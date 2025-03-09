// Important data for calculations & displaying information.
const ship_details = {
    "235109129": {
        "name": "Harbour Spirit",
        "call-sign": "2IES4",
        "type": "Passenger Vessel",
        "gross-tonnage": 293,
        "net-tonnage": 111,
        "length": 29.67,
        "breadth": 10.20,
        "service-speed": 10.0,
        "max-passengers": 300,
        "crew": 4,
    },
    "235001314": {
        "name": "Spirit of Gosport",
        "call-sign": "ZNBE7",
        "type": "Passenger Vessel",
        "gross-tonnage": 300,
        "net-tonnage": 113,
        "length": 32.60,
        "breadth": 10.20,
        "service-speed": 10.0,
        "max-passengers": 300,
        "crew": 3,
    },
    "235024149": {
        "name": "Spirit of Portsmouth",
        "call-sign": "MHBV5",
        "type": "Passenger Vessel",
        "gross-tonnage": 377,
        "net-tonnage": 126,
        "length": 32.60,
        "breadth": 10.20,
        "service-speed": 10.0,
        "max-passengers": 300,
        "crew": 4,
    }
};

// Positions of the two harbours.
const gosport_lon_lat = [50.79474742, -1.11615382];
const portsmouth_lon_lat = [50.79708898, -1.10929834];

// Functions for calculating distance between points.
function haversine_distance(long1, lat1, long2, lat2) {
    const earth_radius = 6371000; // Measured in metres.
    let delta_lat = (lat2 - lat1) * Math.PI / 180;
    let delta_long = (long2 - long1) * Math.PI / 180;
    let a = Math.sin(delta_lat / 2) * Math.sin(delta_lat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(delta_long / 2) * Math.sin(delta_long / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earth_radius * c;
}

// Function to get tracker logs to display frontend.
function get_all_traffic_logs() {
    return fetch("tracker_log.json")
        .then(response => response.text())
        .then(data => {
            try {
                let logs = data.split("\n").filter(line => line.trim() !== "");
                return logs.map(log => JSON.parse(log));
            } catch (error) {
                console.error("Error | Invalid JSON data:", error);
                return [];
            }
        })
        .catch(error => {
            console.error("Error | File read error:", error);
            return [];
        });
}

// Get specific logs from the tracker. 0 = Latest.
function get_traffic_log(index) {
    return get_all_traffic_logs().then(logs => logs[logs.length - 1 - index]);
}

// Function to get all service logs to display frontend.
function get_all_service_logs() {
    return fetch("service_log.json")
        .then(response => response.text())
        .then(data => {
            try {
                let logs = data.split("\n").filter(line => line.trim() !== "");
                return logs.map(log => JSON.parse(log));
            } catch (error) {
                console.error("Error | Invalid JSON data:", error);
                return [];
            }
        })
        .catch(error => {
            console.error("Error | File read error:", error);
            return [];
        });
}

// Get the timetable for the ferries.
function get_timetable() {
    return fetch("timetable.json")
        .then(response => response.json())
        .catch(error => {
            console.error("Error | File read error:", error);
            return {};
        });
}

// Function to format time into minutes and seconds.
function format_time(time) {
    let minutes = Math.floor(time / 60000);
    let seconds = Math.floor((time % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

// Upon page load and every 5 seconds, update the tracker with up-to-date information.
document.addEventListener("DOMContentLoaded", function () {
    const status_message = document.getElementById("status-message");
    const status_message_colour = document.getElementById("status-message-colour");
    const ais_status = document.getElementById("ais-status");
    const last_log = document.getElementById("last-log");
    const average_update = document.getElementById("average-update");
    const current_vessel = document.getElementById("current-vessel");
    const current_heading = document.getElementById("current-heading");
    const current_speed = document.getElementById("current-speed");
    const current_location = document.getElementById("current-location");
    const distance_from_gosport = document.getElementById("distance-from-gosport");
    const distance_from_portsmouth = document.getElementById("distance-from-portsmouth");
    const vessel_details = document.getElementById("vessel-details");
    const progress_bar_fill = document.getElementById("progress-bar-fill");
    const direction_arrow = document.getElementById("direction-arrow");
    const eta_gosport = document.getElementById("eta-gosport");
    const eta_portsmouth = document.getElementById("eta-portsmouth");
    const next_gosport = document.getElementById("next-gosport");
    const next_portsmouth = document.getElementById("next-portsmouth");
    const timetable_loading = document.getElementById("timetable-loading");

    function update_tracker() {
        get_traffic_log(0).then(latest_log => {
            if (!latest_log) {
                console.warn("Warning | No data found for the latest log.");
                return;
            }

            let message_timestamp = latest_log["MetaData"]["time_utc"];
            let time_difference = Math.floor((Date.now() - new Date(message_timestamp).getTime()) / 1000);

            if (time_difference > 60) {
                status_message.innerText = "Systems Offline / Out Of Date";
                status_message_colour.style.backgroundColor = "var(--color-offline)";
                ais_status.innerHTML = "<b>Status:</b> <span class='status-indicator' style='background-color: var(--color-offline)'></span><span style='color: var(--color-offline)'>Offline</span>";
            } else {
                status_message.innerText = "All Systems Operational";
                status_message_colour.style.backgroundColor = "var(--color-online)";
                ais_status.innerHTML = "<b>Status:</b> <span class='status-indicator' style='background-color: var(--color-online)'></span><span style='color: var(--color-online)'>Online</span>";
            }

            last_log.innerHTML = `<b>Last Log:</b> ${new Date(message_timestamp).toLocaleString()}`;

            get_all_traffic_logs().then(logs => {
                let total_time_difference = 0;
                for (let i = 0; i < logs.length - 1; i++) {
                    let current_log = logs[i];
                    let next_log = logs[i + 1];
                    let current_timestamp = new Date(current_log["MetaData"]["time_utc"]).getTime();
                    let next_timestamp = new Date(next_log["MetaData"]["time_utc"]).getTime();
                    total_time_difference += next_timestamp - current_timestamp;
                }

                let average_time_difference = total_time_difference / (logs.length - 1);
                if (isNaN(average_time_difference)) {
                    average_time_difference = 0;
                }
                average_update.innerHTML = `<b>Average Update:</b> ${Math.floor(average_time_difference / 1000)}s`;
            });

            let ship_mmsi = latest_log["Message"]["PositionReport"]["UserID"];
            if (ship_mmsi in ship_details) {
                let ship_name = ship_details[ship_mmsi]["name"];
                current_vessel.innerHTML = `<b>Current Vessel:</b><br>${ship_name}`;

                let vessel_details_html = `<b>Name:</b> ${ship_details[ship_mmsi]["name"]}<br>`;
                vessel_details_html += `<b>Call Sign:</b> ${ship_details[ship_mmsi]["call-sign"]}<br>`;
                vessel_details_html += `<b>Type:</b> ${ship_details[ship_mmsi]["type"]}<br>`;
                vessel_details_html += `<b>Gross Tonnage:</b> ${ship_details[ship_mmsi]["gross-tonnage"]}t<br>`;
                vessel_details_html += `<b>Net Tonnage:</b> ${ship_details[ship_mmsi]["net-tonnage"]}t<br>`;
                vessel_details_html += `<b>Length:</b> ${ship_details[ship_mmsi]["length"]}m<br>`;
                vessel_details_html += `<b>Breadth:</b> ${ship_details[ship_mmsi]["breadth"]}m<br>`;
                vessel_details_html += `<b>Service Speed:</b> ${ship_details[ship_mmsi]["service-speed"]}kts<br>`;
                vessel_details_html += `<b>Max Passengers:</b> ${ship_details[ship_mmsi]["max-passengers"]}<br>`;
                vessel_details_html += `<b>Crew:</b> ${ship_details[ship_mmsi]["crew"]}`;
                vessel_details.innerHTML = vessel_details_html;
            } else {
                current_vessel.innerHTML = `<b>Current Vessel:</b><br>Unknown`;
                vessel_details.innerHTML = "Unknown Ship";
            }

            let ship_heading = latest_log["Message"]["PositionReport"]["TrueHeading"];
            current_heading.innerHTML = `<b>Current Heading:</b> ${ship_heading}°`;

            let ship_speed = latest_log["Message"]["PositionReport"]["Sog"];
            current_speed.innerHTML = `<b>Current Speed:</b> ${ship_speed}kts`;

            let ship_lon = latest_log["Message"]["PositionReport"]["Longitude"];
            let ship_lat = latest_log["Message"]["PositionReport"]["Latitude"];

            let gosport_distance_metres = haversine_distance(ship_lon, ship_lat, gosport_lon_lat[1], gosport_lon_lat[0]);
            let portsmouth_distance_metres = haversine_distance(ship_lon, ship_lat, portsmouth_lon_lat[1], portsmouth_lon_lat[0]);

            if (gosport_distance_metres <= 40) {
                current_location.innerHTML = `<b>Current Location:</b><br>Gosport Harbour`;
            } else if (portsmouth_distance_metres <= 40) {
                current_location.innerHTML = `<b>Current Location:</b><br>Portsmouth Harbour`;
            } else {
                current_location.innerHTML = `<b>Current Location:</b><br>Under Way`;
            }

            distance_from_gosport.innerHTML = `<b>Distance from Gosport:</b> ${Math.round(gosport_distance_metres)}m`;
            distance_from_portsmouth.innerHTML = `<b>Distance from Portsmouth:</b> ${Math.round(portsmouth_distance_metres)}m`;

            get_timetable().then(timetable => {
                let next_gosport_time = timetable["gosport"][0];
                let next_portsmouth_time = timetable["portsmouth"][0];

                let after_gosport_time = timetable["gosport"][1];
                let after_portsmouth_time = timetable["portsmouth"][1];

                let eta_gosport_raw = new Date(next_gosport_time).getTime() - Date.now();
                let eta_portsmouth_raw = new Date(next_portsmouth_time).getTime() - Date.now();

                let eta_gosport_after_raw = new Date(next_gosport_time).getTime() - Date.now();
                let eta_portsmouth_after_raw = new Date(next_portsmouth_time).getTime() - Date.now();

                if (gosport_distance_metres <= 40) {
                    progress_bar_fill.style.width = "0%";
                    eta_gosport.innerText = "ETA: N/A";
                    eta_portsmouth.innerText = "ETA: " + format_time(eta_portsmouth_raw);
                    next_gosport.innerHTML = "Next Arrival: " + new Date(after_gosport_time).toLocaleTimeString() + "<br>ETA: " + format_time(eta_gosport_after_raw);
                    next_portsmouth.innerHTML = "Next Arrival: " + new Date(next_portsmouth_time).toLocaleTimeString() + "<br>ETA: " + format_time(eta_portsmouth_raw);
                } else if (portsmouth_distance_metres <= 40) {
                    progress_bar_fill.style.width = "100%";
                    eta_portsmouth.innerText = "ETA: N/A";
                    eta_gosport.innerText = "ETA: " + format_time(eta_gosport_raw);
                    next_portsmouth.innerHTML = "Next Arrival: " + new Date(after_portsmouth_time).toLocaleTimeString() + "<br>ETA: " + format_time(eta_portsmouth_after_raw);
                    next_gosport.innerHTML = "Next Arrival: " + new Date(next_gosport_time).toLocaleTimeString() + "<br>ETA: " + format_time(eta_gosport_raw);
                } else {
                    let total_distance = gosport_distance_metres + portsmouth_distance_metres;
                    let progress_percentage = Math.min(100, Math.round((gosport_distance_metres / total_distance) * 100));
                    progress_bar_fill.style.width = progress_percentage + "%";

                    eta_gosport.innerText = "ETA: " + format_time(eta_gosport_raw);
                    eta_portsmouth.innerText = "ETA: " + format_time(eta_portsmouth_raw);

                    next_gosport.innerHTML = "Next Arrival: " + new Date(next_gosport_time).toLocaleTimeString() + "<br>ETA: " + format_time(eta_gosport_after_raw);
                    next_portsmouth.innerHTML = "Next Arrival: " + new Date(next_portsmouth_time).toLocaleTimeString() + "<br>ETA: " + format_time(eta_portsmouth_after_raw);
                }

                if (ship_heading >= 160 && ship_heading <= 340) {
                    direction_arrow.style.transform = "scaleX(-1)";
                }

                const timetableGrid = document.getElementById("timetable_grid");
                timetableGrid.innerHTML = ""; // Clear any pre-existing timetable entries

                for (let i = 0; i < 6; i++) {
                    const timetableWidget = document.createElement("div");
                    timetableWidget.className = "timetable-widget";

                    const timetableHeader = document.createElement("div");
                    timetableHeader.className = "timetable-header";
                    const headerTitle = document.createElement("h2");
                    headerTitle.innerText = "Arrivals #" + (i + 1);
                    timetableHeader.appendChild(headerTitle);

                    const timetableBody = document.createElement("div");
                    timetableBody.className = "timetable-body";
                    const bodyText = document.createElement("p");
                    bodyText.id = `next-ferry-${i}`;
                    bodyText.innerHTML = "<b>Gosport:</b><br>Next Arrival: " + new Date(timetable["gosport"][i]).toLocaleTimeString() + "<br>ETA: " + format_time(new Date(timetable["gosport"][i]).getTime() - Date.now()) + "<br><br><b>Portsmouth:</b><br>Next Arrival: " + new Date(timetable["portsmouth"][i]).toLocaleTimeString() + "<br>ETA: " + format_time(new Date(timetable["portsmouth"][i]).getTime() - Date.now());
                    timetableBody.appendChild(bodyText);

                    timetableWidget.appendChild(timetableHeader);
                    timetableWidget.appendChild(timetableBody);

                    timetableGrid.appendChild(timetableWidget);
                }
            });

            if (timetable_loading.style.display !== "none") {
                timetable_loading.style.display = "none";
            }


        }).catch(error => {
            console.error("Error | Failed to get the latest log:", error);
        });
    }

    update_tracker();
    setInterval(update_tracker, 1000);
});

console.log("Success | Clientside Scripts Loaded!");
