export default class GraphRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.gr = null;
    
    this.viewportSettings = {
      start: 0.05,
      end: 1
    };
    this.previousWindow = { xMin: 0, xMax: 30 };
    this.previousLatestX = undefined;
    this.windowDuration = 30;
    this.updateThreshold = 0.05;
  }

  initialize() {
    return new Promise((resolve) => {
      GR.ready(() => {
        this.gr = new GR(this.canvasId);
        this.gr.clearws();
        this.gr.setcolormap(3);
        this.setViewport();
        resolve();
      });
    });
  }
  
  setViewport() {
    if (this.gr) {
      this.gr.setviewport(0.01, 1, 0.05, 1);
    }
  }

  calculateVisibleWindow(buffers) {
    // Find the latest timestamp across all sensor buffers
    const latestX = Object.values(buffers).reduce((latest, { x }) => {
      if (!x || x.length === 0) return latest;
      return Math.max(latest, x[x.length - 1]);
    }, -Infinity);
    
    // If no data points found, return previous window
    if (latestX === -Infinity) {
      return this.previousWindow;
    }
    
    if (this.previousLatestX !== undefined && 
        latestX - this.previousLatestX < this.updateThreshold) {
      return this.previousWindow;
    }
    
    // Create new sliding window
    const newWindow = {
      xMin: latestX - this.windowDuration,
      xMax: latestX
    };
    
    // Update state for next comparison
    this.previousLatestX = latestX;
    this.previousWindow = newWindow;
    
    return newWindow;
  }

  getCanvasRect() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    return {
      left: canvasRect.left + canvasRect.width * this.viewportSettings.start,
      top: canvasRect.top + canvasRect.height * this.viewportSettings.start,
      width: canvasRect.width * (this.viewportSettings.end - this.viewportSettings.start),
      height: canvasRect.height * (this.viewportSettings.end - this.viewportSettings.start),
      right: canvasRect.left + canvasRect.width * this.viewportSettings.end,
      bottom: canvasRect.top + canvasRect.height * this.viewportSettings.end,
    };
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
}