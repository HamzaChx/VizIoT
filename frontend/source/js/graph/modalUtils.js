// import { formatDateWithOffset } from "../utils.js";
// import { getEventBuffer } from "./buffer.js";

// export function setupModalDrag(modal) {
//   const dialog = modal.querySelector(".modal-dialog");
//   const header = dialog.querySelector(".modal-header");
//   let isDragging = false;
//   let currentX;
//   let currentY;
//   let initialX;
//   let initialY;
//   let xOffset = 0;
//   let yOffset = 0;

//   header.addEventListener("mousedown", (e) => {
//     initialX = e.clientX - xOffset;
//     initialY = e.clientY - yOffset;
//     if (e.target === header || e.target.closest(".modal-header")) {
//       isDragging = true;
//     }
//   });

//   document.addEventListener("mousemove", (e) => {
//     if (!isDragging) return;
//     e.preventDefault();

//     currentX = e.clientX - initialX;
//     currentY = e.clientY - initialY;

//     xOffset = currentX;
//     yOffset = currentY;

//     dialog.style.transform = `translate(${currentX}px, ${currentY}px)`;
//   });

//   document.addEventListener("mouseup", () => {
//     isDragging = false;
//   });

//   document
//     .querySelectorAll(".sensor-modal-close")
//     .forEach((btn) => (btn.onclick = () => (modal.style.display = "none")));

//   modal.onclick = (e) => {
//     if (e.target === modal) modal.style.display = "none";
//   };
// }

// export function setupModalClose(modal) {
//   modal.querySelector(".btn-close").onclick = () =>
//     (modal.style.display = "none");
//   modal.onclick = (e) => {
//     if (e.target === modal || e.target.closest("#example-canvas")) {
//       modal.style.display = "none";
//     }
//   };
// }

// export function showModal(content) {
//   const modal = document.getElementById("dynamic-modal");
//   const modalContent = modal.querySelector(".modal-content");
//   modalContent.innerHTML = content;
//   modal.classList.add("show");
//   modal.style.display = "block";
//   setupModalDrag(modal);
//   setupModalClose(modal);
//   return modal;
// }

// export function showCombinedModal(eventInfo, sensors) {
//   const content = `
//       <div class="modal-header">
//           <h5 class="modal-title">Details</h5>
//           <button type="button" class="btn-close"></button>
//       </div>
//       <div class="modal-body">
//           <ul class="nav nav-tabs" role="tablist">
//               ${eventInfo ? `
//                   <li class="nav-item">
//                       <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#event-tab">Event</button>
//                   </li>
//                   <li class="nav-item">
//                       <button class="nav-link" data-bs-toggle="tab" data-bs-target="#annotations-tab">
//                           Annotations <span class="badge bg-secondary" id="annotation-count"></span>
//                       </button>
//                   </li>
//               ` : ''}
//               ${sensors.length > 0 ? `
//                   <li class="nav-item">
//                       <button class="nav-link ${!eventInfo ? 'active' : ''}" data-bs-toggle="tab" data-bs-target="#sensor-tab">
//                           Sensors (${sensors.length})
//                       </button>
//                   </li>
//               ` : ''}
//           </ul>
//           <div class="tab-content mt-3">
//               ${eventInfo ? `
//                   <div class="tab-pane fade show active" id="event-tab">
//                       ${renderEventContent(eventInfo)}
//                   </div>
//                   <div class="tab-pane fade" id="annotations-tab">
//                       <div class="annotations-list"></div>
//                   </div>
//               ` : ''}
//               ${sensors.length > 0 ? `
//                   <div class="tab-pane fade ${!eventInfo ? 'show active' : ''}" id="sensor-tab">
//                       ${renderSensorsContent(sensors)}
//                   </div>
//               ` : ''}
//           </div>
//       </div>
//   `;

//   const modal = showModal(content);
//   initializeTabs(modal);
  
//   if (eventInfo) {
//     loadAnnotations(eventInfo.event_id);
//   }
// }

// async function saveAnnotation(modal, eventId, timestampId) {
//   const annotationText = modal.querySelector('#eventAnnotation').value.trim();
//   if (!annotationText) return;

//   try {
//     const response = await fetch('/api/annotations', {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         event_id: eventId,
//         timestamp_id: timestampId,
//         annotation: annotationText
//       })
//     });

//     if (!response.ok) {
//       throw new Error('Failed to save annotation');
//     }

//     // Show success toast
//     const toast = document.getElementById('streamStatusToast');
//     const toastHeader = toast.querySelector('.toast-header');
//     const toastBody = toast.querySelector('.toast-body');

//     toastHeader.className = 'toast-header bg-success text-white';
//     toastHeader.querySelector('.me-auto').textContent = 'Annotation Status';
//     toastBody.textContent = 'Annotation saved successfully';

//     const bsToast = new bootstrap.Toast(toast, { delay: 2000 });
//     bsToast.show();

//     // Refresh annotations list
//     await loadAnnotations(eventId);

//     // Clear the input
//     modal.querySelector('#eventAnnotation').value = '';

//   } catch (error) {
//     console.error('Error saving annotation:', error);
    
//     // Show error toast
//     const toast = document.getElementById('streamStatusToast');
//     const toastHeader = toast.querySelector('.toast-header');
//     const toastBody = toast.querySelector('.toast-body');

//     toastHeader.className = 'toast-header bg-danger text-white';
//     toastHeader.querySelector('.me-auto').textContent = 'Annotation Status';
//     toastBody.textContent = 'Failed to save annotation';

//     const bsToast = new bootstrap.Toast(toast, { delay: 2000 });
//     bsToast.show();
//   }
// }

// function setupAnnotationHandling(modal) {
//   const saveBtn = modal.querySelector('#saveAnnotationBtn');
//   if (!saveBtn) return;

//   const eventData = modal.querySelector('.toggle-importance').dataset;
//   const handleSave = () => saveAnnotation(modal, eventData.eventId, eventData.timestampId);

//   saveBtn.addEventListener('click', handleSave);

//   const annotationInput = modal.querySelector('#eventAnnotation');
//   if (annotationInput) {
//     annotationInput.addEventListener('keydown', e => {
//       if (e.key === 'Enter' && !e.shiftKey) {
//         e.preventDefault();
//         handleSave();
//       }
//     });
//   }
// }

// function initializeTabs(modal) {
//   modal.querySelectorAll('[data-bs-toggle="tab"]').forEach((tab) => {
//     tab.addEventListener("click", (e) => {
//       e.preventDefault();
//       const target = document.querySelector(e.target.dataset.bsTarget);
//       modal
//         .querySelectorAll(".tab-pane")
//         .forEach((pane) => pane.classList.remove("show", "active"));
//       modal
//         .querySelectorAll(".nav-link")
//         .forEach((link) => link.classList.remove("active"));
//       target.classList.add("show", "active");
//       e.target.classList.add("active");
//     });
//   });

//   modal.querySelectorAll(".toggle-importance").forEach((button) => {
//     button.addEventListener("click", async (e) => {
//       const eventId = e.target.dataset.eventId;
//       const timestampId = e.target.dataset.timestampId;
//       const isCurrentlyImportant = e.target.classList.contains("btn-warning");

//       try {
//         const response = await fetch("/api/annotations", {
//           method: "PUT",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             event_id: eventId,
//             timestamp_id: timestampId,
//             is_important: !isCurrentlyImportant,
//           }),
//         });

//         if (response.ok) {
//           e.target.classList.toggle("btn-warning");
//           e.target.classList.toggle("btn-outline-secondary");
//           e.target.innerHTML = `
//                     <i class="fas fa-star me-1"></i>
//                     ${!isCurrentlyImportant ? "Important" : "Mark as Important"}
//                 `;

//           const eventBuffer = getEventBuffer();
//           const event = eventBuffer.find(
//             (e) => e.timestamp_id === parseInt(timestampId)
//           );
//           if (event) {
//             event.isImportant = !isCurrentlyImportant;
//           }
//         }
//       } catch (error) {
//         console.error("Error updating event importance:", error);
//       }
//     });
//   });

//   const saveBtn = modal.querySelector('#saveAnnotationBtn');
//   if (saveBtn) {
//     saveBtn.addEventListener('click', async () => {
//       const eventData = modal.querySelector('.toggle-importance').dataset;
//       await saveAnnotation(modal, eventData.eventId, eventData.timestampId);
//     });

//     const annotationInput = modal.querySelector('#eventAnnotation');
//     if (annotationInput) {
//       annotationInput.addEventListener('keydown', async (e) => {
//         if (e.key === 'Enter' && !e.shiftKey) {
//           e.preventDefault();
//           const eventData = modal.querySelector('.toggle-importance').dataset;
//           await saveAnnotation(modal, eventData.eventId, eventData.timestampId);
//         }
//       });
//     }
//   }

// }

// function renderEventContent(eventInfo) {
//   const date = new Date(eventInfo.x * 1000 + window.startTime);
//   const timestamp = formatDateWithOffset(date);

//   const buttonClass = eventInfo.isImportant
//     ? "btn-warning"
//     : "btn-outline-secondary";
//   const buttonText = eventInfo.isImportant ? "Important" : "Mark as Important";

//   return `
//       <div class="list-group-item">
//           <div class="row">
//               <div>
//                   <small class="text-muted">Event Name</small>
//                   <div class="fw-bold">${eventInfo.name}</div>
//               </div>
//           </div>
//           <div class="row mt-2">
//               <div class="col-6">
//                   <small class="text-muted">Ranking</small>
//                   <div class="fw-bold">${eventInfo.ranking}</div>
//               </div>
//               <div class="col-6">
//                   <small class="text-muted">Time</small>
//                   <div class="fw-bold">${new Date(
//                     eventInfo.x * 1000 + window.startTime
//                   ).toLocaleString()}</div>
//               </div>
//           </div>
//           <div class="mt-3">
//               <label class="form-label">Annotation</label>
//               <textarea class="form-control" id="eventAnnotation" rows="2">${
//                 eventInfo.annotation || ""
//               }</textarea>
//               <button class="btn btn-primary btn-sm mt-2" id="saveAnnotationBtn">
//                 Save Annotation
//               </button>
//             </div>
//           <button class="btn ${buttonClass} btn-sm mt-3 me-2 toggle-importance" 
//                 data-event-id="${eventInfo.event_id}"
//                 data-timestamp-id="${eventInfo.timestamp_id}"
//                 data-timestamp="${timestamp}">
//             <i class="fas fa-star me-1"></i>
//             ${buttonText}
//           </button>
//       </div>
//   `;
// }

// function renderSensorsContent(sensors) {
//   return sensors
//     .map(
//       (sensor, index) => `
//       <div class="list-group-item">
//           <div class="d-flex justify-content-between align-items-center mb-2">
//               <h6 class="mb-0">${sensor.sensorName}</h6>
//               <span class="badge bg-secondary">${sensor.group}</span>
//           </div>
//           <div class="row">
//               <div class="col-6">
//                   <small class="text-muted">Value</small>
//                   <div class="fw-bold">${sensor.value}</div>
//               </div>
//               <div class="col-6">
//                   <small class="text-muted">Time</small>
//                   <div class="fw-bold">${sensor.timestamp}</div>
//               </div>
//           </div>
//       </div>
//       ${index < sensors.length - 1 ? '<hr class="mt-2 mb-3"/>' : ""}
//   `
//     )
//     .join("");
// }

// async function loadAnnotations(eventId) {
//   try {
//     const response = await fetch(`/api/annotations/${eventId}`);
//     const annotations = await response.json();
    
//     const annotationsList = document.querySelector('.annotations-list');
//     const annotationCount = document.getElementById('annotation-count');
    
//     annotationCount.textContent = annotations.length;
    
//     annotationsList.innerHTML = annotations.map(ann => `
//       <div class="card mb-2">
//         <div class="card-body">
//           <p class="card-text">${ann.annotation}</p>
//           <small class="text-muted">
//             Added on ${new Date(ann.created_at).toLocaleString()}
//           </small>
//         </div>
//       </div>
//     `).join('');
    
//   } catch (error) {
//     console.error('Error loading annotations:', error);
//   }
// }

