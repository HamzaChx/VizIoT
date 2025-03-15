import GraphManager from "../graph/graph.js";
import {
  updateEventBuffer,
  updateSensorBuffers,
  cleanupUnusedSensors
} from "../graph/buffer.js";
import { showToast } from "../utils.js";
import { formatDateWithOffset } from "../../../../utils/utilities.js";
import appState from "../state.js";
import { getCurrentSensorLimit } from "./controls.js";


const MAX_RETRY_ATTEMPTS = 2;

/**
 * Starts listening to the sliding window data stream using SSE.
 * @param {string} canvasId - The canvas element ID for the graph.
 */
export function startSlidingWindowStream(canvasId) {
    if (appState.streaming.eventSource && !appState.streaming.isPaused) {
      console.log("Sliding window stream already active.");
      return;
    }
  
    appState.reset("streaming");
  
    // Initialize graph
    const graphManager = new GraphManager(canvasId);
    appState.update("graph", { manager: graphManager });
    graphManager.initialize();
    graphManager.startDrawing();
  
    // Get sensor limit
    const sensorLimit = getCurrentSensorLimit();
    appState.update("sensors", { limit: sensorLimit });
  
    // Set up Event Source
    const eventSource = new EventSource(
      `/api/streaming/window?start=${appState.streaming.lastTimestamp || ""}&limit=${sensorLimit}`
    );
    appState.update("streaming", { eventSource });
  
    eventSource.onmessage = handleStreamMessage;
    eventSource.onerror = handleStreamError;
    
    eventSource.addEventListener("close", () => {
      if (appState.streaming.eventSource) {
        appState.streaming.eventSource.close();
        appState.update('streaming', { eventSource: null });
      }
      
      if (appState.graph.manager) {
        appState.graph.manager.reset();
        appState.update('graph', { manager: null });
      }
      
      showToast("dark", "Event Stream Closed", "The sliding window stream has been closed.");
    });
  }
  
  /**
   * Stops the sliding window data stream.
   */
  export function stopSlidingWindowStream() {
    if (appState.streaming.eventSource) {
      appState.streaming.eventSource.close();
      appState.update('streaming', { eventSource: null });
    }
  
    appState.graph.manager.reset();
    appState.reset();
    showToast("danger", "Event Stream Stopped", "The sliding window stream has been stopped.");
  }
  
  /**
   * Resume a paused stream
   * @param {number} currentLimit - The current sensor limit
   */
  export function resumeStream(currentLimit) {
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
        showToast("success", "Stream Resumed", "The stream has been resumed");
        appState.update('streaming', { isPaused: false });
        appState.graph.manager.startDrawing();
        const timestamp = new Date(appState.streaming.lastTimestamp);
        const formattedTimestamp = formatDateWithOffset(timestamp);
        return fetch(`/api/streaming/paused-data?limit=${currentLimit}&timestamp=${encodeURIComponent(formattedTimestamp)}`);
      } else {
        throw new Error("Failed to resume stream");
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(({ groupSensorMap, groupIntervals }) => {
      appState.update('sensors', { 
        sensorMap: groupSensorMap,
        groupIntervals: groupIntervals
      });
      
      appState.graph.manager.groupSensorMap = groupSensorMap;
      appState.graph.manager.groupIntervals = groupIntervals;
      appState.graph.manager.requestRedraw();
    })
    .catch((error) => {
      console.error("Error resuming stream:", error);
      showToast("danger", "Error", "Failed to resume stream");
    });
  }
  
  /**
   * Handles incoming stream messages
   * @param {MessageEvent} event - The SSE message event
   */
  function handleStreamMessage(event) {
    try {
      const { eventData, sensorData, groupSensorMap, groupIntervals } = JSON.parse(event.data);
      
      // Update group data
      appState.update('sensors', { 
        sensorMap: groupSensorMap,
        groupIntervals 
      });
  
      if (appState.graph.manager) {
        appState.graph.manager.groupSensorMap = groupSensorMap;
        appState.graph.manager.groupIntervals = groupIntervals;
      }
      
      if (!sensorData || sensorData.length === 0) return;
      
      // Set start time if not set
      if (!appState.streaming.startTime && sensorData.length > 0) {
        const newStartTime = Date.parse(sensorData[0].timestamp);
        appState.update('streaming', { startTime: newStartTime });
      }
      
      // Process sensor data
      const activeSensorIds = sensorData.map((d) => d.sensor_id);
      cleanupUnusedSensors(activeSensorIds);
      
      const transformedData = sensorData.map((entry) => {
        const groupRange = entry.group_max - entry.group_min;
        const scaledY = entry.group_min + entry.normalized_value * groupRange;
        
        return {
          sensorId: entry.sensor_id,
          sensorName: entry.sensor_name,
          originalValue: entry.sliced_value,
          x: (Date.parse(entry.timestamp) - appState.streaming.startTime) / 1000,
          y: scaledY,
          group: entry.group_name,
          group_min: entry.group_min,
          group_max: entry.group_max
        };
      });
      
      updateSensorBuffers(transformedData);
  
      // Process event data
      if (eventData && eventData.length > 0) {
        updateEventBuffer(eventData);
      }
  
      // Update last timestamp
      appState.update('streaming', { 
        lastTimestamp: sensorData[sensorData.length - 1].timestamp 
      });
    } catch (error) {
      console.error("Error processing sliding window data:", error);
      showToast("danger", "Error", "Failed to process stream data");
    }
  }
  
  /**
   * Handles stream errors with retry logic
   */
  function handleStreamError() {
    console.error("Sliding window stream encountered an error.");
    stopSlidingWindowStream();
    
    const currentRetryCount = appState.streaming.retryCount;
    if (currentRetryCount < MAX_RETRY_ATTEMPTS) {
      appState.update('streaming', { retryCount: currentRetryCount + 1 });
      
      setTimeout(() => {
        console.log("Retrying connection to sliding window stream...");
        startSlidingWindowStream("example-canvas");
      }, 1000);
    } else {
      showToast("danger", "Connection Error", "Failed to reconnect to data stream after multiple attempts");
    }
  }