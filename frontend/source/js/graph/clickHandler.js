/**
 * Handles canvas click events to display sensor information in a modal.
 * @param {MouseEvent} event - The mouse event object.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export function handleCanvasClick(event, canvas, graphManager) {
    const rect = canvas.getBoundingClientRect();

    // Translate click coordinates to canvas-relative coordinates
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Translate canvas coordinates to graph-specific values
    const timestamp = translateXToTimestamp(x, graphManager);
    const group = translateYToGroup(y, graphManager);

    // Fetch relevant sensors
    const sensors = getSensorsInRegion(timestamp, group, graphManager);

    // Show modal if sensors are found
    if (sensors.length > 0) {
        showModal(sensors);
    }
}

/**
 * Translates X coordinate to a timestamp.
 * @param {number} x - Canvas X coordinate.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {number} - Timestamp corresponding to X coordinate.
 */
function translateXToTimestamp(x, graphManager) {
    const { xMin, xMax } = graphManager.calculateXRange();
    const canvasWidth = document.getElementById(graphManager.canvasId).width;
    return xMin + (x / canvasWidth) * (xMax - xMin);
}

/**
 * Translates Y coordinate to a sensor group.
 * @param {number} y - Canvas Y coordinate.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {string|null} - Group name corresponding to Y coordinate.
 */
function translateYToGroup(y, graphManager) {
    const groupNames = Object.keys(graphManager.groupSensorMap);
    const groupCount = groupNames.length;
    const canvasHeight = document.getElementById(graphManager.canvasId).height;

    // Dynamically calculate group height based on canvas height and number of groups
    const groupHeight = canvasHeight / groupCount;

    // Determine the clicked group index
    const groupIndex = Math.floor(y / groupHeight);

    // Return the group name if valid, else return null
    return groupNames[groupIndex] || null;
}


/**
 * Retrieves sensors in the clicked region based on timestamp and group.
 * @param {number} timestamp - The clicked timestamp.
 * @param {string|null} group - The clicked group name.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {Array<Object>} - Array of sensors in the region.
 */
function getSensorsInRegion(timestamp, group, graphManager) {
    const buffers = graphManager.getSensorBuffers();
    const tolerance = 0.1;

    return Object.entries(buffers)
        .filter(([_, data]) => {
            return (
                data.group === group &&
                data.x.some((val) => Math.abs(val - timestamp) <= tolerance)
            );
        })
        .map(([sensorId, data]) => {
            const closestIndex = data.x.findIndex(
                (val) => Math.abs(val - timestamp) <= tolerance
            );

            if (closestIndex === -1) return null;

            return {
                sensorId,
                sensorName: data.sensorName || "Unknown",
                value: data.values[closestIndex] || data.y[closestIndex].toFixed(3),
                timestamp: new Date(timestamp * 1000 + window.startTime).toLocaleString(),
                group: data.group
            };
        })
        .filter(sensor => sensor !== null);
}


function showModal(sensors) {
    const modal = document.getElementById("sensor-modal");
    const dataList = document.getElementById("sensor-data-list");

    dataList.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title">
                    ${sensors.length} Sensor${sensors.length > 1 ? 's' : ''} Selected
                </h5>
                <button type="button" class="btn-close sensor-modal-close"></button>
            </div>
            <div class="modal-body">
                <div class="list-group list-group-flush">
                    ${sensors.map(sensor => `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0">${sensor.sensorName}</h6>
                                <span class="badge bg-secondary">${sensor.group}</span>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Value</small>
                                    <div class="fw-bold">${sensor.value}</div>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Time</small>
                                    <div class="fw-bold">${sensor.timestamp}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>`;

    modal.style.display = "block";

    // Add close handlers
    document.querySelectorAll(".sensor-modal-close").forEach(btn => 
        btn.onclick = () => modal.style.display = "none"
    );
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}