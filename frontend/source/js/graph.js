let gr = null;
let xBuffer = []; // Buffer for X-axis values
let yBuffer = []; // Buffer for Y-axis values

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
 * Processes incoming graph data and appends it to the buffers.
 * @param {Array} newGraphData - New data points to append.
 */
function updateBuffers(newGraphData) {
    newGraphData.forEach((point) => {
        xBuffer.push(point.x);
        yBuffer.push(point.y);
    });

    // Keep buffers within a reasonable size for continuous plotting
    if (xBuffer.length > 200) {
        xBuffer.splice(0, xBuffer.length - 200);
        yBuffer.splice(0, yBuffer.length - 200);
    }
}

/**
 * Continuously draws the graph with updated data.
 */
function startDrawing() {
    if (!gr) {
        console.error('GR instance not initialized.');
        return;
    }

    let currentIndex = 0; // Track the index of the last drawn point
    const windowSize = 50; // Number of points visible at a time on the X-axis

    function drawFrame() {
        if (xBuffer.length === 0 || yBuffer.length === 0) {
            requestAnimationFrame(drawFrame);
            return; // Skip frame if no data available
        }

        // Define the window dynamically based on the current index
        const xMin = xBuffer[Math.max(0, currentIndex - windowSize)];
        const xMax = xBuffer[currentIndex];
        const yMin = Math.min(...yBuffer.slice(Math.max(0, currentIndex - windowSize), currentIndex + 1));
        const yMax = Math.max(...yBuffer.slice(Math.max(0, currentIndex - windowSize), currentIndex + 1));

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

        // Plot the polyline incrementally
        gr.setlinecolorind(4);
        gr.polyline(currentIndex + 1, xBuffer.slice(0, currentIndex + 1), yBuffer.slice(0, currentIndex + 1));

        // Increment the index for the next frame
        currentIndex = Math.min(currentIndex + 1, xBuffer.length - 1);

        // Request the next frame
        requestAnimationFrame(drawFrame);
    }

    // Start the animation loop
    requestAnimationFrame(drawFrame);
}

export { initializeGraph, updateBuffers, startDrawing };
