import { FRESHNESS_THRESHOLDS, type FreshnessLevel } from "@/lib/domain/constants";

/** Parse the date formats that show up in Indian open data feeds. */
export function parseSourceDate(input: unknown): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input !== "string" && typeof input !== "number") return null;

  const raw = String(input).trim();
  if (!raw) return null;

  // dd/mm/yyyy or dd-mm-yyyy (AGMARKNET style)
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // yyyy-mm-dd
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysSince(date: Date, now: Date = new Date()): number {
  return daysBetween(date, now);
}

export function isStale(date: Date, maxAgeDays = 7, now: Date = new Date()): boolean {
  return daysSince(date, now) > maxAgeDays;
}

export interface FreshnessInfo {
  level: FreshnessLevel;
  ageDays: number;
  label: string;
  description: string;
}

/**
 * Freshness describes the *source-reported observation date*, never the time the
 * record was retrieved. An empty result set is never treated as "market closed".
 */
export function getFreshness(
  priceDate: Date,
  now: Date = new Date(),
): FreshnessInfo {
  const ageDays = Math.max(0, daysSince(priceDate, now));
  if (ageDays <= FRESHNESS_THRESHOLDS.freshDays) {
    return {
      level: "fresh",
      ageDays,
      label: "Fresh",
      description: "Reported within the last 2 days.",
    };
  }
  if (ageDays <= FRESHNESS_THRESHOLDS.recentDays) {
    return {
      level: "recent",
      ageDays,
      label: "Recent",
      description: "Reported within the last week.",
    };
  }
  if (ageDays <= FRESHNESS_THRESHOLDS.agingDays) {
    return {
      level: "aging",
      ageDays,
      label: "Aging",
      description: "Reported 1–4 weeks ago — verify before acting.",
    };
  }
  return {
    level: "stale",
    ageDays,
    label: "Stale",
    description: "Reported more than 30 days ago — treat as background only.",
  };
}

export function formatDate(date: Date | string, locale = "en-IN"): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function formatDateTime(date: Date | string, locale = "en-IN"): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatRelativeDays(date: Date, now: Date = new Date()): string {
  const days = daysSince(date, now);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
