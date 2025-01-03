import GraphManager from './graph/graph.js';
import { updateBuffers } from './graph/buffer.js';

// Define variables for graph manager and data stream
let graphManager = null;
let eventSource = null;
let startTime = null; // To store the start time of the data stream
let isPaused = false; // Track pause state
let lastTimestamp = null; // Track the last timestamp for resuming

document.getElementById('pause-button').addEventListener('click', () => {
    if (!eventSource) return;

    // Send a pause signal to the backend
    eventSource.dispatchEvent(new Event('pause'));
    graphManager.pauseDrawing();
});

document.getElementById('play-button').addEventListener('click', () => {
    if (!eventSource) {
        startSlidingWindowStream('example-canvas'); // Reinitialize if needed
    } else {
        // Send a resume signal to the backend
        eventSource.dispatchEvent(new Event('resume'));
    }

    graphManager.startDrawing();
});

document.getElementById('stop-button').addEventListener('click', () => {
    stopSlidingWindowStream();
});

let sensorLimit = 1;
const slider = document.getElementById('sensor-slider');
const sensorCountLabel = document.getElementById('sensor-count');

slider.addEventListener('input', (event) => {
    const newLimit = event.target.value;
    sensorLimit = newLimit;
    sensorCountLabel.textContent = newLimit;

    // Send the new limit to the backend
    fetch('/update-limit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: newLimit }),
    }).then((response) => {
        if (!response.ok) {
            console.error('Failed to update sensor limit:', response.statusText);
        }
    }).catch((error) => {
        console.error('Error updating sensor limit:', error);
    });
});

/**
 * Starts listening to the sliding window data stream using SSE.
 * @param {string} canvasId - The canvas element ID for the graph.
 */
function startSlidingWindowStream(canvasId) {
    if (eventSource && !isPaused) {
        console.log('Sliding window stream already active.');
        return;
    }

    // Resume from paused state
    if (isPaused) {
        console.log('Resuming sliding window stream...');
        isPaused = false;
        return;
    }

    // Initialize the graph manager
    graphManager = new GraphManager(canvasId);
    graphManager.initialize();
    graphManager.startDrawing();

    // Create the EventSource
    eventSource = new EventSource(`/stream-sliding-window?start=${lastTimestamp || ''}&limit=${sensorLimit}`);

    eventSource.onmessage = (event) => {
        try {
            const { sensorData } = JSON.parse(event.data);

            if (!sensorData || sensorData.length === 0) {
                return;
            }

            // Set the start time if not already set
            if (!startTime && sensorData.length > 0) {
                startTime = Date.parse(sensorData[0].timestamp);
            }

            // Transform and update the buffers with relative time and group scaling
            const transformedData = sensorData.map((entry) => {
                const groupRange = entry.group_max - entry.group_min;
                const scaledY = entry.group_min + (entry.normalized_value * groupRange);

                return {
                    sensorId: entry.sensor_id,
                    x: (Date.parse(entry.timestamp) - startTime) / 1000,
                    y: scaledY,
                    group: entry.group_name,
                };
            });

            updateBuffers(transformedData);

            // Update the last timestamp for potential resume
            lastTimestamp = sensorData[sensorData.length - 1].timestamp;
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
    }

    isPaused = false;
    lastTimestamp = null;
    startTime = null;

    if (graphManager) {
        graphManager.stopDrawing();
        graphManager.reset();
        graphManager = null;
    }

    console.log('Sliding window stream stopped and reset.');
}

export { startSlidingWindowStream, stopSlidingWindowStream };
