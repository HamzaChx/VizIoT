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
 * Utility function to handle sliding window logic for all sensors.
 */
export const startSlidingWindowStream = (res, db, config) => {
    let startTime = new Date('2023-04-28T17:01:02.00+02:00'); // Static start time
    let endTime = new Date(startTime.getTime() + config.slidingWindowDuration);

    const fetchData = async () => {
        try {
            const { sensorData } = await database.fetchSlidingWindowData(
                db,
                formatDateWithOffset(startTime),
                formatDateWithOffset(endTime)
            );

            if (sensorData && sensorData.length > 0) {
                res.write(`data: ${JSON.stringify({ sensorData })}\n\n`);
            } else {
                res.write('data: { "message": "No new data" }\n\n');
            }

            // Update sliding window
            startTime = new Date(startTime.getTime() + config.windowIncrement);
            endTime = new Date(endTime.getTime() + config.windowIncrement);
        } catch (error) {
            console.error(`Error fetching sliding window data: ${error.message}`);
        }
    };

    // Start the fetch interval
    const fetchIntervalId = setInterval(fetchData, config.streamInterval);

    // Stop streaming when client disconnects
    res.on('close', () => {
        console.log('Client disconnected. Cleaning up stream.');
        clearInterval(fetchIntervalId); // Stop fetching data
        res.end(); // End the response stream
    });

    // Fetch the first batch immediately
    fetchData();
};
