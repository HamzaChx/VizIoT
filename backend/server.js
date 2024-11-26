import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import database from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS to allow requests from the frontend
app.use(cors());
app.use(express.json());

// Serve the frontend files with MIME type handling
app.use(express.static(path.join(__dirname, '../frontend'), {}));


app.get('/load-log', async (req, res) => {
  try {
    const sensorDataFilePath = path.join(__dirname, 'data/sensor_data_stream.json');
    const eventFilePath = path.join(__dirname, 'data/chess_piece_production_j_result.json');

    await database.processAndStore(sensorDataFilePath, eventFilePath);

    res.send('Log data successfully loaded into the database.');
  } catch (error) {
    console.error(`Error loading log data: ${error.message}`);
    res.status(500).send('Error loading log data.');
  }
});

// (async () => {
//   sensorSequence = await database.getSensorSequence(resultFilePath);
// })();

app.get('/data/sliding-window', async (req, res) => {
  const { start, end, sensor_id } = req.query;

  if (!start || !end) {
      return res.status(400).send('Start and end times are required.');
  }

  try {
      const db = await database.initializeDatabase();
      const sensorId = sensor_id ? parseInt(sensor_id, 10) : null; // Convert sensor_id to integer if provided
      const { sensorData } = await database.fetchSlidingWindowData(db, start, end, sensorId);

      res.json({ sensorData });
  } catch (error) {
      console.error(`Error fetching sliding window data: ${error.message}`);
      res.status(500).send('Error fetching data.');
  }
});

// Endpoint to get all sensors
app.get('/sensors', async (req, res) => {
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
app.get('/sensors/:id/events', async (req, res) => {
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
