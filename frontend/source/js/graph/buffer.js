import appState from "../state.js";

let sensorBuffers = {};
let eventBuffer = [];
const eventCache = new WeakMap();
const TIME_WINDOW = 30;

/**
 * Updates the buffers with incoming graph data.
 * @param {Array} newGraphData - Array of new data points.
 */
export function updateSensorBuffers(newGraphData) {
  if (!newGraphData || newGraphData.length === 0) return;
  
  const latestTimestamp = newGraphData.reduce((latest, point) => 
    Math.max(latest, point.x), -Infinity);
  
  const minTimestampToKeep = latestTimestamp - TIME_WINDOW - 2;

  const sensorData = {};
  newGraphData.forEach(dataPoint => {
    const { sensorId } = dataPoint;
    if (!sensorData[sensorId]) {
      sensorData[sensorId] = [];
    }
    sensorData[sensorId].push(dataPoint);
  });
  
  Object.entries(sensorData).forEach(([sensorId, dataPoints]) => {
    dataPoints.sort((a, b) => a.x - b.x);
    
    const firstPoint = dataPoints[0];
    
    if (!sensorBuffers[sensorId]) {
      sensorBuffers[sensorId] = {
        x: [],
        y: [],
        values: [],
        sensorName: firstPoint.sensorName,
        group: firstPoint.group,
        groupBounds: {
          group_min: firstPoint.group_min,
          group_max: firstPoint.group_max,
        },
      };
    }
    
    const buffer = sensorBuffers[sensorId];
    
    let mergedX = [...buffer.x];
    let mergedY = [...buffer.y];
    let mergedValues = [...buffer.values];

    dataPoints.forEach(point => {
      const existingIndex = mergedX.findIndex(x => Math.abs(x - point.x) < 0.001);
      if (existingIndex >= 0) {
        mergedX[existingIndex] = point.x;
        mergedY[existingIndex] = point.y;
        mergedValues[existingIndex] = point.originalValue;
      } else {
        mergedX.push(point.x);
        mergedY.push(point.y);
        mergedValues.push(point.originalValue);
      }
    });
    
    const indicesToKeep = [];
    for (let i = 0; i < mergedX.length; i++) {
      if (mergedX[i] >= minTimestampToKeep) {
        indicesToKeep.push(i);
      }
    }
    
    buffer.x = indicesToKeep.map(i => mergedX[i]);
    buffer.y = indicesToKeep.map(i => mergedY[i]);
    buffer.values = indicesToKeep.map(i => mergedValues[i]);
    
    const sortIndices = buffer.x.map((x, i) => i)
      .sort((a, b) => buffer.x[a] - buffer.x[b]);
    
    buffer.x = sortIndices.map(i => buffer.x[i]);
    buffer.y = sortIndices.map(i => buffer.y[i]);
    buffer.values = sortIndices.map(i => buffer.values[i]);

    buffer.sensorName = firstPoint.sensorName;
    buffer.group = firstPoint.group;
    buffer.groupBounds = {
      group_min: firstPoint.group_min,
      group_max: firstPoint.group_max,
    };
  });
}

/**
 * Retrieves the current sensor buffers.
 * @returns {Object} - The sensor buffers.
 */
export function getSensorBuffers() {
  return sensorBuffers;
}

/**
 * Clears all sensor buffers.
 */
export function clearSensorBuffers() {
  Object.keys(sensorBuffers).forEach((sensorId) => {
    delete sensorBuffers[sensorId];
  });
}

/**
 * Cleans up unused sensors from the buffer.
 *
 * @param {Array} activeSensorIds - Array of active sensor IDs.
 */
export function cleanupUnusedSensors(activeSensorIds) {
  Object.keys(sensorBuffers).forEach((sensorId) => {
    const numericId = parseInt(sensorId);
    if (!activeSensorIds.includes(numericId)) {
      delete sensorBuffers[sensorId];
    }
  });
}

/**
 * Updates the event buffer with incoming events.
 * @param {Array} events - Array of new events.
 */
export function updateEventBuffer(events) {
  if (!events || !appState.streaming.startTime) return;

  if (events.length === eventBuffer.length) {
    let needsUpdate = false;
    for (let i = 0; i < events.length; i++) {
      if (events[i].event_id !== eventBuffer[i].event_id) {
        needsUpdate = true;
        break;
      }
    }
    if (!needsUpdate) return;
  }
  eventBuffer = events.map((event) => {
    let processed = eventCache.get(event);
    if (!processed) {
      processed = {
        x: (Date.parse(event.timestamp) - appState.streaming.startTime) / 1000,
        name: event.event_name,
        ranking: event.ranking,
        sensorId: event.sensor_id,
        isImportant: event.is_important,
        event_id: event.event_id,
        timestamp_id: event.timestamp_id,
        isNew: event.is_new,
      };
      eventCache.set(event, processed);
    }
    return processed;
  });
  
}

/**
 * Retrieves the current event buffer.
 * @returns {Array} - The event buffer.
 */
export function getEventBuffer() {
  return eventBuffer;
}

/**
 * Clears the event buffer.
 */
export function clearEventBuffer() {
  eventBuffer = [];
}
