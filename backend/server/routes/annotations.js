import express from "express";
import { initializeDatabase } from "../../database/db.js";
import { ANNOTATION_QUERIES } from "../../database/queries/index.js";

const router = express.Router();

/**
 * Get all annotations
 * @route GET /api/annotations
 */
router.get("/", async (req, res) => {
  try {
    const db = await getActiveDb();
    const query = ANNOTATION_QUERIES.FETCH_ALL;
    
    const annotations = await db.all(query);
    
    res.json(annotations);
  } catch (error) {
    console.error(`Error fetching all annotations: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

/**
 * Get annotations for a timestamp
 * @route GET /api/annotations/:timestampId
 */
router.get("/:timestampId", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { timestampId } = req.params;
    
    const query = ANNOTATION_QUERIES.FETCH_BY_TIMESTAMP;
    
    const annotations = await db.all(query, [timestampId]);
    
    res.json(annotations);
  } catch (error) {
    console.error(`Error fetching annotations: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

/**
 * Create a new annotation
 * @route POST /api/annotations
 */
router.post("/", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { timestamp_id, annotation } = req.body;
    
    const insertQuery = ANNOTATION_QUERIES.INSERT ;
    
    await db.run(insertQuery, [timestamp_id, annotation]);
    
    const fetchQuery = ANNOTATION_QUERIES.FETCH_BY_TIMESTAMP;
    
    const annotations = await db.all(fetchQuery, [timestamp_id]);
    
    res.status(201).json(annotations);
  } catch (error) {
    console.error(`Error creating annotation: ${error.message}`);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

/**
 * Delete an annotation
 * @route DELETE /api/annotations/:annotationId
 */
router.delete("/:annotationId", async (req, res) => {
  try {
    const db = await initializeDatabase();
    const { annotationId } = req.params;
    
    const query = ANNOTATION_QUERIES.DELETE;
    
    await db.run(query, [annotationId]);
    
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting annotation: ${error.message}`);
    res.status(500).json({ error: "Failed to delete annotation" });
  }
});

export default router;