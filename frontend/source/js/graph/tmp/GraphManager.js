import {
  clearSensorBuffers,
  clearEventBuffer,
  getSensorBuffers,
  getEventBuffer,
} from "../buffer.js";
import { updateLegend } from "../legend.js";
import { handleCanvasClick } from "../clickHandler.js";
// import { plotSensors } from "./sensorPlotter.js";
// import { plotEvents } from "./eventPlotter.js";
import { calculateXRange, drawHighlights } from "./graphUtils.js";

export default class GraphManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.renderer = null;
    this.viewportSettings = { start: 0.05, end: 1 };

    // State management
    this.isDrawing = false;
    this.isPaused = false;
    this.forceRedraw = false;

    // Highlight tracking
    this.highlightedSensors = [];
    this.highlightedEvent = null;

    // Caches and mappings
    this.previousWindow = { xMin: 0, xMax: 30 };
    this.previousLatestXRef = { value: undefined };
    this.groupSensorMap = {};
    this.groupIntervals = {};
    this.newEventCounter = { count: 0 };
  }

  initialize(autoStart = false) {
    GR.ready(() => {
      this.renderer = new GR(this.canvasId);
      this.renderer.clearws();
      this.renderer.setcolormap(3);
      this.renderer.setviewport(0.01, 1, 0.05, 1);
      this.viewportSettings = { start: 0, end: 1 };

      const canvasElement = document.getElementById(this.canvasId);
      if (canvasElement) {
        canvasElement.addEventListener("click", (event) =>
          handleCanvasClick(event, this)
        );
      }
      if (autoStart) this.startDrawing();
    });
  }

  startDrawing() {
    if (!this.renderer) {
      console.error("Renderer not initialized.");
      return;
    }
    this.isDrawing = true;
    this.isPaused = false;
    this._drawFrame();
  }

  pauseDrawing() {
    if (this.isDrawing) this.isPaused = true;
    this._drawFrame();
  }

  requestRedraw() {
    if (this.isPaused) {
      this.forceRedraw = true;
      this._drawFrame();
    }
  }

  stopDrawing() {
    this.isDrawing = false;
    this.isPaused = false;
  }

  reset() {
    this.stopDrawing();
    clearSensorBuffers();
    clearEventBuffer();
    this.renderer.clearws();
    updateLegend({}, {}, {});
    this.renderer.updatews();
  }

  _drawFrame() {
    if (!this.isDrawing) return;
    if (this.isPaused && !this.forceRedraw) return;

    const range = calculateXRange(
      getSensorBuffers(),
      this.previousWindow,
      this.previousLatestXRef
    );
    if (!range) {
      requestAnimationFrame(() => this._drawFrame());
      return;
    }
    const { xMin, xMax } = range;
    const yMin = 0,
      yMax = 1;
    if (xMin === Infinity || xMax === -Infinity) {
      requestAnimationFrame(() => this._drawFrame());
      return;
    }

    this.renderer.clearws();
    this.renderer.setwindow(xMin, xMax, yMin, yMax);
    this.renderer.setlinecolorind(1);
    this.renderer.grid(0.25, 0.25, 0, 0, 2, 2);

    const xTickInterval = Math.ceil((xMax - xMin) / 10) || 1;
    this.renderer.axes(
      xTickInterval,
      (yMax - yMin) / 10 || 1,
      xMin,
      yMin,
      2,
      0,
      0.005,
      (tickValue) => Math.round(tickValue)
    );

    const { groupColorMap, groupSensorMap } = this.plotSensorData();
    this.plotEventLines();

    updateLegend(
      groupColorMap || {},
      groupSensorMap || {},
      this.groupIntervals || {}
    );

    drawHighlights(
      this.renderer,
      this.highlightedSensors,
      this.highlightedEvent,
      xMin,
      xMax,
      getSensorBuffers()
    );

    this.forceRedraw = false;
    if (!this.isPaused) {
      requestAnimationFrame(() => this._drawFrame());
    }
  }

  plotSensorData() {
    const buffers = getSensorBuffers();
    const groupColorMap = {};
    const computedGroupSensorMap = {};
    let nextColorIndex = 4;

    const range = calculateXRange(
      buffers,
      this.previousWindow,
      this.previousLatestXRef
    );
    if (!range)
      return { groupColorMap, groupSensorMap: computedGroupSensorMap }; // Return empty maps instead of just groupColorMap

    const { xMin, xMax } = range;

    Object.entries(buffers).forEach(([_, { x, y, group, sensorName }]) => {
      if (x.length > 0 && y.length > 0 && group) {
        // Add group check
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

        this.renderer.setlinecolorind(groupColorMap[group]); // Fix: use this.renderer instead of this.gr
        this.renderer.polyline(plotX.length, plotX, plotY);
      }
    });

    return { groupColorMap, groupSensorMap: computedGroupSensorMap };
  }

  getSensorBuffers() {
    return getSensorBuffers();
  }

  plotEventLines() {
    const events = getEventBuffer();
    if (!events.length) return;

    const { xMin, xMax } = calculateXRange(
      this.getSensorBuffers(),
      this.previousWindow,
      this.previousLatestXRef
    );

    events.forEach((event) => {
      if (event.x < xMin || event.x > xMax) return;

      if (event.isImportant) {
        this.gr.setlinecolorind(2);
        this.gr.setlinetype(1);
        const xCoords = [event.x, event.x];
        const yCoords = [0, 1];
        this.gr.polyline(2, xCoords, yCoords);
      } else if (event.isNew) {
        this.gr.setlinecolorind(1);
        this.gr.setlinetype(-6);
        const xCoords = [event.x, event.x];
        const yCoords = [0.1, 0.95];
        this.gr.polyline(2, xCoords, yCoords);

        if (!event.newCounted) {
          this.newEventCount++;
          event.newCounted = true;
        }
      } else {
        this.gr.setlinecolorind(1);
        this.gr.setlinetype(3);
        const xCoords = [event.x, event.x];
        const yCoords = [0.05, 0.9];
        this.gr.polyline(2, xCoords, yCoords);
      }
    });

    this.gr.setlinetype(1);
    this.gr.setlinecolorind(1);
  }

  getSensorBuffers() {
    return getSensorBuffers();
  }

  getEventBuffer() {
    return getEventBuffer();
  }
}
