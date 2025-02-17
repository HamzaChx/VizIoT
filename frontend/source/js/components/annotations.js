import { showToast, escapeHtml } from "../utils.js";

export async function saveAnnotation(modal, timestampId) {
  const annotationText = modal.querySelector("#eventAnnotation").value.trim();
  if (!annotationText) return;

  try {
    const response = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp_id: timestampId,
        annotation: annotationText,
      }),
    });

    if (!response.ok) throw new Error("Failed to save annotation");

    const annotations = await response.json();
    updateAnnotationsUI(modal, annotations);

    showToast("success", "Annotation Status", "Annotation saved successfully");

    modal.querySelector("#eventAnnotation").value = "";
  } catch (error) {
    console.error("Error saving annotation:", error);
    showToast("danger", "Annotation Status", "Failed to save annotation");
  }
}

function updateAnnotationsUI(modal, annotations) {
  const hasAnnotations = annotations.length > 0;
  const annotationsTab = modal.querySelector('#annotations-tab-item');
  const annotationsList = modal.querySelector('.annotations-list');
  const annotationCount = annotationsTab?.querySelector('.badge');

  if (annotationsTab) {
    annotationsTab.classList.remove('d-none');
    if (annotationCount) {
      annotationCount.textContent = hasAnnotations ? annotations.length : '';
    }
  }

  if (annotationsList) {
    if (hasAnnotations) {
      annotationsList.innerHTML = renderAnnotationsList(annotations);
    } else {
      annotationsList.innerHTML = `
        <div class="text-center py-4">
          <p class="text-muted mb-0">
            No event annotations yet
          </p>
          <small class="text-muted">
            Add an annotation using the form in the Event tab
          </small>
        </div>
      `;
    }
  }
}

export function renderAnnotationsList(annotations) {
  return annotations
    .map(annotation => `
      <div class="card mb-2">
        <div class="card-body position-relative">
          <button type="button" 
            class="btn-close position-absolute top-0 end-0 m-2 delete-annotation" 
            data-annotation-id="${annotation.annotation_id}"
            aria-label="Delete annotation">
          </button>
          <p class="card-text pe-4">${escapeHtml(annotation.annotation)}</p>
          <small class="text-muted">
            Added on ${new Date(annotation.created_at).toLocaleString()}
          </small>
        </div>
      </div>
    `)
    .join('');
}

export function setupAnnotationHandling(modal) {
  const saveButton = modal.querySelector("#saveAnnotationBtn");
  if (!saveButton) return;

  const eventData = modal.querySelector(".toggle-importance")?.dataset;
  if (!eventData) return;

  const handleSave = () =>
    saveAnnotation(modal, eventData.timestampId);

  saveButton.addEventListener("click", handleSave);

  const annotationInput = modal.querySelector("#eventAnnotation");
  if (annotationInput) {
    annotationInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    });
  }

  modal.querySelector('.annotations-list')?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-annotation');
    if (!deleteBtn) return;

    const annotationId = deleteBtn.dataset.annotationId;
    const timestampId = modal.querySelector('.toggle-importance').dataset.timestampId;
    
    await deleteAnnotation(annotationId, modal, timestampId);
  });

}

async function deleteAnnotation(annotationId, modal, timestampId) {
  try {
    const response = await fetch(`/api/annotations/${annotationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete annotation');

    const updatedResponse = await fetch(`/api/annotations/${timestampId}`);
    const annotations = await updatedResponse.json();
    
    updateAnnotationsUI(modal, annotations);
    showToast("dark", "Annotation Status", "Annotation deleted");
  } catch (error) {
    console.error('Error deleting annotation:', error);
    showToast("danger", "Annotation Status", "Failed to delete annotation");
  }
}

