/**
 * Timezone-aware date and time formatting utilities.
 * Ensures all UTC timestamps from the backend/database are accurately
 * converted and displayed in the user's local system time.
 */

export const parseUtcDate = (rawDate) => {
  if (!rawDate) return new Date();
  if (rawDate instanceof Date) return rawDate;

  let dateStr = String(rawDate).trim();
  if (!dateStr) return new Date();

  // If already contains offset (+05:30, -04:00) or UTC indicator 'Z', parse directly
  if (dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // If naive datetime from PostgreSQL/Python (e.g. "2026-09-22T04:54:00" or "2026-09-22 04:54:00"),
  // treat as UTC by normalizing to ISO and appending 'Z'
  const normalized = dateStr.replace(' ', 'T') + 'Z';
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Fallback to standard constructor
  const fallback = new Date(rawDate);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

/**
 * Formats time in the client's local system time (e.g. "10:24 am" / "10:24 AM").
 */
export const formatMessageTime = (rawDate) => {
  if (!rawDate) return '';
  const date = parseUtcDate(rawDate);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formats date in the client's local system timezone (e.g. "22 Sep" or "22 Sep 2026").
 */
export const formatMessageDate = (rawDate, includeYear = false) => {
  if (!rawDate) return '';
  const date = parseUtcDate(rawDate);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
};

/**
 * Friendly conversation list timestamp (e.g. "10:24 am" if today, "Yesterday", or "22 Sep").
 */
export const formatConversationTime = (rawDate) => {
  if (!rawDate) return '';
  const date = parseUtcDate(rawDate);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return formatMessageTime(rawDate);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  return formatMessageDate(rawDate);
};
