import appState from "../state.js";

let sensorBuffers = {};
let eventBuffer = [];
const eventCache = new WeakMap();

/**
 * Updates the buffers with incoming graph data.
 * @param {Array} newGraphData - Array of new data points.
 */
export function updateSensorBuffers(newGraphData) {
  if (!newGraphData || newGraphData.length === 0) return;
  
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
    
    buffer.x = dataPoints.map(point => point.x);
    buffer.y = dataPoints.map(point => point.y);
    buffer.values = dataPoints.map(point => point.originalValue);
    
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
