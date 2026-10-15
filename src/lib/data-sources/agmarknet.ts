import { AGMARKNET_SOURCE_KEY } from "@/lib/domain/constants";
import { DEFAULT_PRICE_UNIT, CURRENCY } from "@/lib/domain/constants";
import { buildDedupeKey, slugify } from "@/lib/utils/slug";
import { parseSourceDate } from "@/lib/utils/dates";
import type {
  AdapterFetchOptions,
  AdapterResult,
  DataSourceAdapter,
  NormalizedPriceRecord,
} from "./types";

/**
 * AGMARKNET adapter.
 *
 * AGMARKNET (Directorate of Marketing & Inspection) publishes daily mandi
 * prices. The permitted, documented access path is the Open Government Data
 * Platform dataset resource, which requires a free API key registered at
 * data.gov.in. This adapter never scrapes HTML, never bypasses a captcha and
 * does not assume a public API that does not exist.
 *
 * Licence: Government Open Data License - India (attribution required).
 */

const DEFAULT_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const PAGE_SIZE = 1000;

interface AgmarknetRow {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  grade?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function cleanName(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(commodity: string): string {
  const name = commodity.toLowerCase();
  if (/(paddy|rice|wheat|maize|jowar|bajra|ragi|barley|gram|cereal)/.test(name)) return "Cereal";
  if (/(arhar|tur|urad|moong|masur|lentil|gram|pea|pulse)/.test(name)) return "Pulse";
  if (/(mustard|groundnut|soyabean|sunflower|sesam|linseed|oil)/.test(name)) return "Oilseed";
  if (/(potato|tomato|onion|brinjal|cabbage|cauliflower|bhindi|gourd|chilli|carrot|radish|spinach|cucumber|bean)/.test(name))
    return "Vegetable";
  if (/(apple|banana|mango|orange|guava|papaya|grapes|litchi|lemon|pomegranate|watermelon)/.test(name))
    return "Fruit";
  if (/(ginger|garlic|turmeric|coriander|chilli|jeera|cumin|spice)/.test(name)) return "Spice";
  if (/(sugarcane|jaggery|sugar|cotton|jute)/.test(name)) return "Cash crop";
  return "Other";
}

export function agmarknetDedupeKey(record: {
  marketName: string;
  commodityName: string;
  variety?: string;
  grade?: string;
  priceDate: Date;
}): string {
  const day = record.priceDate.toISOString().slice(0, 10);
  return buildDedupeKey([
    AGMARKNET_SOURCE_KEY,
    slugify(record.marketName),
    slugify(record.commodityName),
    record.variety ?? "",
    record.grade ?? "",
    day,
  ]);
}

export function normalizeAgmarknetRow(row: AgmarknetRow): {
  record?: NormalizedPriceRecord;
  rejected?: { reason: string; raw: unknown };
} {
  const state = cleanName(row.state);
  const district = cleanName(row.district);
  const marketName = cleanName(row.market);
  const commodityName = cleanName(row.commodity);
  const priceDate = parseSourceDate(row.arrival_date);
  const minPrice = parseNumber(row.min_price);
  const maxPrice = parseNumber(row.max_price);
  const modalPrice = parseNumber(row.modal_price);

  const notes: string[] = [];
  if (!state || !district || !marketName || !commodityName) {
    return { rejected: { reason: "Missing state, district, market or commodity.", raw: row } };
  }
  if (!priceDate) {
    return { rejected: { reason: "Unparseable arrival date.", raw: row } };
  }
  if (minPrice === undefined && maxPrice === undefined && modalPrice === undefined) {
    return { rejected: { reason: "No price values present.", raw: row } };
  }
  if (modalPrice === undefined) {
    notes.push("Modal price missing; min or max will be used as a fallback.");
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    notes.push("min price is greater than max price in the source row.");
  }

  const variety = cleanName(row.variety) || undefined;
  const grade = cleanName(row.grade) || undefined;

  const record: NormalizedPriceRecord = {
    sourceKey: AGMARKNET_SOURCE_KEY,
    sourceRecordId: `${slugify(marketName)}-${slugify(commodityName)}-${priceDate.toISOString().slice(0, 10)}`,
    state,
    district,
    marketName,
    sourceMarketName: marketName,
    commodityName,
    sourceCommodityName: commodityName,
    variety,
    grade,
    unit: DEFAULT_PRICE_UNIT,
    currency: CURRENCY,
    minPrice,
    maxPrice,
    modalPrice: modalPrice ?? minPrice ?? maxPrice,
    priceDate,
    recordType: "reported_market_price",
    dedupeKey: agmarknetDedupeKey({ marketName, commodityName, variety, grade, priceDate }),
    validationStatus: notes.length ? "warned" : "valid",
    validationNotes: notes,
  };

  return { record };
}

export function createAgmarknetAdapter(env: NodeJS.ProcessEnv = process.env): DataSourceAdapter {
  const apiKey = env.AGRICULTURAL_DATA_API_KEY?.trim() || "";
  const resourceId = env.AGMARKNET_RESOURCE_ID?.trim() || DEFAULT_RESOURCE_ID;

  return {
    key: AGMARKNET_SOURCE_KEY,
    name: "AGMARKNET (via data.gov.in)",
    requiresApiKey: true,
    isConfigured: () => Boolean(apiKey),
    async fetchAndNormalize(options: AdapterFetchOptions): Promise<AdapterResult> {
      if (!apiKey) {
        throw new Error(
          "AGRICULTURAL_DATA_API_KEY is not configured. Register a free key at data.gov.in to enable AGMARKNET ingestion.",
        );
      }

      const records: NormalizedPriceRecord[] = [];
      const rejected: AdapterResult["rejected"] = [];
      const notes: string[] = [];
      const maxRecords = Math.min(options.maxRecords ?? 5000, 20_000);
      let offset = 0;
      let fetchedCount = 0;

      while (records.length + rejected.length < maxRecords) {
        const params = new URLSearchParams({
          "api-key": apiKey,
          format: "json",
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (options.state) params.set("filters[state]", options.state);
        if (options.district) params.set("filters[district]", options.district);
        if (options.commodity) params.set("filters[commodity]", options.commodity);

        const url = `https://api.data.gov.in/resource/${resourceId}?${params.toString()}`;
        const response = await fetch(url, {
          headers: { accept: "application/json" },
          signal: options.signal,
        });

        if (!response.ok) {
          throw new Error(`data.gov.in responded with ${response.status}.`);
        }

        const json = (await response.json()) as { records?: AgmarknetRow[]; total?: number; count?: number };
        const rows = json.records ?? [];
        fetchedCount += rows.length;

        for (const row of rows) {
          const normalized = normalizeAgmarknetRow(row);
          if (normalized.record) records.push(normalized.record);
          else if (normalized.rejected)
            rejected.push({ row: fetchedCount, ...normalized.rejected });
        }

        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        if (json.total !== undefined && offset >= json.total) break;
      }

      notes.push(
        `Retrieved ${fetchedCount} rows from the AGMARKNET resource; normalised ${records.length} records.`,
      );

      return {
        records,
        rejected,
        fetchedCount,
        sourceKey: AGMARKNET_SOURCE_KEY,
        fetchedAt: new Date(),
        notes,
      };
    },
  };
}

export { inferCategory, parseNumber };
