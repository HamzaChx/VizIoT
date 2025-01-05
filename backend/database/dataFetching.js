export async function fetchSlidingWindowData(db, start, end, limit = 1) {
  try {
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
      return { sensorData: [], groupSensorMap: {}, stopStream: true };
    }

    const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
    const intervalSize = 1 / groupNames.length;
    const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
      intervals[groupName] = {
        group_min: index * intervalSize,
        group_max: (index + 1) * intervalSize,
      };
      return intervals;
    }, {});

    const enrichedData = rawData.map(({ sensor_id, sensor_name, timestamp, value, group_name, min_value, max_value }) => {
      const { group_min, group_max } = groupIntervals[group_name];
      const normalized_value = max_value !== min_value ? (value - min_value) / (max_value - min_value) : max_value;
      return { sensor_id, sensor_name, timestamp, normalized_value, group_name, raw_value: value, group_min, group_max };
    });

    const groupSensorMap = rawData.reduce((map, { group_name, sensor_name }) => {
      if (!map[group_name]) {
        map[group_name] = [];
      }
      if (!map[group_name].includes(sensor_name)) {
        map[group_name].push(sensor_name);
      }
      return map;
    }, {});

    console.log(`Fetched ${enrichedData.length} entries for ${groupNames.length} groups.`);

    return { sensorData: enrichedData, groupSensorMap };
  } catch (error) {
    console.error("Error fetching sliding window data:", error.message);
    throw error;
  }
}
