export async function fetchSlidingWindowData(db, start, end) {
    try {
      // Fetch sensor data with normalized values and group assignments
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
  
      if (!rawData.length) {
        return { sensorData: [], stopStream: true };
      }
  
      // Dynamically calculate the groups present in the sliding window
      const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
  
      // Calculate intervals for the groups in the sliding window
      const intervalSize = 1 / groupNames.length;
      const groupIntervals = groupNames.reduce((intervals, groupName, index) => {
        intervals[groupName] = {
          group_min: index * intervalSize,
          group_max: (index + 1) * intervalSize,
        };
        return intervals;
      }, {});
  
      // Enrich the data with group intervals, normalized values, and sensor names
      const enrichedData = rawData
        .filter(({ timestamp }) => new Date(timestamp) >= new Date(start) && new Date(timestamp) <= new Date(end)) // Strict timestamp filtering
        .map(({ sensor_id, sensor_name, timestamp, value, group_name, min_value, max_value }) => {
          const { group_min, group_max } = groupIntervals[group_name];
          const normalized_value =
            max_value !== min_value
              ? (value - min_value) / (max_value - min_value)
              : 0.5
  
          return {
            sensor_id,
            sensor_name,
            timestamp,
            normalized_value,
            group_name,
            raw_value: value,
            group_min,
            group_max,
          };
        });
  
      console.log("Fetched sliding window data:", enrichedData); // Debugging log
      return { sensorData: enrichedData };
    } catch (error) {
      console.error("Error fetching sliding window data:", error.message);
      throw error;
    }
}
