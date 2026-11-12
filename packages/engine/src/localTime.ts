import { DAYS_PER_WEEK, MS_PER_DAY } from './constants';

/** ISO 8601 date-time with an explicit zone: an unambiguous instant. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NOON_HOUR = 12;

/** Milliseconds since the epoch, or null if `iso` is not an unambiguous instant. */
export function parseInstant(iso: unknown): number | null {
  if (typeof iso !== 'string' || !ISO_INSTANT.test(iso)) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      });
    } catch {
      throw new Error('invalid_time_zone');
    }
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** `YYYY-MM-DD` of that instant in that IANA zone. */
export function localDateOf(iso: string, timeZone: string): string {
  const formatter = formatterFor(timeZone);
  const ms = parseInstant(iso);
  if (ms === null) throw new Error('invalid_date');
  const parts = formatter.formatToParts(new Date(ms));
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The Monday on or before the date. Arithmetic is at UTC noon so no zone can shift it. */
export function weekStartOf(localDate: string): string {
  const match = LOCAL_DATE.exec(localDate);
  if (!match) throw new Error('invalid_date');
  const noon = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), NOON_HOUR));
  if (noon.toISOString().slice(0, 10) !== localDate) throw new Error('invalid_date');
  const daysSinceMonday = (noon.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  return new Date(noon.getTime() - daysSinceMonday * MS_PER_DAY).toISOString().slice(0, 10);
}
