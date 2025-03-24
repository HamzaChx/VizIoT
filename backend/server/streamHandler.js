import { fetchSlidingWindowData } from "../database/dataFetching.js";
import { formatDateWithOffset } from "../../utils/utilities.js";

/**
 * Creates a Server-Sent Events stream that sends data packets using a sliding time window
 * 
 * @param {Object} res - Express response object for SSE
 * @param {Object} db - Database connection
 * @param {Object} config - Configuration with slidingWindowDuration and windowIncrement
 * @param {Date} startTime - Initial window start time
 * @param {Object} streamData - Stream state containing isPaused and currentLimit
 */
export const startSlidingWindowStream = (res, db, config, startTime, streamData) => {

  let currentTime = startTime;
  let endTime = new Date(currentTime.getTime() + config.slidingWindowDuration);

  const fetchData = async () => {
    if (streamData.isPaused) return;

    try {
      const { eventData, sensorData, groupSensorMap, groupIntervals, stopStream } =
        await fetchSlidingWindowData(
          db,
          formatDateWithOffset(currentTime),
          formatDateWithOffset(endTime),
          streamData.currentLimit
        );

      if (stopStream) {
        res.write("event: close\ndata: {}\n\n");
        res.end();
        return;
      }

      res.write(
        `data: ${JSON.stringify({ eventData, sensorData, groupSensorMap, groupIntervals })}\n\n`
      );

      if (streamData.initialFetch) {
        streamData.initialFetch = false;
      } else {
        currentTime = new Date(currentTime.getTime() + config.windowIncrement);
        endTime = new Date(endTime.getTime() + config.windowIncrement);
      }
    } catch (error) {
      console.error(`Error fetching sliding window data: ${error.message}`);
    }
  };

  streamData.initialFetch = true;

  const fetchIntervalId = setInterval(fetchData, config.streamInterval);
  streamData.fetchIntervalId = fetchIntervalId;
  
  res.on("close", () => {
    clearInterval(fetchIntervalId);
    streamData.fetchIntervalId = null;
  });
  
  fetchData();
};
