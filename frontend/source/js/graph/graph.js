import { getSensorBuffers, clearSensorBuffers } from './buffer.js';
import { updateLegend } from './legend.js';

export default class GraphManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.gr = null;
        this.isDrawing = false;
        this.isPaused = false;
        this.groupSensorMap = {};
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
        this.isPaused = false; // Ensure it’s not paused when starting
        this.drawFrame();
    }

    /**
     * Pauses the graph rendering process.
     */
    pauseDrawing() {
        if (this.isDrawing) {
            this.isPaused = true;
            console.log("Graph rendering paused.");
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
        this.stopDrawing(); // Stop rendering
        clearSensorBuffers(); // Clear data buffers
        this.gr.clearws(); // Clear the graph workspace
        updateLegend({}); // Clear the legend
    }

    /**
     * Draws a single frame of the graph, including axes, grid, and sensor data.
     */
    drawFrame() {
        if (!this.isDrawing || this.isPaused) return;

        // Calculate X-axis range
        const { xMin, xMax } = this.calculateXRange();
        const yMin = 0, yMax = 1;

        if (xMin === Infinity || xMax === -Infinity) {
            requestAnimationFrame(() => this.drawFrame());
            return;
        }

        // Configure the graph window
        this.gr.clearws();
        this.gr.setwindow(xMin, xMax, yMin, yMax);

        // Draw grid and axes
        this.gr.setlinecolorind(1);
        this.gr.grid(0.25, 0.25, 0, 0, 2, 2);

        // Custom axis labels for the x-axis
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

        // Plot data and update legend
        const groupColorMap = this.plotSensorData();
        updateLegend(groupColorMap, this.groupSensorMap);

        // Continue rendering
        requestAnimationFrame(() => this.drawFrame());
    }

    /**
     * Calculates the global X-axis range across all sensor buffers.
     * @returns {{xMin: number, xMax: number}} - The X-axis range.
     */
    calculateXRange() {
        const buffers = getSensorBuffers();
        let xMin = Infinity, xMax = -Infinity;

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
                // Assign a color to the group if not already assigned
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
}
