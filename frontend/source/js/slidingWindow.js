import { initializeGraph, startDrawing, updateBuffers } from './graph.js';

let eventSource = null;

/**
 * Starts listening to the sliding window data stream using SSE.
 * @param {string} canvasId - The canvas element ID for the graph.
 * @param {number} sensorId - The sensor ID to stream data for.
 */
function startSlidingWindowStream(canvasId, sensorId) {
    if (eventSource) {
        console.log('Sliding window stream already active.');
        return;
    }

    initializeGraph(canvasId); // Initialize the graph
    startDrawing(); // Start continuous graph drawing

    // Create the EventSource
    eventSource = new EventSource(`/stream-sliding-window?sensor_id=${sensorId}`);

    // Listen for new data
    eventSource.onmessage = (event) => {
        try {
            const { sensorData } = JSON.parse(event.data);

            if (!sensorData || sensorData.length === 0) {
                console.log('No data received for the sliding window.');
                return;
            }

            // Transform and update the buffers with new data
            const transformedData = sensorData.map((entry) => ({
                x: new Date(entry.timestamp).getTime() / 1000, // Convert timestamp to seconds
                y: entry.value, // Use the sensor value as the Y-coordinate
            }));

            // Ensure all received data is added to the buffer
            updateBuffers(transformedData);
        } catch (error) {
            console.error('Error processing sliding window data:', error);
        }
    };

    // Handle connection errors
    eventSource.onerror = (error) => {
        console.error('Sliding window stream encountered an error:', error);
        stopSlidingWindowStream(); // Cleanup
    };

    console.log(`Sliding window stream started for sensor ID: ${sensorId}`);
}

/**
 * Stops the sliding window data stream.
 */
function stopSlidingWindowStream() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log('Sliding window stream stopped.');
    }
}

export { startSlidingWindowStream, stopSlidingWindowStream };
