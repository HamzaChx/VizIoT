import { initializeDatabase } from "./db.js";

export async function fetchSlidingWindowDataIntervals(start, end) {
  const db = await initializeDatabase();

  const rawData = await db.all(
    `
    SELECT sd.sensor_id, sd.timestamp, sd.value, g.name AS group_name, s.name AS sensor_name,
           MIN(sd.value) OVER(PARTITION BY sd.sensor_id) AS min_value,
           MAX(sd.value) OVER(PARTITION BY sd.sensor_id) AS max_value
    FROM SensorData sd
    JOIN Sensors s ON sd.sensor_id = s.sensor_id
    JOIN Groups g ON s.group_id = g.group_id
    WHERE sd.timestamp BETWEEN ? AND ?
    `,
    [start, end]
  );

  if (!rawData.length) return { sensorData: [], stopStream: true };

  const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
  const intervalSize = 1 / groupNames.length;

  const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
    intervals[groupName] = { group_min: index * intervalSize, group_max: (index + 1) * intervalSize };
    return intervals;
  }, {});

  return {
    sensorData: rawData.map(({ sensor_id, sensor_name, timestamp, value, group_name, min_value, max_value }) => ({
      sensor_id,
      sensor_name,
      timestamp,
      normalized_value: max_value !== min_value ? (value - min_value) / (max_value - min_value) : 0.5,
      group_name,
      raw_value: value,
      ...groupIntervals[group_name],
    })),
  };
}
