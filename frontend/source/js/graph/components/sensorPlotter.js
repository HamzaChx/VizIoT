export default class SensorPlotter {
    constructor() {
      this.groupColorMap = {};
      this.groupSensorMap = {};
      this.nextColorIndex = 4;
    }
  
    plotSensorData(renderer, buffers, range) {
      if (!renderer || !range) return {};
      
      const { xMin, xMax } = range;
      this.groupColorMap = {};
      this.nextColorIndex = 4;
      const computedGroupSensorMap = {};
  
      Object.entries(buffers).forEach(([_, { x, y, group, sensorName }]) => {
        if (x.length > 0 && y.length > 0) {
          // Assign color to group
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
  
          // Prepare data points with boundary extensions
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

          renderer.setLineProperties(this.groupColorMap[group]);
          renderer.drawPolyline({ x: plotX, y: plotY });
        }
      });
  
      this.groupSensorMap = computedGroupSensorMap;
      return this.groupColorMap;
    }
  
    getGroupSensorMap() {
      return this.groupSensorMap;
    }
  
    getGroupColorMap() {
      return this.groupColorMap;
    }
  }