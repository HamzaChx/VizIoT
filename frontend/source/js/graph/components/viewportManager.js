export default class ViewportManager {
    constructor() {
      this.viewportSettings = {
        start: 0.05,
        end: 1
      };
      this.previousWindow = { xMin: 0, xMax: 30 };
      this.previousLatestX = undefined;
      this.windowDuration = 30;
      this.updateThreshold = 0.05;
    }
  
    setViewport(renderer) {
      if (renderer.gr) {
        renderer.gr.setviewport(0.01, 1, 0.05, 1);
      }
    }
  
    calculateVisibleWindow(buffers) {
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
        return this.previousWindow;
      }
  
      // Only update if the latest data point has moved enough
      if (
        this.previousLatestX !== undefined &&
        latestX - this.previousLatestX < this.updateThreshold
      ) {
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
  
    getCanvasRect(canvasId) {
      const canvas = document.getElementById(canvasId);
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
  }