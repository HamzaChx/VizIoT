import {
  initializeDatabase,
  executeTransaction,
  insertOrUpdate,
} from "./db.js";
import fs from "fs/promises";
import yaml from "js-yaml";
import { formatDateWithOffset } from "../server/utils.js";

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

      let lastKnownValue = null; // To track the last non-null value for the sensor

      for (const [timestamp, rawValue] of Object.entries(dataPoints)) {
        let processedValue = null;

        if (rawValue == null) {
          // Fill missing value with the last known value if available
          processedValue = lastKnownValue;
        } else {
          if (type === "boolean") {
            processedValue = parseBinary(rawValue);
          } else if (type === "string") {
            const { encoded, normalized } = labelEncode(sensorName, rawValue);
            processedValue = 0.5; // Example of a normalized string value
          } else {
            processedValue = rawValue;
          }

          // Update the last known value
          lastKnownValue = processedValue;
        }

        // Skip if both rawValue and lastKnownValue are null
        if (processedValue == null) continue;

        await insertOrUpdate(
          db,
          `INSERT OR REPLACE INTO SensorData (sensor_id, timestamp, value, original_value) VALUES (?, ?, ?, ?)`,
          [
            sensor_id,
            timestamp,
            processedValue,
            typeof rawValue === "string" ? rawValue : null,
          ]
        );
      }
    }
  });
}


// function interpolateSensorData(
//   type,
//   lastKnownValue,
//   lastKnownTimestamp,
//   nextKnownValue,
//   nextKnownTimestamp,
//   currentTimestamp
// ) {
//   // For discrete sensors, return null (discrete data cannot be interpolated)
//   if (type === "boolean" || type === "string") {
//     return null;
//   }

//   // If last or next known value is missing, fallback to the last known value
//   if (lastKnownValue == null || nextKnownValue == null) {
//     return lastKnownValue ?? null; // Default to the last known value if available
//   }

//   // Perform linear interpolation for continuous data
//   const fraction =
//     (currentTimestamp - lastKnownTimestamp) /
//     (nextKnownTimestamp - lastKnownTimestamp);
//   return lastKnownValue + fraction * (nextKnownValue - lastKnownValue);
// }

// export async function storeSensorData(sensorData) {
//   const db = await initializeDatabase();
//   const binaryMapping = {
//     "closed": 0,
//     "opened": 1,
//     "true": 1,
//     "false": 0,
//     "active": 1,
//     "inactive": 0,
//   };
//   const parseBinary = (value) => binaryMapping[value?.toLowerCase()] ?? null;

//   await executeTransaction(db, async () => {
//     for (const [sensorName, dataPoints] of sensorData) {
//       await insertOrUpdate(
//         db,
//         `INSERT OR IGNORE INTO Sensors (name, type, group_id) VALUES (?, 'unknown', NULL)`,
//         [sensorName]
//       );

//       const sensor = await db.get(
//         "SELECT sensor_id, type FROM Sensors WHERE name = ?",
//         [sensorName]
//       );

//       if (!sensor) continue;

//       const { sensor_id, type } = sensor;

//       let lastKnownValue = null;
//       let lastKnownTimestamp = null;

//       // Sort timestamps for processing
//       const sortedTimestamps = Object.keys(dataPoints)
//         .map((ts) => new Date(ts))
//         .sort((a, b) => a - b);

//       for (let i = 0; i < sortedTimestamps.length; i++) {
//         const currentTimestamp = sortedTimestamps[i];
//         const formattedTimestamp = formatDateWithOffset(currentTimestamp);
//         const rawValue = dataPoints[currentTimestamp.toISOString()];

//         if (rawValue == null) {
//           // Find the next known value for interpolation
//           let nextKnownValue = null;
//           let nextKnownTimestamp = null;

//           for (let j = i + 1; j < sortedTimestamps.length; j++) {
//             const futureTimestamp = sortedTimestamps[j];
//             const futureValue = dataPoints[futureTimestamp.toISOString()];
//             if (futureValue != null) {
//               nextKnownValue = futureValue;
//               nextKnownTimestamp = futureTimestamp;
//               break;
//             }
//           }

//           const interpolatedValue = interpolateSensorData(
//             type,
//             lastKnownValue,
//             lastKnownTimestamp,
//             nextKnownValue,
//             nextKnownTimestamp,
//             currentTimestamp
//           );

//           if (type === "boolean" || type === "string") {
//             await insertOrUpdate(
//               db,
//               `INSERT OR REPLACE INTO SensorData (sensor_id, timestamp, value, original_value) VALUES (?, ?, ?, ?)`,
//               [sensor_id, formattedTimestamp, null, null]
//             );
//           } else {
//             await insertOrUpdate(
//               db,
//               `INSERT OR REPLACE INTO SensorData (sensor_id, timestamp, value, original_value) VALUES (?, ?, ?, ?)`,
//               [sensor_id, formattedTimestamp, interpolatedValue, null]
//             );
//           }

//           continue;
//         }

//         // Process non-null raw values
//         let processedValue;
//         if (type === "boolean") {
//           processedValue = parseBinary(rawValue);
//         } else if (type === "string") {
//           const { encoded, normalized } = labelEncode(sensorName, rawValue);
//           processedValue = normalized;
//         } else {
//           processedValue = rawValue;
//         }

//         lastKnownValue = processedValue;
//         lastKnownTimestamp = currentTimestamp;

//         await insertOrUpdate(
//           db,
//           `INSERT OR REPLACE INTO SensorData (sensor_id, timestamp, value, original_value) VALUES (?, ?, ?, ?)`,
//           [
//             sensor_id,
//             formattedTimestamp, // Use properly formatted timestamp
//             processedValue,
//             typeof rawValue === "string" ? rawValue : null,
//           ]
//         );
//       }
//     }
//   });
// }


export async function populateNormalizedValues() {
  const db = await initializeDatabase();

  try {
    
    const sensors = await db.all(`SELECT DISTINCT sensor_id FROM SensorData`);

    for (const { sensor_id } of sensors) {

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
