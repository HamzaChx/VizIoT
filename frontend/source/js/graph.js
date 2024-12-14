let gr = null;
const sensorBuffers = {}; // Buffers for each sensor { sensorId: { x: [], y: [], group: '' } }

/**
 * Initializes the GR graph and sets the viewport.
 * @param {string} canvasId - The ID of the canvas element for the graph.
 */
function initializeGraph(canvasId) {
    GR.ready(() => {
        gr = new GR(canvasId);

        // Configure the initial viewport and settings
        gr.clearws();
        gr.setviewport(0.1, 0.95, 0.1, 0.95);
    });
}

/**
 * Processes incoming graph data and appends it to the appropriate sensor buffers.
 * @param {Array} newGraphData - Array of new data points for multiple sensors.
 *                              Each point should have { sensorId, x, y, group }.
 */
function updateBuffers(newGraphData) {
    newGraphData.forEach((point) => {
        const { sensorId, x, y, group } = point;

        if (!sensorBuffers[sensorId]) {
            // Initialize buffers for the sensor if not already present
            sensorBuffers[sensorId] = { x: [], y: [], group };
        }

        const sensorBuffer = sensorBuffers[sensorId];
        sensorBuffer.x.push(x);
        sensorBuffer.y.push(y);

        // Keep buffers within a reasonable size for continuous plotting
        if (sensorBuffer.x.length > 200) {
            sensorBuffer.x.splice(0, sensorBuffer.x.length - 200);
            sensorBuffer.y.splice(0, sensorBuffer.y.length - 200);
        }
    });
}

/**
 * Continuously draws the graph with updated data for multiple sensors.
 */
function startDrawing() {
    if (!gr) {
        console.error('GR instance not initialized.');
        return;
    }

    function drawFrame() {
        if (Object.keys(sensorBuffers).length === 0) {
            requestAnimationFrame(drawFrame);
            return; // Skip frame if no data is available
        }

        // Calculate global data range across all sensors
        let xMin = Infinity, xMax = -Infinity, yMin = 0, yMax = 1; // Fixed range for normalized values
        Object.values(sensorBuffers).forEach(({ x }) => {
            if (x.length > 0) {
                xMin = Math.min(xMin, x[0]);
                xMax = Math.max(xMax, x[x.length - 1]);
            }
        });

        // If no valid range, skip drawing
        if (xMin === Infinity || xMax === -Infinity) {
            requestAnimationFrame(drawFrame);
            return;
        }

        // Clear the workspace and reset the viewport
        gr.clearws();
        gr.setviewport(0.1, 0.95, 0.1, 0.95);
        gr.setwindow(xMin, xMax, yMin, yMax);

        // Draw grid and axes
        gr.setlinecolorind(1);
        gr.grid(0.25, 0.25, 0, 0, 2, 2);
        gr.axes(
            (xMax - xMin) / 10 || 1,
            (yMax - yMin) / 10 || 1,
            xMin, yMin,
            2, 2, 0.005
        );

        // Plot polylines for each sensor
        let lineColorIndex = 1; // Start with color index 2 for different sensors
        Object.entries(sensorBuffers).forEach(([sensorId, { x, y, group }]) => {
            if (x.length > 0 && y.length > 0) {
                gr.setlinecolorind(lineColorIndex++);
                gr.polyline(x.length, x, y);
            }
        });

        // Request the next frame
        requestAnimationFrame(drawFrame);
    }

    // Start the animation loop
    requestAnimationFrame(drawFrame);
}

export { initializeGraph, updateBuffers, startDrawing };
