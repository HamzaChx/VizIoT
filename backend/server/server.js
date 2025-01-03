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

// Enable CORS to allow requests from the frontend
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend"), {}));

// Configurations
const SLIDING_WINDOW_CONFIG = {
  slidingWindowDuration: 30 * 1000, // Duration of the window
  windowIncrement: 1000 / 24, // Determines how much time the sliding window moves forward on each increment
  streamInterval: 1000 / 24, // Controls the interval at which updates are sent to the client
};

app.get("/api/config", (req, res) => {
  res.json(SLIDING_WINDOW_CONFIG);
});

// Endpoint to load log data into the database
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

// Endpoint to update the sensor limit dynamically
app.post('/update-limit', (req, res) => {
  const newLimit = parseInt(req.body.limit, 10);
  if (isNaN(newLimit) || newLimit <= 0) {
    return res.status(400).send('Invalid limit value');
  }

  console.log(`Updating sensor limit to: ${newLimit}`);
  // Notify all active streams about the new limit
  activeStreams.forEach((stream) => {
    stream.emit('update-limit', newLimit);
  });

  res.status(200).send('Limit updated');
});

const activeStreams = new Set();

app.get('/stream-sliding-window', async (req, res) => {
  try {
    const db = await initializeDatabase();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    activeStreams.add(res); // Add the response to the active streams set

    const startQuery = req.query.start;
    const limit = parseInt(req.query.limit, 10) || 1;
    const startTime = startQuery ? new Date(startQuery) : new Date('2023-04-28T17:00:12.79+02:00');

    startSlidingWindowStream(res, db, SLIDING_WINDOW_CONFIG, startTime, limit);

    res.on('close', () => {
      console.log('Client disconnected. Cleaning up stream.');
      activeStreams.delete(res); // Remove the response from the active streams set
      res.end();
    });
  } catch (error) {
    console.error(`Error initializing database: ${error.message}`);
    res.status(500).send('Failed to initialize database');
  }
});

// Endpoint to get all sensors
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

// Serve the index.html for the frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
