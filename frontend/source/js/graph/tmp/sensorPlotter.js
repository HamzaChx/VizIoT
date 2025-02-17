import { getSensorBuffers } from "../buffer.js";
import { preparePlotData } from "./graphUtils.js";

export function plotSensors(renderer, xMin, xMax) {
    const buffers = getSensorBuffers();
    const groupColorMap = {};
    let nextColorIndex = 4;
    const computedGroupSensorMap = {};
  
    Object.values(buffers).forEach((buffer) => {
      const { x, y, group, sensorName } = buffer;
      if (x.length > 0 && y.length > 0) {
        // Assign color to group
        if (!(group in groupColorMap)) {
          groupColorMap[group] = nextColorIndex--;
          if (nextColorIndex === 2) nextColorIndex = 7;
          if (nextColorIndex < 1) nextColorIndex = 8;
        }
  
        // Track sensors in group
        if (!computedGroupSensorMap[group]) {
          computedGroupSensorMap[group] = [];
        }
        if (!computedGroupSensorMap[group].includes(sensorName)) {
          computedGroupSensorMap[group].push(sensorName);
        }
  
        // Prepare plot data with continuous lines
        const { plotX, plotY } = preparePlotData(x, y, xMin, xMax);
        
        renderer.setlinecolorind(groupColorMap[group]);
        renderer.polyline(plotX.length, plotX, plotY);
      }
    });
  
    return { groupColorMap, groupSensorMap: computedGroupSensorMap };
  }