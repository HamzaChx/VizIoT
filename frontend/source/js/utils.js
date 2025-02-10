import { cleanupUnusedSensors, updateEventBuffer, updateSensorBuffers } from "./graph/buffer.js";

export function showMessage(message, type = "info") {
  const alertBox = document.getElementById("alert-box");
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.classList.remove("d-none");
  alertBox.style.opacity = "1";

  setTimeout(() => {
    alertBox.style.opacity = "0";
    setTimeout(() => {
      alertBox.classList.add("d-none");
    }, 500);
  }, 2000);
}

/**
 * Utility function to format a date string with offset.
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string with timezone offset
 */
export function formatDateWithOffset(date) {
  const offset = -date.getTimezoneOffset();
  const absOffsetHours = Math.abs(Math.floor(offset / 60))
    .toString()
    .padStart(2, "0");
  const absOffsetMinutes = Math.abs(offset % 60)
    .toString()
    .padStart(2, "0");
  const sign = offset >= 0 ? "+" : "-";

  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}T${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}.${date
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}${sign}${absOffsetHours}:${absOffsetMinutes}`;
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
    .then(({ events, sensorData, groupSensorMap }) => {
      if (!sensorData || sensorData.length === 0) return;

      graphManager.groupSensorMap = groupSensorMap;
      
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
      
      if (events && events.length > 0) {
        updateEventBuffer(events);
      }

      graphManager.requestRedraw();
    })
    .catch(error => {
      console.error('Error updating paused data:', error);
    });
}