import Decimal from "decimal.js";

/**
 * All money and quantity arithmetic goes through Decimal.js so that
 * "50 quintals × ₹2,300" never drifts due to binary floating point.
 */
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export type Numeric = number | string | Decimal;

export function d(value: Numeric): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

/** Money is displayed and stored with 2 decimal places (paise). */
export function roundMoney(value: Numeric): number {
  return d(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function roundQty(value: Numeric, places = 3): number {
  return d(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
}

/** Rupees, grouped the Indian way: ₹1,15,000.00 */
export function formatINR(value: Numeric, options?: { decimals?: number }): string {
  const decimals = options?.decimals ?? 0;
  const num = d(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(num) ? num : 0);
}

/** Compact Indian units for charts and tiles: ₹1.2L, ₹3.4Cr. */
export function formatINRCompact(value: Numeric): string {
  const num = d(value).toNumber();
  if (!Number.isFinite(num)) return "₹0";
  const abs = Math.abs(num);
  if (abs >= 1_00_00_000) return `₹${(num / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(num / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `₹${(num / 1_000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

export function formatNumberIN(value: Numeric, decimals = 0): string {
  const num = d(value).toDecimalPlaces(decimals).toNumber();
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(num) ? num : 0);
}

export function percentDifference(from: Numeric, to: Numeric): number | null {
  const base = d(from);
  if (base.isZero()) return null;
  return d(to).minus(base).dividedBy(base).times(100).toDecimalPlaces(2).toNumber();
}
