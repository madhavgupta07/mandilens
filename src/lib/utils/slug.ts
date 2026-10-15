/** Small text-normalisation helpers used for slugs and duplicate detection. */

export function slugify(input: string): string {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Normalise a name for comparisons: lowercase, strip punctuation and the
 * bracketed qualifiers AGMARKNET adds, e.g. "Paddy(Common)" -> "paddy common".
 */
export function normalizeName(input: string): string {
  return String(input)
    .toLowerCase()
    .replace(/[()\/\\,.\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable key used to detect duplicate price observations. */
export function buildDedupeKey(parts: Array<string | number | undefined | null>): string {
  return parts
    .map((p) => (p === undefined || p === null ? "" : normalizeName(String(p))))
    .join("|");
}
