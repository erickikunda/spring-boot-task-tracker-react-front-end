const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

/** Formats an ISO datetime string as a relative string: "3 hours ago", "yesterday". */
export function formatRelative(iso: string): string {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60)     return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600)   return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 604_800) return rtf.format(Math.round(diffSec / 86_400), 'day');
  return formatDate(iso);
}

/**
 * Formats a YYYY-MM-DD date string or ISO datetime as "May 26, 2026".
 * Date-only strings are parsed as local time to avoid timezone shifts.
 */
export function formatDate(value: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (value.includes('T')) {
    return new Date(value).toLocaleDateString('en-US', opts);
  }
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}
