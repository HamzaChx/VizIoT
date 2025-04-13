import {
  getSensorBuffers,
  clearSensorBuffers,
  clearEventBuffer,
  getEventBuffer,
} from "./buffer.js";
import { updateLegend } from "./legend.js";
import { handleCanvasClick } from "./clickHandler.js";
import appState from "../state.js";

import GraphRenderer from "./components/graphRenderer.js";
import HighlightManager from "./components/highlightManager.js";
import SensorPlotter from "./components/sensorPlotter.js";
import EventPlotter from "./components/eventPlotter.js";

export default class GraphManager {
  constructor(canvasId) {
    this.canvasId = canvasId;

    this.renderer = new GraphRenderer(canvasId);
    this.highlightManager = new HighlightManager();
    this.sensorPlotter = new SensorPlotter();
    this.eventPlotter = new EventPlotter();

    appState.update("graph", {
      manager: this,
      isDrawing: false,
      isPaused: false,
      forceRedraw: false,
      lastUpdateTime: 0,
    });
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
    appState.update("graph", { isDrawing: true, isPaused: false });
    this.drawFrame();
  }

  /**
   * Pauses the graph rendering process
   */
  pauseDrawing() {
    if (appState.graph.isDrawing) {
      appState.update("graph", { isPaused: true });
    }
    this.drawFrame();
  }

  /**
   * Requests a redraw of the graph
   */
  requestRedraw() {
    appState.update("graph", { forceRedraw: true });
    this.drawFrame();
  }

  /**
   * Stops the graph rendering process
   */
  stopDrawing() {
    appState.update("graph", { isDrawing: false, isPaused: false });
  }

  /**
   * Resets the graph state
   */
  reset() {
    this.stopDrawing();
    clearSensorBuffers();
    clearEventBuffer();

    if (this.renderer) {
      this.renderer.reset();
    }

    updateLegend({}, {}, {});
    appState.update("sensors", { groupSensorMap: {}, groupIntervals: {} });
    this.renderer.updateWorkstation();
  }

  /**
   * Main drawing function that coordinates all components
   */
  drawFrame() {
    if (!appState.graph.isDrawing) return;
    if (appState.graph.isPaused && !appState.graph.forceRedraw) return;

    const buffers = getSensorBuffers();
    const range = this.renderer.calculateVisibleWindow(buffers);

    if (!range) {
      requestAnimationFrame(() => this.drawFrame());
      return;
    }

    let { xMin, xMax } = range;
    const yMin = 0,
      yMax = 1;

    if (xMin === Infinity || xMax === -Infinity) {
      requestAnimationFrame(() => this.drawFrame());
      return;
    }

    this.renderer.clear();
    this.renderer.setWindow(xMin, xMax, yMin, yMax);
    this.renderer.drawGrid(0.25, 0.25);

    const xTickInterval = Math.ceil((xMax - xMin) / 10) || 1;
    this.renderer.drawAxes(
      xTickInterval,
      (yMax - yMin) / 10 || 1,
      xMin,
      yMin,
      (tickValue) => {
        const minutes = Math.floor(tickValue / 60);
        const seconds = Math.floor(tickValue % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    );

    const events = getEventBuffer();
    const groupColorMap = this.sensorPlotter.plotSensorData(
      this.renderer,
      buffers,
      range
    );
    this.eventPlotter.plotEventLines(this.renderer, events, range);

    appState.update("sensors", {
      groupSensorMap: this.sensorPlotter.getGroupSensorMap(),
    });

    updateLegend(
      groupColorMap,
      appState.sensors.groupSensorMap,
      appState.sensors.groupIntervals
    );

    this.highlightManager.drawHighlights(this.renderer, buffers, range);

    appState.update("graph", { forceRedraw: false });

    if (!appState.graph.isPaused) {
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
    appState.update("ui", { highlightedSensors: sensorIds });
    this.highlightManager.setHighlightedSensors(sensorIds);
  }

  /**
   * Gets the highlighted sensors
   */
  get highlightedSensors() {
    return appState.ui.highlightedSensors;
  }

  /**
   * Sets the highlighted event
   */
  set highlightedEvent(event) {
    appState.update("ui", { highlightedEvent: event });
    this.highlightManager.setHighlightedEvent(event);
  }

  /**
   * Gets the highlighted event
   */
  get highlightedEvent() {
    return appState.ui.highlightedEvent;
  }
}
