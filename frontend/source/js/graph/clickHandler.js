import { showCombinedModal } from "../components/modal.js";

/**
 * Handles canvas click events to display sensor information in a modal and highlight the clicked line.
 * @param {MouseEvent} event - The mouse event object.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export async function handleCanvasClick(event, graphManager) {
  const rect = event.target.getBoundingClientRect();
  if (!rect) return;

  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  const graphX = rawX / rect.width;
  const graphY = 1 - rawY / rect.height;

  graphManager.lastClickY = graphY;

  const timestamp = translateXToTimestamp(graphX, graphManager);
  const eventInfo = getEventAtTimestamp(timestamp, graphManager);
  const sensors = getSensorsInRegion(timestamp, graphManager, graphY);

  graphManager.highlightedEvent = eventInfo;
  graphManager.highlightedSensors = sensors.map((s) => s.sensorId);
  graphManager.requestRedraw();

  if (eventInfo || sensors.length > 0) {
    graphManager.highlightedEvent = eventInfo;
    graphManager.highlightedSensors = sensors.map((s) => s.sensorId);
    graphManager.requestRedraw();

    try {
      if (eventInfo) {
        const response = await fetch(
          `/api/annotations/${eventInfo.timestamp_id}`
        );
        if (response.ok) {
          const annotations = await response.json();
          eventInfo.annotations = annotations;
        }
      }
      showCombinedModal(eventInfo, sensors);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      showCombinedModal(eventInfo, sensors);
    }
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
  const yTolerance = 0.05; // Reduced tolerance for more precise clicks
  const results = [];

  const range = graphManager.calculateSlidingWindowXRange();
  if (!range) return results;
  const { xMin, xMax } = range;

  Object.entries(buffers).forEach(([sensorId, data]) => {
    // Skip invalid data
    if (!data.x.length || !data.group || !data.groupBounds) return;

    const { group_min, group_max } = data.groupBounds;

    // Check if click is within group bounds
    const normalizedY = (graphY - group_min) / (group_max - group_min);
    if (normalizedY < 0 || normalizedY > 1) return;

    // Create virtual points for continuous line
    let virtualX = [...data.x];
    let virtualY = [...data.y];

    // Add boundary points
    if (virtualX[0] > xMin) {
      virtualX.unshift(xMin);
      virtualY.unshift(virtualY[0]);
    }
    if (virtualX[virtualX.length - 1] < xMax) {
      virtualX.push(xMax);
      virtualY.push(virtualY[virtualY.length - 1]);
    }

    // Find nearest point within tolerances
    const candidates = virtualX
      .map((val, idx) => ({
        x: val,
        y: virtualY[idx],
        idx,
        distance: Math.abs(virtualY[idx] - graphY),
      }))
      .filter(
        (pt) =>
          Math.abs(pt.x - timestamp) <= xTolerance &&
          Math.abs(pt.y - graphY) <= yTolerance
      )
      .sort((a, b) => a.distance - b.distance);

    if (candidates.length > 0) {
      const candidate = candidates[0];
      const value =
        candidate.idx < data.values.length ? data.values[candidate.idx] : "N/A";

      results.push({
        sensorId,
        sensorName: data.sensorName || "Unknown",
        value,
        timestamp: new Date(
          timestamp * 1000 + window.startTime
        ).toLocaleString(),
        group: data.group,
        distance: candidate.distance,
      });
    }
  });

  return results.sort((a, b) => a.distance - b.distance);
}

const EVENT_HEIGHTS = {
  important: { start: 0, end: 1 },
  new: { start: 0.15, end: 0.95 },
  regular: { start: 0.05, end: 0.9 },
};

function getEventAtTimestamp(timestamp, graphManager) {
  const events = graphManager.getEventBuffer();
  const xTolerance = 0.5;
  const graphY = graphManager.lastClickY;

  let closestEvent = null;
  let minDistance = xTolerance;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const distance = Math.abs(event.x - timestamp);

    if (distance > xTolerance) continue;

    // Check height range only if within x tolerance
    const heightRange = event.isImportant
      ? EVENT_HEIGHTS.important
      : event.isNew
      ? EVENT_HEIGHTS.new
      : EVENT_HEIGHTS.regular;

    if (graphY >= heightRange.start && graphY <= heightRange.end) {
      if (distance < minDistance) {
        minDistance = distance;
        closestEvent = event;
      }
    }
  }

  return closestEvent;
}
