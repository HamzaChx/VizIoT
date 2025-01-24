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
    // this.rewindOffset = 0;
    // this.maxRewindOffset = 30;
    // this.activeHighlight = null;
  }

  /**
   * Initializes the graph instance, configures the viewport, and starts rendering if required.
   * @param {boolean} autoStart - Whether to start rendering immediately after initialization.
   */
  initialize(autoStart = false) {
    GR.ready(() => {
      this.gr = new GR(this.canvasId);

      // Configure the viewport
      this.gr.clearws();
      this.gr.setviewport(0.1, 0.95, 0.1, 0.95);

      // Add the click event listener
      const canvasElement = document.getElementById(this.canvasId);
      canvasElement.addEventListener("click", (event) =>
        handleCanvasClick(event, canvasElement, this)
      );

      if (autoStart) this.startDrawing();
    });
  }

  // handleRewind(event) {
  //   if (!this.isPaused) return;

  //   event.preventDefault();

  //   // Calculate rewind adjustment (in seconds)
  //   const delta = event.deltaY > 0 ? 1 : -1;
  //   this.rewindOffset = Math.max(
  //     0,
  //     Math.min(this.maxRewindOffset, this.rewindOffset + delta)
  //   );

  //   // Trigger redraw
  //   this.drawFrame();
  // }

  initialize(autoStart = false) {
    GR.ready(() => {
      this.gr = new GR(this.canvasId);
      this.gr.clearws();
      this.gr.setviewport(0.05, 0.95, 0.05, 0.95);

      const canvasElement = document.getElementById(this.canvasId);
      if (canvasElement) {
        canvasElement.addEventListener("click", (event) =>
          handleCanvasClick(event, canvasElement, this)
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
      // this.rewindOffset = 0;
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

    this.startDrawing();
  }

  /**
   * Draws a single frame of the graph, including axes, grid, and sensor data.
   */
  drawFrame() {
    if (!this.isDrawing) return;

    const { xMin, xMax } = this.calculateXRange();
    const yMin = 0,
      yMax = 1;

    if (xMin === Infinity || xMax === -Infinity) {
      requestAnimationFrame(() => this.drawFrame());
      return;
    }

    this.gr.clearws();
    this.gr.setwindow(xMin, xMax, yMin, yMax);

    // if (this.rewindOffset > 0) {
    //   this.gr.setlinecolorind(2); // Red
    //   this.gr.text(0.1, 0.95, `${this.rewindOffset}s`);
    // }

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

  // resetRewind() {
  //   this.rewindOffset = 0;
  //   this.drawFrame();
  // }

  /**
   * Calculates the global X-axis range across all sensor buffers.
   * @returns {{xMin: number, xMax: number}} - The X-axis range.
   */
  calculateXRange() {
    const buffers = getSensorBuffers();
    let xMin = Infinity,
      xMax = -Infinity;

    Object.values(buffers).forEach(({ x }) => {
      if (x.length > 0) {
        xMin = Math.min(xMin, x[0]);
        xMax = Math.max(xMax, x[x.length - 1]);
      }
    });

    return { xMin, xMax };
  }

  /**
   * Plots sensor data on the graph and assigns colors to groups.
   * @returns {Object} - The group color map.
   */
  plotSensorData() {
    const buffers = getSensorBuffers();
    const groupColorMap = {};
    let nextColorIndex = 4;

    Object.entries(buffers).forEach(([_, { x, y, group }]) => {
      if (x.length > 0 && y.length > 0) {
        if (!(group in groupColorMap)) {
          groupColorMap[group] = nextColorIndex--;
          if (nextColorIndex < 1) nextColorIndex = 8;
        }

        // Plot the data
        this.gr.setlinecolorind(groupColorMap[group]);
        this.gr.polyline(x.length, x, y);
      }
    });

    return groupColorMap;
  }

  plotEventLines() {
    const events = getEventBuffer();
    if (!events.length) return;

    const { xMin, xMax } = this.calculateXRange();
    const yMin = 0,
      yMax = 1;

    events.forEach((event) => {
      if (event.x < xMin || event.x > xMax) return;

      this.gr.setlinecolorind(1);
      this.gr.setlinetype(event.ranking >= 0.5 ? 1 : 3); // Solid/dashed
      this.gr.setlinewidth(2);

      const xCoords = [event.x, event.x];
      const yCoords = [yMin, yMax];
      this.gr.polyline(2, xCoords, yCoords);
    });

    this.gr.setlinewidth(1);
    this.gr.setlinetype(1);
  }
}
