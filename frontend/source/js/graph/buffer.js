const sensorBuffers = {};

/**
 * Updates the buffers with incoming graph data.
 * @param {Array} newGraphData - Array of new data points.
 */
export function updateBuffers(newGraphData) {
    const maxBufferSize = 200;

    newGraphData.forEach(({ sensorId, x, y, group }) => {
        const buffer = sensorBuffers[sensorId] || (sensorBuffers[sensorId] = { x: [], y: [], group });
        buffer.x.push(x);
        buffer.y.push(y);

        // Trim buffers
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
