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
      
      // const { xMin, xMax } = range;
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

          renderer.drawPolyline({ x, y }); // TODO: Replace with drawPoint instead

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