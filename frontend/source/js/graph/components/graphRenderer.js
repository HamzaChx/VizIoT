export default class GraphRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.gr = null;

    this.viewportSettings = {
      xMin: 0.01,
      xMax: 1,
      yMin: 0.05,
      yMax: 1,
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

        this.defineBaseColors();

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

  defineBaseColors() {
    if (!this.gr) return;
    // Define standard colors for groups (indices 2-8)
    this.gr.setcolorrep(2, 1.0, 0.0, 0.0);
    this.gr.setcolorrep(3, 0.0, 0.8, 0.0);
    this.gr.setcolorrep(4, 0.1, 0.4, 1.0);
    this.gr.setcolorrep(5, 1.0, 0.9, 0.0);
    this.gr.setcolorrep(6, 1.0, 0.2, 0.8);
    this.gr.setcolorrep(7, 0.0, 0.8, 0.9);
    this.gr.setcolorrep(8, 1.0, 0.5, 0.0);
  }

  setColorWithShade(baseColorIndex, shade) {
    if (!this.gr) return;
    
    const customColorIndex = 100 + (baseColorIndex * 10) + Math.floor(shade * 9);
    
    let r, g, b;
    
    switch(baseColorIndex) {
      case 2: r = 1.0; g = 0.0; b = 0.0; break;     // Red
      case 3: r = 0.0; g = 0.8; b = 0.0; break;     // Green
      case 4: r = 0.1; g = 0.4; b = 1.0; break;     // Blue
      case 5: r = 1.0; g = 0.9; b = 0.0; break;     // Yellow
      case 6: r = 1.0; g = 0.2; b = 0.8; break;     // Magenta
      case 7: r = 0.0; g = 0.8; b = 0.9; break;     // Cyan
      case 8: r = 1.0; g = 0.5; b = 0.0; break;     // Orange
      default: r = 0.0; g = 0.0; b = 0.0;           // Black (fallback)
    }

    if (shade < 0.5) {
      const factor = 0.3 + (shade * 1.4); 
      r *= factor;
      g *= factor;
      b *= factor;
    } else {
      const factor = (shade - 0.5) * 1.2;
      r = Math.min(1.0, r + (1.0 - r) * factor);
      g = Math.min(1.0, g + (1.0 - g) * factor);
      b = Math.min(1.0, b + (1.0 - b) * factor);
    }
    
    this.gr.setcolorrep(customColorIndex, r, g, b);
    this.gr.setlinecolorind(customColorIndex);
  }

  calculateVisibleWindow(buffers) {
    const latestX = Object.values(buffers).reduce((latest, { x }) => {
      if (!x || x.length === 0) return latest;
      return Math.max(latest, x[x.length - 1]);
    }, -Infinity);

    if (latestX === -Infinity) {
      return this.previousWindow;
    }

    if (
      this.previousLatestX !== undefined &&
      latestX - this.previousLatestX < this.updateThreshold
    ) {
      return this.previousWindow;
    }

    const newWindow = {
      xMin: latestX - this.windowDuration,
      xMax: latestX,
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
      width:
        canvasRect.width *
        (this.viewportSettings.xMax - this.viewportSettings.xMin),
      height:
        canvasRect.height *
        (this.viewportSettings.yMax - this.viewportSettings.yMin),
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

    if (!this.gr) return;

    this.previousWindow = { xMin: 0, xMax: 30 };
    this.previousLatestX = undefined;
    this.clear();
  }
}
