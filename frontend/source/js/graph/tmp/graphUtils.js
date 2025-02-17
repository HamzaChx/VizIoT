/**
 * Prepares plot data by ensuring the data arrays span the current window.
 */
export function preparePlotData(xArray, yArray, xMin, xMax) {
    const plotX = [...xArray];
    const plotY = [...yArray];
    if (plotX[0] > xMin) {
      plotX.unshift(xMin);
      plotY.unshift(plotY[0]);
    }
    if (plotX[plotX.length - 1] < xMax) {
      plotX.push(xMax);
      plotY.push(plotY[plotY.length - 1]);
    }
    return { plotX, plotY };
  }
  
  /**
   * Calculates the global X-axis range across all sensor buffers.
   * @param {Object} buffers - The sensor buffers.
   * @param {Object} previousWindow - The previous window { xMin, xMax }.
   * @param {Object} previousLatestXRef - A mutable reference for the latest X value.
   * @returns {{xMin: number, xMax: number}}
   */
  export function calculateXRange(buffers, previousWindow, previousLatestXRef) {
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
      return previousWindow || { xMin: 0, xMax: 30 };
    }
  
    const updateThreshold = 0.05;
    if (
      previousLatestXRef.value !== undefined &&
      latestX - previousLatestXRef.value < updateThreshold
    ) {
      return previousWindow;
    }
  
    const windowDuration = 30;
    const newWindow = { xMin: latestX - windowDuration, xMax: latestX };
  
    previousLatestXRef.value = latestX;
    return newWindow;
  }
  
  /**
   * Draws highlights for sensor lines and events.
   */
  export function drawHighlights(renderer, highlightedSensors, highlightedEvent, xMin, xMax, buffers) {
    highlightedSensors.forEach((sensorId) => {
      const buffer = buffers[sensorId];
      if (!buffer || !buffer.x.length) return;
      const { plotX, plotY } = preparePlotData(buffer.x, buffer.y, xMin, xMax);
      renderer.setlinecolorind(2);
      renderer.setlinewidth(3);
      renderer.polyline(plotX.length, plotX, plotY);
    });
  
    if (highlightedEvent) {
      renderer.setlinecolorind(2);
      renderer.setlinetype(1);
      renderer.setlinewidth(3);
      renderer.polyline(2, [highlightedEvent.x, highlightedEvent.x], [0, 1]);
    }
  
    renderer.setlinewidth(1);
    renderer.setlinecolorind(1);
    renderer.setlinetype(1);
  }
  