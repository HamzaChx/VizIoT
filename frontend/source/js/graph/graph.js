import {
  getSensorBuffers,
  clearSensorBuffers,
  clearEventBuffer,
  getEventBuffer,
} from "./buffer.js";
import { updateLegend } from "./legend.js";
import { handleCanvasClick } from "./clickHandler.js";

export default class GraphManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.gr = null;
    this.viewportSettings = {
      start: 0.05,
      end: 1,
    };

    // State management
    this.isDrawing = false;
    this.isPaused = false;
    this.forceRedraw = false;

    // Highlight tracking
    this.highlightedSensors = [];
    this.highlightedEvent = null;

    // Window calculation cache
    this.previousWindow = { xMin: 0, xMax: 30 };
    this.lastUpdateTime = 0;

    // Group mapping
    this.groupSensorMap = {};
    this.groupIntervals = {};

    this.graphY = null;

  }

  /**
   * Initializes the graph instance, configures the viewport, and starts rendering if required.
   * @param {boolean} autoStart - Whether to start rendering immediately after initialization.
   */
  initialize(autoStart = false) {
    GR.ready(() => {
      this.gr = new GR(this.canvasId);
      this.gr.clearws();
      this.gr.setcolormap(3);

      const viewportStart = 0;
      const viewportEnd = 1;
      this.gr.setviewport(0.01, 1, 0.05, 1);

      this.viewportSettings = {
        start: viewportStart,
        end: viewportEnd,
      };

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
   * Starts the graph rendering process.
   */
  startDrawing() {
    if (!this.gr) {
      console.error("GR instance not initialized.");
      return;
    }

    this.isDrawing = true;
    this.isPaused = false;
    this.drawFrame();
  }

  /**
   * Pauses the graph rendering process.
   */
  pauseDrawing() {
    if (this.isDrawing) {
      this.isPaused = true;
    }
    this.drawFrame();
  }

  requestRedraw() {
    this.forceRedraw = true;
    this.drawFrame();
  }

  /**
   * Stops the graph rendering process completely.
   */
  stopDrawing() {
    this.isDrawing = false;
    this.isPaused = false;
  }

  /**
   * Resets the graph by clearing buffers and reinitializing.
   */
  reset() {
    this.stopDrawing();

    clearSensorBuffers();
    clearEventBuffer();
    this.gr.clearws();
    updateLegend({}, {}, {});

    this.gr.updatews();
  }

  /**
   * Draws the highlights (sensor lines and event line) on top of the current frame.
   */
  drawHighlights() {
    if (!this.gr) return;
    const buffers = getSensorBuffers();
    const range = this.calculateSlidingWindowXRange();
    if (!range) return;
    const { xMin, xMax } = range;

    this.highlightedSensors.forEach((sensorId) => {
      const buffer = buffers[sensorId];
      if (!buffer || !buffer.x.length) return;

      let plotX = [...buffer.x];
      let plotY = [...buffer.y];
      if (plotX[0] > xMin) {
        plotX.unshift(xMin);
        plotY.unshift(plotY[0]);
      }
      if (plotX[plotX.length - 1] < xMax) {
        plotX.push(xMax);
        plotY.push(plotY[plotY.length - 1]);
      }

      this.gr.setlinecolorind(2);
      this.gr.setlinewidth(3);
      this.gr.polyline(plotX.length, plotX, plotY);
    });

    if (this.highlightedEvent) {
      this.gr.setlinecolorind(2);
      this.gr.setlinetype(1);
      this.gr.setlinewidth(3);
      const xCoords = [this.highlightedEvent.x, this.highlightedEvent.x];
      const yCoords = [0, 1];
      this.gr.polyline(2, xCoords, yCoords);
    }

    this.gr.setlinewidth(1);
    this.gr.setlinecolorind(1);
    this.gr.setlinetype(1);
  }

  /**
   * Modified drawFrame to call drawHighlights after drawing sensors, events, and legend.
   */
  drawFrame() {
    if (!this.isDrawing) return;

    if (this.isPaused && !this.forceRedraw) return;

    const range = this.calculateSlidingWindowXRange();
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

    this.gr.clearws();
    this.gr.setwindow(xMin, xMax, yMin, yMax);

    this.gr.setlinecolorind(1);
    this.gr.grid(0.25, 0.25, 0, 0, 2, 2);

    const xTickInterval = Math.ceil((xMax - xMin) / 10) || 1;
    this.gr.axes(
      xTickInterval,
      (yMax - yMin) / 10 || 1,
      xMin,
      yMin,
      2,
      0,
      0.005,
      (tickValue) => Math.round(tickValue)
    );

    const groupColorMap = this.plotSensorData();
    this.plotEventLines();
    updateLegend(groupColorMap, this.groupSensorMap, this.groupIntervals);

    this.drawHighlights();

    this.forceRedraw = false;

    if (!this.isPaused) {
      requestAnimationFrame(() => this.drawFrame());
    }
  }

  /**
   * Calculates the global X-axis range across all sensor buffers.
   * @returns {{xMin: number, xMax: number}} - The newWindow object with xMin and xMax values.
   */
  calculateSlidingWindowXRange() {
    const buffers = getSensorBuffers();
    let latestX = -Infinity;

    Object.values(buffers).forEach(({ x }) => {
      if (x && x.length > 0) {
        const bufferLatest = x[x.length - 1];
        if (bufferLatest > latestX) {
          latestX = bufferLatest;
        }
      }
    });

    if (latestX === -Infinity) {
      if (!this.previousWindow) {
        return { xMin: 0, xMax: 30 };
      }
      return this.previousWindow;
    }

    const updateThreshold = 0.05;
    if (
      this.previousLatestX !== undefined &&
      latestX - this.previousLatestX < updateThreshold
    ) {
      return this.previousWindow;
    }

    const windowDuration = 30;
    const newWindow = { xMin: latestX - windowDuration, xMax: latestX };

    this.previousLatestX = latestX;
    this.previousWindow = newWindow;

    return newWindow;
  }

  getBoundingClientRect() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const viewportStart = this.viewportSettings.start;
    const viewportEnd = this.viewportSettings.end;

    return {
      left: canvasRect.left + canvasRect.width * viewportStart,
      top: canvasRect.top + canvasRect.height * viewportStart,
      width: canvasRect.width * (viewportEnd - viewportStart),
      height: canvasRect.height * (viewportEnd - viewportStart),
      right: canvasRect.left + canvasRect.width * viewportEnd,
      bottom: canvasRect.top + canvasRect.height * viewportEnd,
    };
  }

  /**
   * Plots sensor data on the graph and assigns colors to groups.
   * @returns {Object} - The group color map.
   */
  plotSensorData() {
    const buffers = getSensorBuffers();
    const groupColorMap = {};
    let nextColorIndex = 4;

    const range = this.calculateSlidingWindowXRange();
    if (!range) return groupColorMap;
    const { xMin, xMax } = range;

    const computedGroupSensorMap = {};

    Object.entries(buffers).forEach(([_, { x, y, group, sensorName }]) => {
      if (x.length > 0 && y.length > 0) {
        if (!(group in groupColorMap)) {
          groupColorMap[group] = nextColorIndex--;
          if (nextColorIndex === 2) nextColorIndex = 7;
          if (nextColorIndex < 1) nextColorIndex = 8;
        }

        if (!computedGroupSensorMap[group]) {
          computedGroupSensorMap[group] = [];
        }
        if (!computedGroupSensorMap[group].includes(sensorName)) {
          computedGroupSensorMap[group].push(sensorName);
        }

        let plotX = [...x];
        let plotY = [...y];

        if (plotX[0] > xMin) {
          plotX.unshift(xMin);
          plotY.unshift(plotY[0]);
        }

        if (plotX[plotX.length - 1] < xMax) {
          plotX.push(xMax);
          plotY.push(plotY[plotY.length - 1]);
        }

        this.gr.setlinecolorind(groupColorMap[group]);
        this.gr.polyline(plotX.length, plotX, plotY);
      }
    });

    this.groupSensorMap = computedGroupSensorMap;
    return groupColorMap;
  }

  getSensorBuffers() {
    return getSensorBuffers();
  }

  plotEventLines() {
    const events = getEventBuffer();
    if (!events.length) return;
    
    const { xMin, xMax } = this.calculateSlidingWindowXRange();
    
    // Group events by type for batch rendering
    const importantEvents = [];
    const newEvents = [];
    const regularEvents = [];
    
    events.forEach(event => {
      if (event.x < xMin || event.x > xMax) return;
      if (event.isImportant) importantEvents.push(event);
      else if (event.isNew) newEvents.push(event);
      else regularEvents.push(event);
    });

    this.batchRenderEvents(importantEvents, 2, 1, [0, 1]);
    this.batchRenderEvents(newEvents, 1, -6, [0.1, 0.95]);
    this.batchRenderEvents(regularEvents, 1, 3, [0.05, 0.90]);

    this.gr.setlinecolorind(1);
    this.gr.setlinetype(1);

  }
  
  batchRenderEvents(events, colorInd, lineType, [yStart, yEnd]) {
    if (!events.length) return;
    
    this.gr.setlinecolorind(colorInd);
    this.gr.setlinetype(lineType);
    
    events.forEach(event => {
      const xCoords = [event.x, event.x];
      const yCoords = [yStart, yEnd];
      this.gr.polyline(2, xCoords, yCoords);
    });
  }

  getEventBuffer() {
    return getEventBuffer();
  }
}
