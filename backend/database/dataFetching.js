export async function fetchEventTimestamps(db, rawData, start, end) {
  try {
    const sensorIds = [...new Set(rawData.map((entry) => entry.sensor_id))];

    if (sensorIds.length === 0) return [];

    const timestamps = await db.all(
      `
      SELECT 
        et.timestamp,
        pe.sensor_id,
        pe.name as event_name,
        pe.ranking
      FROM EventTimestamps et
      JOIN ProcessEvents pe ON et.event_id = pe.event_id
      WHERE pe.sensor_id IN (${sensorIds.join(",")})
      AND et.timestamp BETWEEN ? AND ?
      ORDER BY et.timestamp ASC
      `,
      [start, end]
    );

    return timestamps;
  } catch (error) {
    console.error("Error fetching event timestamps:", error.message);
    throw error;
  }
}

export async function fetchSlidingWindowData(db, start, end, limit = 1) {
  try {
    const rawData = await db.all(
      `
      SELECT 
        sd.sensor_id, 
        sd.timestamp, 
        sd.original_value, 
        sd.normalized_value, 
        g.name AS group_name, 
        s.name AS sensor_name,
        s.type
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
    const verticalMargin = 0.025;
    const groupMargin = 0.05;
    const availableHeight = 1 - 2 * verticalMargin;
    const effectiveIntervalSize =
      (availableHeight - groupMargin * (groupNames.length - 1)) /
      groupNames.length;

    const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
      const start =
        1 - verticalMargin - index * (effectiveIntervalSize + groupMargin);
      intervals[groupName] = {
        group_min: start - effectiveIntervalSize,
        group_max: start,
      };
      return intervals;
    }, {});

    const sensorData = rawData.map(
      ({
        sensor_id,
        sensor_name,
        timestamp,
        type,
        original_value,
        normalized_value,
        group_name,
      }) => {
        const { group_min, group_max } = groupIntervals[group_name];

        let sliced_value = original_value;
        if (type === "float") {
          sliced_value = parseFloat(original_value).toFixed(2);
        }

        return {
          sensor_id,
          sensor_name,
          timestamp,
          sliced_value,
          normalized_value,
          group_name,
          group_min,
          group_max,
        };
      }
    );

    const groupSensorMap = rawData.reduce(
      (map, { group_name, sensor_name }) => {
        if (!map[group_name]) {
          map[group_name] = [];
        }
        if (!map[group_name].includes(sensor_name)) {
          map[group_name].push(sensor_name);
        }
        return map;
      },
      {}
    );

    const events = await fetchEventTimestamps(db, rawData, start, end);

    console.log(
      `Fetched ${sensorData.length} entries for ${groupNames.length} groups.`
    );

    return { events, sensorData, groupSensorMap };
  } catch (error) {
    console.error("Error fetching sliding window data:", error.message);
    throw error;
  }
}
