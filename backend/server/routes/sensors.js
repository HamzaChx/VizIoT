import express from "express";
import { initializeDatabase } from "../../database/db.js";
import { SENSOR_QUERIES } from "../../database/queries/index.js";

const router = express.Router();

/**
 * Get all sensors
 * @route GET /api/sensors
 */
router.get("/", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const sensors = await db.all(SENSOR_QUERIES.GET_ALL);
    res.json(sensors);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching sensors.");
  }
});

/**
 * Get total number of available sensors
 * @route GET /api/sensors/count
 */
router.get("/count", async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    const result = await db.all("SELECT COUNT(DISTINCT sensor_id) as count FROM Sensors");
    
    res.json({ count: result[0].count });
  } catch (error) {
    console.error("Error fetching sensor count:", error);
    res.status(500).json({ error: "Failed to fetch sensor count" });
  }
});

/**
 * GET sensor information including name, ranking, and event count
 */
router.get('/info', async (req, res) => {
  const eventId = parseInt(req.query.id);
  
  if (!eventId || isNaN(eventId)) {
    return res.status(400).json({ error: 'Valid event ID is required' });
  }
  
  try {
    const db = await initializeDatabase();

    // First get the process event info associated with the event_id limit
    const processEventInfo = await db.get(`
      SELECT pe.event_id, pe.sensor_id, pe.name as event_name, pe.ranking
      FROM ProcessEvents pe
      WHERE pe.event_id = ?
    `, [eventId]);
    
    if (!processEventInfo) {
      return res.status(404).json({ error: 'Process event not found' });
    }
    
    // Get the associated sensor information
    const sensorInfo = await db.get(`
      SELECT s.name as sensor_name, s.type
      FROM Sensors s
      WHERE s.sensor_id = ?
    `, [processEventInfo.sensor_id]);
    
    if (!sensorInfo) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    
    // Get count of event timestamps for this process event
    const eventTimestampCount = await db.get(`
      SELECT COUNT(*) as timestamp_count
      FROM EventTimestamps et
      WHERE et.event_id = ?
    `, [eventId]);
    
    // Combine all information
    const result = {
      event_id: processEventInfo.event_id,
      sensor_id: processEventInfo.sensor_id,
      event_name: processEventInfo.event_name,
      sensor_name: sensorInfo.sensor_name,
      type: sensorInfo.type,
      ranking: processEventInfo.ranking || 0,
      event_count: eventTimestampCount?.timestamp_count || 0
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching sensor info:', error);
    res.status(500).json({ error: 'Failed to fetch sensor information' });
  }
});

export default router;