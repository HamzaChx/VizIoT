import { initializeGraph, startDrawing, updateBuffers } from './graph.js';

let eventSource = null;

/**
 * Starts listening to the sliding window data stream using SSE.
 * @param {string} canvasId - The canvas element ID for the graph.
 */
function startSlidingWindowStream(canvasId) {
    if (eventSource) {
        console.log('Sliding window stream already active.');
        return;
    }

    initializeGraph(canvasId);
    startDrawing();

    // Create the EventSource
    eventSource = new EventSource('/stream-sliding-window');

    // Listen for new data
    eventSource.onmessage = (event) => {
        try {
            const { sensorData } = JSON.parse(event.data);

            if (!sensorData || sensorData.length === 0) {
                return;
            }

            // Transform and update the buffers with new data
            const transformedData = sensorData.map((entry) => ({
                sensorId: entry.sensor_id, // Keep track of the sensor
                x: new Date(entry.timestamp).getTime() / 1000, // Convert timestamp to seconds
                y: entry.value, // Use the sensor value as the Y-coordinate
            }));

            // Ensure all received data is added to the buffer within the sliding window
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

}

/**
 * Stops the sliding window data stream.
 */
function stopSlidingWindowStream() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log('Sliding window stream stopped. Connection closed with the server.');
    }
}

export { startSlidingWindowStream, stopSlidingWindowStream };
