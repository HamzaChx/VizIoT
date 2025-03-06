import { fetchSlidingWindowData } from "../database/dataFetching.js";
import { formatDateWithOffset } from "../../utils/utilities.js";

/**
 * Utility function to handle sliding window logic
 */
export const startSlidingWindowStream = (res, db, config, startTime, streamData) => {
  let endTime = new Date(startTime.getTime() + config.slidingWindowDuration);

  const fetchData = async () => {
    if (streamData.isPaused) return;

    try {
      const { eventData, sensorData, groupSensorMap, groupIntervals, stopStream } =
        await fetchSlidingWindowData(
          db,
          formatDateWithOffset(startTime),
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

      startTime = new Date(startTime.getTime() + config.windowIncrement);
      endTime = new Date(endTime.getTime() + config.windowIncrement);
    } catch (error) {
      console.error(`Error fetching sliding window data: ${error.message}`);
    }
  };

  const fetchIntervalId = setInterval(fetchData, config.streamInterval);
  res.on("close", () => clearInterval(fetchIntervalId));
  fetchData();
};
