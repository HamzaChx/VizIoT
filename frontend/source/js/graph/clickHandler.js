import { showCombinedModal } from "../components/modal.js";
import appState from "../state.js";
import {
  formatReadableDate,
} from "../../../../utils/utilities.js";

/**
 * Handles canvas click events to display sensor information in a modal and highlight the clicked line.
 * @param {MouseEvent} event - The mouse event object.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export async function handleCanvasClick(event, graphManager) {
  event.preventDefault();
  event.stopPropagation();
  
  const rect = graphManager.getBoundingClientRect();
  if (!rect) return;

  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  const graphX = rawX / rect.width;

  const graphY =
    1 - rawY / rect.height - graphManager.renderer.viewportSettings.yMin;

  appState.update("ui", { lastClickY: graphY });

  const timestamp = translateXToTimestamp(graphX, graphManager);
  const eventInfo = getEventAtTimestamp(timestamp, graphManager);
  const sensors = getSensorsInRegion(timestamp, graphManager, graphY);

  graphManager.highlightedEvent = eventInfo;
  graphManager.highlightedSensors = sensors.map((s) => s.sensorId);
  graphManager.requestRedraw();

  if (appState.debug?.showClickMarkers) {
    graphManager.drawDebugMarker(timestamp, graphY);
    graphManager.requestRedraw();
  }

  if (eventInfo || sensors.length > 0) {
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
  const results = [];

  if (!Object.keys(buffers).length) return results;

  const xTolerance = 0.5;
  const yTolerance = 0.025;

  Object.entries(buffers).forEach(([sensorId, data]) => {
    if (!data.x || !data.x.length || !data.y || !data.y.length) return;

    let closestPointIdx = -1;
    let closestXDist = Infinity;

    for (let i = 0; i < data.x.length; i++) {
      const dist = Math.abs(data.x[i] - timestamp);
      if (dist < closestXDist) {
        closestXDist = dist;
        closestPointIdx = i;
      }
    }

    if (closestPointIdx !== -1 && closestXDist <= xTolerance) {
      const pointY = data.y[closestPointIdx];

      const yDist = Math.abs(pointY - graphY);

      if (yDist <= yTolerance) {
        const value =
          closestPointIdx < data.values?.length
            ? data.values[closestPointIdx]
            : "N/A";

        const date = new Date(timestamp * 1000 + appState.streaming.startTime);
        const readableTimestamp = formatReadableDate(date);

        results.push({
          sensorId,
          sensorName: data.sensorName || "Unknown",
          value,
          timestamp: readableTimestamp,
          group: data.group,
          distance: yDist,
        });
      }
    }
  });

  return results.sort((a, b) => a.distance - b.distance);
}

const EVENT_HEIGHTS = {
  important: { start: 0, end: 1 },
  new: { start: 0.15, end: 0.95 },
  regular: { start: 0.05, end: 0.9 },
};

/**
 * Retrieves the closest event to the clicked timestamp within a specified tolerance.
 * @param {number} timestamp - The clicked timestamp.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {Object|null} - The closest event or null if none found.
 */
function getEventAtTimestamp(timestamp, graphManager) {
  const events = graphManager.getEventBuffer();
  const xTolerance = 0.5;
  const graphY = appState.ui.lastClickY;

  let closestEvent = null;
  let minDistance = xTolerance;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const distance = Math.abs(event.x - timestamp);

    if (distance > xTolerance) continue;

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
