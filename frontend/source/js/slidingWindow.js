import { fetchCurrentWindow } from './api.js';
import { preprocessData, plotData } from './plotGraph.js';

let startTime = new Date('2023-04-28T17:01:13.00+02:00');
let endTime = new Date(startTime.getTime() + 40 * 1000);
const windowIncrement = 10 * 1000;
let slidingWindowActive = false;
let slidingWindowTimer = null;
let sensorId = 6;

function formatDateWithOffset(date) {
    const offset = -date.getTimezoneOffset();
    const absOffsetHours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
    const absOffsetMinutes = Math.abs(offset % 60).toString().padStart(2, '0');
    const sign = offset >= 0 ? '+' : '-';

    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}${sign}${absOffsetHours}:${absOffsetMinutes}`;
}

async function requestAndPlotSlidingWindow() {
    if (!slidingWindowActive) return;

    try {
        const tempStartTime = formatDateWithOffset(startTime);
        const tempEndTime = formatDateWithOffset(endTime);

        console.log('Requesting data for window:', { tempStartTime, tempEndTime });

        const data = await fetchCurrentWindow(tempStartTime, tempEndTime, sensorId);

        if (!data || !data.sensorData || (data.sensorData.length === 0 && (!data.processEvents || data.processEvents.length === 0))) {
            console.log('No more data to fetch. Sliding window stopped.');
            slidingWindowActive = false;
            return;
        }

        const { processedData, processEvents = [] } = preprocessData(data);
        plotData(processedData, processEvents);

        startTime = new Date(startTime.getTime() + windowIncrement);
        endTime = new Date(endTime.getTime() + windowIncrement);

        slidingWindowTimer = setTimeout(() => requestAndPlotSlidingWindow(), 8 * 1000);
    } catch (error) {
        console.error('Error in sliding window logic:', error);
    }
}

function startSlidingWindow() {
    if (!slidingWindowActive) {
        slidingWindowActive = true;
        requestAndPlotSlidingWindow();
        console.log('Sliding window started.');
    }
}

function pauseSlidingWindow() {
    slidingWindowActive = false;
    console.log('Sliding window paused.');
}

function stopSlidingWindow() {
    slidingWindowActive = false;
    if (slidingWindowTimer) {
        clearTimeout(slidingWindowTimer);
        slidingWindowTimer = null;
        console.log('Sliding window stopped.');
    }
}

function setupSlidingWindow() {
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const stopButton = document.getElementById('stop-button');

    if (playButton) playButton.addEventListener('click', startSlidingWindow);
    if (pauseButton) pauseButton.addEventListener('click', pauseSlidingWindow);
    if (stopButton) stopButton.addEventListener('click', stopSlidingWindow);

    console.log('Event listeners added for existing buttons.');
}

export { setupSlidingWindow, startSlidingWindow, pauseSlidingWindow, stopSlidingWindow };
