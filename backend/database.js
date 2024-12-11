import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs/promises";

async function initializeDatabase() {
  const db = await open({
    filename: "./data/sensor_logs.db",
    driver: sqlite3.Database,
  });

  // Create 'Sensors' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Sensors (
      sensor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // Create 'SensorData' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS SensorData (
      data_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      value REAL,
      FOREIGN KEY (sensor_id) REFERENCES Sensors(sensor_id) ON DELETE CASCADE,
      UNIQUE (sensor_id, timestamp)
    );
  `);

  // Create 'ProcessEvents' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ProcessEvents (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id INTEGER,
      name TEXT NOT NULL,
      ranking REAL,
      description TEXT,
      FOREIGN KEY (sensor_id) REFERENCES Sensors(sensor_id) ON DELETE CASCADE
    );
  `);

  // Create 'EventTimestamps' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS EventTimestamps (
      timestamp_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES ProcessEvents(event_id)
    );
  `);

  return db;
}

async function storeSensorData(sensorData) {
  const db = await initializeDatabase();

  // Helper function to parse binary strings
  function parseBinary(value) {
      const binaryMapping = {
          "close": 0, "open": 1,
          "true": 1, "false": 0,
          "active": 1, "inactive": 0
      };
      const normalizedValue = value?.toLowerCase();
      return binaryMapping[normalizedValue] !== undefined ? binaryMapping[normalizedValue] : null;
  }

  // Helper function to label encode strings
  const stringLabelMap = new Map(); // Global map for consistent label encoding
  function labelEncode(value) {
      if (!stringLabelMap.has(value)) {
          stringLabelMap.set(value, stringLabelMap.size + 1);
      }
      return stringLabelMap.get(value);
  }

  try {
      await db.run("BEGIN TRANSACTION");

      for (const [sensorName, dataPoints] of sensorData) {
          // Insert or ignore sensor name
          await db.run("INSERT OR IGNORE INTO Sensors (name) VALUES (?)", [sensorName]);

          // Get sensor_id
          const sensor = await db.get("SELECT sensor_id FROM Sensors WHERE name = ?", [sensorName]);
          if (!sensor) {
              console.warn(`Sensor ${sensorName} could not be retrieved or created.`);
              continue;
          }
          const { sensor_id } = sensor;

          // Process and insert data points
          for (const [timestamp, value] of Object.entries(dataPoints)) {
              let processedValue = value;

              if (value === null || value === undefined) {
                  continue;
              }

              if (typeof value === "string") {
                  processedValue = parseBinary(value);
                  if (processedValue === null) {
                      processedValue = labelEncode(value);
                  }
              }

              try {
                  // Use INSERT OR REPLACE to handle duplicate entries
                  await db.run(
                      `INSERT OR REPLACE INTO SensorData (sensor_id, timestamp, value)
                       VALUES (?, ?, ?)`,
                      [sensor_id, timestamp, processedValue]
                  );
              } catch (dbError) {
                  console.error(`Failed to insert or replace data for sensor ${sensorName} at ${timestamp}:`, dbError.message);
              }
          }
      }

      await db.run("COMMIT");
  } catch (error) {
      console.error("Error storing sensor data:", error);
      await db.run("ROLLBACK");
  } finally {
      await db.close();
  }
}


async function storeSensorEvents(processEvents) {
  const db = await initializeDatabase();
  try {
    await db.run("BEGIN TRANSACTION");

    for (const event of processEvents) {
      const { name, ranking, meta, events } = event;
      const sensor = await db.get(
        "SELECT sensor_id FROM Sensors WHERE name = ?",
        [name]
      );

      if (!sensor) continue;

      const { sensor_id } = sensor;

      // Insert the process event into the ProcessEvents table
      await db.run(
        "INSERT OR IGNORE INTO ProcessEvents (name, sensor_id, ranking, description) VALUES (?, ?, ?, ?)",
        [name, sensor_id, ranking, meta?.description || ""]
      );

      // Retrieve the event ID
      const processEvent = await db.get(
        "SELECT event_id FROM ProcessEvents WHERE name = ?",
        [name]
      );
      if (!processEvent) {
        console.error(`Failed to retrieve event ID for ${name}`);
        continue;
      }

      const { event_id } = processEvent;

      // Insert each timestamp associated with the event
      for (const { timestamp } of events) {
        // Check if the timestamp already exists for this event
        const existingTimestamp = await db.get(
          "SELECT 1 FROM EventTimestamps WHERE event_id = ? AND timestamp = ?",
          [event_id, timestamp]
        );

        if (!existingTimestamp) {
          await db.run(
            "INSERT INTO EventTimestamps (event_id, timestamp) VALUES (?, ?)",
            [event_id, timestamp]
          );
        }
      }
    }

    await db.run("COMMIT");
    console.log("Process events successfully stored in the database.");
  } catch (error) {
    console.error(`Failed to store process events: ${error.message}`);
    await db.run("ROLLBACK");
  } finally {
    await db.close();
  }
}

// Function to process and store data
async function processAndStore(sensorDataFilePath, eventFilePath) {
  try {
    const sensorData = JSON.parse(
      await fs.readFile(sensorDataFilePath, "utf-8")
    );
    const processEvents = JSON.parse(await fs.readFile(eventFilePath, "utf-8"));

    await storeSensorData(sensorData);
    await storeSensorEvents(processEvents);

    console.log("All data successfully stored in the database.");
  } catch (error) {
    console.error(`Error during data processing: ${error.message}`);
  }
}

async function fetchSlidingWindowData(db, start, end, sensorId = null) {
  console.log("Fetching data for window:", { start, end });

  // Query to fetch SensorData and associated sensor names
  let sensorDataQuery = `
    SELECT sd.sensor_id, sd.timestamp, sd.value, pe.event_id
    FROM ProcessEvents pe
    JOIN SensorData sd ON pe.sensor_id = sd.sensor_id
    WHERE sd.timestamp BETWEEN ? AND ?
  `;
  const params = [start, end];

  // Add filter for specific sensor if sensorId is provided
  if (sensorId) {
    sensorDataQuery += ` AND sd.sensor_id = ?`;
    params.push(sensorId);
  }

  // Ensure the results are ordered by timestamp
  sensorDataQuery += `
      ORDER BY pe.event_id ASC, sd.timestamp ASC;
  `;

  // Execute the query
  const sensorData = await db.all(sensorDataQuery, params);

  console.log("Sensor Data:", sensorData);

  return { sensorData };
}

export default {
  initializeDatabase,
  storeSensorData,
  storeSensorEvents,
  processAndStore,
  fetchSlidingWindowData,
};
