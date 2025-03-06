import { cleanupUnusedSensors, updateEventBuffer, updateSensorBuffers } from "./graph/buffer.js";
import { formatDateWithOffset } from "../../../utils/utilities.js";

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

// export function formatDateWithOffset(date) {
//   const offset = -date.getTimezoneOffset();
//   const absOffsetHours = Math.abs(Math.floor(offset / 60))
//     .toString()
//     .padStart(2, "0");
//   const absOffsetMinutes = Math.abs(offset % 60)
//     .toString()
//     .padStart(2, "0");
//   const sign = offset >= 0 ? "+" : "-";

//   return `${date.getFullYear()}-${(date.getMonth() + 1)
//     .toString()
//     .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}T${date
//     .getHours()
//     .toString()
//     .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
//     .getSeconds()
//     .toString()
//     .padStart(2, "0")}.${date
//     .getMilliseconds()
//     .toString()
//     .padStart(3, "0")}${sign}${absOffsetHours}:${absOffsetMinutes}`;
// }

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

  fetch(`/update-paused-data?limit=${newLimit}&timestamp=${encodeURIComponent(formattedTimestamp)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(({ eventData, sensorData, groupSensorMap, groupIntervals }) => {
      if (!sensorData || sensorData.length === 0) return;

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
          x: (Date.parse(entry.timestamp) - window.startTime) / 1000,
          y: scaledY,
          group: entry.group_name,
        };
      });

      updateSensorBuffers(transformedData);
      
      const events = eventData.events;
      const count = eventData.newCount;
      if (events && events.length > 0) {
        updateEventBuffer(events, count);
      }

      graphManager.requestRedraw();
    })
    .catch(error => {
      console.error('Error updating paused data:', error);
    });
}

export function updateSensorCount(newLimit, isPaused, graphManager, lastTimestamp, sensorLimit) {

  const sensorCountLabel = document.getElementById("sensor-count");

  if (newLimit < 1) return;

  sensorLimit = newLimit;
  sensorCountLabel.textContent = newLimit;

  if (isPaused && graphManager) {
    updateSliderOnPause(graphManager, newLimit, lastTimestamp);
    return;
  }

  fetch("/update-limit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: newLimit }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to update sensor limit:", response.statusText);
      }
    })
    .catch((error) => {
      console.error("Error updating sensor limit:", error);
    });
}
