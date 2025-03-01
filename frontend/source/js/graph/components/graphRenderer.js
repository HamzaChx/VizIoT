export default class GraphRenderer {
    constructor(canvasId) {
      this.canvasId = canvasId;
      this.gr = null;
    }
  
    initialize() {
      return new Promise((resolve) => {
        GR.ready(() => {
          this.gr = new GR(this.canvasId);
          this.gr.clearws();
          this.gr.setcolormap(3);
          resolve();
        });
      });
    }
  
    clear() {
      if (this.gr) this.gr.clearws();
    }
  
    updateWorkstation() {
      if (this.gr) this.gr.updatews();
    }
  
    setWindow(xMin, xMax, yMin, yMax) {
      if (this.gr) this.gr.setwindow(xMin, xMax, yMin, yMax);
    }
  
    drawGrid(xStep, yStep) {
      if (this.gr) {
        this.gr.setlinecolorind(1);
        this.gr.grid(xStep, yStep, 0, 0, 2, 2);
      }
    }
  
    drawAxes(xTickInterval, yTickInterval, xMin, yMin, tickCallback) {
      if (this.gr) {
        this.gr.axes(
          xTickInterval, 
          yTickInterval, 
          xMin, 
          yMin, 
          2, 
          0, 
          0.005, 
          tickCallback
        );
      }
    }
  
    setLineProperties(colorIndex, width, type) {
      if (this.gr) {
        this.gr.setlinecolorind(colorIndex || 1);
        if (width) this.gr.setlinewidth(width);
        if (type) this.gr.setlinetype(type);
      }
    }
  
    drawLine(x1, y1, x2, y2) {
      if (this.gr) {
        this.gr.polyline(2, [x1, x2], [y1, y2]);
      }
    }
  
    drawPolyline(points) {
      if (this.gr && points.x.length > 0) {
        this.gr.polyline(points.x.length, points.x, points.y);
      }
    }
  
    getCanvasBoundingRect() {
      const canvas = document.getElementById(this.canvasId);
      return canvas ? canvas.getBoundingClientRect() : null;
    }
  }