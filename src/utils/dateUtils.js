/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format a date object or string into a readable string format
 * @param {Date|string} date - The date to format (Date object or ISO string)
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeTime - Whether to include time in the output
 * @param {string} options.locale - The locale to use for formatting
 * @returns {string} The formatted date string
 */
export const formatDate = (date, options = {}) => {
  const {
    includeTime = false,
    locale = 'en-US'
  } = options;
  
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // If date is invalid, return a placeholder
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return 'Invalid date';
  }
  
  // Create formatting options
  const dateFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  
  // Return formatted date
  return dateObj.toLocaleDateString(locale, dateFormatOptions);
};

/**
 * Get the difference between two dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
export const getDaysDifference = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // Convert to UTC timestamps and calculate difference in milliseconds
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  
  // Convert to days (86400000 = 24 * 60 * 60 * 1000)
  return Math.floor((utc2 - utc1) / 86400000);
}; 