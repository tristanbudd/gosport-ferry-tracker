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

// Upon page load and every 5 seconds, update the tracker with up-to-date information.
document.addEventListener("DOMContentLoaded", function () {
    const tracker_log_table = document.getElementById("tracker-log-table");

    get_all_traffic_logs().then(logs => {
        logs.forEach((log, index) => {
            console.log(log);
            const row = document.createElement("tr");

            const index_cell = document.createElement("td");
            index_cell.innerText = index + 1;
            row.appendChild(index_cell);

            const lat_long_cell = document.createElement("td");
            lat_long_cell.innerHTML = `Lat: ${log["Message"]["PositionReport"]["Latitude"]}<br>Long: ${log["Message"]["PositionReport"]["Longitude"]}`;
            row.appendChild(lat_long_cell);

            const speed_cell = document.createElement("td");
            speed_cell.innerText = log["Message"]["PositionReport"]["Sog"] + " knots";
            row.appendChild(speed_cell);

            const heading_cell = document.createElement("td");
            heading_cell.innerText = log["Message"]["PositionReport"]["TrueHeading"] + "°";
            row.appendChild(heading_cell);

            const timestamp_cell = document.createElement("td");
            timestamp_cell.innerText = new Date(log["MetaData"]["time_utc"]).toLocaleString();
            row.appendChild(timestamp_cell);

            const full_report_cell = document.createElement("td");
            const download_link = document.createElement("a");
            download_link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(log))}`;
            download_link.download = `report_${index + 1}.json`;
            download_link.innerText = "Download";
            full_report_cell.appendChild(download_link);
            row.appendChild(full_report_cell);

            tracker_log_table.appendChild(row);
        });
    });
});
console.log("Success | Clientside Scripts Loaded!");