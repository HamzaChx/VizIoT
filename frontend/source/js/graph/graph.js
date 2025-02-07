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
    this.isDrawing = false;
    this.isPaused = false;
    this.groupSensorMap = {};
    this.getSensorBuffers = getSensorBuffers;
    this.previousLatestX = undefined;
    this.previousWindow = undefined;
  }

  /**
   * Initializes the graph instance, configures the viewport, and starts rendering if required.
   * @param {boolean} autoStart - Whether to start rendering immediately after initialization.
   */
  initialize(autoStart = false) {
    GR.ready(() => {
      this.gr = new GR(this.canvasId);
      this.gr.clearws();

      const viewportStart = 0.05;
      const viewportEnd = 0.95;
      this.gr.setviewport(
        viewportStart,
        viewportEnd,
        viewportStart,
        viewportEnd
      );

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
    updateLegend({});

    this.previousLatestX = undefined;
    this.previousWindow = undefined;

    this.startDrawing();
  }

  // /**
  //  * Highlights the selected sensors by drawing their lines with emphasis
  //  * @param {Array} sensorIds - Array of sensor IDs to highlight
  //  */
  // highlightSensors(sensorIds) {
  //   const buffers = getSensorBuffers();
  //   const range = this.calculateSlidingWindowXRange();
  //   if (!range) return;
  //   const { xMin, xMax } = range;

  //   // Draw highlighted sensors on top
  //   sensorIds.forEach((sensorId) => {
  //     const buffer = buffers[sensorId];
  //     if (!buffer || !buffer.x.length) return;

  //     let plotX = [...buffer.x];
  //     let plotY = [...buffer.y];

  //     // Pad boundaries
  //     if (plotX[0] > xMin) {
  //       plotX.unshift(xMin);
  //       plotY.unshift(plotY[0]);
  //     }
  //     if (plotX[plotX.length - 1] < xMax) {
  //       plotX.push(xMax);
  //       plotY.push(plotY[plotY.length - 1]);
  //     }

  //     // Draw highlighted line
  //     this.gr.setlinecolorind(7); // Yellow highlight
  //     this.gr.setlinewidth(3); // Thicker line
  //     this.gr.polyline(plotX.length, plotX, plotY);
  //   });

  //   this.gr.setlinewidth(1); // Reset line width
  //   this.gr.setlinecolorind(1); // Reset line color
  // }

  /**
   * Draws a single frame of the graph, including axes, grid, and sensor data.
   */
  drawFrame() {
    if (!this.isDrawing) return;

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

    updateLegend(groupColorMap, this.groupSensorMap);

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
      return this.previousWindow || null;
    }

    const updateThreshold = 0.05; // for example, 50 ms
    if (
      this.previousLatestX !== undefined &&
      latestX - this.previousLatestX < updateThreshold
    ) {
      return this.previousWindow;
    }

    const windowDuration = 30; // seconds
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

  plotEventLines() {
    const events = getEventBuffer();
    if (!events.length) return;

    const { xMin, xMax } = this.calculateSlidingWindowXRange();

    events.forEach((event) => {
      if (event.x < xMin || event.x > xMax) return;

      this.gr.setlinecolorind(1);
      this.gr.setlinetype(3);
      this.gr.setlinewidth(2);

      const xCoords = [event.x, event.x];
      const yCoords = [0, 1];
      this.gr.polyline(2, xCoords, yCoords);
    });

    this.gr.setlinewidth(1);
    this.gr.setlinetype(1);
  }

  getEventBuffer() {
    return getEventBuffer();
  }
}
