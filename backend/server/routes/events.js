import express from "express";
import { initializeDatabase } from "../../database/db.js";
import { EVENT_QUERIES } from "../../database/queries/index.js";

const router = express.Router();

/**
 * Update event importance
 * @route PUT /api/events/importance
 */
router.put("/importance", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { timestamp_id, is_important } = req.body;
    
    const query = EVENT_QUERIES.UPDATE_IMPORTANCE;
    
    await db.run(query, [is_important, timestamp_id]);
    
    res.status(200).json({
      message: "Event importance updated successfully",
      is_important
    });
  } catch (error) {
    console.error(`Error updating event importance: ${error.message}`);
    res.status(500).json({ error: "Failed to update event importance" });
  }
});

export default router;