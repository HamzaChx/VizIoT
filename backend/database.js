import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs/promises";
import yaml from "js-yaml";

async function initializeDatabase() {
  const db = await open({
    filename: "./data/sensor_logs.db",
    driver: sqlite3.Database,
  });

  // Create 'Groups' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Groups (
      group_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // Create 'Sensors' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Sensors (
      sensor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES Groups(group_id) ON DELETE SET NULL
    );
  `);

  // Create 'SensorData' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS SensorData (
      data_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      value REAL,
      original_value TEXT, -- New column for the original string value
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

  const binaryMapping = {
    "closed": 0, "opened": 1,
    "true": 1, "false": 0,
    "active": 1, "inactive": 0
  };

  const stringLabelMap = new Map();

  const parseBinary = (value) => binaryMapping[value?.toLowerCase()] ?? null;

  const labelEncode = (value) => {
    if (!stringLabelMap.has(value)) {
      stringLabelMap.set(value, stringLabelMap.size + 1);
    }
    return stringLabelMap.get(value);
  };

  try {
    await db.run("BEGIN TRANSACTION");

    for (const [sensorName, dataPoints] of sensorData) {
      await db.run("INSERT OR IGNORE INTO Sensors (name) VALUES (?)", [sensorName]);

      const { sensor_id } = await db.get(
        "SELECT sensor_id FROM Sensors WHERE name = ?",
        [sensorName]
      ) || {};

      if (!sensor_id) {
        console.warn(`Sensor ${sensorName} could not be retrieved or created.`);
        continue;
      }

      const insertDataPoint = async (timestamp, rawValue) => {
        if (rawValue == null) return;

        const isString = typeof rawValue === "string";
        const originalValue = isString ? rawValue : null;
        const processedValue = isString
          ? parseBinary(rawValue) ?? labelEncode(rawValue)
          : rawValue;

        await db.run(
          `INSERT OR REPLACE INTO SensorData 
           (sensor_id, timestamp, value, original_value)
           VALUES (?, ?, ?, ?)`,
          [sensor_id, timestamp, processedValue, originalValue]
        );
      };

      await Promise.all(
        Object.entries(dataPoints).map(([timestamp, value]) =>
          insertDataPoint(timestamp, value).catch((error) =>
            console.error(`Error inserting data for ${sensorName} at ${timestamp}:`, error.message)
          )
        )
      );
    }

    await db.run("COMMIT");
  } catch (error) {
    console.error("Transaction failed:", error);
    await db.run("ROLLBACK");
  } finally {
    await db.close();
  }
}

async function storeSensorGroups(yamlFilePath) {
  const db = await initializeDatabase();

  try {
    const yamlContent = await fs.readFile(yamlFilePath, 'utf-8');
    const groups = yaml.load(yamlContent);

    await db.run("BEGIN TRANSACTION");

    for (const group of groups) {
      const groupName = group.group.id;

      // Insert the group into the Groups table
      await db.run(
        "INSERT OR IGNORE INTO Groups (name) VALUES (?)",
        [groupName]
      );

      // Retrieve the group_id
      const { group_id } = await db.get(
        "SELECT group_id FROM Groups WHERE name = ?",
        [groupName]
      ) || {};

      if (!group_id) {
        console.error(`Failed to retrieve group_id for ${groupName}`);
        continue;
      }

      // Assign group_id to each sensor in the group
      const sensors = group.group.sensors.map((sensor) => Object.keys(sensor)[0]);
      for (const sensorName of sensors) {
        await db.run(
          "UPDATE Sensors SET group_id = ? WHERE name = ?",
          [group_id, sensorName]
        );
      }
    }

    await db.run("COMMIT");
    console.log("Sensor groups successfully stored and assigned.");
  } catch (error) {
    console.error("Failed to store sensor groups:", error.message);
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
async function processAndStore(sensorDataFilePath, eventFilePath, yamlFilePath) {
  try {
    const sensorData = JSON.parse(
      await fs.readFile(sensorDataFilePath, "utf-8")
    );
    const processEvents = JSON.parse(await fs.readFile(eventFilePath, "utf-8"));

    await storeSensorData(sensorData);
    await storeSensorEvents(processEvents);
    await storeSensorGroups(yamlFilePath);

    console.log("All data successfully stored in the database.");
  } catch (error) {
    console.error(`Error during data processing: ${error.message}`);
  }
}

// async function normalizeSensorData(db, start, end) {
//   try {
//     const rawData = await db.all(`
//       SELECT sd.sensor_id, sd.timestamp, sd.value, g.name AS group_name, s.name AS sensor_name,
//              MIN(sd.value) OVER(PARTITION BY sd.sensor_id) AS min_value,
//              MAX(sd.value) OVER(PARTITION BY sd.sensor_id) AS max_value
//       FROM SensorData sd
//       JOIN Sensors s ON sd.sensor_id = s.sensor_id
//       JOIN Groups g ON s.group_id = g.group_id
//       WHERE sd.timestamp BETWEEN ? AND ?
//     `, [start, end]);

//     return rawData.map(({ sensor_id, timestamp, value, group_name, min_value, max_value }) => ({
//       sensor_id,
//       timestamp,
//       normalized_value: max_value !== min_value
//         ? (value - min_value) / (max_value - min_value)
//         : 0.5, // Default to midpoint if all values are identical
//       group_name,
//       raw_value: value,
//     }));
//   } catch (error) {
//     console.error("Error normalizing sensor data:", error.message);
//     throw error;
//   }
// }

// async function fetchSlidingWindowData(db, start, end) {

//   try {
//     const normalizedData = await normalizeSensorData(db, start, end);
//     console.log("Normalized Data:", normalizedData);

//     return { sensorData: normalizedData };
//   } catch (error) {
//     console.error("Error fetching sliding window data:", error.message);
//     throw error;
//   }
// }

async function fetchSlidingWindowDataIntervals(db, start, end) {
  try {
    // Fetch sensor data with normalized values and group assignments
    const rawData = await db.all(`
      SELECT sd.sensor_id, sd.timestamp, sd.value, g.name AS group_name, s.name AS sensor_name,
             MIN(sd.value) OVER(PARTITION BY sd.sensor_id) AS min_value,
             MAX(sd.value) OVER(PARTITION BY sd.sensor_id) AS max_value
      FROM SensorData sd
      JOIN Sensors s ON sd.sensor_id = s.sensor_id
      JOIN Groups g ON s.group_id = g.group_id
      WHERE sd.timestamp BETWEEN ? AND ?
    `, [start, end]);

    // Dynamically calculate the groups present in the sliding window
    const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
    // console.log("Group Names:", groupNames);

    // Calculate intervals for the groups in the sliding window
    const intervalSize = 1 / groupNames.length;
    const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
      intervals[groupName] = {
        group_min: index * intervalSize,
        group_max: (index + 1) * intervalSize,
      };
      return intervals;
    }, {});

    // Enrich the data with group intervals and normalized values
    const enrichedData = rawData.map(({ sensor_id, timestamp, value, group_name, min_value, max_value }) => {
      const { group_min, group_max } = groupIntervals[group_name];
      const normalized_value = max_value !== min_value
        ? (value - min_value) / (max_value - min_value)
        : 0.5; // Default to midpoint if all values are identical
      return {
        sensor_id,
        timestamp,
        normalized_value,
        group_name,
        raw_value: value,
        group_min,
        group_max,
      };
    });

    console.log("Data:", enrichedData);

    return { sensorData: enrichedData };
  } catch (error) {
    console.error('Error fetching sliding window data with intervals:', error.message);
    throw error;
  }
}

export default {
  initializeDatabase,
  storeSensorData,
  storeSensorEvents,
  processAndStore,
  fetchSlidingWindowDataIntervals
};
