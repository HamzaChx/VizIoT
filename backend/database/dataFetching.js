export async function fetchSlidingWindowData(db, start, end, limit = 1) {
  try {
      // Fetch sensor data for limited sensor IDs
      const rawData = await db.all(
          `
          SELECT sd.sensor_id, sd.timestamp, sd.value, g.name AS group_name, s.name AS sensor_name,
                 MIN(sd.value) OVER(PARTITION BY sd.sensor_id) AS min_value,
                 MAX(sd.value) OVER(PARTITION BY sd.sensor_id) AS max_value
          FROM SensorData sd
          JOIN Sensors s ON sd.sensor_id = s.sensor_id
          JOIN Groups g ON s.group_id = g.group_id
          WHERE sd.sensor_id IN (
              SELECT DISTINCT sensor_id
              FROM SensorData
              WHERE timestamp BETWEEN ? AND ?
              LIMIT ?
          )
          AND sd.timestamp BETWEEN ? AND ?
          `,
          [start, end, limit, start, end]
      );

      if (!rawData.length) {
          return { sensorData: [], stopStream: true };
      }

      // Dynamically calculate the groups present in the sliding window
      const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
      const intervalSize = 1 / groupNames.length;
      const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
          intervals[groupName] = {
              group_min: index * intervalSize,
              group_max: (index + 1) * intervalSize,
          };
          return intervals;
      }, {});

      // Enrich the data with group intervals, normalized values, and sensor names
      const enrichedData = rawData.map(({ sensor_id, sensor_name, timestamp, value, group_name, min_value, max_value }) => {
          const { group_min, group_max } = groupIntervals[group_name];
          const normalized_value = max_value !== min_value ? (value - min_value) / (max_value - min_value) : 0.5;
          return { sensor_id, sensor_name, timestamp, normalized_value, group_name, raw_value: value, group_min, group_max };
      });

      console.log(`Fetched ${enrichedData.length} entries for ${groupNames.length} groups.`);

      return { sensorData: enrichedData };
  } catch (error) {
      console.error("Error fetching sliding window data:", error.message);
      throw error;
  }
}
