import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { startSlidingWindowStream } from "../server/utils.js";
import { initializeDatabase } from "../database/db.js";
import { processAndStore } from "../database/dataStorage.js";

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

app.post('/update-limit', (req, res) => {
    const newLimit = parseInt(req.body.limit, 10);
    if (isNaN(newLimit) || newLimit <= 0) {
        return res.status(400).send("Invalid limit value");
    }

    activeStreams.forEach((streamData, stream) => {
        streamData.currentLimit = newLimit;
        stream.write(`event: update-limit\ndata: ${JSON.stringify({ limit: newLimit })}\n\n`);
    });

    res.status(200).send("Limit updated");
});

app.post('/pause-stream', (req, res) => {
    const stream = Array.from(activeStreams.keys()).find((stream) => stream.req.ip === req.ip);
    if (stream) {
        const streamData = activeStreams.get(stream);
        streamData.isPaused = true;
        res.status(200).send("Stream paused");
        console.log('Stream paused');
    } else {
        res.status(404).send("Stream not found");
    }
});

app.post('/resume-stream', (req, res) => {
    const stream = Array.from(activeStreams.keys()).find((stream) => stream.req.ip === req.ip);
    if (stream) {
        const streamData = activeStreams.get(stream);
        streamData.isPaused = false;
        res.status(200).send("Stream resumed");
    } else {
        res.status(404).send("Stream not found");
    }
});

app.get('/stream-sliding-window', async (req, res) => {
    try {
        const db = await initializeDatabase();

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const startQuery = req.query.start;
        const limit = parseInt(req.query.limit, 10) || 1;
        const startTime = startQuery ? new Date(startQuery) : new Date('2023-04-28T17:01:02.00+02:00');

        const streamData = {
            isPaused: false,
            currentLimit: limit,
        };

        activeStreams.set(res, streamData);

        startSlidingWindowStream(res, db, SLIDING_WINDOW_CONFIG, startTime, streamData);

        res.on('close', () => {
            activeStreams.delete(res);
        });
    } catch (error) {
        console.error(`Error initializing database: ${error.message}`);
        res.status(500).send("Failed to initialize database");
    }
});

app.put("/api/annotations", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { event_id, timestamp_id, timestamp, is_important } = req.body;
        
        await db.run(
            `UPDATE EventTimestamps 
             SET is_important = ?
             WHERE timestamp_id = ? AND event_id = ?`,
            [is_important, timestamp_id, event_id]
        );
        
        res.status(200).send("Annotation updated successfully.");
    } catch (error) {
    console.error(`Error adding annotation: ${error.message}`);
    res.status(500).send("Failed to add annotation.");
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
