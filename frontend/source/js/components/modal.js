import { initializeTabs } from "./tabs.js";
import { formatDateWithOffset, formatReadableDate } from "../../../utils/utilities.js";
import { renderAnnotationsList } from "./annotations.js";
import appState from "../state.js";

export function setupModalDrag(modal) {
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

export function setupModalClose(modal) {
  modal.querySelector(".btn-close").onclick = () =>
    (modal.style.display = "none");
  modal.onclick = (e) => {
    if (e.target === modal || e.target.closest("#example-canvas")) {
      modal.style.display = "none";
    }
  };
}

export function showModal(content) {
  const modal = document.getElementById("dynamic-modal");
  const modalContent = modal.querySelector(".modal-content");
  modalContent.innerHTML = content;
  modal.classList.add("show");
  modal.style.display = "block";
  setupModalDrag(modal);
  setupModalClose(modal);
  return modal;
}

export function showCombinedModal(eventInfo, sensors) {

  const hasAnnotations = eventInfo?.annotations?.length > 0;

  const content = `
      <div class="modal-header">
          <h5 class="modal-title">Details</h5>
          <button type="button" class="btn-close"></button>
      </div>
      <div class="modal-body">
          <ul class="nav nav-tabs" role="tablist">
              ${eventInfo ? `
                  <li class="nav-item">
                      <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#event-tab">Event</button>
                  </li>
                  <li class="nav-item ${!hasAnnotations ? 'd-none' : ''}" id="annotations-tab-item">
                      <button class="nav-link" data-bs-toggle="tab" data-bs-target="#annotations-tab">Annotations</button>
                  </li>
              ` : ''}
              ${sensors.length > 0 ? `
                  <li class="nav-item">
                      <button class="nav-link ${!eventInfo ? 'active' : ''}" data-bs-toggle="tab" data-bs-target="#sensor-tab">
                          Sensors <span class="mx-1 badge bg-secondary rounded-pill">${sensors.length}</span>
                      </button>
                  </li>
              ` : ''}
          </ul>
          <div class="tab-content mt-3">
              ${eventInfo ? `
                  <div class="tab-pane fade show active" id="event-tab">
                      ${renderEventContent(eventInfo)}
                  </div>
                  <div class="tab-pane fade" id="annotations-tab">
                      <div class="annotations-list">
                          ${hasAnnotations ? renderAnnotationsList(eventInfo.annotations) : ''}
                      </div>
                  </div>
              ` : ''}
              ${sensors.length > 0 ? `
                  <div class="tab-pane fade ${!eventInfo ? 'show active' : ''}" id="sensor-tab">
                      ${renderSensorsContent(sensors)}
                  </div>
              ` : ''}
          </div>
      </div>
  `;

  const modal = showModal(content);
  initializeTabs(modal);

}

export function renderEventContent(eventInfo) {
  const date = new Date(eventInfo.x * 1000 + appState.streaming.startTime);
  const timestamp = formatDateWithOffset(date);

  return `
      <div class="list-group-item">
          <div class="row">
              <div>
                  <small class="text-muted">Event Name</small>
                  <div class="fw-bold">${eventInfo.name}</div>
              </div>
          </div>
          <div class="row mt-2">
              <div class="col-6">
                  <small class="text-muted">Ranking</small>
                  <div class="fw-bold">${eventInfo.ranking}</div>
              </div>
              <div class="col-6">
                  <small class="text-muted">Time</small>
                  <div class="fw-bold">${formatReadableDate(date)}</div>
              </div>
          </div>
          <div class="mt-3">
              <label class="form-label">Add Annotation</label>
              <textarea class="form-control" id="eventAnnotation" rows="2"></textarea>
              <button class="btn btn-primary btn-sm mt-2" id="saveAnnotationBtn">Save Annotation</button>
          </div>
          <button class="btn ${eventInfo.isImportant ? "btn-warning" : "btn-outline-secondary"} btn-sm mt-3 me-2 toggle-importance" 
              data-event-id="${eventInfo.event_id}"
              data-timestamp-id="${eventInfo.timestamp_id}"
              data-timestamp="${timestamp}">
              <i class="fas fa-star me-1"></i>
              ${eventInfo.isImportant ? "Important" : "Mark as Important"}
          </button>
      </div>
  `;
}

export function renderSensorsContent(sensors) {
  return sensors
    .map(
      (sensor, index) => `
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
        ${index < sensors.length - 1 ? '<hr class="mt-2 mb-3"/>' : ""}
    `
    )
    .join("");
}
