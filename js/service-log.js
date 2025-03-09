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

// Upon page load and every 5 seconds, update the tracker with up-to-date information.
document.addEventListener("DOMContentLoaded", function () {
    const service_log_table = document.getElementById("service-log-table");

    get_all_service_logs().then(logs => {
        logs.forEach((log, index) => {
            const row = document.createElement("tr");

            const index_cell = document.createElement("td");
            index_cell.innerText = index + 1;
            row.appendChild(index_cell);

            const port_cell = document.createElement("td");
            port_cell.innerText = log.port;
            row.appendChild(port_cell);

            const timestamp_cell = document.createElement("td");
            timestamp_cell.innerText = new Date(log.timestamp).toLocaleString();
            row.appendChild(timestamp_cell);

            service_log_table.appendChild(row);
        });
    });
});
console.log("Success | Clientside Scripts Loaded!");