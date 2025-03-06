import {
  getSensorBuffers,
  clearSensorBuffers,
  clearEventBuffer,
  getEventBuffer,
} from "./buffer.js";
import { updateLegend } from "./legend.js";
import { handleCanvasClick } from "./clickHandler.js";

import GraphRenderer from "./components/graphRenderer.js";
import HighlightManager from "./components/highlightManager.js";
import SensorPlotter from "./components/sensorPlotter.js";
import EventPlotter from "./components/eventPlotter.js";

export default class GraphManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    
    // Component initialization
    this.renderer = new GraphRenderer(canvasId);
    this.highlightManager = new HighlightManager();
    this.sensorPlotter = new SensorPlotter();
    this.eventPlotter = new EventPlotter();
    
    // State management
    this.isDrawing = false;
    this.isPaused = false;
    this.forceRedraw = false;
    this.lastUpdateTime = 0;
    
    // Group mapping
    this.groupSensorMap = {};
    this.groupIntervals = {};
    
    this.lastClickY = null;
  }

  /**
   * Initializes the graph instance and components
   * @param {boolean} autoStart - Whether to start rendering immediately
   */
  initialize(autoStart = false) {
    this.renderer.initialize().then(() => {
      this.renderer.setViewport(this.renderer);
      
      const canvasElement = document.getElementById(this.canvasId);
      if (canvasElement) {
        canvasElement.addEventListener("click", (event) => 
          handleCanvasClick(event, this)
        );
      }
      
      if (autoStart) this.startDrawing();
    });
  }

  /**
   * Starts the graph rendering process
   */
  startDrawing() {
    this.isDrawing = true;
    this.isPaused = false;
    this.drawFrame();
  }

  /**
   * Pauses the graph rendering process
   */
  pauseDrawing() {
    if (this.isDrawing) {
      this.isPaused = true;
    }
    this.drawFrame();
  }

  /**
   * Requests a redraw of the graph
   */
  requestRedraw() {
    this.forceRedraw = true;
    this.drawFrame();
  }

  /**
   * Stops the graph rendering process
   */
  stopDrawing() {
    this.isDrawing = false;
    this.isPaused = false;
  }

  /**
   * Resets the graph state
   */
  reset() {
    this.stopDrawing();
    clearSensorBuffers();
    clearEventBuffer();
    this.renderer.clear();
    updateLegend({}, {}, {});
    this.renderer.updateWorkstation();
  }

  /**
   * Main drawing function that coordinates all components
   */
  drawFrame() {
    if (!this.isDrawing) return;
    if (this.isPaused && !this.forceRedraw) return;

    const buffers = getSensorBuffers();
    const range = this.renderer.calculateVisibleWindow(buffers);
    
    if (!range) {
      requestAnimationFrame(() => this.drawFrame());
      return;
    }

    let { xMin, xMax } = range;
    const yMin = 0, yMax = 1;

    if (xMin === Infinity || xMax === -Infinity) {
      requestAnimationFrame(() => this.drawFrame());
      return;
    }

    // Clear and set up the graph
    this.renderer.clear();
    this.renderer.setWindow(xMin, xMax, yMin, yMax);
    this.renderer.drawGrid(0.25, 0.25);

    // Draw axes
    const xTickInterval = Math.ceil((xMax - xMin) / 10) || 1;
    this.renderer.drawAxes(
      xTickInterval,
      (yMax - yMin) / 10 || 1,
      xMin,
      yMin,
      (tickValue) => Math.round(tickValue)
    );

    // Plot data elements
    const events = getEventBuffer();
    const groupColorMap = this.sensorPlotter.plotSensorData(this.renderer, buffers, range);
    this.eventPlotter.plotEventLines(this.renderer, events, range);
    
    // Update the group sensor map from the plotter
    this.groupSensorMap = this.sensorPlotter.getGroupSensorMap();
    
    // Update the legend
    updateLegend(groupColorMap, this.groupSensorMap, this.groupIntervals);

    // Draw highlights on top
    this.highlightManager.drawHighlights(this.renderer, buffers, range);

    this.forceRedraw = false;

    if (!this.isPaused) {
      requestAnimationFrame(() => this.drawFrame());
    }
  }

  /**
   * Gets the current sliding window range
   */
  calculateSlidingWindowXRange() {
    const buffers = getSensorBuffers();
    return this.renderer.calculateVisibleWindow(buffers);
  }

  /**
   * Gets the canvas bounding rectangle
   */
  getBoundingClientRect() {
    return this.renderer.getCanvasRect(this.canvasId);
  }

  /**
   * Gets the sensor buffers
   */
  getSensorBuffers() {
    return getSensorBuffers();
  }

  /**
   * Gets the event buffer
   */
  getEventBuffer() {
    return getEventBuffer();
  }
  
  /**
   * Sets the highlighted sensors
   */
  set highlightedSensors(sensorIds) {
    this.highlightManager.setHighlightedSensors(sensorIds);
  }
  
  /**
   * Gets the highlighted sensors
   */
  get highlightedSensors() {
    return this.highlightManager.highlightedSensors;
  }
  
  /**
   * Sets the highlighted event
   */
  set highlightedEvent(event) {
    this.highlightManager.setHighlightedEvent(event);
  }
  
  /**
   * Gets the highlighted event
   */
  get highlightedEvent() {
    return this.highlightManager.highlightedEvent;
  }
}
