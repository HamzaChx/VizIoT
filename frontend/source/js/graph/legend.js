/**
 * Updates the legend displayed in the UI.
 * @param {Object} groupColorMap - Mapping of groups to colors.
 */
export function updateLegend(groupColorMap) {
    const legendList = document.getElementById("legend-list");
    if (!legendList) return;

    legendList.innerHTML = ""; // Clear existing legend

    Object.entries(groupColorMap).forEach(([group, colorIndex]) => {
        if (colorIndex !== undefined) {
            const legendItem = createLegendItem(group, colorIndex);
            legendList.appendChild(legendItem);
        }
    });
}


/**
 * Creates a legend item for a sensor group.
 * @param {string} group - The sensor group.
 * @param {number} colorIndex - The assigned color index.
 * @returns {HTMLElement} - The legend item element.
 */
function createLegendItem(group, colorIndex) {
    const legendItem = document.createElement("li");
    legendItem.style.display = "flex";
    legendItem.style.alignItems = "center";
    legendItem.style.marginBottom = "10px";

    const colorBox = document.createElement("div");
    colorBox.style.width = "20px";
    colorBox.style.height = "20px";
    colorBox.style.backgroundColor = getGRColor(colorIndex);
    colorBox.style.marginRight = "10px";

    const label = document.createElement("span");
    label.textContent = group;

    legendItem.appendChild(colorBox);
    legendItem.appendChild(label);

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