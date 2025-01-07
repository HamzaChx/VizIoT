/**
 * Updates the legend displayed in the UI.
 * @param {Object} groupColorMap - Mapping of groups to colors.
 * @param {Object} groupSensorMap - Mapping of groups to their sensors.
 */
export function updateLegend(groupColorMap, groupSensorMap) {
    const legendList = document.getElementById("legend-list");
    if (!legendList) return;

    legendList.innerHTML = "";

    Object.entries(groupColorMap).forEach(([group, colorIndex]) => {
        if (colorIndex !== undefined) {
            const legendItem = createLegendItem(group, colorIndex, groupSensorMap[group]);
            legendList.appendChild(legendItem);
        }
    });
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
