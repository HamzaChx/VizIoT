import appState from "../state.js";

let sensorBuffers = {};
let eventBuffer = [];
const eventCache = new WeakMap();

/**
 * Updates the buffers with incoming graph data.
 * @param {Array} newGraphData - Array of new data points.
 */
export function updateSensorBuffers(newGraphData) {
  const maxBufferSize = 300;

  newGraphData.forEach(
    ({
      sensorId,
      sensorName,
      originalValue,
      x,
      y,
      group,
      group_min,
      group_max,
    }) => {
      if (!sensorBuffers[sensorId]) {
        sensorBuffers[sensorId] = {
          x: [],
          y: [],
          values: [],
          sensorName,
          group,
          groupBounds: {
            group_min,
            group_max,
          },
        };
      }

      const buffer = sensorBuffers[sensorId];

      buffer.x.push(x);
      buffer.y.push(y);
      buffer.values.push(originalValue);

      if (buffer.x.length > maxBufferSize) {
        buffer.x.splice(0, buffer.x.length - maxBufferSize);
        buffer.y.splice(0, buffer.y.length - maxBufferSize);
        buffer.values.splice(0, buffer.values.length - maxBufferSize);
      }
    }
  );
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
