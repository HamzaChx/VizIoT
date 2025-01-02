import { fetchSlidingWindowDataIntervals } from "../database/dataFetching.js";
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
export const startSlidingWindowStream = (res, config) => {
  let startTime = new Date('2023-04-28T17:00:12.79+02:00'); // Static start time
  let endTime = new Date(startTime.getTime() + config.slidingWindowDuration);

  const fetchData = async () => {
    try {
      // Fetch preloaded data for the current window with intervals
      const { sensorData, stopStream } = await fetchSlidingWindowDataIntervals(
        formatDateWithOffset(startTime),
        formatDateWithOffset(endTime)
      );

      if (stopStream) {
        console.log('No more data to fetch. Stopping the stream.');
        clearInterval(fetchIntervalId); // Stop the interval when data is empty
        res.end();
        return;
      }

      // Send the data to the client
      res.write(`data: ${JSON.stringify({ sensorData })}\n\n`);

      // Increment the window
      startTime = new Date(startTime.getTime() + config.windowIncrement);
      endTime = new Date(endTime.getTime() + config.windowIncrement);
    } catch (error) {
      console.error(`Error fetching sliding window data: ${error.message}`);
      clearInterval(fetchIntervalId); // Stop the interval on error
      res.end();
    }
  };

  // Start the fetch interval
  const fetchIntervalId = setInterval(fetchData, config.streamInterval);

  // Stop streaming when client disconnects
  res.on('close', () => {
    console.log('Client disconnected. Cleaning up stream.');
    clearInterval(fetchIntervalId);
    res.end();
  });

  // Fetch the first batch immediately
  fetchData();
};
