/**
 * Shared display formatters for athlete stats and UI numbers.
 */

/** Power rating — one decimal, no float junk (e.g. 25.000000000000004 → "25.0"). */
export function formatPower(value: number | null | undefined, empty = "—"): string {
  if (value == null || Number.isNaN(Number(value))) return empty;
  const n = Math.round(Number(value) * 10) / 10;
  return n.toFixed(1);
}
