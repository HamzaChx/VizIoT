/**
 * Handles canvas click events to display sensor information in a modal.
 * @param {MouseEvent} event - The mouse event object.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Object} graphManager - An instance of GraphManager.
 */
export function handleCanvasClick(event, canvas, graphManager) {
  const viewportStart = graphManager.viewportSettings.start;
  const viewportEnd = graphManager.viewportSettings.end;
  const rect = canvas.getBoundingClientRect();

  // Get raw click coordinates
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  // Check if click is within viewport
  const viewportWidth = rect.width * (viewportEnd - viewportStart);
  const viewportHeight = rect.height * (viewportEnd - viewportStart);
  const viewportLeft = rect.width * viewportStart;
  const viewportTop = rect.height * viewportStart;

  if (
    rawX < viewportLeft ||
    rawX > viewportLeft + viewportWidth ||
    rawY < viewportTop ||
    rawY > viewportTop + viewportHeight
  ) {
    return;
  }

  // Normalize coordinates to graph space (0-1)
  const graphX = (rawX - viewportLeft) / viewportWidth;
  const graphY = 1 - (rawY - viewportTop) / viewportHeight;

  const timestamp = translateXToTimestamp(graphX, graphManager);
  const group = translateYToGroup(graphY, graphManager.groupSensorMap);

  if (group) {
    const sensors = getSensorsInRegion(timestamp, group, graphManager, graphY);
    if (sensors.length > 0) {
      showModal(sensors);
    }
  }
}

/**
 * Translates X coordinate to a timestamp.
 * @param {number} x - Canvas X coordinate.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {number} - Timestamp corresponding to X coordinate.
 */
function translateXToTimestamp(x, graphManager) {
  const { xMin, xMax } = graphManager.calculateXRange();
  const canvasWidth = document.getElementById(graphManager.canvasId).width;
  return xMin + (x / canvasWidth) * (xMax - xMin);
}

/**
 * Translates Y coordinate to a sensor group.
 * @param {number} y - Canvas Y coordinate.
 * @param {Object} graphManager - An instance of GraphManager.
 * @returns {string|null} - Group name corresponding to Y coordinate.
 */
function translateYToGroup(graphY, groupSensorMap) {
  const groupNames = Object.keys(groupSensorMap);
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
    const xTolerance = 0.25;
    const yTolerance = 0.025;
    
    return Object.entries(buffers)
        .filter(([_, data]) => {
            if (data.group !== group) return false;
            
            const timeIndices = data.x
                .map((val, idx) => ({ val, idx }))
                .filter(({val}) => Math.abs(val - timestamp) <= xTolerance)
                .sort((a, b) => Math.abs(a.val - timestamp) - Math.abs(b.val - timestamp))
                .slice(0, 2);
            
            if (timeIndices.length === 0) return false;
            
            let interpolatedY;
            const value = data.values[timeIndices[0].idx];
            const isBinary = value === '0' || value === '1';
            
            if (!isBinary && timeIndices.length === 2) {
                const t1 = timeIndices[0].val;
                const t2 = timeIndices[1].val;
                const y1 = data.y[timeIndices[0].idx];
                const y2 = data.y[timeIndices[1].idx];
                
                const ratio = (timestamp - t1) / (t2 - t1);
                interpolatedY = y1 + (y2 - y1) * ratio;
            } else {
                interpolatedY = data.y[timeIndices[0].idx];
            }
            
            return Math.abs(interpolatedY - graphY) <= yTolerance;
        })
        .map(([sensorId, data]) => {
            const timeIndices = data.x
                .map((val, idx) => ({ val, idx }))
                .filter(({val}) => Math.abs(val - timestamp) <= xTolerance)
                .sort((a, b) => Math.abs(a.val - timestamp) - Math.abs(b.val - timestamp))
                .slice(0, 2);
            
            let value;
            const originalValue = data.values[timeIndices[0].idx];
            const isBinary = originalValue === '0' || originalValue === '1';
            
            if (!isBinary && timeIndices.length === 2) {
                const t1 = timeIndices[0].val;
                const t2 = timeIndices[1].val;
                const v1 = data.values[timeIndices[0].idx];
                const v2 = data.values[timeIndices[1].idx];
                
                // Only interpolate if not binary/string
                if (!isNaN(parseFloat(v1)) && !isNaN(parseFloat(v2))) {
                    const ratio = (timestamp - t1) / (t2 - t1);
                    value = parseFloat(v1) + (parseFloat(v2) - parseFloat(v1)) * ratio;
                    value = value.toFixed(3);
                } else {
                    value = v1; // Use nearest value for non-numeric types
                }
            } else {
                value = originalValue;
            }
            
            // Convert binary values to human-readable format
            if (isBinary) {
                value = value === '1' ? 'Active' : 'Inactive';
            }
            
            return {
                sensorId,
                sensorName: data.sensorName || "Unknown",
                value,
                timestamp: new Date(timestamp * 1000 + window.startTime).toLocaleString(),
                group: data.group
            };
        });
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
