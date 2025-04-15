export default class SensorPlotter {
    constructor() {
      this.groupColorMap = {};
      this.groupSensorMap = {};
      this.sensorShadeMap = {}; 
      this.nextColorIndex = 4;
      this.lastPlottedPoints = {};
      this.maxTimeGap = 2 ;
    }
  
    plotSensorData(renderer, buffers, range) {
      if (!renderer || !range) return {};
      
      this.groupColorMap = {};
      this.sensorShadeMap = {}; 
      this.nextColorIndex = 4;
      const computedGroupSensorMap = {};
      
      // First pass: determine groups and count sensors in each group
      const sensorCountByGroup = {};
      const sensorsInGroup = {};
      
      Object.entries(buffers).forEach(([sensorId, { group, sensorName }]) => {
        if (!group || !sensorName) return;
        
        if (!(group in this.groupColorMap)) {
          this.groupColorMap[group] = this.nextColorIndex--;
          if (this.nextColorIndex === 2) this.nextColorIndex = 7;
          if (this.nextColorIndex < 1) this.nextColorIndex = 8;
          
          sensorCountByGroup[group] = 0;
          sensorsInGroup[group] = [];
        }
        
        if (!sensorsInGroup[group].includes(sensorName)) {
          sensorsInGroup[group].push(sensorName);
          sensorCountByGroup[group]++;
        }
        
        if (!computedGroupSensorMap[group]) {
          computedGroupSensorMap[group] = [];
        }
        
        if (!computedGroupSensorMap[group].includes(sensorName)) {
          computedGroupSensorMap[group].push(sensorName);
        }
      });
      
      // Second pass: draw sensor lines with appropriate shades
      Object.entries(buffers).forEach(([sensorId, { x, y, group, sensorName }]) => {
        if (!x || !y || !group || x.length === 0 || y.length === 0 || !sensorName) return;
        
        const baseColorIndex = this.groupColorMap[group];
        
        if (!this.sensorShadeMap[sensorId]) {
          const sensorIndex = sensorsInGroup[group].indexOf(sensorName);
          let shade = 0.5;
          
          if (sensorCountByGroup[group] > 1) {
            shade = 0.1 + (0.8 * sensorIndex / (sensorCountByGroup[group] - 1));
          }
          
          this.sensorShadeMap[sensorId] = shade;
        }
        
        renderer.setColorWithShade(baseColorIndex, this.sensorShadeMap[sensorId]);
        
        renderer.drawPolyline({ x, y });
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

    getSensorShadeMap() {
      return this.sensorShadeMap;
    }

  }