/** 3 -> 'Slot 3'. */
export function slotLabel(slotNumber: number): string {
  return `Slot ${slotNumber}`;
}

/** 1438 -> '1,438'. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-GB');
}
