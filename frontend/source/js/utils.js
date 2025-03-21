import { cleanupUnusedSensors, updateEventBuffer, updateSensorBuffers } from "./graph/buffer.js";
import { formatDateWithOffset } from "../../../utils/utilities.js";
import appState from "./state.js";

export function showNewEventsMessage(count) {
  const messageElement = document.getElementById('new-events-message');
  const messageText = messageElement.querySelector('small');
  
  messageText.textContent = `${count} new event${count !== 1 ? 's' : ''} added`;
  messageElement.classList.remove('d-none');
  
  setTimeout(() => {
    messageElement.classList.add('fade-out');
    setTimeout(() => {
      messageElement.classList.add('d-none');
      messageElement.classList.remove('fade-out');
    }, 500);
  }, 1500);
}

export function showToast(type, title, message) {
  const toast = document.getElementById('streamStatusToast');
  const toastHeader = toast.querySelector('.toast-header');
  const toastBody = toast.querySelector('.toast-body');

  toastHeader.className = `toast-header bg-${type} text-white`;
  toastHeader.querySelector('.me-auto').textContent = title;
  toastBody.textContent = message;

  const bsToast = new bootstrap.Toast(toast, { delay: 2000 });
  bsToast.show();
}

export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function updateSliderOnPause(graphManager, newLimit, lastTimestamp) {
  if (!lastTimestamp) return;

  const timestamp = new Date(lastTimestamp);
  const formattedTimestamp = formatDateWithOffset(timestamp);

  fetch(`/api/streaming/paused-data?limit=${newLimit}&timestamp=${encodeURIComponent(formattedTimestamp)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(({ eventData, sensorData, groupSensorMap, groupIntervals }) => {
      if (!sensorData || sensorData.length === 0) return;

      appState.update('sensors', { 
        sensorMap: groupSensorMap,
        groupIntervals: groupIntervals 
      });

      graphManager.groupSensorMap = groupSensorMap;
      graphManager.groupIntervals = groupIntervals;

      const activeSensorIds = sensorData.map(d => d.sensor_id);
      cleanupUnusedSensors(activeSensorIds);

      const transformedData = sensorData.map(entry => {
        const groupRange = entry.group_max - entry.group_min;
        const scaledY = entry.group_min + entry.normalized_value * groupRange;
        
        return {
          sensorId: entry.sensor_id,
          sensorName: entry.sensor_name,
          originalValue: entry.sliced_value,
          x: (Date.parse(entry.timestamp) - appState.streaming.startTime) / 1000,
          y: scaledY,
          group: entry.group_name,
        };
      });

      updateSensorBuffers(transformedData);

      if (eventData && eventData.length > 0) {
        updateEventBuffer(eventData);
      }

      graphManager.requestRedraw();
    })
    .catch(error => {
      console.error('Error updating paused data:', error);
    });
}

export function updateSensorCount(newLimit) {

  document.getElementById("sensor-count").textContent = newLimit;

  appState.update('sensors', { limit: newLimit });
  
  if (appState.streaming.isPaused && appState.graph.manager) {
    updateSliderOnPause(appState.graph.manager, newLimit, appState.streaming.lastTimestamp);
    return;
  }
  
  fetch("/api/streaming/limit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: newLimit }),
  }).catch(error => {
    console.error("Failed to update sensor limit:", error);
    showToast("danger", "Error", "Failed to update sensor limit");
  });

}
