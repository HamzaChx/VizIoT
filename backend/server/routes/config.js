import express from 'express';
import { getActiveDatabase } from '../../database/db.js';

const router = express.Router();

const DATABASE_NAMES = {
  "evaluation": "Smart Home Sensors",
  "chess": "Chess Piece Production"
};

/**
 * Get current database information
 * @route GET /api/config/database
 * @returns {Object} Current database and available databases
 */
router.get('/database', (req, res) => {
  res.json({ 
    current: getActiveDatabase(),
    databases: DATABASE_NAMES
  });
});

export default router;