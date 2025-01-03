/**
 * Updates the legend displayed in the UI.
 * @param {Object} groupColorMap - Mapping of groups to colors.
 * @param {Object} groupSensorMap - Mapping of groups to their sensors.
 */
export function updateLegend(groupColorMap, groupSensorMap) {
    const legendList = document.getElementById("legend-list");
    if (!legendList) return;

    legendList.innerHTML = ""; // Clear existing legend

    Object.entries(groupColorMap).forEach(([group, colorIndex]) => {
        if (colorIndex !== undefined) {
            const legendItem = createLegendItem(group, colorIndex, groupSensorMap[group]);
            legendList.appendChild(legendItem);
        }
    });
}

/**
 * Creates a legend item for a sensor group.
 * @param {string} group - The sensor group.
 * @param {number} colorIndex - The assigned color index.
 * @param {Array<string>} sensors - The sensors belonging to this group.
 * @returns {HTMLElement} - The legend item element.
 */
function createLegendItem(group, colorIndex, sensors) {
    const legendItem = document.createElement("li");
    legendItem.style.display = "flex";
    legendItem.style.flexDirection = "column";
    legendItem.style.alignItems = "start";
    legendItem.style.marginBottom = "15px";

    // Group title and color box
    const titleContainer = document.createElement("div");
    titleContainer.style.display = "flex";
    titleContainer.style.alignItems = "center";

    const colorBox = document.createElement("div");
    colorBox.style.width = "20px";
    colorBox.style.height = "20px";
    colorBox.style.backgroundColor = getGRColor(colorIndex);
    colorBox.style.marginRight = "10px";

    const label = document.createElement("span");
    label.textContent = group;

    titleContainer.appendChild(colorBox);
    titleContainer.appendChild(label);

    // Sensor list
    const sensorList = document.createElement("ul");
    sensorList.style.margin = "5px 0 0 30px";
    sensorList.style.padding = "0";
    sensorList.style.listStyleType = "disc";

    if (sensors && sensors.length > 0) {
        sensors.forEach((sensorName) => {
            const sensorItem = document.createElement("li");
            sensorItem.textContent = sensorName;
            sensorList.appendChild(sensorItem);
        });
    }

    // Append group title and sensor list to legend item
    legendItem.appendChild(titleContainer);
    legendItem.appendChild(sensorList);

    return legendItem;
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
        2: "#FF0000",
        1: "#000000"
    };
    return grColorMap[colorIndex] || "#000000";
}
