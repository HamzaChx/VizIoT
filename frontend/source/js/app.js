import { startSlidingWindowStream, stopSlidingWindowStream } from './slidingWindow.js';

// Function to display a message
function showMessage(message, type = 'info') {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('d-none');
    alertBox.style.opacity = '1';

    // Hide the alert after 3 seconds
    setTimeout(() => {
        alertBox.style.opacity = '0';
        setTimeout(() => {
            alertBox.classList.add('d-none');
        }, 500);
    }, 2000);
}

// Hide the initial alert
function hideInitialAlert() {
    const initialAlert = document.getElementById('initial-alert');
    initialAlert.style.opacity = '0';
    initialAlert.classList.add('d-none');
}

// Attach event listeners to buttons
document.getElementById('start-button').addEventListener('click', () => {
    const canvasId = 'example-canvas';
    const sensorId = 6; // TODO: Replace with the actual dymanic sensor ID
    startSlidingWindowStream(canvasId, sensorId);
    showMessage('Data stream started successfully!', 'success');
    hideInitialAlert(); // Remove the initial alert when play is pressed
});

document.getElementById('stop-button').addEventListener('click', () => {
    stopSlidingWindowStream();
    showMessage('Streaming of the data stopped.', 'warning');
});

document.getElementById("sensor-slider").addEventListener("input", async (event) => {
    const sensorLimit = parseInt(event.target.value, 10);
    document.getElementById("sensor-slider-label").textContent = `Sensors Visible: ${sensorLimit}`;

    // Fetch data for the specified number of sensors
    const { sensorData } = await fetchSlidingWindowData(db, startTime, endTime, sensorLimit);

    // Update the graph
    updateGraph(sensorData);
});
