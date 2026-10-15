import { Decimal, d } from "@/lib/utils/decimal";
import {
  UNITS,
  UNIT_TO_KG,
  UNIT_LABELS,
  type Unit,
} from "@/lib/domain/constants";

const UNIT_ALIASES: Record<string, Unit> = {
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  quintal: "quintal",
  quintals: "quintal",
  qtl: "quintal",
  qt: "quintal",
  q: "quintal",
  "100kg": "quintal",
  tonne: "tonne",
  tonnes: "tonne",
  ton: "tonne",
  tons: "tonne",
  mt: "tonne",
  "metric tonne": "tonne",
  "metric ton": "tonne",
};

export function normalizeUnit(input: string | undefined | null): Unit | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase().replace(/\./g, "");
  if (UNIT_ALIASES[key]) return UNIT_ALIASES[key];
  if ((UNITS as readonly string[]).includes(key)) return key as Unit;
  return null;
}

export function unitLabel(unit: Unit): string {
  return UNIT_LABELS[unit];
}

export function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value);
}

/** Convert a quantity between units. */
export function convertQuantity(
  value: number | string | Decimal,
  from: Unit,
  to: Unit,
): number {
  const inKg = d(value).times(UNIT_TO_KG[from]);
  return inKg.dividedBy(UNIT_TO_KG[to]).toNumber();
}

export function toKilograms(value: number | string | Decimal, from: Unit): number {
  return d(value).times(UNIT_TO_KG[from]).toNumber();
}

/**
 * Convert a per-unit price from one unit to another.
 * e.g. ₹2,300 per quintal -> ₹23 per kg.
 */
export function convertPricePerUnit(
  pricePerUnit: number | string | Decimal,
  from: Unit,
  to: Unit,
): number {
  return d(pricePerUnit)
    .times(UNIT_TO_KG[to])
    .dividedBy(UNIT_TO_KG[from])
    .toNumber();
}

/** Human readable quantity, e.g. "50 quintals (5,000 kg)". */
export function formatQuantity(value: number, unit: Unit): string {
  const plural = unit === "kg" ? "kg" : `${unitLabel(unit)}${value === 1 ? "" : "s"}`;
  const kg = toKilograms(value, unit);
  const label = unit === "kg" ? "kg" : UNITS.includes(unit) ? UNIT_LABELS[unit] : unit;
  return `${value} ${plural} (${new Intl.NumberFormat("en-IN").format(kg)} kg)`.replace(
    "kilogram",
    label,
  );
}
