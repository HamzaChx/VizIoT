export const ANNOTATION_QUERIES = {
  FETCH_BY_TIMESTAMP: `
      SELECT * FROM EventAnnotations 
      WHERE timestamp_id = ? 
      ORDER BY created_at DESC
    `,

  INSERT: `
      INSERT INTO EventAnnotations 
      (timestamp_id, annotation)
      VALUES (?, ?)
    `,

  DELETE: `
      DELETE FROM EventAnnotations 
      WHERE annotation_id = ?
    `,
};
