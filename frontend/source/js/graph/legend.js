import appState from "../state.js";

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
        const sensorShadeMap = appState.graph.manager?.sensorPlotter?.getSensorShadeMap() || {};
        const sensorBuffers = appState.graph.manager?.getSensorBuffers() || {};
        
        sensors.forEach((sensorName) => {
            const sensorItem = document.createElement("li");
            sensorItem.className = "list-group-item px-0 py-1 d-flex align-items-center";

            const sensorId = Object.keys(sensorBuffers).find(id => 
                sensorBuffers[id].sensorName === sensorName && 
                sensorBuffers[id].group === group
            );
            
            const sensorColorBox = document.createElement("span");
            sensorColorBox.style.width = "10px";
            sensorColorBox.style.height = "10px";
            sensorColorBox.className = "me-2 rounded-circle";
            
            if (sensorId && sensorShadeMap[sensorId]) {
                const shade = sensorShadeMap[sensorId];
                sensorColorBox.style.backgroundColor = getShadedColor(colorIndex, shade);
            } else {
                sensorColorBox.style.backgroundColor = getGRColor(colorIndex);
            }
            
            sensorItem.appendChild(sensorColorBox);
            sensorItem.appendChild(document.createTextNode(sensorName));
            sensorList.appendChild(sensorItem);
        });
    }

    legendItem.appendChild(titleContainer);
    legendItem.appendChild(sensorList);

    return legendItem;
}

/**
 *  Generates a shaded color based on the color index and shade value
 * @param {number} colorIndex - The index of the color in the color map
 * @param {number} shade - The shade value (0 to 1) to determine the lightness/darkness of the color
 * @returns 
 */
function getShadedColor(colorIndex, shade) {
    let r, g, b;
    
    switch(colorIndex) {
        case 2: r = 255; g = 0; b = 0; break;         // Red
        case 3: r = 0; g = 204; b = 0; break;         // Green
        case 4: r = 26; g = 102; b = 255; break;      // Blue
        case 5: r = 255; g = 230; b = 0; break;       // Yellow
        case 6: r = 255; g = 51; b = 204; break;      // Magenta
        case 7: r = 0; g = 204; b = 255; break;       // Cyan
        case 8: r = 255; g = 128; b = 0; break;       // Orange
        default: return getGRColor(colorIndex);        // Use default
    }
    
    if (shade < 0.5) {
        const factor = 0.3 + (shade * 1.4); // 0.3 to 1.0
        r = Math.round(r * factor);
        g = Math.round(g * factor);
        b = Math.round(b * factor);
    } else {
        const factor = (shade - 0.5) * 1.2; // 0 to 0.6
        r = Math.min(255, Math.round(r + (255 - r) * factor));
        g = Math.min(255, Math.round(g + (255 - g) * factor));
        b = Math.min(255, Math.round(b + (255 - b) * factor));
    }
    
    return `rgb(${r}, ${g}, ${b})`;
}

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
 * Updates the heatmap element with colored bands for each group.
 * @param {Object} groupColorMap - Mapping of groups to color indices.
 * @param {Object} groupIntervals - Mapping of groups to vertical intervals.
 */
function updateHeatmap(groupColorMap, groupIntervals) {
    const heatmapContainer = document.getElementById("heatmap");
    if (!heatmapContainer || !groupIntervals) return;
    
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    heatmapContainer.innerHTML = "";
    
    const sortedGroups = Object.entries(groupIntervals)
      .sort(([, a], [, b]) => b.group_max - a.group_max);
    
    sortedGroups.forEach(([group, interval]) => {
        const band = document.createElement("div");
        band.className = "heatmap-band";
        
        const viewportStart = 0.05;
        const viewportEnd = 0.90;
        const viewportHeight = viewportEnd - viewportStart;
        
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
            opacity: 0.8;
        `;
        
        band.setAttribute('data-group', group);
        
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
        1: "#000000",               // Black
        2: "#FF0000",               // Red
        3: "#00CC00",               // Green
        4: "#1A66FF",               // Blue
        5: "#FFE600",               // Yellow
        6: "#FF33CC",               // Magenta
        7: "#00CCFF",               // Cyan
        8: "#FF8000"                // Orange
    };
    return grColorMap[colorIndex] || "#000000";}
