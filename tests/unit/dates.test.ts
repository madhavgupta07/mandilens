import { describe, it, expect } from "vitest";
import {
  parseSourceDate,
  daysBetween,
  daysSince,
  getFreshness,
  formatRelativeDays,
} from "@/lib/utils/dates";

describe("dates", () => {
  it("parses AGMARKNET dd/mm/yyyy dates as UTC", () => {
    const date = parseSourceDate("05/03/2026");
    expect(date).not.toBeNull();
    expect(date!.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("parses ISO dates", () => {
    expect(parseSourceDate("2026-03-05")!.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    // parseSourceDate truncates to the UTC day (price dates have day granularity).
    expect(parseSourceDate("2026-03-05T10:00:00.000Z")!.toISOString()).toBe(
      "2026-03-05T00:00:00.000Z",
    );
  });

  it("returns null for empty or nonsense input", () => {
    expect(parseSourceDate("")).toBeNull();
    expect(parseSourceDate(null)).toBeNull();
    expect(parseSourceDate(undefined)).toBeNull();
    expect(parseSourceDate({})).toBeNull();
  });

  it("computes whole-day differences ignoring time of day", () => {
    const a = new Date("2026-03-01T23:30:00.000Z");
    const b = new Date("2026-03-03T00:15:00.000Z");
    expect(daysBetween(a, b)).toBe(2);
    expect(daysSince(a, b)).toBe(2);
  });

  it("classifies freshness by the reported date", () => {
    const now = new Date("2026-03-20T12:00:00.000Z");
    expect(getFreshness(new Date("2026-03-20T00:00:00.000Z"), now).level).toBe("fresh");
    expect(getFreshness(new Date("2026-03-16T00:00:00.000Z"), now).level).toBe("recent");
    expect(getFreshness(new Date("2026-03-05T00:00:00.000Z"), now).level).toBe("aging");
    expect(getFreshness(new Date("2026-01-01T00:00:00.000Z"), now).level).toBe("stale");
  });

  it("never reports a future date as negative age", () => {
    const now = new Date("2026-03-20T12:00:00.000Z");
    const info = getFreshness(new Date("2026-03-25T00:00:00.000Z"), now);
    expect(info.ageDays).toBe(0);
    expect(info.level).toBe("fresh");
  });

  it("formats relative days", () => {
    const now = new Date("2026-03-20T12:00:00.000Z");
    expect(formatRelativeDays(new Date("2026-03-20T08:00:00.000Z"), now)).toBe("today");
    expect(formatRelativeDays(new Date("2026-03-19T08:00:00.000Z"), now)).toBe("yesterday");
    expect(formatRelativeDays(new Date("2026-03-10T08:00:00.000Z"), now)).toBe("10 days ago");
  });
});
