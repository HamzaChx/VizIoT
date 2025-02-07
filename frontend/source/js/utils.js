export function showMessage(message, type = 'info') {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('d-none');
    alertBox.style.opacity = '1';

    setTimeout(() => {
        alertBox.style.opacity = '0';
        setTimeout(() => {
            alertBox.classList.add('d-none');
        }, 500);
    }, 2000);
}

export function hideInitialAlert() {
    const initialAlert = document.getElementById('initial-alert');
    initialAlert.style.opacity = '0';
    initialAlert.classList.add('d-none');
}

/**
 * Utility function to format a date string with offset.
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string with timezone offset
 */
export function formatDateWithOffset(date) {
    const offset = -date.getTimezoneOffset();
    const absOffsetHours = Math.abs(Math.floor(offset / 60))
        .toString()
        .padStart(2, "0");
    const absOffsetMinutes = Math.abs(offset % 60)
        .toString()
        .padStart(2, "0");
    const sign = offset >= 0 ? "+" : "-";

    return `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}T${date
        .getHours()
        .toString()
        .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
        .getSeconds()
        .toString()
        .padStart(2, "0")}.${date
        .getMilliseconds()
        .toString()
        .padStart(3, "0")}${sign}${absOffsetHours}:${absOffsetMinutes}`;
}
