import database from './database.js';

/**
 * Utility function to format a date string with offset.
 */
function formatDateWithOffset(date) {
    const offset = -date.getTimezoneOffset();
    const absOffsetHours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
    const absOffsetMinutes = Math.abs(offset % 60).toString().padStart(2, '0');
    const sign = offset >= 0 ? '+' : '-';

    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}${sign}${absOffsetHours}:${absOffsetMinutes}`;
}

/**
 * Utility function to handle sliding window logic.
 */
export const startSlidingWindowStream = (res, db, sensorId, config) => {
    let startTime = new Date('2023-04-28T17:01:02.00+02:00'); // TODO: Change to be a dynamic start time
    let endTime = new Date(startTime.getTime() + config.slidingWindowDuration);
    let dataBuffer = []; // Buffer for received data

    // Fetch data and update the buffer
    const fetchData = async () => {
        try {
            const { sensorData } = await database.fetchSlidingWindowData(
                db,
                formatDateWithOffset(startTime),
                formatDateWithOffset(endTime),
                sensorId
            );

            if (sensorData && sensorData.length > 0) {
                dataBuffer.push(...sensorData); // Add new data to the buffer
            }

            // Update sliding window
            startTime = new Date(startTime.getTime() + config.windowIncrement);
            endTime = new Date(endTime.getTime() + config.windowIncrement);
        } catch (error) {
            console.error(`Error fetching sliding window data: ${error.message}`);
        }
    };

    // Send data from the buffer
    const sendData = () => {
        if (dataBuffer.length > 0) {
            res.write(`data: ${JSON.stringify({ sensorData: dataBuffer })}\n\n`);
            dataBuffer = []; // Clear buffer after sending
        } else {
            res.write('data: { "message": "No new data" }\n\n'); // Send empty update
        }
    };

    // Start fetch and send intervals
    const fetchIntervalId = setInterval(fetchData, config.windowIncrement);
    const sendIntervalId = setInterval(sendData, config.streamInterval);

    // Stop streaming when client disconnects
    res.on('close', () => {
        console.log(`Client disconnected for sensor ID: ${sensorId}`);
        clearInterval(fetchIntervalId);
        clearInterval(sendIntervalId);
        res.end();
    });

    // Fetch the first batch immediately
    fetchData();
    // Send the first batch immediately
    sendData();
};
