// import GraphManager from "../graph/graph.js";
// import {
//   updateEventBuffer,
//   updateSensorBuffers,
//   cleanupUnusedSensors
// } from "../graph/buffer.js";
// import { updateSensorCount, showToast } from "../utils.js";
// import { formatDateWithOffset } from "../../../../utils/utilities.js";
// import appState from "../state.js";

// const slider = document.getElementById("sensor-slider");

// slider.addEventListener("input", (event) => {
//   const newLimit = parseInt(event.target.value);
//   appState.sensors.limit = newLimit;
//   updateSensorCount(newLimit);
// });

// slider.addEventListener("wheel", (event) => {
//     event.preventDefault();

//     const step = 1;
//     const direction = event.deltaY > 0 ? -step : step;
//     const newValue = parseInt(slider.value) + direction;

//     if (newValue >= slider.min && newValue <= slider.max) {
//       slider.value = newValue;
//       slider.dispatchEvent(new Event("input"));
//     }
//   },
//   { passive: false }
// );

// document.getElementById("increase-sensor").addEventListener("click", () => {
//   const newValue = Math.min(parseInt(slider.value) + 1, slider.max);
//   slider.value = newValue;
//   updateSensorCount(newValue);
// });

// document.getElementById("decrease-sensor").addEventListener("click", () => {
//   const newValue = Math.max(parseInt(slider.value) - 1, slider.min);
//   slider.value = newValue;
//   updateSensorCount(newValue);
// });

// document.getElementById("pause-button").addEventListener("click", () => {
//   if (!appState.streaming.eventSource || appState.streaming.isPaused) return;

//   fetch("/api/streaming/pause", { method: "POST" })
//     .then((response) => {
//       if (response.ok) {
//         appState.update('streaming', { isPaused: true });
        
//         if (appState.graph.manager) {
//           appState.graph.manager.pauseDrawing();
//         }
        
//         showToast("dark", "Event Stream Paused", "The sliding window stream has been paused.");
//       } else {
//         console.error("Failed to pause stream:", response.statusText);
//       }
//     })
//     .catch((error) => {
//       console.error("Error pausing stream:", error);
//       showToast("danger", "Error", "Failed to pause stream");
//     });
// });

// document.getElementById("play-button").addEventListener("click", () => {
//   if (!appState.streaming.eventSource || !appState.streaming.isPaused) {
//     appState.sensors.limit = parseInt(slider.value);
//     startSlidingWindowStream("example-canvas");
//     return;
//   }

//   if (appState.streaming.isPaused) {
//     const currentLimit = parseInt(slider.value);
//     fetch("/api/streaming/limit", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ limit: currentLimit }),
//     })
//     .then(() => {
//       return fetch("/api/streaming/resume", { method: "POST" });
//     })
//     .then((response) => {
//       if (response.ok) {
//         appState.update('streaming', { isPaused: false });
//         appState.graph.manager.startDrawing();
//         const timestamp = new Date(appState.streaming.lastTimestamp);
//         const formattedTimestamp = formatDateWithOffset(timestamp);
//         return fetch(`/api/streaming/paused-data?limit=${currentLimit}&timestamp=${encodeURIComponent(formattedTimestamp)}`);
//       } else {
//         throw new Error("Failed to resume stream");
//       }
//     })
//     .then(response => {
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       return response.json();
//     })
//     .then(({ groupSensorMap, groupIntervals }) => {
//       appState.update('sensors', { 
//         sensorMap: groupSensorMap,
//         groupIntervals: groupIntervals
//       });
      
//       appState.graph.manager.groupSensorMap = groupSensorMap;
//       appState.graph.manager.groupIntervals = groupIntervals;
//       appState.graph.manager.requestRedraw();
//     })
//     .catch((error) => {
//       console.error("Error resuming stream:", error);
//       showToast("danger", "Error", "Failed to resume stream");
//     });
//   }
// });

// document.getElementById("stop-button").addEventListener("click", () => {
//   stopSlidingWindowStream();
// });

// /**
//  * Starts listening to the sliding window data stream using SSE.
//  * @param {string} canvasId - The canvas element ID for the graph.
//  */
// function startSlidingWindowStream(canvasId) {
//   if (appState.streaming.eventSource && !appState.streaming.isPaused) {
//     console.log("Sliding window stream already active.");
//     return;
//   }

//   appState.reset("streaming");

//   const graphManager = new GraphManager(canvasId);
//   appState.update("graph", { manager: graphManager });
//   graphManager.initialize();
//   graphManager.startDrawing();

//   const sensorLimit = parseInt(slider.value);
//   appState.update("sensors", { limit: sensorLimit });

//   const eventSource = new EventSource(
//     `/api/streaming/window?start=${appState.streaming.lastTimestamp || ""}&limit=${sensorLimit}`
//   );
//   appState.update("streaming", { eventSource });

//   eventSource.onmessage = handleStreamMessage;
//   eventSource.onerror = handleStreamError;
  
//   eventSource.addEventListener("close", () => {
//     if (appState.streaming.eventSource) {
//       appState.streaming.eventSource.close();
//       appState.update('streaming', { eventSource: null });
//     }
    
//     if (appState.graph.manager) {
//       appState.graph.manager.reset();
//       appState.update('graph', { manager: null });
//     }
    
//     showToast("dark", "Event Stream Closed", "The sliding window stream has been closed.");
//   });

// }

// /**
//  * Stops the sliding window data stream.
//  */
// function stopSlidingWindowStream() {
//   if (appState.streaming.eventSource) {
//     appState.streaming.eventSource.close();
//     appState.update('streaming', { eventSource: null });
//   }

//   appState.reset();

//   showToast("danger", "Event Stream Stopped", "The sliding window stream has been stopped.");

// }

// /**
//  * Handles incoming stream messages
//  * @param {MessageEvent} event - The SSE message event
//  */
// function handleStreamMessage(event) {
//   try {
//     const { eventData, sensorData, groupSensorMap, groupIntervals } = JSON.parse(event.data);
    
//     appState.update('sensors', { 
//       sensorMap: groupSensorMap,
//       groupIntervals 
//     });

//     if (appState.graph.manager) {
//       appState.graph.manager.groupSensorMap = groupSensorMap;
//       appState.graph.manager.groupIntervals = groupIntervals;
//     }
    
//     if (!sensorData || sensorData.length === 0) return;
    
//     if (!appState.streaming.startTime && sensorData.length > 0) {
//       const newStartTime = Date.parse(sensorData[0].timestamp);
//       appState.update('streaming', { startTime: newStartTime });
//     }
    
//     const activeSensorIds = sensorData.map((d) => d.sensor_id);
//     cleanupUnusedSensors(activeSensorIds);
    
//     const transformedData = sensorData.map((entry) => {
//       const groupRange = entry.group_max - entry.group_min;
//       const scaledY = entry.group_min + entry.normalized_value * groupRange;
      
//       return {
//         sensorId: entry.sensor_id,
//         sensorName: entry.sensor_name,
//         originalValue: entry.sliced_value,
//         x: (Date.parse(entry.timestamp) - appState.streaming.startTime) / 1000,
//         y: scaledY,
//         group: entry.group_name,
//       };
//     });
    
//     updateSensorBuffers(transformedData);

//     console.log(eventData)

//     if (eventData.length > 0) {
//       updateEventBuffer(eventData);
//     }

//     appState.update('streaming', { 
//       lastTimestamp: sensorData[sensorData.length - 1].timestamp 
//     });
    
//     if (appState.graph.manager) {
//       appState.graph.manager.groupSensorMap = groupSensorMap;
//       appState.graph.manager.groupIntervals = groupIntervals;
//     }
//   } catch (error) {
//     console.error("Error processing sliding window data:", error);
//     showToast("danger", "Error", "Failed to process stream data");
//   }
// }

// /**
//  * Handles stream errors
//  */
// function handleStreamError() {
//   console.error("Sliding window stream encountered an error.");
//   stopSlidingWindowStream();
  
//   const currentRetryCount = appState.streaming.retryCount;
//   if (currentRetryCount < 2) {
//     appState.update('streaming', { retryCount: currentRetryCount + 1 });
    
//     setTimeout(() => {
//       console.log("Retrying connection to sliding window stream...");
//       startSlidingWindowStream("example-canvas");
//     }, 1000);
//   } else {
//     showToast("danger", "Connection Error", "Failed to reconnect to data stream after multiple attempts");
//   }
// }

// export { startSlidingWindowStream, stopSlidingWindowStream };