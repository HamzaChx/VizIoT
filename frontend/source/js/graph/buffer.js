let sensorBuffers = {};
let eventBuffer = [];

/**
 * Updates the buffers with incoming graph data.
 * @param {Array} newGraphData - Array of new data points.
 */
export function updateSensorBuffers(newGraphData) {
    const maxBufferSize = 225;

    newGraphData.forEach(({ sensorId, sensorName, originalValue, x, y, group }) => {
        const buffer = sensorBuffers[sensorId] || (sensorBuffers[sensorId] = { 
            x: [], 
            y: [], 
            sensorName, 
            values: [], // Add array to store original values
            group 
        });
        
        buffer.x.push(x);
        buffer.y.push(y);
        buffer.values.push(originalValue); // Store original value

        // Maintain buffer size for all arrays
        if (buffer.x.length > maxBufferSize) {
            buffer.x.splice(0, buffer.x.length - maxBufferSize);
            buffer.y.splice(0, buffer.y.length - maxBufferSize);
            buffer.values.splice(0, buffer.values.length - maxBufferSize);
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

class HistoricalBuffer {
    constructor(maxDuration = 30) { // 30 seconds of history
        this.buffer = new Map();
        this.maxDuration = maxDuration;
    }

    addData(timestamp, sensorData) {
        this.buffer.set(timestamp, {...sensorData});
        // Clean old data
        const oldestAllowed = timestamp - this.maxDuration;
        for (const [t] of this.buffer) {
            if (t < oldestAllowed) this.buffer.delete(t);
        }
    }

    getDataInTimeRange(startTime, endTime) {
        const data = {};
        this.buffer.forEach((sensorData, timestamp) => {
            if (timestamp >= startTime && timestamp <= endTime) {
                Object.entries(sensorData).forEach(([sensorId, point]) => {
                    if (!data[sensorId]) {
                        data[sensorId] = { x: [], y: [], group: point.group };
                    }
                    data[sensorId].x.push(point.x);
                    data[sensorId].y.push(point.y);
                });
            }
        });
        return data;
    }
}

let historicalBuffer = new HistoricalBuffer();
export { historicalBuffer };