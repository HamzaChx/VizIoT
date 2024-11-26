function preprocessData(data) {
  const { sensorData, processEvents = [] } = data;

  // Process sensor data into the format required for plotting
  const processedData = sensorData.map(({ sensor_name, timestamp, value }) => {
      const date = new Date(timestamp);
      const timeInSeconds = date.getTime() / 1000; // Convert to seconds for the graph
      return {
          sensor: sensor_name,
          x: timeInSeconds,
          y: value
      };
  });

  return { processedData, processEvents };
}


function plotData(graphData, events) {
    console.log('Plotting data incrementally:', graphData, events);

    try {
        GR.ready(function () {
            const gr = new GR("example-canvas");

            // Extract x and y values from graphData
            const x = graphData.map((point) => point.x);
            const y = graphData.map((point) => point.y);

            // Ensure there is data to plot
            if (x.length === 0 || y.length === 0) {
                console.warn("No data to plot.");
                return;
            }

            // Calculate data ranges
            let xMin = Math.min(...x);
            let xMax = Math.max(...x);
            let yMin = Math.min(...y);
            let yMax = Math.max(...y);

            // Validate and adjust ranges to prevent invalid windows
            if (xMin === xMax) {
                xMin -= 1; // Add padding if x range is zero
                xMax += 1;
            }
            if (yMin === yMax) {
                yMin -= 1; // Add padding if y range is zero
                yMax += 1;
            }

            if (isNaN(xMin) || isNaN(xMax) || isNaN(yMin) || isNaN(yMax)) {
                console.error("Invalid data range for SET_WINDOW.");
                return;
            }

            // Configure the graph viewport and window
            gr.clearws();
            gr.setviewport(0.1, 0.95, 0.1, 0.95);

            // Set the window for the plot
            gr.setwindow(xMin, xMax, yMin, yMax);

            // Draw axes and grid
            gr.grid(1, 1, 0, 0, 2, 2);
            gr.axes(
                (xMax - xMin) / 10 || 1, // X-axis tick interval
                (yMax - yMin) / 10 || 1, // Y-axis tick interval
                xMin, yMin,
                2, 2, 0.005
            );

            // Animation logic
            let currentIndex = 0; // Start plotting from the first point

            function drawIncrementally() {
                if (currentIndex >= x.length) {
                    console.log('All points plotted.');
                    return; // Stop the animation when all points are plotted
                }

                // Clear the workspace before redrawing
                gr.clearws();
                gr.setviewport(0.1, 0.95, 0.1, 0.95);
                gr.setwindow(xMin, xMax, yMin, yMax);

                gr.setlinecolorind(1);
                gr.grid(1, 1, 0, 0, 2, 2);
                gr.axes(
                    (xMax - xMin) / 10 || 1,
                    (yMax - yMin) / 10 || 1,
                    xMin, yMin,
                    0, 0, 0.005
                );

                // Plot the polyline incrementally up to the current index
                gr.setlinecolorind(4);
                gr.polyline(currentIndex + 1, x.slice(0, currentIndex + 1), y.slice(0, currentIndex + 1));

                // Plot event markers, if any, that fall within the currently drawn range
                events.forEach((event) => {
                    const eventTime = new Date(event.timestamp).getTime() / 1000; // Convert to seconds
                    if (eventTime >= xMin && eventTime <= x[currentIndex]) {
                        gr.setmarkercolorind(2); // Marker color (e.g., red)
                        gr.polymarker(1, [eventTime], [y[0]]); // Adjust event Y coordinate as needed
                    }
                });

                // Increment the index for the next frame
                currentIndex++;

                // Schedule the next frame
                requestAnimationFrame(drawIncrementally);
            }

            // Start the animation loop
            requestAnimationFrame(drawIncrementally);
        });
    } catch (error) {
        console.error('Error plotting data incrementally:', error);
    }
}


export { preprocessData, plotData };