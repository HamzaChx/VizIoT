import { formatDateWithOffset } from "../utils.js";
import { getEventBuffer } from "./buffer.js";

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
  const content = `
      <div class="modal-header">
          <h5 class="modal-title">Details</h5>
          <button type="button" class="btn-close"></button>
      </div>
      <div class="modal-body">
          <ul class="nav nav-tabs" role="tablist">
              ${
                eventInfo
                  ? `
                  <li class="nav-item">
                      <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#event-tab">Event</button>
                  </li>
              `
                  : ""
              }
              ${
                sensors.length > 0
                  ? `
                  <li class="nav-item">
                      <button class="nav-link ${
                        !eventInfo ? "active" : ""
                      }" data-bs-toggle="tab" data-bs-target="#sensor-tab">
                          Sensors (${sensors.length})
                      </button>
                  </li>
              `
                  : ""
              }
          </ul>
          <div class="tab-content mt-3">
              ${
                eventInfo
                  ? `
                  <div class="tab-pane fade show active" id="event-tab">
                      ${renderEventContent(eventInfo)}
                  </div>
              `
                  : ""
              }
              ${
                sensors.length > 0
                  ? `
                  <div class="tab-pane fade ${
                    !eventInfo ? "show active" : ""
                  }" id="sensor-tab">
                      ${renderSensorsContent(sensors)}
                  </div>
              `
                  : ""
              }
          </div>
      </div>
  `;

  const modal = showModal(content);
  initializeTabs(modal);
}

function initializeTabs(modal) {
  modal.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(e.target.dataset.bsTarget);
      modal
        .querySelectorAll(".tab-pane")
        .forEach((pane) => pane.classList.remove("show", "active"));
      modal
        .querySelectorAll(".nav-link")
        .forEach((link) => link.classList.remove("active"));
      target.classList.add("show", "active");
      e.target.classList.add("active");
    });
  });

  modal.querySelectorAll(".toggle-importance").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const eventId = e.target.dataset.eventId;
      const timestampId = e.target.dataset.timestampId;
      const timestamp = e.target.dataset.timestamp;
      const isCurrentlyImportant = e.target.classList.contains("btn-warning");
      
      try {
        const response = await fetch("/api/annotations", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: eventId,
            timestamp_id: timestampId,
            timestamp: timestamp,
            is_important: !isCurrentlyImportant,
          }),
        });

        if (response.ok) {
          // Toggle button appearance
          e.target.classList.toggle("btn-warning");
          e.target.classList.toggle("btn-outline-secondary");
          e.target.innerHTML = `
                    <i class="fas fa-star me-1"></i>
                    ${!isCurrentlyImportant ? "Important" : "Mark as Important"}
                `;

          // Update event buffer
          const eventBuffer = getEventBuffer();
          const event = eventBuffer.find(
            (e) => e.timestamp_id === parseInt(timestampId)
          );
          if (event) {
            event.isImportant = !isCurrentlyImportant;
          }
        }
      } catch (error) {
        console.error("Error updating event importance:", error);
      }
    });
  });
}

function renderEventContent(eventInfo) {
  const date = new Date(eventInfo.x * 1000 + window.startTime);
  const timestamp = formatDateWithOffset(date);

  const buttonClass = eventInfo.isImportant ? "btn-warning" : "btn-outline-secondary";
  const buttonText = eventInfo.isImportant ? "Important" : "Mark as Important";

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
                  <div class="fw-bold">${new Date(
                    eventInfo.x * 1000 + window.startTime
                  ).toLocaleString()}</div>
              </div>
          </div>
          <button class="btn ${buttonClass} btn-sm mt-3 me-2 toggle-importance" 
                data-event-id="${eventInfo.event_id}"
                data-timestamp-id="${eventInfo.timestamp_id}"
                data-timestamp="${timestamp}">
            <i class="fas fa-star me-1"></i>
            ${buttonText}
          </button>
      </div>
  `;
}

function renderSensorsContent(sensors) {
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
