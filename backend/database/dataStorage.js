import {
  initializeDatabase,
  executeTransaction,
  insertOrUpdate,
} from "./db.js";
import fs from "fs/promises";
import yaml from "js-yaml";

const labelEncode = (() => {
  const sensorMaps = new Map();

  return (sensorName, rawValue) => {
    if (!rawValue || typeof rawValue !== "string")
      return { encoded: null, normalized: null };

    const normalizedValue = rawValue.trim().toLowerCase();

    if (!sensorMaps.has(sensorName)) {
      sensorMaps.set(sensorName, new Map());
    }

    const sensorMap = sensorMaps.get(sensorName);

    if (!sensorMap.has(normalizedValue)) {
      const encodedValue = sensorMap.size;
      sensorMap.set(normalizedValue, encodedValue);
    }

    const encodedValue = sensorMap.get(normalizedValue);

    const totalValues = sensorMap.size;
    const normalized = totalValues > 1 ? encodedValue / (totalValues - 1) : 0;

    const flipFlopNormalized =
      encodedValue % 2 === 0 ? normalized : normalized * -1;

    return {
      encoded: encodedValue,
      normalized: flipFlopNormalized,
    };
  };
})();

export async function storeSensorData(sensorData) {
  const db = await initializeDatabase();
  const binaryMapping = {
    "closed": 0,
    "opened": 1,
    "true": 1,
    "false": 0,
    "active": 1,
    "inactive": 0,
  };
  const parseBinary = (value) => binaryMapping[value?.toLowerCase()] ?? null;

  await executeTransaction(db, async () => {
    for (const [sensorName, dataPoints] of sensorData) {
      await insertOrUpdate(
        db,
        `INSERT OR IGNORE INTO Sensors (name, type, group_id) VALUES (?, 'unknown', NULL)`,
        [sensorName]
      );

      const sensor = await db.get(
        "SELECT sensor_id, type FROM Sensors WHERE name = ?",
        [sensorName]
      );

      if (!sensor) continue;

      const { sensor_id, type } = sensor;

      let lastKnownValue = null;

      for (const [timestamp, rawValue] of Object.entries(dataPoints)) {
        let processedValue = null;

        if (rawValue == null) {
          processedValue = lastKnownValue;
        } else {
          if (type === "boolean") {
            processedValue = parseBinary(rawValue);
          } else if (type === "string") {
            const { encoded, normalized } = labelEncode(sensorName, rawValue);
            processedValue = normalized;
          } else {
            processedValue = rawValue;
          }
          lastKnownValue = processedValue;
        }

        if (processedValue == null) continue;

        await insertOrUpdate(
          db,
          `INSERT OR REPLACE INTO SensorData (sensor_id, timestamp, value, original_value) VALUES (?, ?, ?, ?)`,
          [
            sensor_id,
            timestamp,
            processedValue,
            rawValue,
          ]
        );
      }
    }
  });
}

export async function populateNormalizedValues() {
  const db = await initializeDatabase();

  try {
    const sensors = await db.all(`
      SELECT DISTINCT sd.sensor_id, s.type 
      FROM SensorData sd
      JOIN Sensors s ON sd.sensor_id = s.sensor_id
    `);

    for (const { sensor_id, type } of sensors) {
      if (type === 'boolean') {
        await db.run(
          `UPDATE SensorData
           SET normalized_value = CASE 
             WHEN value = 0 THEN 0 
             ELSE 1 
           END
           WHERE sensor_id = ?`,
          [sensor_id]
        );
        continue;
      }

      const minMax = await db.get(
        `SELECT MIN(value) AS min_value, MAX(value) AS max_value
         FROM SensorData
         WHERE sensor_id = ?`,
        [sensor_id]
      );

      const min = minMax?.min_value ?? 0;
      const max = minMax?.max_value ?? 1;
      const range = max - min || 1;

      await db.run(
        `UPDATE SensorData
         SET normalized_value = (value - ?) / ?
         WHERE sensor_id = ?`,
        [min, range, sensor_id]
      );
    }
  } catch (error) {
    console.error("Error populating normalized values:", error.message);
    throw error;
  }
}

export async function storeSensorGroups(yamlFilePath) {
  const db = await initializeDatabase();
  const yamlContent = await fs.readFile(yamlFilePath, "utf-8");
  const groups = yaml.load(yamlContent);

  await executeTransaction(db, async () => {
    for (const group of groups) {
      const groupName = group.group.id;
      await insertOrUpdate(
        db,
        "INSERT OR IGNORE INTO Groups (name) VALUES (?)",
        [groupName]
      );
      const { group_id } =
        (await db.get("SELECT group_id FROM Groups WHERE name = ?", [
          groupName,
        ])) || {};
      if (!group_id) continue;
      for (const sensor of group.group.sensors) {
        const sensorName = Object.keys(sensor)[0];
        const sensorType = sensor[sensorName]?.data || "unknown";
        await insertOrUpdate(
          db,
          "INSERT OR IGNORE INTO Sensors (name, type, group_id) VALUES (?, ?, ?)",
          [sensorName, sensorType, group_id]
        );
        await insertOrUpdate(
          db,
          "UPDATE Sensors SET group_id = ?, type = ? WHERE name = ?",
          [group_id, sensorType, sensorName]
        );
      }
    }
  });
}

export async function storeSensorEvents(processEvents) {
  const db = await initializeDatabase();
  await executeTransaction(db, async () => {
    for (const event of processEvents) {
      const { name, ranking, meta, events } = event;
      const sensor = await db.get(
        "SELECT sensor_id FROM Sensors WHERE name = ?",
        [name]
      );
      if (!sensor) continue;
      const { sensor_id } = sensor;
      await insertOrUpdate(
        db,
        "INSERT OR IGNORE INTO ProcessEvents (name, sensor_id, ranking, description) VALUES (?, ?, ?, ?)",
        [name, sensor_id, ranking, meta?.description || ""]
      );
      const { event_id } = await db.get(
        "SELECT event_id FROM ProcessEvents WHERE name = ?",
        [name]
      );
      if (!event_id) continue;
      for (const { timestamp } of events) {
        await insertOrUpdate(
          db,
          "INSERT OR IGNORE INTO EventTimestamps (event_id, timestamp) VALUES (?, ?)",
          [event_id, timestamp]
        );
      }
    }
  });
}

export async function processAndStore(
  sensorDataFilePath,
  eventFilePath,
  yamlFilePath
) {
  const sensorData = JSON.parse(await fs.readFile(sensorDataFilePath, "utf-8"));
  const processEvents = JSON.parse(await fs.readFile(eventFilePath, "utf-8"));
  await storeSensorGroups(yamlFilePath);
  await storeSensorData(sensorData);
  await populateNormalizedValues();
  await storeSensorEvents(processEvents);
  console.log("Data successfully processed and stored.");
}
