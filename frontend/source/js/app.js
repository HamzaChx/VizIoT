import { startSlidingWindowStream, stopSlidingWindowStream } from './slidingWindow.js';

// Attach event listeners to buttons
document.getElementById('start-button').addEventListener('click', () => {
    const canvasId = 'example-canvas';
    const sensorId = 6; // Replace with the actual sensor ID
    startSlidingWindowStream(canvasId, sensorId);
});

document.getElementById('stop-button').addEventListener('click', stopSlidingWindowStream);
