import { fetchSlidingWindowData } from "../database/dataFetching.js";

/**
 * Utility function to format a date string with offset.
 */
export function formatDateWithOffset(date) {
  const offset = -date.getTimezoneOffset();
  const absOffsetHours = Math.abs(Math.floor(offset / 60))
    .toString()
    .padStart(2, "0");
  const absOffsetMinutes = Math.abs(offset % 60)
    .toString()
    .padStart(2, "0");
  const sign = offset >= 0 ? "+" : "-";

  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}T${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}.${date
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}${sign}${absOffsetHours}:${absOffsetMinutes}`;
}

/**
 * Utility function to handle sliding window logic for all sensors.
 */
export const startSlidingWindowStream = (
  res,
  db,
  config,
  startTime,
  streamData
) => {
  let endTime = new Date(startTime.getTime() + config.slidingWindowDuration);

  const fetchData = async () => {
    if (streamData.isPaused) return;

    try {
      const { events, sensorData, groupSensorMap, stopStream } =
        await fetchSlidingWindowData(
          db,
          formatDateWithOffset(startTime),
          formatDateWithOffset(endTime),
          streamData.currentLimit
        );

      if (stopStream || !sensorData.length) {
        console.log("No more data available. Closing stream.");
        res.write("event: close\ndata: {}\n\n");
        res.end();
        return;
      }

      res.write(
        `data: ${JSON.stringify({ events, sensorData, groupSensorMap })}\n\n`
      );

      startTime = new Date(startTime.getTime() + config.windowIncrement);
      endTime = new Date(endTime.getTime() + config.windowIncrement);
    } catch (error) {
      console.error(`Error fetching sliding window data: ${error.message}`);
    }
  };

  const fetchIntervalId = setInterval(fetchData, config.streamInterval);

  res.on("close", () => {
    console.log("Stream Stopped.");
    clearInterval(fetchIntervalId);
  });

  fetchData();
};
