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

const legendList = document.getElementById("legend-list");

function updateLegend(groupColorMap) {
    // Clear the legend before populating it
    legendList.innerHTML = "";

    Object.entries(groupColorMap).forEach(([group, colorIndex]) => {
        // Create a legend item
        const legendItem = document.createElement("li");
        legendItem.style.display = "flex";
        legendItem.style.alignItems = "center";
        legendItem.style.marginBottom = "10px";

        // Color box
        const colorBox = document.createElement("div");
        colorBox.style.width = "20px";
        colorBox.style.height = "20px";
        colorBox.style.backgroundColor = getGRColor(colorIndex); // Helper function to get color
        colorBox.style.marginRight = "10px";

        // Group label
        const label = document.createElement("span");
        label.textContent = group;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);

        legendList.appendChild(legendItem);
    });
}

function getGRColor(colorIndex) {
    const grColorMap = {
        8: "#00008B", // Dark Blue
        7: "#FF00FF", // Pink
        6: "#FFFF00", // Yellow
        5: "#00FFFF", // Cyan
        4: "#3357FF", // Blue
        3: "#33FF57", // Green
        2: "#FF0000", // Red
        1: "#000000"  // Black
    };
    return grColorMap[colorIndex] || "#000000"; // Default to black if colorIndex is not mapped
}


/**
 * Continuously draws the graph with updated data for multiple sensors.
 */

let isDrawing = false;
function startDrawing() {
    if (!gr) {
        console.error('GR instance not initialized.');
        return;
    }

    isDrawing = true;

    function drawFrame() {

        if (!isDrawing) {
            return; // Exit the loop if drawing is stopped
        }

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
            (xMax - xMin) / 10 || 1, // Major tick spacing for x-axis
            (yMax - yMin) / 10 || 1, // Major tick spacing for y-axis
            xMin, yMin,              // Origin for the axes
            2, 0,                    // x-axis labeled, y-axis not labeled
            0.005                    // Tick mark length
        );

        // Plot polylines for each sensor
        let groupColorMap = {}; // Map to store the color index for each group
        let nextColorIndex = 4; 

        Object.entries(sensorBuffers).forEach(([sensorId, { x, y, group }]) => {
            if (x.length > 0 && y.length > 0) {
                console.log(`Plotting sensor ${sensorId} with group ${group}`);

                // Assign a new color to the group if it doesn't already have one
                if (!(group in groupColorMap)) {
                    groupColorMap[group] = nextColorIndex--;
                    if (nextColorIndex <= 1) {
                        nextColorIndex = 8;
                    }
                }

                // Set the line color based on the group's assigned color
                const lineColorIndex = groupColorMap[group];
                gr.setlinecolorind(lineColorIndex);

                // Draw the polyline for the current sensor
                gr.polyline(x.length, x, y);
            }
        });

        updateLegend(groupColorMap);

        // Request the next frame
        requestAnimationFrame(drawFrame);
    }

    // Start the animation loop
    requestAnimationFrame(drawFrame);
}

function stopDrawing() {
    isDrawing = false;
}

export { initializeGraph, updateBuffers, startDrawing, stopDrawing };
