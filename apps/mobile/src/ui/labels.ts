/** 3 -> 'Slot 3'. */
export function slotLabel(slotNumber: number): string {
  return `Slot ${slotNumber}`;
}

/** 1438 -> '1,438'. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-GB');
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-11-08' -> 'Sun 8 Nov'. The date is a calendar day, so no time zone is involved. */
export function dayLabel(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return localDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return localDate;
  return `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** 1.25 -> '×1.25', 1.5 -> '×1.5', 2 -> '×2'. */
export function multiplierLabel(multiplier: number): string {
  return `×${Number(multiplier.toFixed(2))}`;
}
