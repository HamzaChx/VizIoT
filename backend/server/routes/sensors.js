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

export default router;