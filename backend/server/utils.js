import { fetchSlidingWindowData } from "../database/dataFetching.js";

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
export const startSlidingWindowStream = (res, db, config, startTime, initialLimit) => {
  let endTime = new Date(startTime.getTime() + config.slidingWindowDuration);
  let isPaused = false; // Track the paused state
  let currentLimit = initialLimit; // Track the current sensor limit

  const fetchData = async () => {
    if (isPaused) return;
  
    try {
      const { sensorData, groupSensorMap, stopStream } = await fetchSlidingWindowData(
        db,
        formatDateWithOffset(startTime),
        formatDateWithOffset(endTime),
        currentLimit
      );
  
      if (stopStream) {
        console.log('No more data to fetch. Stopping the stream.');
        clearInterval(fetchIntervalId);
        res.end();
        return;
      }
  
      res.write(`data: ${JSON.stringify({ sensorData, groupSensorMap })}\n\n`);
  
      startTime = new Date(startTime.getTime() + config.windowIncrement);
      endTime = new Date(endTime.getTime() + config.windowIncrement);
    } catch (error) {
      console.error(`Error fetching sliding window data: ${error.message}`);
      clearInterval(fetchIntervalId);
      res.end();
    }
  };  

  const fetchIntervalId = setInterval(fetchData, config.streamInterval);

  // Listen for updates to the sensor limit
  res.on('update-limit', (newLimit) => {
    currentLimit = newLimit; // Update the limit
  });

  res.on('pause', () => {
    console.log('Stream paused.');
    isPaused = true;
  });

  res.on('resume', () => {
    console.log('Stream resumed.');
    isPaused = false;
    fetchData();
  });

  res.on('close', () => {
    console.log('Stream Stopped.');
    clearInterval(fetchIntervalId);
    res.end();
  });

  fetchData();
};
