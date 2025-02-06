import GraphManager from "./graph/graph.js";
import { updateEventBuffer, updateSensorBuffers, cleanupUnusedSensors } from "./graph/buffer.js";

let graphManager = null;
let eventSource = null;
let startTime = null;
let isPaused = false;
let lastTimestamp = null;

let sensorLimit = 1;
const slider = document.getElementById("sensor-slider");
const sensorCountLabel = document.getElementById("sensor-count");

slider.addEventListener("input", (event) => {
  const newLimit = parseInt(event.target.value);
  if (newLimit < 1) return;
  
  sensorLimit = newLimit;
  sensorCountLabel.textContent = newLimit;

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
});

slider.addEventListener("wheel", (event) => {
  event.preventDefault();
  
  const step = 1;
  const direction = event.deltaY > 0 ? -step : step;
  const newValue = parseInt(slider.value) + direction;

  if (newValue >= slider.min && newValue <= slider.max) {
      slider.value = newValue;
      slider.dispatchEvent(new Event("input"));
  }
}, { passive: false });

document.getElementById("pause-button").addEventListener("click", () => {
  if (!eventSource || isPaused) return;

  fetch("/pause-stream", { method: "POST" })
    .then((response) => {
      if (response.ok) {
        isPaused = true;
        graphManager.pauseDrawing();
      } else {
        console.error("Failed to pause stream:", response.statusText);
      }
    })
    .catch((error) => {
      console.error("Error pausing stream:", error);
    });
});

document.getElementById("play-button").addEventListener("click", () => {
  if (!eventSource && !isPaused) {
    startSlidingWindowStream("example-canvas");
    return;
  }

  if (isPaused) {
    fetch("/resume-stream", { method: "POST" })
      .then((response) => {
        if (response.ok) {
          isPaused = false;
          graphManager.startDrawing();
        } else {
          console.error("Failed to resume stream:", response.statusText);
        }
      })
      .catch((error) => {
        console.error("Error resuming stream:", error);
      });
  }
});

document.getElementById("stop-button").addEventListener("click", () => {
  stopSlidingWindowStream();
});

/**
 * Starts listening to the sliding window data stream using SSE.
 * @param {string} canvasId - The canvas element ID for the graph.
 */
function startSlidingWindowStream(canvasId) {
  if (eventSource && !isPaused) {
    console.log("Sliding window stream already active.");
    return;
  }

  lastTimestamp = null;
  startTime = null;
  window.startTime = null;
  window.previousLatestX = undefined;
  window.previousWindow = undefined;

  graphManager = new GraphManager(canvasId);
  graphManager.initialize();
  graphManager.startDrawing();

  eventSource = new EventSource(
    `/stream-sliding-window?start=${lastTimestamp || ""}&limit=${sensorLimit}`
  );

  eventSource.onmessage = (event) => {
    try {
      const { events, sensorData, groupSensorMap } = JSON.parse(event.data);

      graphManager.groupSensorMap = groupSensorMap;

      if (!sensorData || sensorData.length === 0) return;

      if (!startTime && sensorData.length > 0) {
        startTime = Date.parse(sensorData[0].timestamp);
        window.startTime = startTime;
      }

      const activeSensorIds = sensorData.map(d => d.sensor_id);
      cleanupUnusedSensors(activeSensorIds);

      const transformedData = sensorData.map((entry) => {
        const groupRange = entry.group_max - entry.group_min;
        const scaledY = entry.group_min + entry.normalized_value * groupRange;

        return {
          sensorId: entry.sensor_id,
          sensorName: entry.sensor_name,
          originalValue: entry.sliced_value,
          x: (Date.parse(entry.timestamp) - startTime) / 1000,
          y: scaledY,
          group: entry.group_name,
        };
      });

      updateSensorBuffers(transformedData);
      
      if (events && events.length > 0) {
        updateEventBuffer(events);
      }

      lastTimestamp = sensorData[sensorData.length - 1].timestamp;

    } catch (error) {
      console.error("Error processing sliding window data:", error);
    }
  };

  eventSource.onerror = () => {
    console.error("Sliding window stream encountered an error.");
    stopSlidingWindowStream();
    setTimeout(() => {
      console.log("Retrying connection to sliding window stream...");
      startSlidingWindowStream(canvasId);
    }, 5000);
  };

  eventSource.addEventListener('close', () => {
    eventSource.close();
    eventSource = null;
  });

}

/**
 * Stops the sliding window data stream.
 */
function stopSlidingWindowStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  isPaused = false;
  lastTimestamp = null;
  startTime = null;
  window.startTime = null;

  if (graphManager) {
    graphManager.reset();
    graphManager = null;
  }

  window.previousLatestX = undefined;
  window.previousWindow = undefined;

}

export { startSlidingWindowStream, stopSlidingWindowStream };
