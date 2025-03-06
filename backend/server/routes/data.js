import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { processAndStore } from "../../database/dataStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

/**
 * Load log data into the database
 * @route GET /api/data/load
 */
router.get("/load", async (req, res) => {
  try {
    const sensorDataFilePath = path.join(
      __dirname,
      "../logs/sensor_data_stream.json"
    );
    const eventFilePath = path.join(
      __dirname,
      "../logs/chess_piece_production_j_result.json"
    );
    const yamlFilePath = path.join(
      __dirname,
      "../logs/chess_piece_production.yaml"
    );

    await processAndStore(sensorDataFilePath, eventFilePath, yamlFilePath);

    res.send("Log data successfully loaded into the database.");
  } catch (error) {
    console.error(`Error loading log data: ${error.message}`);
    res.status(500).send("Error loading log data.");
  }
});

export default router;