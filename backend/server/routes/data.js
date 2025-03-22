import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { processAndStore } from "../../database/dataStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

/**
 * Load log data into the database
 * @route GET /api/data
 */
router.get("/", async (req, res) => {
  try {
    const sensorDataFilePath = path.join(
      __dirname,
      "../logs/evaluation/stream_data.json"
    );
    const eventFilePath = path.join(
      __dirname,
      "../logs/evaluation/events.json"
    );
    const yamlFilePath = path.join(
      __dirname,
      "../logs/evaluation/groups.yaml"
    );

    await processAndStore(sensorDataFilePath, eventFilePath, yamlFilePath);

    res.send("Log data successfully loaded into the database.");
  } catch (error) {
    console.error(`Error loading log data: ${error.message}`);
    res.status(500).send("Error loading log data.");
  }
});

export default router;