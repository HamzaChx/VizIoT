import { initializeGraph, startDrawing, updateBuffers } from './graph.js';

let eventSource = null;
let startTime = null; // To store the start time of the data stream

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

            // Set the start time if not already set
            if (!startTime && sensorData.length > 0) {
                startTime = Date.parse(sensorData[0].timestamp); // Parse the first timestamp
            }

            // Transform and update the buffers with relative time
            const transformedData = sensorData.map((entry) => ({
                sensorId: entry.sensor_id,               // Keep track of the sensor
                x: (Date.parse(entry.timestamp) - startTime) / 1000, // Relative time in seconds
                y: entry.normalized_value,              // Use the normalized value as Y-coordinate
                group: entry.group_name,                // Group name for styling
            }));

            // Update buffers with transformed data
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
        startTime = null; // Reset start time
        console.log('Sliding window stream stopped. Connection closed with the server.');
    }
}

export { startSlidingWindowStream, stopSlidingWindowStream };
