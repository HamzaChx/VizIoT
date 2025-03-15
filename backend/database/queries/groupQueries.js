export const GROUP_QUERIES = {
  INSERT_GROUP: `
      INSERT OR IGNORE INTO Groups (name) VALUES (?)
    `,

  FETCH_GROUP_BY_NAME: `
      SELECT group_id FROM Groups WHERE name = ?
    `,
};
