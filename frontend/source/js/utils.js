// Function to display a message
export function showMessage(message, type = 'info') {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('d-none');
    alertBox.style.opacity = '1';

    // Hide the alert after 3 seconds
    setTimeout(() => {
        alertBox.style.opacity = '0';
        setTimeout(() => {
            alertBox.classList.add('d-none');
        }, 500);
    }, 2000);
}

// Hide the initial alert
export function hideInitialAlert() {
    const initialAlert = document.getElementById('initial-alert');
    initialAlert.style.opacity = '0';
    initialAlert.classList.add('d-none');
}