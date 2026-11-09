/**
 * Date & Time utilities locked to Indian Standard Time (IST - Asia/Kolkata, UTC+5:30)
 * Ensures 100% consistency across local dev, Docker, and Vercel cloud serverless.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD string in IST timezone
 * @param {Date|string|number} date 
 * @returns {string} e.g. "2026-11-09"
 */
function getLocalDateString(date = new Date()) {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Formats time in 12-hour format in IST timezone: "04:23 PM"
 * @param {Date|string|number} date 
 * @returns {string} e.g. "04:23 PM"
 */
function formatTime(date) {
  if (!date) return '--:--';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

/**
 * Returns the hour (0-23) in IST timezone
 * @param {Date|string|number} date 
 * @returns {number} 0-23
 */
function getIstHour(date = new Date()) {
  const d = date ? new Date(date) : new Date();
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hour12: false
  }).format(d);
  return parseInt(hourStr, 10);
}

/**
 * Returns human time-of-day greeting (Morning, Afternoon, Evening, Night) based on IST hour
 * @param {Date|string|number} date 
 * @returns {{ timeOfDay: string, hindiGreeting: string }}
 */
function getTimeOfDayInfo(date = new Date()) {
  const hour = getIstHour(date);
  if (hour >= 4 && hour < 12) {
    return { timeOfDay: 'Morning', hindiGreeting: 'शुभ प्रभात' };
  } else if (hour >= 12 && hour < 17) {
    return { timeOfDay: 'Afternoon', hindiGreeting: 'शुभ दोपहर' };
  } else if (hour >= 17 && hour < 22) {
    return { timeOfDay: 'Evening', hindiGreeting: 'शुभ संध्या' };
  } else {
    return { timeOfDay: 'Night', hindiGreeting: 'नमस्ते' };
  }
}

/**
 * Parse dateStr ("YYYY-MM-DD") and timeStr ("HH:mm") into a Date object at IST (+05:30)
 * @param {string} dateStr 
 * @param {string} timeStr 
 * @returns {Date}
 */
function parseTimeToDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00+05:30`);
}

module.exports = {
  TIMEZONE,
  getLocalDateString,
  formatTime,
  getIstHour,
  getTimeOfDayInfo,
  parseTimeToDate
};
