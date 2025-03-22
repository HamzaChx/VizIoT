import { DATA_FETCH_QUERIES } from "./queries/dataFetchQueries.js";

export async function fetchEventTimestamps(db, rawData, start, end, currentStep) {
  try {
    const sensorIds = [...new Set(rawData.map((entry) => entry.sensor_id))];
    if (sensorIds.length === 0) return [];

    const events = await db.all(
      `
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
      WHERE pe.sensor_id IN (${sensorIds.join(",")})
      AND et.timestamp BETWEEN ? AND ?
      ORDER BY et.timestamp ASC
      `,
      [currentStep, start, end]
    );

    if (!events.length) {
      return [];
    }

    return events;
  } catch (error) {
    console.error("Error fetching event timestamps:", error.message);
    throw error;
  }
}

export async function fetchSlidingWindowData(db, start, end, limit = 1) {

  try {
    const rawData = await db.all(DATA_FETCH_QUERIES.FETCH_SLIDING_WINDOW,
      [limit, start, end]
    );

    if (!rawData.length) {
      return { sensorData: [], groupSensorMap: {}, stopStream: true };
    }

    const groupIntervals = processGroupIntervals(rawData);

    const sensorData = processSensorData(rawData, groupIntervals);

    const eventData = await fetchEventTimestamps(
      db,
      rawData,
      start,
      end,
      limit
    );

    const groupSensorMap = buildGroupSensorMap(rawData);

    console.log("Fetched sensorData: ", sensorData.length, "for : ", Object.keys(groupSensorMap).length , "groups");

    return {
      eventData,
      sensorData,
      groupSensorMap,
      groupIntervals,
    };
  } catch (error) {
    console.error("Error fetching sliding window data:", error.message);
    throw error;
  }
}

function processGroupIntervals(rawData) {
  const groupNames = [...new Set(rawData.map((entry) => entry.group_name))];
  const verticalMargin = 0.1;
  const groupMargin = 0.05;
  const availableHeight = 1 - 2 * verticalMargin;
  const effectiveIntervalSize =
    (availableHeight - groupMargin * (groupNames.length - 1)) /
    groupNames.length;

  return groupNames.reduce((intervals, groupName, index) => {
    const start =
      1 - verticalMargin - index * (effectiveIntervalSize + groupMargin);
    intervals[groupName] = {
      group_min: start - effectiveIntervalSize,
      group_max: start,
    };
    return intervals;
  }, {});
}

function processSensorData(rawData, groupIntervals) {
  return rawData.map(
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
      const sliced_value =
        type === "float"
          ? parseFloat(original_value).toFixed(2)
          : original_value;
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
}

function buildGroupSensorMap(rawData) {
  return rawData.reduce((map, { group_name, sensor_name }) => {
    if (!map[group_name]) map[group_name] = [];
    if (!map[group_name].includes(sensor_name)) {
      map[group_name].push(sensor_name);
    }
    return map;
  }, {});
}

export async function getFirstAvailableTimestamp(db) {
  try {
    const result = await db.get(`
      SELECT MIN(timestamp) as first_timestamp 
      FROM SensorData
    `);
    
    if (result && result.first_timestamp) {
      console.log("First available timestamp in database:", result.first_timestamp);
      return result.first_timestamp;
    } else {
      console.log("No timestamps found in database, using default");
      return "2025-03-21T10:00:00.00+02:00";
    }
  } catch (error) {
    return "2025-03-21T10:00:00.00+02:00";
  }
}