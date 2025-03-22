export default class SensorPlotter {
    constructor() {
      this.groupColorMap = {};
      this.groupSensorMap = {};
      this.nextColorIndex = 4;
      this.lastPlottedPoints = {};
      this.maxTimeGap = 2 ;
    }
  
    plotSensorData(renderer, buffers, range) {
      if (!renderer || !range) return {};
      
      this.groupColorMap = {};
      this.nextColorIndex = 4;
      const computedGroupSensorMap = {};
  
      Object.entries(buffers).forEach(([_, { x, y, group, sensorName }]) => {
        if (x.length > 0 && y.length > 0) {
          if (!(group in this.groupColorMap)) {
            this.groupColorMap[group] = this.nextColorIndex--;
            if (this.nextColorIndex === 2) this.nextColorIndex = 7;
            if (this.nextColorIndex < 1) this.nextColorIndex = 8;
          }
  
          if (!computedGroupSensorMap[group]) {
            computedGroupSensorMap[group] = [];
          }
          if (!computedGroupSensorMap[group].includes(sensorName)) {
            computedGroupSensorMap[group].push(sensorName);
          }
  
          renderer.setLineProperties(this.groupColorMap[group]);

          // Split into segments where time gaps are too large
          const segments = this.splitIntoSegments(x, y);
          segments.forEach(segment => {
            if (segment.x.length > 1) {
              renderer.drawPolyline(segment);
            }
          });
        }
      });
  
      this.groupSensorMap = computedGroupSensorMap;
      return this.groupColorMap;
    }
    
    // Split data into segments when there are significant time gaps
    splitIntoSegments(xValues, yValues) {
      const segments = [];
      let currentSegment = { x: [], y: [] };
      
      for (let i = 0; i < xValues.length; i++) {
        // Check for time gap with previous point
        if (i > 0 && (xValues[i] - xValues[i-1]) > this.maxTimeGap) {
          // Save the current segment if it has points
          if (currentSegment.x.length > 0) {
            segments.push(currentSegment);
            currentSegment = { x: [], y: [] };
          }
        }
        
        // Add point to current segment
        currentSegment.x.push(xValues[i]);
        currentSegment.y.push(yValues[i]);
      }
      
      // Add the last segment if it has points
      if (currentSegment.x.length > 0) {
        segments.push(currentSegment);
      }
      
      return segments;
    }
  
    getGroupSensorMap() {
      return this.groupSensorMap;
    }
  
    getGroupColorMap() {
      return this.groupColorMap;
    }
  }