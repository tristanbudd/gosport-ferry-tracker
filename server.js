require("dotenv").config();

const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const gosport_lon_lat = [50.79474742, -1.11615382];
const portsmouth_lon_lat = [50.79708898, -1.10929834];

function haversine_distance(long1, lat1, long2, lat2) {
    const earth_radius = 6371000; // Measured in metres.
    let delta_lat = (lat2 - lat1) * Math.PI / 180;
    let delta_long = (long2 - long1) * Math.PI / 180;
    let a = Math.sin(delta_lat / 2) * Math.sin(delta_lat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(delta_long / 2) * Math.sin(delta_long / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earth_radius * c;
}

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const service_log_file = path.join(dataDir, "service_log.json");
const timetable_file = path.join(dataDir, "timetable.json");
const tracker_log_file = path.join(dataDir, "tracker_log.json");

let last_log_time = { gosport: 0, portsmouth: 0 };
const log_interval = 10 * 60 * 1000; // 10 minutes in milliseconds

function log_service_event(port_name, distance) {
    const current_time = Date.now();
    if (current_time - last_log_time[port_name] >= log_interval) {
        last_log_time[port_name] = current_time;
        const log_entry = {
            port: port_name,
            distance: distance,
            timestamp: new Date().toISOString()
        };

        fs.readFile(service_log_file, "utf8", (err, data) => {
            if (err) {
                console.error("Error | File read error:", err);
                return;
            }

            let lines = [];
            if (data.trim() !== "") {
                lines = data.split("\n").filter(line => line.trim() !== "");
            }

            if (lines.length >= 100) {
                lines.shift();
            }
            lines.push(JSON.stringify(log_entry));

            fs.writeFile(service_log_file, lines.join("\n") + "\n", (err) => {
                if (err) console.error("Error | File write error:", err);
            });

            update_timetable(port_name, current_time);
        });
    }
}

function update_timetable(port_name, current_time) {
    fs.readFile(timetable_file, "utf8", (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error("Error | File read error:", err);
            return;
        }

        let timetable = { gosport: [], portsmouth: [] };

        if (data.trim() !== "") {
            try {
                timetable = JSON.parse(data);
            } catch (e) {
                console.error("Error | JSON parse error:", e.message);
                return;
            }
        }

        timetable[port_name] = [];
        for (let i = 0; i < 6; i++) {
            let next_arrival_time = new Date(current_time + (i + 1) * 17 * 60 * 1000).toISOString();
            timetable[port_name].push(next_arrival_time);
        }

        fs.writeFile(timetable_file, JSON.stringify(timetable, null, 2), (err) => {
            if (err) console.error("Error | File write error:", err);
        });
    });
}

let socket;
let reconnect_interval = 5000; // 5 seconds

function websocket_connect() {
    console.log("WebSocket | Connecting...");
    socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

    socket.onopen = function() {
        let subscription_message = {
            Apikey: process.env.AISSTREAM_API_KEY,
            BoundingBoxes: [[[-90, -180], [90, 180]]],
            FiltersShipMMSI: ["235109129", "235001314", "235024149"],
            FilterMessageTypes: ["PositionReport"]
        };

        socket.send(JSON.stringify(subscription_message));
        console.log("WebSocket | Connection Established!");
    };

    socket.onmessage = function(event) {
        let ais_message = JSON.parse(event.data);

        fs.readFile(tracker_log_file, "utf8", (err, data) => {
            if (err) {
                console.error("Error | File read error:", err);
                return;
            }

            let lines = [];
            if (data.trim() !== "") {
                lines = data.split("\n").filter(line => line.trim() !== "");
            }

            if (lines.length >= 100) {
                lines.shift();
            }

            try {
                let ais_message = JSON.parse(event.data);
                lines.push(JSON.stringify(ais_message));

                fs.writeFile(tracker_log_file, lines.join("\n") + "\n", (err) => {
                    if (err) console.error("Error | File write error:", err);
                });
            } catch (e) {
                console.error("Error | JSON parse error:", e.message);
            }
        });


        let position_report = ais_message["Message"]["PositionReport"];
        let ship_lon = position_report["Longitude"];
        let ship_lat = position_report["Latitude"];

        let gosport_distance = haversine_distance(ship_lon, ship_lat, gosport_lon_lat[1], gosport_lon_lat[0]);
        let portsmouth_distance = haversine_distance(ship_lon, ship_lat, portsmouth_lon_lat[1], portsmouth_lon_lat[0]);

        if (gosport_distance <= 40) {
            log_service_event("gosport", gosport_distance);
        } else if (portsmouth_distance <= 40) {
            log_service_event("portsmouth", portsmouth_distance);
        }
    };

    socket.onerror = function(error) {
        console.error("WebSocket | Error:", error.message);
    };

    socket.onclose = function() {
        console.log("WebSocket | Closing Connection. Reconnecting in " + reconnect_interval / 1000 + " seconds...");
        setTimeout(websocket_connect, reconnect_interval);
    };
}

websocket_connect();