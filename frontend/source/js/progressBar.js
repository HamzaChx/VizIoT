let progressBarInterval = null; // Interval for updating the progress bar
let streamStartTime = null; // To track the start of the stream
let SLIDING_WINDOW_CONFIG = null; // Configuration for the sliding window

async function fetchStreamConfig() {
    try {
        const response = await fetch('/api/config', { method: 'GET' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch stream configuration:', error.message);
        throw error;
    }
}

SLIDING_WINDOW_CONFIG = await fetchStreamConfig();

/**
 * Starts the loading bar progress update.
 */
function startLoadingBar() {

    const progressBar = document.getElementById('progress-bar');
    const elapsedTimeElement = document.getElementById('elapsed-time');
    const remainingTimeElement = document.getElementById('remaining-time');
    const slidingWindowDuration = SLIDING_WINDOW_CONFIG.slidingWindowDuration;

    // Record the stream start time
    streamStartTime = Date.now();

    // Update progress bar and time labels at regular intervals
    progressBarInterval = setInterval(() => {
        const elapsedTime = Date.now() - streamStartTime;
        const progress = Math.min((elapsedTime / slidingWindowDuration) * 100, 100); // Cap progress at 100%

        // Update progress bar width and aria attributes
        progressBar.style.width = progress + '%';
        progressBar.setAttribute('aria-valuenow', Math.floor(progress));

        // Update time labels
        elapsedTimeElement.textContent = formatTime(elapsedTime / 1000);
        remainingTimeElement.textContent = formatTime((slidingWindowDuration - elapsedTime) / 1000);

        // Reset if the progress reaches 100% (optional looping effect)
        if (progress >= 100) {
            streamStartTime = Date.now(); // Reset the start time for continuous visualization
        }
    }, SLIDING_WINDOW_CONFIG.streamInterval);
}

/**
 * Stops the loading bar progress update.
 */
function stopLoadingBar() {
    clearInterval(progressBarInterval);
    progressBarInterval = null;

    // Reset progress bar and labels
    const progressBar = document.getElementById('progress-bar');
    const elapsedTimeElement = document.getElementById('elapsed-time');
    const remainingTimeElement = document.getElementById('remaining-time');

    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');
    elapsedTimeElement.textContent = '00:00';
    remainingTimeElement.textContent = formatTime(SLIDING_WINDOW_CONFIG.slidingWindowDuration / 1000);
}

/**
 * Formats time in seconds to MM:SS format.
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export { startLoadingBar, stopLoadingBar };