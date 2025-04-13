export default class GraphRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.gr = null;
    
    this.viewportSettings = {
      xMin: 0.01,
      xMax: 1,
      yMin: 0.05,
      yMax: 1
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
        this.setViewport();
        resolve();
      });
    });
  }
  
  setViewport() {
    if (this.gr) {
      this.gr.setviewport(
        this.viewportSettings.xMin, 
        this.viewportSettings.xMax, 
        this.viewportSettings.yMin, 
        this.viewportSettings.yMax
      );
    }
  }

  calculateVisibleWindow(buffers) {
    const latestX = Object.values(buffers).reduce((latest, { x }) => {
      if (!x || x.length === 0) return latest;
      return Math.max(latest, x[x.length - 1]);
    }, -Infinity);
    
    if (latestX === -Infinity) {
      return this.previousWindow;
    }
    
    if (this.previousLatestX !== undefined && 
        latestX - this.previousLatestX < this.updateThreshold) {
      return this.previousWindow;
    }

    const newWindow = {
      xMin: latestX - this.windowDuration,
      xMax: latestX
    };
    
    this.previousLatestX = latestX;
    this.previousWindow = newWindow;
    
    return newWindow;
  }

  getCanvasRect() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return null;
  
    const canvasRect = canvas.getBoundingClientRect();
    return {
      left: canvasRect.left + canvasRect.width * this.viewportSettings.xMin,
      top: canvasRect.top + canvasRect.height * this.viewportSettings.yMin,
      width: canvasRect.width * (this.viewportSettings.xMax - this.viewportSettings.xMin),
      height: canvasRect.height * (this.viewportSettings.yMax - this.viewportSettings.yMin),
      right: canvasRect.left + canvasRect.width * this.viewportSettings.xMax,
      bottom: canvasRect.top + canvasRect.height * this.viewportSettings.yMax,
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

  reset() {
    this.previousWindow = { xMin: 0, xMax: 30 };
    this.previousLatestX = undefined;
    this.clear();
  }

}