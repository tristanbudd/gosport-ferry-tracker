require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const cors = require('cors');

// Replace this with your site if you are hosting yourself.
app.use(cors({
  origin: 'https://ferrytracker.tristanbudd.com'
}));

// Serve static files from /public
app.use('/ferrytracker', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Gosport Ferry Tracker API is running');
});

// Start server listening on the port Passenger gives us
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

/* Your existing WebSocket code here, but without listening on another port */

const gosport_lon_lat = [50.79474742, -1.11615382];
const portsmouth_lon_lat = [50.79708898, -1.10929834];

function haversine_distance(long1, lat1, long2, lat2) {
  const earth_radius = 6371000; // Metres
  let delta_lat = (lat2 - lat1) * Math.PI / 180;
  let delta_long = (long2 - long1) * Math.PI / 180;
  let a = Math.sin(delta_lat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(delta_long / 2) ** 2;
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earth_radius * c;
}

const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const service_log_file = path.join(dataDir, 'service_log.json');
const timetable_file = path.join(dataDir, 'timetable.json');
const tracker_log_file = path.join(dataDir, 'tracker_log.json');

let last_log_time = { gosport: 0, portsmouth: 0 };
const log_interval = 10 * 60 * 1000; // 10 minutes

function log_service_event(port_name, distance) {
  const current_time = Date.now();
  if (current_time - last_log_time[port_name] >= log_interval) {
    last_log_time[port_name] = current_time;
    const log_entry = {
      port: port_name,
      distance: distance,
      timestamp: new Date().toISOString()
    };

    fs.readFile(service_log_file, 'utf8', (err, data) => {
      let lines = [];
      if (!err && data.trim() !== '') {
        lines = data.split('\n').filter(line => line.trim() !== '');
      }

      if (lines.length >= 100) lines.shift();

      lines.push(JSON.stringify(log_entry));

      fs.writeFile(service_log_file, lines.join('\n') + '\n', err => {
        if (err) console.error('Error writing service_log:', err);
      });

      update_timetable(port_name, current_time);
    });
  }
}

function update_timetable(port_name, current_time) {
  fs.readFile(timetable_file, 'utf8', (err, data) => {
    let timetable = { gosport: [], portsmouth: [] };
    if (!err && data.trim() !== '') {
      try {
        timetable = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing timetable JSON:', e.message);
      }
    }

    timetable[port_name] = [];
    for (let i = 0; i < 6; i++) {
      let next_time = new Date(current_time + (i + 1) * 17 * 60 * 1000).toISOString();
      timetable[port_name].push(next_time);
    }

    fs.writeFile(timetable_file, JSON.stringify(timetable, null, 2), err => {
      if (err) console.error('Error writing timetable:', err);
    });
  });
}

let socket;
const reconnect_interval = 5000;

function websocket_connect() {
  console.log('WebSocket | Connecting...');
  socket = new WebSocket('wss://stream.aisstream.io/v0/stream');

  socket.onopen = () => {
    const subscription_message = {
      Apikey: process.env.AISSTREAM_API_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FiltersShipMMSI: ['235109129', '235001314', '235024149'],
      FilterMessageTypes: ['PositionReport']
    };

    socket.send(JSON.stringify(subscription_message));
    console.log('WebSocket | Connection Established!');
  };

  socket.onmessage = event => {
    try {
      const ais_message = JSON.parse(event.data);
      if (!ais_message.Message || !ais_message.Message.PositionReport) {
        console.error('Error | Missing PositionReport:', ais_message);
        return;
      }

      fs.readFile(tracker_log_file, 'utf8', (err, data) => {
        let lines = [];
        if (!err && data.trim() !== '') {
          lines = data.split('\n').filter(line => line.trim() !== '');
        }

        if (lines.length >= 100) lines.shift();

        lines.push(JSON.stringify(ais_message));

        fs.writeFile(tracker_log_file, lines.join('\n') + '\n', err => {
          if (err) console.error('Error writing tracker_log:', err);
        });
      });

      const position_report = ais_message.Message.PositionReport;
      const ship_lon = position_report.Longitude;
      const ship_lat = position_report.Latitude;

      const gosport_distance = haversine_distance(ship_lon, ship_lat, gosport_lon_lat[1], gosport_lon_lat[0]);
      const portsmouth_distance = haversine_distance(ship_lon, ship_lat, portsmouth_lon_lat[1], portsmouth_lon_lat[0]);

      if (gosport_distance <= 40) {
        log_service_event('gosport', gosport_distance);
      } else if (portsmouth_distance <= 40) {
        log_service_event('portsmouth', portsmouth_distance);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  };

  socket.onerror = error => {
    console.error('WebSocket | Error:', error.message);
  };

  socket.onclose = () => {
    console.log(`WebSocket | Disconnected. Reconnecting in ${reconnect_interval / 1000}s...`);
    setTimeout(websocket_connect, reconnect_interval);
  };
}

websocket_connect();
