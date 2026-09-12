/**
 * Centralized Date & Time utilities for Veltis.
 * Formats timestamps in Indian Standard Time (IST, Asia/Kolkata).
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a timestamp or date into IST format: "12 Sep 2026, 10:42 PM".
 * Prioritizes full ISO timestamps (like transaction.createdAt) to include exact time.
 * If only a date-only string (YYYY-MM-DD) is provided, safely displays date without off-by-one shifts.
 */
export function formatISTDateTime(
  timestamp?: string | Date | null,
  fallbackDateStr?: string | Date | null
): string {
  const target = timestamp || fallbackDateStr;
  if (!target) return '';

  const dateObj = typeof target === 'string' ? new Date(target) : target;
  if (isNaN(dateObj.getTime())) return '';

  // Check if string is date-only (e.g. "2026-09-12")
  if (typeof target === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(target.trim())) {
    const [year, month, day] = target.trim().split('-').map(Number);
    // Construct local midnight to avoid UTC negative shift
    const localDate = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(localDate).replace(/\bSept\b/g, 'Sep');
  }

  // Format with date and time in IST (Asia/Kolkata)
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // e.g. "12 Sep 2026, 10:42 PM"
  const formatted = formatter.format(dateObj);
  return formatted
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
    .replace(/\bSept\b/g, 'Sep');
}

/**
 * Format date-only string (YYYY-MM-DD) safely without UTC shifts.
 */
export function formatISTDateOnly(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [year, month, day] = dateStr.trim().split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(localDate).replace(/\bSept\b/g, 'Sep');
  }
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d).replace(/\bSept\b/g, 'Sep');
}
