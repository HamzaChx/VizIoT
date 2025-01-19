let sensorBuffers = {};
let eventBuffer = [];

/**
 * Updates the buffers with incoming graph data.
 * @param {Array} newGraphData - Array of new data points.
 */
export function updateSensorBuffers(newGraphData) {
    const maxBufferSize = 200;

    newGraphData.forEach(({ sensorId, x, y, group }) => {
        const buffer = sensorBuffers[sensorId] || (sensorBuffers[sensorId] = { x: [], y: [], group });
        buffer.x.push(x);
        buffer.y.push(y);

        if (buffer.x.length > maxBufferSize) {
            buffer.x.splice(0, buffer.x.length - maxBufferSize);
            buffer.y.splice(0, buffer.y.length - maxBufferSize);
        }
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
    Object.keys(sensorBuffers).forEach(sensorId => {
        delete sensorBuffers[sensorId];
    });
}

export function cleanupUnusedSensors(activeSensorIds) {
    // Only remove sensors not in active list
    Object.keys(sensorBuffers).forEach(sensorId => {
        const numericId = parseInt(sensorId);
        // Keep sensor if it's in active list and within current limit
        if (!activeSensorIds.includes(numericId)) {
            delete sensorBuffers[sensorId];
        }
    });
}

export function updateEventBuffer(events) {
    if (!events || !window.startTime) return;
    
    eventBuffer = events.map(event => ({
        x: (Date.parse(event.timestamp) - window.startTime) / 1000,
        name: event.event_name,
        ranking: event.ranking,
        sensorId: event.sensor_id
    }));
}
export function getEventBuffer() {
    return eventBuffer;
}

export function clearEventBuffer() {
    eventBuffer = [];
}
