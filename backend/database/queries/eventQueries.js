export const EVENT_QUERIES = {
  UPDATE_IMPORTANCE: `
        UPDATE EventTimestamps 
        SET is_important = ?
        WHERE timestamp_id = ?
      `,

  GET_EVENT_TIMESTAMPS: `
        SELECT
          et.timestamp,
          et.is_important,
          et.timestamp_id,
          et.event_id,
          pe.sensor_id,
          pe.name as event_name,
          pe.ranking,
          CASE
            WHEN pe.event_id = ? THEN 1
            ELSE 0
          END as is_new
        FROM EventTimestamps et
        JOIN ProcessEvents pe ON et.event_id = pe.event_id
        WHERE pe.sensor_id IN (?)
        AND et.timestamp BETWEEN ? AND ?
        ORDER BY et.timestamp ASC
      `,

  INSERT_EVENT: `
        INSERT OR IGNORE INTO ProcessEvents 
        (name, sensor_id, ranking, description) 
        VALUES (?, ?, ?, ?)
      `,

  INSERT_EVENT_TIMESTAMP: `
        INSERT OR IGNORE INTO EventTimestamps 
        (event_id, timestamp) 
        VALUES (?, ?)
      `,
};
