import express from "express";
import { initializeDatabase } from "../../database/db.js";
import { fetchSlidingWindowData, getFirstAvailableTimestamp } from "../../database/dataFetching.js";
import { startSlidingWindowStream } from "../streamHandler.js";
import { formatDateWithOffset } from "../../../utils/utilities.js";

const router = express.Router();

// Configuration for sliding window
export const SLIDING_WINDOW_CONFIG = {
  slidingWindowDuration: 30 * 1000, // Duration of the window
  windowIncrement: 500, // Determines how much time the sliding window moves forward on each increment
  streamInterval: 42, // Controls the interval at which updates are sent to the client
};

export const activeStreams = new Map();

/**
 * Get streaming configuration
 * @route GET /api/streaming/config
 */
router.get("/config", (req, res) => {
  res.json(SLIDING_WINDOW_CONFIG);
});

/**
 * Update streaming configuration
 * @route PUT /api/streaming/config
 */
router.put("/config", (req, res) => {
  const { slidingWindowDuration, windowIncrement, streamInterval } = req.body;

  if (
    typeof slidingWindowDuration !== "number" ||
    typeof windowIncrement !== "number" ||
    typeof streamInterval !== "number"
  ) {
    return res.status(400).send("Invalid configuration values");
  }

  SLIDING_WINDOW_CONFIG.slidingWindowDuration = slidingWindowDuration;
  SLIDING_WINDOW_CONFIG.windowIncrement = windowIncrement;
  SLIDING_WINDOW_CONFIG.streamInterval = streamInterval;

  res.status(200).send("Configuration updated");
});


/**
 * Update sensor limit for all active streams
 * @route PUT /api/streaming/limit
 */
router.put("/limit", (req, res) => {
  const newLimit = parseInt(req.body.limit, 10);
  if (isNaN(newLimit) || newLimit <= 0) {
    return res.status(400).send("Invalid limit value");
  }

  activeStreams.forEach((streamData, stream) => {
    streamData.currentLimit = newLimit;
    stream.write(
      `event: update-limit\ndata: ${JSON.stringify({ limit: newLimit })}\n\n`
    );
  });

  res.status(200).send("Limit updated");
});

/**
 * Get data for a specific timestamp when paused
 * @route GET /api/streaming/paused-data
 */
router.get("/paused-data", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const limit = parseInt(req.query.limit, 10);
    const timestamp = decodeURIComponent(req.query.timestamp);

    if (!timestamp || isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const endTime = new Date(timestamp);
    const startTime = new Date(
      endTime.getTime() - SLIDING_WINDOW_CONFIG.slidingWindowDuration
    );

    const end = formatDateWithOffset(endTime);
    const start = formatDateWithOffset(startTime);

    const data = await fetchSlidingWindowData(db, start, end, limit);

    res.json({
      eventData: data.eventData || [],
      sensorData: data.sensorData || [],
      groupSensorMap: data.groupSensorMap || {},
      groupIntervals: data.groupIntervals || {},
    });
  } catch (error) {
    console.error("Error updating paused data:", error);
    res.status(500).json({ error: "Error updating paused data" });
  }
});

/**
 * Pause an active stream
 * @route PUT /api/streaming/pause
 */
router.put("/pause", (req, res) => {
  const stream = Array.from(activeStreams.keys()).find(
    (stream) => stream.req.ip === req.ip
  );
  if (stream) {
    const streamData = activeStreams.get(stream);
    streamData.isPaused = true;
    res.status(200).send("Stream paused");
    console.log("Stream paused");
  } else {
    res.status(404).send("Stream not found");
  }
});

/**
 * Resume a paused stream
 * @route PUT /api/streaming/resume
 */
router.put("/resume", (req, res) => {
  const stream = Array.from(activeStreams.keys()).find(
    (stream) => stream.req.ip === req.ip
  );
  if (stream) {
    const streamData = activeStreams.get(stream);
    streamData.isPaused = false;
    res.status(200).send("Stream resumed");
  } else {
    res.status(404).send("Stream not found");
  }
});

/**
 * Stop an active stream
 * @route PUT /api/streaming/stop
 */
router.put("/stop", (req, res) => {
  const stream = Array.from(activeStreams.keys()).find(
    (stream) => stream.req.ip === req.ip
  );
  
  if (stream) {
    const streamData = activeStreams.get(stream);

    if (streamData.fetchIntervalId) {
      clearInterval(streamData.fetchIntervalId);
      streamData.fetchIntervalId = null;
    }
    
    stream.write('event: close\ndata: {"reason": "user-initiated"}\n\n');

    activeStreams.delete(stream);
    
    res.status(200).send("Stream stopped");
  } else {
    res.status(404).send("Stream not found");
  }
});

/**
 * Start a sliding window data stream
 * @route GET /api/streaming/window
 */
router.get("/window", async (req, res) => {
  try {
    const db = await initializeDatabase();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const limit = parseInt(req.query.limit, 10) || 1;
    const firstTimestamp = await getFirstAvailableTimestamp(db, limit);
    const startTime = new Date(firstTimestamp);

    const streamData = {
      isPaused: false,
      currentLimit: limit,
    };

    activeStreams.set(res, streamData);

    startSlidingWindowStream(
      res,
      db,
      SLIDING_WINDOW_CONFIG,
      startTime,
      streamData
    );

    res.on("close", () => {
      activeStreams.delete(res);
    });
  } catch (error) {
    console.error(`Error initializing database: ${error.message}`);
    res.status(500).send("Failed to initialize database");
  }
});

/**
* Rewind to a specific timestamp offset
* @route PUT /api/streaming/rewind
*/
router.put("/rewind", async (req, res) => {
  try {
    const { offsetSeconds } = req.body;
    
    if (typeof offsetSeconds !== "number" || offsetSeconds < 0) {
      return res.status(400).send("Invalid time offset");
    }
    
    const stream = Array.from(activeStreams.keys()).find(
      (stream) => stream.req.ip === req.ip
    );
    
    if (!stream) {
      return res.status(404).send("Stream not found");
    }
    
    const db = await initializeDatabase();
    const streamData = activeStreams.get(stream);
    const firstTimestamp = await getFirstAvailableTimestamp(db, streamData.currentLimit);
    const baseStartTime = new Date(firstTimestamp);
    
    const targetTime = new Date(baseStartTime.getTime() + (offsetSeconds * 1000));
    
    streamData.isPaused = false;
    streamData.initialFetch = true;
    
    if (streamData.fetchIntervalId) {
      clearInterval(streamData.fetchIntervalId);
    }
    
    startSlidingWindowStream(
      stream,
      await initializeDatabase(),
      SLIDING_WINDOW_CONFIG,
      targetTime,
      streamData
    );
    
    stream.write(`event: rewind\ndata: ${JSON.stringify({ 
      originalStartTime: baseStartTime.toISOString(),
      targetTime: targetTime.toISOString(),
      offsetSeconds
    })}\n\n`);
    
    res.status(200).send("Stream position updated");
  } catch (error) {
    console.error("Error updating stream position:", error);
    res.status(500).send("Failed to update stream position");
  }
 });

export default router;