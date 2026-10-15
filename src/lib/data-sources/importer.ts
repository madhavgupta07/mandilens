import Papa from "papaparse";
import { parseSourceDate } from "@/lib/utils/dates";
import { buildDedupeKey, slugify } from "@/lib/utils/slug";
import { DEFAULT_PRICE_UNIT, CURRENCY } from "@/lib/domain/constants";
import type { NormalizedInput } from "@/lib/services/ingestion";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

/** Canonical field names an import can be mapped onto. */
export const IMPORT_FIELDS = [
  "state",
  "district",
  "market",
  "commodity",
  "variety",
  "grade",
  "arrival_date",
  "min_price",
  "max_price",
  "modal_price",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

const HEADER_ALIASES: Record<ImportField, string[]> = {
  state: ["state", "state_name", "state name"],
  district: ["district", "district_name", "district name"],
  market: ["market", "market_name", "market name", "mandi", "apmc"],
  commodity: ["commodity", "commodity_name", "commodity name", "crop", "item"],
  variety: ["variety", "variety_name"],
  grade: ["grade", "quality"],
  arrival_date: ["arrival_date", "date", "price_date", "reported_date", "arrival date"],
  min_price: ["min_price", "minimum_price", "min price", "min"],
  max_price: ["max_price", "maximum_price", "max price", "max"],
  modal_price: ["modal_price", "modal price", "modal", "price"],
};

/** Guess a column mapping from a file's headers so admins can accept defaults. */
export function inferMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const mapping: Partial<Record<ImportField, string>> = {};
  const normalized = headers.map((header) => ({ header, key: header.trim().toLowerCase() }));
  for (const field of IMPORT_FIELDS) {
    const aliases = HEADER_ALIASES[field];
    const match = normalized.find((item) => aliases.includes(item.key));
    if (match) mapping[field] = match.header;
  }
  return mapping;
}

export function parseCsv(text: string): ParsedFile {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter(Boolean);
  return { headers, rows };
}

export function parseJson(text: string): ParsedFile {
  const parsed = JSON.parse(text) as unknown;
  const array = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { records?: unknown[] }).records)
      ? (parsed as { records: unknown[] }).records
      : Array.isArray((parsed as { data?: unknown[] }).data)
        ? (parsed as { data: unknown[] }).data
        : null;
  if (!array) throw new Error("JSON must be an array, or an object with a records/data array.");

  const rows = array.map((item) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      record[key] = value === null || value === undefined ? "" : String(value);
    }
    return record;
  });
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return { headers, rows };
}

export function parseUploadedFile(text: string, fileType: "csv" | "json"): ParsedFile {
  return fileType === "csv" ? parseCsv(text) : parseJson(text);
}

export interface MapResult {
  records: NormalizedInput[];
  errors: Array<{ row: number; message: string }>;
  previewRows: Record<string, unknown>[];
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value.replace(/,/g, ""));
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

/**
 * Convert raw file rows into normalised records using an explicit mapping.
 * Every row is validated; nothing is guessed and nothing is dropped silently.
 */
export function mapRowsToRecords(
  rows: Record<string, string>[],
  mapping: Partial<Record<ImportField, string>>,
  options: { sourceKey: string; isDemo?: boolean; importedBy?: string; unit?: string },
): MapResult {
  const records: NormalizedInput[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const previewRows: Record<string, unknown>[] = [];

  const unit = options.unit ?? DEFAULT_PRICE_UNIT;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const get = (field: ImportField) => (mapping[field] ? row[mapping[field]!]?.trim() : undefined);

    const state = get("state");
    const district = get("district");
    const marketName = get("market");
    const commodityName = get("commodity");
    const priceDate = parseSourceDate(get("arrival_date"));
    const minPrice = toNumber(get("min_price"));
    const maxPrice = toNumber(get("max_price"));
    const modalPrice = toNumber(get("modal_price"));

    if (!state || !district || !marketName || !commodityName) {
      errors.push({ row: rowNumber, message: "Missing state, district, market or commodity." });
      return;
    }
    if (!priceDate) {
      errors.push({ row: rowNumber, message: "Unparseable date; expected dd/mm/yyyy or ISO." });
      return;
    }
    if (minPrice === undefined && maxPrice === undefined && modalPrice === undefined) {
      errors.push({ row: rowNumber, message: "No price value found." });
      return;
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      errors.push({ row: rowNumber, message: "min_price is greater than max_price." });
      return;
    }

    const variety = get("variety");
    const grade = get("grade");
    const record: NormalizedInput = {
      sourceKey: options.sourceKey,
      state,
      district,
      marketName,
      sourceMarketName: marketName,
      commodityName,
      sourceCommodityName: commodityName,
      variety,
      grade,
      unit,
      currency: CURRENCY,
      minPrice,
      maxPrice,
      modalPrice: modalPrice ?? minPrice ?? maxPrice,
      priceDate,
      recordType: options.isDemo ? "historical_price" : "reported_market_price",
      dedupeKey: buildDedupeKey([
        options.sourceKey,
        slugify(marketName),
        slugify(commodityName),
        variety ?? "",
        grade ?? "",
        priceDate.toISOString().slice(0, 10),
      ]),
      validationStatus: modalPrice === undefined ? "warned" : "valid",
      validationNotes: modalPrice === undefined ? ["Modal price missing; fallback used."] : [],
      isDemo: options.isDemo,
      importedBy: options.importedBy,
    };
    records.push(record);

    if (previewRows.length < 20) {
      previewRows.push({
        row: rowNumber,
        state,
        district,
        market: marketName,
        commodity: commodityName,
        variety: variety ?? "",
        date: priceDate.toISOString().slice(0, 10),
        min: minPrice ?? "",
        max: maxPrice ?? "",
        modal: modalPrice ?? "",
      });
    }
  });

  return { records, errors, previewRows };
}
