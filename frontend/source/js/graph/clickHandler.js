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
        .filter(([_, { group: sensorGroup, x }]) => {
            return (
                sensorGroup === group &&
                x.some((val) => Math.abs(val - timestamp) <= tolerance)
            );
        })
        .map(([sensorId, { x, y, group: sensorGroup }]) => {
            const closestIndex = x.findIndex((val) => Math.abs(val - timestamp) <= tolerance);

            if (closestIndex === -1) return null;

            // Find sensor info from groupSensorMap
            const sensorInfo = graphManager.groupSensorMap[sensorGroup]?.find(
                sensor => sensor.id === sensorId || sensor.sensor_id === sensorId
            );

            return {
                sensorId,
                sensorName: sensorInfo?.sensor_name || sensorInfo?.name || "Unknown",
                value: y[closestIndex].toFixed(3), // Format to 3 decimal places
                timestamp: new Date(timestamp * 1000 + window.startTime).toLocaleString(), // Convert to readable time
                group: sensorGroup,
            };
        })
        .filter((sensor) => sensor !== null);
}

/**
 * Displays the modal with sensor data.
 * @param {Array<Object>} sensors - Array of sensor data to display.
 */
function showModal(sensors) {
    const modal = document.getElementById("sensor-modal");
    const dataList = document.getElementById("sensor-data-list");

    // Populate sensor data in the modal
    dataList.innerHTML = sensors
        .map(
            (sensor) => `
            <li>
                <strong>Name:</strong> ${sensor.sensorName || "Unknown"}<br>
                <strong>Group:</strong> ${sensor.group}<br>
                <strong>Value:</strong> ${sensor.value}<br>
                <strong>Timestamp:</strong> ${sensor.timestamp}
            </li>
        `
        )
        .join("");

    // Show the modal
    modal.style.display = "block";

    // Add event listener to close button
    const closeButton = document.querySelector(".sensor-modal-close");
    closeButton.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Close the modal when clicking outside the content area
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}
