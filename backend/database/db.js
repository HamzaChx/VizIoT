import sqlite3 from "sqlite3";
import { open } from "sqlite";

const CREATE_TABLE_QUERIES = {
  groups: `
    CREATE TABLE IF NOT EXISTS Groups (
      group_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_min REAL,
      group_max REAL
    );
  `,
  sensors: `
    CREATE TABLE IF NOT EXISTS Sensors (
      sensor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT,
      group_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES Groups(group_id) ON DELETE SET NULL
    );
  `,
  sensorData: `
    CREATE TABLE IF NOT EXISTS SensorData (
      data_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      value REAL,
      normalized_value REAL,
      original_value TEXT,
      FOREIGN KEY (sensor_id) REFERENCES Sensors(sensor_id) ON DELETE CASCADE,
      UNIQUE (sensor_id, timestamp)
    );
  `,
  processEvents: `
    CREATE TABLE IF NOT EXISTS ProcessEvents (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id INTEGER,
      name TEXT NOT NULL,
      ranking REAL,
      description TEXT,
      FOREIGN KEY (sensor_id) REFERENCES Sensors(sensor_id) ON DELETE CASCADE
    );
  `,
  eventTimestamps: `
    CREATE TABLE IF NOT EXISTS EventTimestamps (
      timestamp_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES ProcessEvents(event_id)
    );
  `,
};

export async function initializeDatabase() {
  const db = await open({ filename: "./data/sensor_logs.db", driver: sqlite3.Database });
  for (const query of Object.values(CREATE_TABLE_QUERIES)) {
    await db.exec(query);
  }
  return db;
}

export async function executeTransaction(db, operations) {
  try {
    await db.run("BEGIN TRANSACTION");
    await operations();
    await db.run("COMMIT");
  } catch (error) {
    console.error("Transaction failed:", error.message);
    await db.run("ROLLBACK");
  }
}

export async function insertOrUpdate(db, query, params) {
  try {
    await db.run(query, params);
  } catch (error) {
    console.error("Failed to execute query:", query, "with params:", params, error.message);
  }
}
