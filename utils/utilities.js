/**
 * Formats a date with timezone offset always using +02:00
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string with +02:00 timezone
 */
export function formatDateWithOffset(date) {
  if (typeof date === "string") {
    const parsedDate = new Date(date);

    const utcYear = parsedDate.getUTCFullYear();
    const utcMonth = (parsedDate.getUTCMonth() + 1).toString().padStart(2, "0");
    const utcDay = parsedDate.getUTCDate().toString().padStart(2, "0");

    let utcHours = parsedDate.getUTCHours();
    let utcMinutes = parsedDate.getUTCMinutes();
    let utcSeconds = parsedDate.getUTCSeconds();
    let utcMilliseconds = parsedDate.getUTCMilliseconds();

    utcHours = (utcHours + 2) % 24;

    return `${utcYear}-${utcMonth}-${utcDay}T${utcHours
      .toString()
      .padStart(2, "0")}:${utcMinutes.toString().padStart(2, "0")}:${utcSeconds
      .toString()
      .padStart(2, "0")}.${utcMilliseconds.toString().padStart(3, "0")}+02:00`;
  }

  const utcYear = date.getUTCFullYear();
  const utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const utcDay = date.getUTCDate().toString().padStart(2, "0");

  let utcHours = date.getUTCHours() + 2;
  let utcMinutes = date.getUTCMinutes();
  let utcSeconds = date.getUTCSeconds();
  let utcMilliseconds = date.getUTCMilliseconds();

  if (utcHours >= 24) {
    utcHours -= 24;
    const nextDay = new Date(
      Date.UTC(utcYear, date.getUTCMonth(), date.getUTCDate() + 1)
    );
    return formatDateWithOffset(nextDay);
  }

  const hours = utcHours.toString().padStart(2, "0");
  const minutes = utcMinutes.toString().padStart(2, "0");
  const seconds = utcSeconds.toString().padStart(2, "0");
  const milliseconds = utcMilliseconds.toString().padStart(3, "0");

  return `${utcYear}-${utcMonth}-${utcDay}T${hours}:${minutes}:${seconds}.${milliseconds}+02:00`;
}

/**
 * Create a human-readable date string with UTC+2 timezone
 * @param {Date} date - The date to format
 * @returns {string} - Formatted readable date string (21.3.2025, 09:59:43)
 */
export function formatReadableDate(date) {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth() + 1;
  const utcDay = date.getUTCDate();

  let utcHours = date.getUTCHours() + 2;
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();

  if (utcHours >= 24) {
    utcHours -= 24;
  }

  return `${utcDay}.${utcMonth}.${utcYear}, ${utcHours
    .toString()
    .padStart(2, "0")}:${utcMinutes.toString().padStart(2, "0")}:${utcSeconds
    .toString()
    .padStart(2, "0")}`;
}
