import { DEMO_SOURCE_KEY, DEFAULT_PRICE_UNIT, CURRENCY } from "@/lib/domain/constants";
import { buildDedupeKey, slugify } from "@/lib/utils/slug";
import type { NormalizedInput } from "@/lib/services/ingestion";

/**
 * The MandiLens demonstration dataset.
 *
 * This data is invented for the demo and for automated tests. It is tagged with
 * `isDemo: true` everywhere and is sourced from the `mandilens_demo` key, so it
 * can never be mistaken for a real market price. Values are plausible, not real.
 */

export interface DemoMarket {
  name: string;
  district: string;
  state: string;
}

export interface DemoCommodity {
  name: string;
  hindiName: string;
  category: string;
  aliases: string[];
  /** indicative modal price in ₹ per quintal */
  basePrice: number;
}

export const DEMO_STATE = "Bihar";

export const DEMO_MARKETS: DemoMarket[] = [
  { name: "Samastipur APMC", district: "Samastipur", state: DEMO_STATE },
  { name: "Muzaffarpur APMC", district: "Muzaffarpur", state: DEMO_STATE },
  { name: "Bhagalpur APMC", district: "Bhagalpur", state: DEMO_STATE },
  { name: "Patna (Musallahpur) APMC", district: "Patna", state: DEMO_STATE },
  { name: "Darbhanga APMC", district: "Darbhanga", state: DEMO_STATE },
  { name: "Begusarai APMC", district: "Begusarai", state: DEMO_STATE },
  { name: "Purnia APMC", district: "Purnia", state: DEMO_STATE },
  { name: "Bihar Sharif APMC", district: "Nalanda", state: DEMO_STATE },
];

export const DEMO_COMMODITIES: DemoCommodity[] = [
  { name: "Maize", hindiName: "मक्का", category: "Cereal", aliases: ["makka", "corn", "makai"], basePrice: 2150 },
  { name: "Paddy (Common)", hindiName: "धान", category: "Cereal", aliases: ["dhan", "paddy"], basePrice: 2320 },
  { name: "Wheat", hindiName: "गेहूं", category: "Cereal", aliases: ["gehu", "gehun", "wheat"], basePrice: 2680 },
  { name: "Potato", hindiName: "आलू", category: "Vegetable", aliases: ["aloo", "alu"], basePrice: 1420 },
  { name: "Onion", hindiName: "प्याज", category: "Vegetable", aliases: ["pyaz", "piyaz"], basePrice: 1950 },
  { name: "Mustard", hindiName: "सरसों", category: "Oilseed", aliases: ["sarson", "mustard seed"], basePrice: 5650 },
  { name: "Lentil (Masur)", hindiName: "मसूर", category: "Pulse", aliases: ["masur", "masoor", "masur dal"], basePrice: 6300 },
  { name: "Sugarcane", hindiName: "गन्ना", category: "Cash crop", aliases: ["ganna"], basePrice: 380 },
];

/** Deterministic 32-bit PRNG so demo data and tests are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface GenerateDemoOptions {
  days?: number;
  now?: Date;
}

/**
 * Build demo price observations: one row per (market, commodity, day) for the
 * requested window. Prices drift slowly with deterministic noise.
 */
export function generateDemoPrices(options: GenerateDemoOptions = {}): NormalizedInput[] {
  const days = options.days ?? 45;
  const now = options.now ?? new Date();
  const records: NormalizedInput[] = [];

  for (const market of DEMO_MARKETS) {
    const marketFactor = 0.9 + (hashString(market.name) % 200) / 1000; // 0.90–1.10
    for (const commodity of DEMO_COMMODITIES) {
      const commodityNoise = hashString(`${market.name}:${commodity.name}`) % 1000;
      const rng = mulberry32(hashString(`${market.district}:${commodity.name}`));

      // Weekly drift so the trend is visible but gentle.
      const drift = ((commodityNoise % 60) - 30) / 1000;

      for (let i = days - 1; i >= 0; i -= 1) {
        const priceDate = new Date(now);
        priceDate.setUTCHours(0, 0, 0, 0);
        priceDate.setUTCDate(priceDate.getUTCDate() - i);

        const dayIndex = days - 1 - i;
        const seasonal = Math.sin((dayIndex / days) * Math.PI) * 0.04;
        const noise = (rng() - 0.5) * 0.05;
        const modal = Math.max(
          100,
          Math.round(commodity.basePrice * marketFactor * (1 + drift + seasonal * (dayIndex / days) + noise)),
        );
        const min = Math.round(modal * 0.93);
        const max = Math.round(modal * 1.08);
        const day = priceDate.toISOString().slice(0, 10);

        records.push({
          sourceKey: DEMO_SOURCE_KEY,
          sourceRecordId: `${slugify(market.name)}-${slugify(commodity.name)}-${day}`,
          state: market.state,
          district: market.district,
          marketName: market.name,
          sourceMarketName: market.name,
          commodityName: commodity.name,
          sourceCommodityName: commodity.name,
          unit: DEFAULT_PRICE_UNIT,
          currency: CURRENCY,
          minPrice: min,
          maxPrice: max,
          modalPrice: modal,
          priceDate,
          recordType: i === 0 ? "reported_market_price" : "historical_price",
          dedupeKey: buildDedupeKey([
            DEMO_SOURCE_KEY,
            slugify(market.name),
            slugify(commodity.name),
            day,
          ]),
          validationStatus: "valid",
          validationNotes: ["Illustrative demo value; not a real market price."],
          isDemo: true,
        });
      }
    }
  }

  return records;
}
