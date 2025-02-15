import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  startSlidingWindowStream,
  formatDateWithOffset,
} from "../server/utils.js";
import { initializeDatabase } from "../database/db.js";
import { processAndStore } from "../database/dataStorage.js";
import { fetchSlidingWindowData } from "../database/dataFetching.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3005;

const SLIDING_WINDOW_CONFIG = {
  slidingWindowDuration: 30 * 1000, // Duration of the window
  windowIncrement: 1000 / 24, // Determines how much time the sliding window moves forward on each increment
  streamInterval: 1000 / 24, // Controls the interval at which updates are sent to the client
};

const activeStreams = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend"), {}));

app.get("/api/config", (req, res) => {
  res.json(SLIDING_WINDOW_CONFIG);
});

app.get("/load-log", async (req, res) => {
  try {
    const sensorDataFilePath = path.join(
      __dirname,
      "logs/sensor_data_stream.json"
    );
    const eventFilePath = path.join(
      __dirname,
      "logs/chess_piece_production_j_result.json"
    );
    const yamlFilePath = path.join(
      __dirname,
      "logs/chess_piece_production.yaml"
    );

    await processAndStore(sensorDataFilePath, eventFilePath, yamlFilePath);

    res.send("Log data successfully loaded into the database.");
  } catch (error) {
    console.error(`Error loading log data: ${error.message}`);
    res.status(500).send("Error loading log data.");
  }
});

app.post("/update-limit", (req, res) => {
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

app.get("/update-paused-data", async (req, res) => {
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
      events: data.events || [],
      sensorData: data.sensorData || [],
      groupSensorMap: data.groupSensorMap || {},
    });
  } catch (error) {
    console.error("Error updating paused data:", error);
    res.status(500).json({ error: "Error updating paused data" });
  }
});

app.post("/pause-stream", (req, res) => {
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

app.post("/resume-stream", (req, res) => {
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

app.get("/stream-sliding-window", async (req, res) => {
  try {
    const db = await initializeDatabase();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const startQuery = req.query.start;
    const limit = parseInt(req.query.limit, 10) || 1;
    const startTime = startQuery
      ? new Date(startQuery)
      : new Date("2023-04-28T17:01:02.00+02:00");

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

app.put("/api/events/importance", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { timestamp_id, is_important } = req.body;
    
    await db.run(
      `UPDATE EventTimestamps 
       SET is_important = ?
       WHERE timestamp_id = ?`,
      [is_important, timestamp_id]
    );
    
    res.status(200).json({
      message: "Event importance updated successfully",
      is_important
    });
  } catch (error) {
    console.error(`Error updating event importance: ${error.message}`);
    res.status(500).json({ error: "Failed to update event importance" });
  }
});

app.get("/api/annotations/:timestampId", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { timestampId } = req.params;
    
    const annotations = await db.all(
      `SELECT * FROM EventAnnotations 
       WHERE timestamp_id = ? 
       ORDER BY created_at DESC`,
      [timestampId]
    );
    
    res.json(annotations);
  } catch (error) {
    console.error(`Error fetching annotations: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

app.post("/api/annotations", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { timestamp_id, annotation } = req.body;
    
    await db.run(
      `INSERT INTO EventAnnotations (timestamp_id, annotation)
       VALUES (?, ?)`,
      [timestamp_id, annotation]
    );
    
    const annotations = await db.all(
      `SELECT * FROM EventAnnotations 
       WHERE timestamp_id = ? 
       ORDER BY created_at DESC`,
      [timestamp_id]
    );
    
    res.status(201).json(annotations);
  } catch (error) {
    console.error(`Error creating annotation: ${error.message}`);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

app.delete("/api/annotations/:annotationId", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { annotationId } = req.params;
    
    await db.run(
      `DELETE FROM EventAnnotations 
       WHERE annotation_id = ?`,
      [annotationId]
    );
    
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting annotation: ${error.message}`);
    res.status(500).json({ error: "Failed to delete annotation" });
  }
});

app.get("/api/sensors", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const sensors = await db.all("SELECT * FROM Sensors");
    res.json(sensors);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching sensors.");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
