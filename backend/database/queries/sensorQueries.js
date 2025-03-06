export const SENSOR_QUERIES = {
    GET_ALL: `
      SELECT * FROM Sensors
    `,
    
    GET_BY_NAME: `
      SELECT sensor_id, type FROM Sensors WHERE name = ?
    `,
    
    INSERT_OR_IGNORE: `
      INSERT OR IGNORE INTO Sensors 
      (name, type, group_id) 
      VALUES (?, ?, ?)
    `,
    
    UPDATE_GROUP_AND_TYPE: `
      UPDATE Sensors 
      SET group_id = ?, type = ? 
      WHERE name = ?
    `,
    
    INSERT_SENSOR_DATA: `
      INSERT OR REPLACE INTO SensorData 
      (sensor_id, timestamp, value, original_value) 
      VALUES (?, ?, ?, ?)
    `
};
