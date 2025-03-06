import GraphManager from "./graph/graph.js";
import {
  updateEventBuffer,
  updateSensorBuffers,
  cleanupUnusedSensors
} from "./graph/buffer.js";
import { updateSensorCount, showToast } from "./utils.js";
import { formatDateWithOffset } from "../../../utils/utilities.js";

let graphManager = null;
let eventSource = null;
let startTime = null;
let isPaused = false;
let lastTimestamp = null;
let retryCount = 0;

let sensorLimit = 1;
const slider = document.getElementById("sensor-slider");

slider.addEventListener("input", (event) => {
  const newLimit = parseInt(event.target.value);
  updateSensorCount(newLimit, isPaused, graphManager, lastTimestamp, sensorLimit);
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
  },
  { passive: false }
);

document.getElementById("increase-sensor").addEventListener("click", () => {
  const newValue = Math.min(parseInt(slider.value) + 1, slider.max);
  slider.value = newValue;
  updateSensorCount(newValue, isPaused, graphManager, lastTimestamp, sensorLimit);
});

document.getElementById("decrease-sensor").addEventListener("click", () => {
  const newValue = Math.max(parseInt(slider.value) - 1, slider.min);
  slider.value = newValue;
  updateSensorCount(newValue, isPaused, graphManager, lastTimestamp, sensorLimit);
});

document.getElementById("pause-button").addEventListener("click", () => {
  if (!eventSource || isPaused) return;

  fetch("/api/streaming/pause", { method: "POST" })
    .then((response) => {
      if (response.ok) {
        isPaused = true;
        graphManager.pauseDrawing();

        showToast("dark", "Event Stream Paused", "The sliding window stream has been paused.");

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
    sensorLimit = parseInt(slider.value);
    startSlidingWindowStream("example-canvas");
    return;
  }

  if (isPaused) {
    const currentLimit = parseInt(slider.value);
    fetch("/api/streaming/limit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: currentLimit }),
    })
    .then(() => {
      return fetch("/api/streaming/resume", { method: "POST" });
    })
    .then((response) => {
      if (response.ok) {
        isPaused = false;
        graphManager.startDrawing();
        const timestamp = new Date(lastTimestamp);
        const formattedTimestamp = formatDateWithOffset(timestamp);
        return fetch(`/api/streaming/paused-data?limit=${currentLimit}&timestamp=${encodeURIComponent(formattedTimestamp)}`);
      } else {
        console.error("Failed to resume stream:", response.statusText);
      }
    })
    .then(response => response.json())
    .then(({ groupSensorMap, groupIntervals }) => {
      
      graphManager.groupSensorMap = groupSensorMap;
      graphManager.groupIntervals = groupIntervals;

      graphManager.requestRedraw();
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

  sensorLimit = parseInt(slider.value);

  eventSource = new EventSource(
    `/api/streaming/window?start=${lastTimestamp || ""}&limit=${sensorLimit}`
  );

  eventSource.onmessage = (event) => {
    try {
      const { eventData, sensorData, groupSensorMap, groupIntervals } = JSON.parse(event.data);
  
      graphManager.groupSensorMap = groupSensorMap;
      graphManager.groupIntervals = groupIntervals;
  
      if (!sensorData || sensorData.length === 0) return;
  
      if (!startTime && sensorData.length > 0) {
        startTime = Date.parse(sensorData[0].timestamp);
        window.startTime = startTime;
      }
  
      const activeSensorIds = sensorData.map((d) => d.sensor_id);
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

      const events = eventData.events;
      const count = eventData.newCount;
      if (events && events.length > 0) {
        updateEventBuffer(events, count);
      }
  
      lastTimestamp = sensorData[sensorData.length - 1].timestamp;
    } catch (error) {
      console.error("Error processing sliding window data:", error);
    }
  };

  eventSource.onerror = () => {
    console.error("Sliding window stream encountered an error.");
    stopSlidingWindowStream();
    if (retryCount < 2) {
      retryCount++;
      setTimeout(() => {
        console.log("Retrying connection to sliding window stream...");
        startSlidingWindowStream(canvasId);
      }, 1000);
    }
  };

  eventSource.addEventListener("close", () => {
    eventSource.close();
    eventSource = null;
    graphManager.reset();

    showToast("dark", "Event Stream Closed", "The sliding window stream has been closed.");

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

  showToast("danger", "Event Stream Stopped", "The sliding window stream has been stopped.");

}

export { startSlidingWindowStream, stopSlidingWindowStream };
