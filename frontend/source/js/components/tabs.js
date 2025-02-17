import { getEventBuffer } from "../graph/buffer.js";
import { showToast } from "../utils.js";
import { setupAnnotationHandling } from "./annotations.js";

export function initializeTabs(modal) {
  setupTabHandling(modal);
  setupAnnotationHandling(modal);
  modal.querySelectorAll(".toggle-importance").forEach(button => {
    button.addEventListener("click", () => handleImportanceToggle(button));
  });
}

function setupTabHandling(modal) {
  modal.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("click", (e) => handleTabClick(e, modal));
  });
}

function handleTabClick(e, modal) {
  e.preventDefault();
  const target = modal.querySelector(e.target.dataset.bsTarget);
  if (!target) {
    return;
  }
  updateTabStates(modal, target, e.target);
}

function updateTabStates(modal, targetPane, targetTab) {
  modal
    .querySelectorAll(".tab-pane")
    .forEach((pane) => pane.classList.remove("show", "active"));
  modal
    .querySelectorAll(".nav-link")
    .forEach((link) => link.classList.remove("active"));
  targetPane.classList.add("show", "active");
  targetTab.classList.add("active");
}

async function handleImportanceToggle(button) {
  const { timestampId } = button.dataset;
  const isCurrentlyImportant = button.classList.contains("btn-warning");

  try {
    const response = await fetch("/api/events/importance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp_id: timestampId,
        is_important: !isCurrentlyImportant
      })
    });

    if (response.ok) {
      updateImportanceUI(button, isCurrentlyImportant);
      updateEventBufferImportance(timestampId, !isCurrentlyImportant);
    }
  } catch (error) {
    console.error("Error updating event importance:", error);
    showToast("danger", "Update Failed", "Failed to update event importance");
  }
}

function updateImportanceUI(button, currentState) {
  button.classList.toggle("btn-warning");
  button.classList.toggle("btn-outline-secondary");
  button.innerHTML = `
      <i class="fas fa-star me-1"></i>
      ${!currentState ? "Important" : "Mark as Important"}
    `;
}

function updateEventBufferImportance(timestampId, newState) {
  const eventBuffer = getEventBuffer();
  const event = eventBuffer.find(
    (e) => e.timestamp_id === parseInt(timestampId)
  );
  if (event) {
    event.isImportant = newState;
  }
}
