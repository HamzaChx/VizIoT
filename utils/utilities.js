/**
 * Formats a date with timezone offset always using +02:00
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string with +02:00 timezone
 */
export function formatDateWithOffset(date) {
  // If it's already a string with timezone info, parse it correctly
  if (typeof date === 'string') {
    // Parse the input timestamp directly
    const parsedDate = new Date(date);
    
    // Get UTC components to avoid local timezone interference
    const utcYear = parsedDate.getUTCFullYear();
    const utcMonth = (parsedDate.getUTCMonth() + 1).toString().padStart(2, "0");
    const utcDay = parsedDate.getUTCDate().toString().padStart(2, "0");
    
    // For +02:00 timezone, we add 2 hours to the UTC time
    let utcHours = parsedDate.getUTCHours();
    let utcMinutes = parsedDate.getUTCMinutes();
    let utcSeconds = parsedDate.getUTCSeconds();
    let utcMilliseconds = parsedDate.getUTCMilliseconds();
    
    // Adjust for +02:00 timezone
    utcHours = (utcHours + 2) % 24;
    
    // Format with fixed +02:00 timezone
    return `${utcYear}-${utcMonth}-${utcDay}T${utcHours.toString().padStart(2, "0")}:${utcMinutes.toString().padStart(2, "0")}:${utcSeconds.toString().padStart(2, "0")}.${utcMilliseconds.toString().padStart(3, "0")}+02:00`;
  }
  
  // For Date objects, convert to UTC and then add 2 hours for +02:00
  const utcYear = date.getUTCFullYear();
  const utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const utcDay = date.getUTCDate().toString().padStart(2, "0");
  
  // Add 2 hours to UTC time for +02:00 timezone
  let utcHours = date.getUTCHours() + 2; 
  let utcMinutes = date.getUTCMinutes();
  let utcSeconds = date.getUTCSeconds();
  let utcMilliseconds = date.getUTCMilliseconds();
  
  // Handle day rollover if hours > 23
  if (utcHours >= 24) {
    utcHours -= 24;
    // Create a new Date with incremented day
    const nextDay = new Date(Date.UTC(utcYear, date.getUTCMonth(), date.getUTCDate() + 1));
    return formatDateWithOffset(nextDay);
  }
  
  // Format the time components
  const hours = utcHours.toString().padStart(2, "0");
  const minutes = utcMinutes.toString().padStart(2, "0");
  const seconds = utcSeconds.toString().padStart(2, "0");
  const milliseconds = utcMilliseconds.toString().padStart(3, "0");
  
  // Always use +02:00 timezone
  return `${utcYear}-${utcMonth}-${utcDay}T${hours}:${minutes}:${seconds}.${milliseconds}+02:00`;
}