import { describe, it, expect } from "vitest";
import {
  normalizeUnit,
  convertQuantity,
  convertPricePerUnit,
  toKilograms,
  unitLabel,
  isUnit,
} from "@/lib/utils/units";

describe("units", () => {
  it("normalises common aliases to canonical units", () => {
    expect(normalizeUnit("QTL")).toBe("quintal");
    expect(normalizeUnit("Tonnes")).toBe("tonne");
    expect(normalizeUnit("kgs")).toBe("kg");
    expect(normalizeUnit("metric ton")).toBe("tonne");
    expect(normalizeUnit("banana")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit(null)).toBeNull();
  });

  it("recognises valid units", () => {
    expect(isUnit("quintal")).toBe(true);
    expect(isUnit("pound")).toBe(false);
    expect(unitLabel("tonne")).toBe("tonne");
  });

  it("converts quantities through the kilogram base", () => {
    expect(convertQuantity(1, "tonne", "quintal")).toBe(10);
    expect(convertQuantity(50, "quintal", "kg")).toBe(5000);
    expect(convertQuantity(2000, "kg", "tonne")).toBe(2);
    expect(toKilograms(1.5, "tonne")).toBe(1500);
  });

  it("converts per-unit prices proportionally to the unit size", () => {
    // ₹2,300 per quintal -> ₹23 per kg
    expect(convertPricePerUnit(2300, "quintal", "kg")).toBe(23);
    // ₹20 per kg -> ₹20,000 per tonne
    expect(convertPricePerUnit(20, "kg", "tonne")).toBe(20000);
    // round-trip
    expect(convertPricePerUnit(convertPricePerUnit(1500, "quintal", "tonne"), "tonne", "quintal")).toBeCloseTo(
      1500,
      6,
    );
  });
});
