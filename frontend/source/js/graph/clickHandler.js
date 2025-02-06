/**
 * Handles canvas click events to display sensor information in a modal.
 * @param {MouseEvent} event - The mouse event object.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export function handleCanvasClick(event, canvas, graphManager) {
  // Use graphManager's getBoundingClientRect which properly accounts for viewport
  const rect = graphManager.getBoundingClientRect();
  if (!rect) return;

  // Get click coordinates relative to the graph area
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  // Check if click is within graph bounds
  if (
    rawX < 0 ||
    rawX > rect.width ||
    rawY < 0 ||
    rawY > rect.height
  ) {
    return;
  }

  // Normalize coordinates to graph space (0-1)
  const graphX = rawX / rect.width;
  const graphY = 1 - (rawY / rect.height);

  // Convert coordinates to data values
  const timestamp = translateXToTimestamp(graphX, graphManager);
  
  // Find nearby sensors without requiring exact group match
  const sensors = getSensorsInRegion(timestamp, null, graphManager, graphY);
  if (sensors.length > 0) {
    showModal(sensors);
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
 * Translates Y coordinate to a sensor group.
 * @param {number} y - Canvas Y coordinate.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {string|null} - Group name corresponding to Y coordinate.
 */
function translateYToGroup(graphY, groupSensorMap) {
  const groupNames = Object.keys(groupSensorMap).sort();
  const verticalMargin = 0.025;
  const groupMargin = 0.05;
  const availableHeight = 1 - 2 * verticalMargin;
  const effectiveIntervalSize =
    (availableHeight - groupMargin * (groupNames.length - 1)) /
    groupNames.length;

  for (let i = 0; i < groupNames.length; i++) {
    const groupName = groupNames[i];
    const start =
      1 - verticalMargin - i * (effectiveIntervalSize + groupMargin);
    const min = start - effectiveIntervalSize;
    const max = start;
    if (graphY >= min && graphY <= max) {
      return groupName;
    }
  }
  return null;
}

/**
 * Retrieves sensors in the clicked region based on timestamp and group.
 * @param {number} timestamp - The clicked timestamp.
 * @param {string|null} group - The clicked group name.
 * @param {Object} graphManager - An instance of GraphManager.
 * @param {number} graphY - The Y coordinate of the click in graph space (0-1).
 * @returns {Array<Object>} - Array of sensors in the region.
 */
function getSensorsInRegion(timestamp, group, graphManager, graphY) {
  const buffers = graphManager.getSensorBuffers();
  // Increase tolerance to make clicks easier to register
  const xTolerance = 0.5;  // Increased from 0.25
  const yTolerance = 0.05; // Increased from 0.025
  const results = [];

  const range = graphManager.calculateSlidingWindowXRange();
  if (!range) return results;
  const { xMin, xMax } = range;

  Object.entries(buffers).forEach(([sensorId, data]) => {
    // Remove group check to find any nearby sensors
    // if (data.group !== group) return;

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
      .filter(pt => Math.abs(pt.x - timestamp) <= xTolerance)
      .sort((a, b) => Math.abs(a.x - timestamp) - Math.abs(b.x - timestamp));

    if (candidates.length > 0) {
      const candidate = candidates[0];
      if (Math.abs(candidate.y - graphY) <= yTolerance) {
        const value = (candidate.idx < data.values.length)
          ? data.values[candidate.idx]
          : "N/A";

        results.push({
          sensorId,
          sensorName: data.sensorName || "Unknown",
          value,
          timestamp: new Date(timestamp * 1000 + window.startTime).toLocaleString(),
          group: data.group
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


function showModal(sensors) {
  const modal = document.getElementById("sensor-modal");
  const dataList = document.getElementById("sensor-data-list");

  dataList.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
            <div class="modal-header sticky-top bg-white">
                <h5 class="modal-title">
                    ${sensors.length} Sensor${
    sensors.length > 1 ? "s" : ""
  } Selected
                </h5>
                <button type="button" class="btn-close sensor-modal-close"></button>
            </div>
            <div class="modal-body">
                <div class="list-group list-group-flush">
                    ${sensors
                      .map(
                        (sensor) => `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0">${sensor.sensorName}</h6>
                                <span class="badge bg-secondary">${sensor.group}</span>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Value</small>
                                    <div class="fw-bold">${sensor.value}</div>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Time</small>
                                    <div class="fw-bold">${sensor.timestamp}</div>
                                </div>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        </div>
    </div>`;

  modal.style.display = "block";

  const dialog = modal.querySelector(".modal-dialog");
  const header = dialog.querySelector(".modal-header");
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  header.addEventListener("mousedown", (e) => {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target === header || e.target.closest(".modal-header")) {
      isDragging = true;
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    xOffset = currentX;
    yOffset = currentY;

    dialog.style.transform = `translate(${currentX}px, ${currentY}px)`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  document
    .querySelectorAll(".sensor-modal-close")
    .forEach((btn) => (btn.onclick = () => (modal.style.display = "none")));

  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}
