import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import database from './database.js';
import { startSlidingWindowStream } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Configurations
const SLIDING_WINDOW_CONFIG = {
  slidingWindowDuration: 30 * 1000, 
  windowIncrement: (1000 / 24), // Determines how much time the sliding window moves forward on each increment
  streamInterval: (1000 / 24), // Controls the interval at which updates are sent to the client
};

// Enable CORS to allow requests from the frontend
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'), {}));

// Endpoint to load log data into the database
app.get('/load-log', async (req, res) => {
  try {
    const sensorDataFilePath = path.join(__dirname, 'data/sensor_data_stream.json');
    const eventFilePath = path.join(__dirname, 'data/chess_piece_production_j_result.json');
    const yamlFilePath = path.join(__dirname, 'data/chess_piece_production.yaml');

    await database.processAndStore(sensorDataFilePath, eventFilePath, yamlFilePath);

    res.send('Log data successfully loaded into the database.');
  } catch (error) {
    console.error(`Error loading log data: ${error.message}`);
    res.status(500).send('Error loading log data.');
  }
});

// Endpoint for SSE stream with sliding window
app.get('/stream-sliding-window', async (req, res) => {
  try {
      const db = await database.initializeDatabase();
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      startSlidingWindowStream(res, db, SLIDING_WINDOW_CONFIG);
  } catch (error) {
      console.error(`Error initializing database: ${error.message}`);
      res.status(500).send('Failed to initialize database');
  }
});


// Endpoint to get all sensors
app.get('/api/sensors', async (req, res) => {
  try {
    const db = await database.initializeDatabase();
    const sensors = await db.all('SELECT * FROM Sensors');
    res.json(sensors);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching sensors.');
  }
});

// Endpoint to get events for a specific sensor
app.get('/api/sensors/:id/events', async (req, res) => {
  try {
    const db = await database.initializeDatabase();
    const sensorId = req.params.id;
    const events = await db.all('SELECT * FROM event WHERE sensor_id = ?', [sensorId]);
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching events.');
  }
});

// Serve the index.html for the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
