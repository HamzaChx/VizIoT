import express from "express";
import { initializeDatabase } from "../../database/db.js";
import { fetchSlidingWindowData } from "../../database/dataFetching.js";
import { startSlidingWindowStream } from "../streamHandler.js";
import { formatDateWithOffset } from "../../../utils/utilities.js";

const router = express.Router();

// Configuration for sliding window
export const SLIDING_WINDOW_CONFIG = {
  slidingWindowDuration: 30 * 1000, // Duration of the window
  windowIncrement: 500, // Determines how much time the sliding window moves forward on each increment
  streamInterval: 100, // Controls the interval at which updates are sent to the client
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
 * Start a sliding window data stream
 * @route GET /api/streaming/window
 */
router.get("/window", async (req, res) => {
  try {
    const db = await initializeDatabase();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const startQuery = req.query.start;
    const limit = parseInt(req.query.limit, 10) || 1;
    const startTime = startQuery
      ? new Date(startQuery)
      : new Date("2025-03-21T07:00:00.50+02:00");

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

export default router;