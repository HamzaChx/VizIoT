// Tooltip Initialization
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
tooltip.style.position = 'absolute';
tooltip.style.pointerEvents = 'none';
tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
tooltip.style.color = 'white';
tooltip.style.padding = '5px 10px';
tooltip.style.borderRadius = '5px';
tooltip.style.fontSize = '12px';
tooltip.style.display = 'none';
tooltip.style.zIndex = '1000';
document.body.appendChild(tooltip);

/**
 * Show the tooltip near the cursor.
 * @param {string} content - Text to display in the tooltip.
 * @param {MouseEvent} event - Mouse event for positioning.
 */
export function showTooltip(content, event) {
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
    tooltip.style.display = 'block';
    tooltip.textContent = content;
}

/**
 * Hide the tooltip.
 */
export function hideTooltip() {
    tooltip.style.display = 'none';
}

/**
 * Detect if the mouse is near a data point.
 * @param {number} mouseX - Mouse X coordinate in world space.
 * @param {number} mouseY - Mouse Y coordinate in world space.
 * @param {number} pointX - Data point X coordinate.
 * @param {number} pointY - Data point Y coordinate.
 * @param {number} threshold - Proximity threshold for detection.
 * @returns {boolean} True if the mouse is near the point.
 */
export function isNearPoint(mouseX, mouseY, pointX, pointY, threshold = 0.02) {
    const dx = mouseX - pointX;
    const dy = mouseY - pointY;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
}

// const tooltip = document.getElementById('tooltip'); // Reference the tooltip element
// const canvas = document.getElementById('example-canvas'); // Your GR canvas element

// // Track sensor data for hover detection
// const sensorData = {}; // { sensorId: { sensorName, x: [x1, x2, ...], y: [y1, y2, ...] } }
// Object.entries(sensorBuffers).forEach(([sensorId, { x, y, group }]) => {
//     sensorData[sensorId] = { sensorName: group, x, y }; // Assume `group` is the `sensorName`
// });

// // Event listener for mouse movement on the canvas
// canvas.addEventListener('mousemove', (event) => {
//     const rect = canvas.getBoundingClientRect(); // Get canvas position and size
//     const mouseX = event.clientX - rect.left; // Mouse X relative to canvas
//     const mouseY = event.clientY - rect.top;  // Mouse Y relative to canvas

//     // Transform mouse coordinates to match GR's viewport
//     const [xWorld, yWorld] = transformToWorldCoordinates(mouseX, mouseY);

//     // Check if the mouse is near any polyline
//     let foundSensor = null;
//     for (const [sensorId, { sensorName, x, y }] of Object.entries(sensorData)) {
//         for (let i = 0; i < x.length; i++) {
//             if (isNearPoint(xWorld, yWorld, x[i], y[i])) {
//                 foundSensor = sensorName;
//                 break;
//             }
//         }
//         if (foundSensor) break;
//     }

//     // Show or hide the tooltip
//     if (foundSensor) {
//         tooltip.style.left = `${event.clientX + 10}px`;
//         tooltip.style.top = `${event.clientY + 10}px`;
//         tooltip.style.display = 'block';
//         tooltip.textContent = foundSensor;
//     } else {
//         tooltip.style.display = 'none';
//     }
// });

// // Helper: Check proximity to a point
// function isNearPoint(mouseX, mouseY, pointX, pointY, threshold = 0.02) {
//     const dx = mouseX - pointX;
//     const dy = mouseY - pointY;
//     return Math.sqrt(dx * dx + dy * dy) < threshold;
// }

// // Helper: Transform screen coordinates to GR world coordinates
// function transformToWorldCoordinates(screenX, screenY) {
//     const viewport = gr.getviewport(); // [xmin, xmax, ymin, ymax]
//     const window = gr.getwindow(); // [wxmin, wxmax, wymin, wymax]
//     const [xmin, xmax, ymin, ymax] = viewport;
//     const [wxmin, wxmax, wymin, wymax] = window;

//     const xWorld = wxmin + ((screenX - xmin) / (xmax - xmin)) * (wxmax - wxmin);
//     const yWorld = wymin + ((screenY - ymin) / (ymax - ymin)) * (wymax - wymin);

//     return [xWorld, yWorld];
// }
