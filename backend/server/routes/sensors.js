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

export default router;