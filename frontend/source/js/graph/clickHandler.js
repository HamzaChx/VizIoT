import { showCombinedModal } from "./modalUtils.js";

/**
 * Handles canvas click events to display sensor information in a modal and highlight the clicked line.
 * @param {MouseEvent} event - The mouse event object.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export function handleCanvasClick(event, graphManager) {
  const rect = event.target.getBoundingClientRect();
  if (!rect) return;

  // Calculate normalized coordinates (0-1 range)
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;
  
  // Convert to graph coordinates
  const graphX = rawX / rect.width;
  const graphY = 1 - (rawY / rect.height); // Flip Y coordinate

  // Get timestamp from X coordinate
  const timestamp = translateXToTimestamp(graphX, graphManager);
  
  // Get clicked elements
  const eventInfo = getEventAtTimestamp(timestamp, graphManager);
  const sensors = getSensorsInRegion(timestamp, graphManager, graphY);

  // Update highlights
  graphManager.highlightedEvent = eventInfo;
  graphManager.highlightedSensors = sensors.map((s) => s.sensorId);
  
  // Force redraw
  graphManager.requestRedraw();

  // Show modal if we have data
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
        distance: Math.abs(virtualY[idx] - graphY)
      }))
      .filter(pt => 
        Math.abs(pt.x - timestamp) <= xTolerance &&
        Math.abs(pt.y - graphY) <= yTolerance
      )
      .sort((a, b) => a.distance - b.distance);

    if (candidates.length > 0) {
      const candidate = candidates[0];
      const value = candidate.idx < data.values.length ? data.values[candidate.idx] : "N/A";

      results.push({
        sensorId,
        sensorName: data.sensorName || "Unknown",
        value,
        timestamp: new Date(timestamp * 1000 + window.startTime).toLocaleString(),
        group: data.group,
        distance: candidate.distance
      });
    }
  });

  return results.sort((a, b) => a.distance - b.distance);

}

function getEventAtTimestamp(timestamp, graphManager) {
  // const events = graphManager.getEventBuffer();
  // const xTolerance = 0.5;

  // return events.find(event => 
  //   Math.abs(event.x - timestamp) <= xTolerance
  // );
  
  const events = graphManager.getEventBuffer();
  const xTolerance = 0.5;

  // Find events within tolerance
  const nearbyEvents = events.filter(event => 
    Math.abs(event.x - timestamp) <= xTolerance
  );

  // Return the closest event
  if (nearbyEvents.length > 0) {
    return nearbyEvents.reduce((closest, current) => {
      const closestDist = Math.abs(closest.x - timestamp);
      const currentDist = Math.abs(current.x - timestamp);
      return currentDist < closestDist ? current : closest;
    });
  }

  return null;
}
