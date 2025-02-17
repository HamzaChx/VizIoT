/**
 * Updates the legend displayed in the UI.
 * @param {Object} groupColorMap - Mapping of groups to colors.
 * @param {Object} groupSensorMap - Mapping of groups to their sensors.
 */
export function updateLegend(groupColorMap, groupSensorMap, groupIntervals) {
    const legendList = document.getElementById("legend-list");
    if (!legendList) return;

    legendList.innerHTML = "";

    Object.entries(groupColorMap).forEach(([group, colorIndex]) => {
        if (colorIndex !== undefined) {
            const legendItem = createLegendItem(group, colorIndex, groupSensorMap[group]);
            legendList.appendChild(legendItem);
        }
    });

    updateHeatmap(groupColorMap, groupIntervals);

}

/**
 * Creates a legend item for a sensor group using Bootstrap for styling.
 * @param {string} group - The sensor group.
 * @param {number} colorIndex - The assigned color index.
 * @param {Array<string>} sensors - The sensors belonging to this group.
 * @returns {HTMLElement} - The legend item element.
 */
function createLegendItem(group, colorIndex, sensors) {
    const legendItem = document.createElement("li");
    legendItem.className = "mb-3";

    const titleContainer = document.createElement("div");
    titleContainer.className = "d-flex align-items-center mb-2";

    const colorBox = document.createElement("div");
    colorBox.style.width = "16px";
    colorBox.style.height = "16px";
    colorBox.style.backgroundColor = getGRColor(colorIndex);
    colorBox.className = "me-2 rounded";

    const label = document.createElement("span");
    label.textContent = group;
    label.className = "fw-bold text-muted";

    titleContainer.appendChild(colorBox);
    titleContainer.appendChild(label);

    const sensorList = document.createElement("ul");
    sensorList.className = "list-group list-group-flush ms-3";

    if (sensors && sensors.length > 0) {
        sensors.forEach((sensorName) => {
            const sensorItem = document.createElement("li");
            sensorItem.textContent = sensorName;
            sensorItem.className = "list-group-item px-0 py-1";
            sensorList.appendChild(sensorItem);
        });
    }

    legendItem.appendChild(titleContainer);
    legendItem.appendChild(sensorList);

    return legendItem;
}

/**
 * Updates the heatmap element with colored bands for each group.
 * @param {Object} groupColorMap - Mapping of groups to color indices.
 * @param {Object} groupIntervals - Mapping of groups to vertical intervals.
 */
function updateHeatmap(groupColorMap, groupIntervals) {
    const heatmapContainer = document.getElementById("heatmap");
    if (!heatmapContainer || !groupIntervals) return;
    
    // Clear existing tooltips
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    heatmapContainer.innerHTML = "";
    
    // Sort groups by vertical position
    const sortedGroups = Object.entries(groupIntervals)
      .sort(([, a], [, b]) => b.group_max - a.group_max);
    
    sortedGroups.forEach(([group, interval]) => {
        const band = document.createElement("div");
        band.className = "heatmap-band";
        
        // Match graph viewport exactly - consider margins
        const viewportStart = 0.05; // Graph starts at 0.1
        const viewportEnd = 0.90;  // Graph ends at 0.95
        const viewportHeight = viewportEnd - viewportStart;
        
        // Adjust interval to match graph viewport
        const adjustedMax = (interval.group_max - viewportStart) / viewportHeight;
        const adjustedMin = (interval.group_min - viewportStart) / viewportHeight;
        
        const topPosition = (1 - adjustedMax) * 100;
        const height = (adjustedMax - adjustedMin) * 100;
        
        band.style.cssText = `
            position: absolute;
            top: ${topPosition}%;
            height: ${height}%;
            width: 100%;
            background-color: ${getGRColor(groupColorMap[group])};
        `;
        
        // Simple tooltip implementation
        band.setAttribute('data-group', group);
        
        // Show tooltip on hover
        band.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip show';
            tooltip.textContent = group;
            tooltip.style.cssText = `
                position: absolute;
                left: ${e.clientX + 10}px;
                top: ${e.clientY - 10}px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(tooltip);
        });
        
        band.addEventListener('mouseleave', () => {
            const tooltips = document.querySelectorAll('.tooltip');
            tooltips.forEach(tooltip => tooltip.remove());
        });
        
        heatmapContainer.appendChild(band);
    });
}

/**
 * Maps a color index to a hexadecimal color value.
 * @param {number} colorIndex - Index of the color.
 * @returns {string} - The color value.
 */
function getGRColor(colorIndex) {
    const grColorMap = {
        8: "#00008B",
        7: "#FF00FF",
        6: "#FFFF00",
        5: "#00FFFF",
        4: "#3357FF",
        3: "#33FF57",
        1: "#000000"
    };
    return grColorMap[colorIndex] || "#000000";
}
