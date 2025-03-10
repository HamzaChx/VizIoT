import appState from "../state.js";
import { updateSensorCount, showToast } from "../utils.js";
import { startSlidingWindowStream, stopSlidingWindowStream, resumeStream } from "./streamHandler.js";

const slider = document.getElementById("sensor-slider");

/**
 * Set up all UI controls for streaming functionality
 */
export function initializeControls() {

  const initialLimit = parseInt(slider.value);
  updateSensorCount(initialLimit);
  appState.sensors.limit = initialLimit;

  slider.addEventListener("input", (event) => {
    const newLimit = parseInt(event.target.value);
    appState.sensors.limit = newLimit;
    updateSensorCount(newLimit);
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

  document.getElementById("increase-sensor").addEventListener("click", () => {
    const newValue = Math.min(parseInt(slider.value) + 1, slider.max);
    slider.value = newValue;
    updateSensorCount(newValue);
  });

  document.getElementById("decrease-sensor").addEventListener("click", () => {
    const newValue = Math.max(parseInt(slider.value) - 1, slider.min);
    slider.value = newValue;
    updateSensorCount(newValue);
  });

  document.getElementById("pause-button").addEventListener("click", () => {
    if (!appState.streaming.eventSource || appState.streaming.isPaused) return;

    fetch("/api/streaming/pause", { method: "POST" })
      .then((response) => {
        if (response.ok) {
          appState.update('streaming', { isPaused: true });
          
          if (appState.graph.manager) {
            appState.graph.manager.pauseDrawing();
          }
          
          showToast("dark", "Event Stream Paused", "The sliding window stream has been paused.");
        } else {
          console.error("Failed to pause stream:", response.statusText);
        }
      })
      .catch((error) => {
        console.error("Error pausing stream:", error);
        showToast("danger", "Error", "Failed to pause stream");
      });
  });

  document.getElementById("play-button").addEventListener("click", () => {
    if (!appState.streaming.eventSource || !appState.streaming.isPaused) {
      appState.sensors.limit = parseInt(slider.value);
      startSlidingWindowStream("example-canvas");
      return;
    }

    if (appState.streaming.isPaused) {
      resumeStream(parseInt(slider.value));
    }
  });

  document.getElementById("stop-button").addEventListener("click", () => {
    stopSlidingWindowStream();
  });
}

/**
 * Get current sensor limit from slider
 */
export function getCurrentSensorLimit() {
  return parseInt(slider.value);
}