import GraphManager from "./graph/graph.js";
import {
  updateEventBuffer,
  updateSensorBuffers,
  cleanupUnusedSensors,
} from "./graph/buffer.js";
import { updateSensorCount, showNewEventsMessage } from "./utils.js";

let graphManager = null;
let eventSource = null;
let startTime = null;
let isPaused = false;
let lastTimestamp = null;

let sensorLimit = 1;
const slider = document.getElementById("sensor-slider");

slider.addEventListener("input", (event) => {
  const newLimit = parseInt(event.target.value);
  updateSensorCount(newLimit, isPaused, graphManager, lastTimestamp, sensorLimit);
  
  if (graphManager) {
    graphManager.captureSliderStepBaseline();
    
    setTimeout(() => {
      const newCount = graphManager.newEventCount;
      if (newCount > 0) {
        showNewEventsMessage(newCount);
      }
    }, 100);
  }

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
  if (graphManager) {
    graphManager.captureSliderStepBaseline();
    setTimeout(() => {
      const newCount = graphManager.newEventCount;
      if (newCount > 0) {
        showNewEventsMessage(newCount);
      }
    }, 100);
  }
});

document.getElementById("decrease-sensor").addEventListener("click", () => {
  const newValue = Math.max(parseInt(slider.value) - 1, slider.min);
  slider.value = newValue;
  updateSensorCount(newValue, isPaused, graphManager, lastTimestamp, sensorLimit);
});

document.getElementById("pause-button").addEventListener("click", () => {
  if (!eventSource || isPaused) return;

  fetch("/pause-stream", { method: "POST" })
    .then((response) => {
      if (response.ok) {
        isPaused = true;
        graphManager.pauseDrawing();

        const toast = document.getElementById("streamStatusToast");
        const toastHeader = toast.getElementsByClassName("toast-header")[0];

        toastHeader.classList.remove("bg-danger");
        toastHeader.classList.add("bg-dark");

        toast.getElementsByClassName("toast-body")[0].textContent = "The sliding window stream has been paused.";

        const bsToast = new bootstrap.Toast(toast, {
          delay: 1500,
        });
        bsToast.show();
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
      const { events, sensorData, groupSensorMap, groupIntervals } = JSON.parse(event.data);

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

  eventSource.addEventListener("close", () => {
    eventSource.close();
    eventSource = null;
    graphManager.reset();

    const toast = document.getElementById("streamStatusToast");
    toast.getElementsByClassName("toast-body")[0].textContent =
      "The sliding window stream has been closed.";
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
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

  const toast = document.getElementById("streamStatusToast");
  const toastHeader = toast.getElementsByClassName("toast-header")[0];
  
  toastHeader.classList.remove("bg-dark");
  toastHeader.classList.add("bg-danger");

  toast.getElementsByClassName("toast-body")[0].textContent =
    "The sliding window stream has been stopped.";
  const bsToast = new bootstrap.Toast(toast, {
    delay: 2000,
  });
  bsToast.show();
}

export { startSlidingWindowStream, stopSlidingWindowStream };
