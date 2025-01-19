export async function fetchSlidingWindowData(db, start, end, limit = 1) {
  try {
    const rawData = await db.all(
      `
      SELECT sd.sensor_id, sd.timestamp, sd.normalized_value, g.name AS group_name, s.name AS sensor_name
      FROM SensorData sd
      JOIN Sensors s ON sd.sensor_id = s.sensor_id
      JOIN Groups g ON s.group_id = g.group_id
      WHERE sd.sensor_id IN (
          SELECT DISTINCT pe.sensor_id
          FROM ProcessEvents pe
          WHERE pe.event_id BETWEEN 1 AND ?
      )
      AND sd.timestamp BETWEEN ? AND ?
      `,
      [limit, start, end]
    );

    if (!rawData.length) {
      return { sensorData: [], groupSensorMap: {}, stopStream: true };
    }

    const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
    const margin = 0.05;
    const effectiveIntervalSize = (1 - margin * (groupNames.length - 1)) / groupNames.length;

    const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
      const start = index * (effectiveIntervalSize + margin);
      intervals[groupName] = {
        group_min: start,
        group_max: start + effectiveIntervalSize,
      };
      return intervals;
    }, {});

    const enrichedData = rawData.map(({ sensor_id, sensor_name, timestamp, normalized_value, group_name }) => {
      const { group_min, group_max } = groupIntervals[group_name];
      return {
        sensor_id,
        sensor_name,
        timestamp,
        normalized_value,
        group_name,
        group_min,
        group_max,
      };
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

    console.log(`Fetched ${enrichedData.length} entries for ${groupNames.length} groups with margins.`);

    return { sensorData: enrichedData, groupSensorMap };
  } catch (error) {
    console.error("Error fetching sliding window data:", error.message);
    throw error;
  }
}
