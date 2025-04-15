import appState from "../state.js";
import { updateSensorCount, showToast } from "../utils.js";
import { startSlidingWindowStream, stopSlidingWindowStream, resumeStream, rewindStream } from "./streamHandler.js";
import { clearSensorBuffers, clearEventBuffer } from "../graph/buffer.js";

const slider = document.getElementById("sensor-slider");
const DEFAULT_STREAM_INTERVAL = 80;

/**
 * Changes the streaming speed by updating the streamInterval configuration
 * @param {number} speedFactor - Factor to multiply/divide the default speed (0.5, 1, or 2)
 */
async function changeStreamSpeed(speedFactor) {
  try {
    // Calculate new interval - higher interval = slower speed
    const newInterval = Math.round(DEFAULT_STREAM_INTERVAL / speedFactor);
    
    const response = await fetch("/api/streaming/config", {
      method: "PUT", 
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        streamInterval: newInterval,
        slidingWindowDuration: 30 * 1000, // Keep original value
        windowIncrement: 500 // Keep original value
      })
    });
    
    if (response.ok) {
      // Also send a command to update the speed of the current stream
      if (appState.streaming.eventSource && !appState.streaming.isPaused) {
        await fetch("/api/streaming/speed", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ speedFactor })
        });
      }
      
      // Update speed buttons UI
      updateSpeedButtonsUI(speedFactor);
      showToast("info", "Speed Changed", `Streaming speed set to ${speedFactor}x`);
    } else {
      console.error("Failed to update stream speed");
      showToast("danger", "Error", "Failed to update streaming speed");
    }
  } catch (error) {
    console.error("Error changing stream speed:", error);
    showToast("danger", "Error", "Failed to update streaming speed");
  }
}

/**
 * Updates the UI of speed buttons to reflect current selection
 * @param {number} activeFactor - Currently active speed factor
 */
function updateSpeedButtonsUI(activeFactor) {
  const speedButtons = {
    0.5: document.getElementById("speed-half"),
    1: document.getElementById("speed-normal"),
    2: document.getElementById("speed-double")
  };
  
  // Reset all buttons
  Object.values(speedButtons).forEach(btn => {
    btn.classList.remove("active", "btn-secondary");
    btn.classList.add("btn-outline-secondary");
  });
  
  // Highlight active button
  const activeButton = speedButtons[activeFactor];
  if (activeButton) {
    activeButton.classList.remove("btn-outline-secondary");
    activeButton.classList.add("active", "btn-secondary");
  }
}

/**
 * Fetch available sensor count and update slider max value
 */
async function updateSensorLimit() {
  try {
    const response = await fetch("/api/sensors/count");
    if (response.ok) {
      const { count } = await response.json();
      
      slider.max = count;
      
      if (parseInt(slider.value) > count) {
        slider.value = count;
        updateSensorCount(count);
        appState.sensors.limit = count;
        updateSensorInfoDisplay(count);
      }
    } else {
      console.error("Failed to fetch sensor count");
    }
  } catch (error) {
    console.error("Error fetching sensor count:", error);
  }
}

/**
 * Updates the sensor info display with the current sensor's data
 * @param {number} sensorLimit - Current value of the sensor slider
 */
async function updateSensorInfoDisplay(sensorLimit) {
  const sensorInfoDisplay = document.getElementById("sensor-info-display");
  
  if (!sensorLimit || sensorLimit <= 0) {
    sensorInfoDisplay.textContent = "No sensor selected";
    return;
  }
  
  try {
    const response = await fetch(`/api/sensors/info?id=${sensorLimit}`);
    
    if (!response.ok) {
      sensorInfoDisplay.textContent = `Sensor ${sensorLimit} - No information available`;
      return;
    }
    
    const sensorInfo = await response.json();
    
    if (sensorInfo) {
      const { sensor_name, ranking, event_count } = sensorInfo;
      const eventsText = event_count === 1 ? "event" : "events";
      sensorInfoDisplay.textContent = `${sensor_name} - ${ranking.toFixed(1)} - (${event_count} ${eventsText})`;
    } else {
      sensorInfoDisplay.textContent = `Sensor ${sensorLimit} - No information available`;
    }
  } catch (error) {
    console.error("Error fetching sensor info:", error);
    sensorInfoDisplay.textContent = `Error loading sensor information`;
  }
}

/**
 * Set up all UI controls for streaming functionality
 */
export function initializeControls() {

  updateSensorLimit();

  const initialLimit = parseInt(slider.value);
  updateSensorCount(initialLimit);
  appState.sensors.limit = initialLimit;
  updateSensorInfoDisplay(initialLimit);

  slider.addEventListener("input", (event) => {
    const newLimit = parseInt(event.target.value);
    appState.sensors.limit = newLimit;
    updateSensorCount(newLimit);
    updateSensorInfoDisplay(newLimit);
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
    updateSensorInfoDisplay(newValue);
  });

  document.getElementById("decrease-sensor").addEventListener("click", () => {
    const newValue = Math.max(parseInt(slider.value) - 1, slider.min);
    slider.value = newValue;
    updateSensorCount(newValue);
    updateSensorInfoDisplay(newValue);
  });

  document.getElementById("pause-button").addEventListener("click", () => {
    if (!appState.streaming.eventSource || appState.streaming.isPaused) return;

    fetch("/api/streaming/pause", { method: "PUT" })
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

      if (appState.streaming.eventSource) {
        appState.streaming.eventSource.close();
        appState.update("streaming", { eventSource: null });
      }

      clearSensorBuffers();
      clearEventBuffer();

      if (appState.graph.manager) {
        appState.graph.manager.stopDrawing();
        appState.graph.manager.reset();
        
        if (appState.graph.manager.renderer) {
          appState.graph.manager.renderer.reset();
          appState.graph.manager.renderer.previousWindow = { xMin: 0, xMax: 30 };
          appState.graph.manager.renderer.previousLatestX = undefined;
        }
      }
      
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


  document.getElementById("rewind-button").addEventListener("click", () => {
    const rewindTimeInput = document.getElementById("rewind-time");
    const offsetSeconds = parseInt(rewindTimeInput.value) || 0;
    
    if (offsetSeconds < 0) {
      rewindTimeInput.value = "0";
      showToast("warning", "Invalid Time", "Please enter a positive number of seconds");
      return;
    }
    
    rewindStream(offsetSeconds);
  });

  document.getElementById("rewind-time").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const rewindTimeInput = document.getElementById("rewind-time");
      const offsetSeconds = parseInt(rewindTimeInput.value) || 0;
      
      if (offsetSeconds < 0) {
        rewindTimeInput.value = "0";
        showToast("warning", "Invalid Time", "Please enter a positive number of seconds");
        return;
      }
      
      rewindStream(offsetSeconds);
    }
  });

  document.getElementById("speed-half").addEventListener("click", () => {
    changeStreamSpeed(0.5);
  });
  
  document.getElementById("speed-normal").addEventListener("click", () => {
    changeStreamSpeed(1);
  });
  
  document.getElementById("speed-double").addEventListener("click", () => {
    changeStreamSpeed(2);
  });

}

/**
 * Get current sensor limit from slider
 */
export function getCurrentSensorLimit() {
  return parseInt(slider.value);
}