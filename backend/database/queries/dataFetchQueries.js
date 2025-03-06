export const DATA_FETCH_QUERIES = {
  FETCH_SLIDING_WINDOW: `
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

  FETCH_MIN_MAX_VALUES: `
      SELECT MIN(value) AS min_value, MAX(value) AS max_value
      FROM SensorData
      WHERE sensor_id = ?
    `,

  UPDATE_BOOLEAN_NORMALIZED: `
      UPDATE SensorData
      SET normalized_value = CASE 
        WHEN value = 0 THEN 0 
        ELSE 1 
      END
      WHERE sensor_id = ?
    `,

  UPDATE_NORMALIZED_VALUES: `
      UPDATE SensorData
      SET normalized_value = (value - ?) / ?
      WHERE sensor_id = ?
    `,

  GET_SENSORS_WITH_DATA: `
      SELECT DISTINCT sd.sensor_id, s.type 
      FROM SensorData sd
      JOIN Sensors s ON sd.sensor_id = s.sensor_id
    `,
};
