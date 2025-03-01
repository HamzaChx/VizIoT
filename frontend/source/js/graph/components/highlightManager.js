export default class HighlightManager {
    constructor() {
      this.highlightedSensors = [];
      this.highlightedEvent = null;
    }
  
    setHighlightedSensors(sensorIds) {
      this.highlightedSensors = sensorIds;
    }
  
    setHighlightedEvent(event) {
      this.highlightedEvent = event;
    }
  
    drawHighlights(renderer, buffers, range) {
      if (!renderer || !range) return;
      const { xMin, xMax } = range;
  
      // Draw highlighted sensor lines
      this.highlightedSensors.forEach((sensorId) => {
        const buffer = buffers[sensorId];
        if (!buffer || !buffer.x.length) return;
  
        let plotX = [...buffer.x];
        let plotY = [...buffer.y];
        
        // Add boundary points for continuity
        if (plotX[0] > xMin) {
          plotX.unshift(xMin);
          plotY.unshift(plotY[0]);
        }
        if (plotX[plotX.length - 1] < xMax) {
          plotX.push(xMax);
          plotY.push(plotY[plotY.length - 1]);
        }
  
        renderer.setLineProperties(2, 3);
        renderer.drawPolyline({ x: plotX, y: plotY });
      });
  
      // Draw highlighted event line
      if (this.highlightedEvent) {
        renderer.setLineProperties(2, 3, 1);
        renderer.drawLine(this.highlightedEvent.x, 0, this.highlightedEvent.x, 1);
      }
  
      // Reset line properties
      renderer.setLineProperties(1, 1, 1);
    }
  }