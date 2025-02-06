import { showCombinedModal } from "./modalUtils.js";

/**
 * Handles canvas click events to display sensor information in a modal.
 * @param {MouseEvent} event - The mouse event object.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export function handleCanvasClick(event, canvas, graphManager) {
  const rect = graphManager.getBoundingClientRect();
  if (!rect) return;

  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  if (rawX < 0 || rawX > rect.width || rawY < 0 || rawY > rect.height) return;

  const graphX = rawX / rect.width;
  const graphY = 1 - (rawY / rect.height);
  const timestamp = translateXToTimestamp(graphX, graphManager);

  const eventInfo = getEventAtTimestamp(timestamp, graphManager);
  const sensors = getSensorsInRegion(timestamp, graphManager, graphY);

  if (eventInfo || sensors.length > 0) {
      showCombinedModal(eventInfo, sensors);
  }
}

/**
 * Translates X coordinate to a timestamp.
 * @param {number} x - Canvas X coordinate.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {number} - Timestamp corresponding to X coordinate.
 */
function translateXToTimestamp(normalizedX, graphManager) {
  const range = graphManager.calculateSlidingWindowXRange();
  if (!range) return 0;
  const { xMin, xMax } = range;
  return xMin + normalizedX * (xMax - xMin);
}

/**
 * Retrieves sensors in the clicked region based on timestamp and group.
 * @param {number} timestamp - The clicked timestamp.
 * @param {string|null} group - The clicked group name.
 * @param {Object} graphManager - An instance of GraphManager.
 * @param {number} graphY - The Y coordinate of the click in graph space (0-1).
 * @returns {Array<Object>} - Array of sensors in the region.
 */
function getSensorsInRegion(timestamp, graphManager, graphY) {
  const buffers = graphManager.getSensorBuffers();
  const xTolerance = 0.5;
  const yTolerance = 0.05;
  const results = [];

  const range = graphManager.calculateSlidingWindowXRange();
  if (!range) return results;
  const { xMin, xMax } = range;

  Object.entries(buffers).forEach(([sensorId, data]) => {

    let virtualX = [...data.x];
    let virtualY = [...data.y];
    if (virtualX.length === 0) return;

    // Pad boundaries
    if (virtualX[0] > xMin) {
      virtualX.unshift(xMin);
      virtualY.unshift(virtualY[0]);
    }
    if (virtualX[virtualX.length - 1] < xMax) {
      virtualX.push(xMax);
      virtualY.push(virtualY[virtualY.length - 1]);
    }

    // Find nearest point
    const candidates = virtualX
      .map((val, idx) => ({ x: val, y: virtualY[idx], idx }))
      .filter((pt) => Math.abs(pt.x - timestamp) <= xTolerance)
      .sort((a, b) => Math.abs(a.x - timestamp) - Math.abs(b.x - timestamp));

    if (candidates.length > 0) {
      const candidate = candidates[0];
      if (Math.abs(candidate.y - graphY) <= yTolerance) {
        const value =
          candidate.idx < data.values.length
            ? data.values[candidate.idx]
            : "N/A";

        results.push({
          sensorId,
          sensorName: data.sensorName || "Unknown",
          value,
          timestamp: new Date(
            timestamp * 1000 + window.startTime
          ).toLocaleString(),
          group: data.group,
        });
      }
    }
  });

  // Sort results by distance to click point for better relevance
  results.sort((a, b) => {
    const bufferA = buffers[a.sensorId];
    const bufferB = buffers[b.sensorId];
    const distA = Math.abs(bufferA.y[bufferA.y.length - 1] - graphY);
    const distB = Math.abs(bufferB.y[bufferB.y.length - 1] - graphY);
    return distA - distB;
  });

  return results;
}

function getEventAtTimestamp(timestamp, graphManager) {
  const events = graphManager.getEventBuffer();
  const xTolerance = 0.5;

  return events.find(event => 
    Math.abs(event.x - timestamp) <= xTolerance
  );
}
