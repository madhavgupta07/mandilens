import { connectToDatabase } from "@/lib/db/connect";
import { Commodity, Market } from "@/lib/db/models";
import { normalizeName } from "@/lib/utils/slug";
import { normalizeUnit } from "@/lib/utils/units";
import type { Unit } from "@/lib/domain/constants";

export interface KnownEntities {
  commodities: string[];
  markets: string[];
  districts: string[];
  states: string[];
}

export type IntentKind =
  | "compare"
  | "prices"
  | "history"
  | "buyers"
  | "sellers"
  | "freshness"
  | "help"
  | "unknown";

export interface ParsedIntent {
  kind: IntentKind;
  commodity?: string;
  quantity?: number;
  quantityUnit?: Unit;
  market?: string;
  district?: string;
  state?: string;
  days?: number;
  matched: string[];
}

/** Load the vocabulary the rule-based parser matches against. */
export async function loadKnownEntities(): Promise<KnownEntities> {
  await connectToDatabase();
  const [commodities, markets, districts, states] = await Promise.all([
    Commodity.find({ isActive: true }).select("name aliases").limit(2000).lean(),
    Market.find({ isActive: true }).select("name").limit(3000).lean(),
    Market.distinct("district"),
    Market.distinct("state"),
  ]);

  return {
    commodities: [
      ...new Set(
        commodities.flatMap((c) => [c.name, ...((c.aliases ?? []) as string[])]).filter(Boolean),
      ),
    ],
    markets: [...new Set(markets.map((m) => m.name))],
    districts: districts.filter(Boolean) as string[],
    states: states.filter(Boolean) as string[],
  };
}

const COMPARE_WORDS = [
  "compare",
  "comparison",
  "best market",
  "which market",
  "kahan bechu",
  "net proceeds",
  "net return",
  "margin",
  "transport cost",
  "options",
  "तुलना",
  "मुनाफा",
  "लाभ",
];
const HISTORY_WORDS = [
  "history",
  "trend",
  "over time",
  "last 30",
  "last 7",
  "last 15",
  "movement",
  "rise",
  "fall",
  "रुझान",
  "इतिहास",
];
const BUYER_WORDS = ["buyer", "buyers", "looking for", "who wants", "purchase", "खरीद", "क्रेता", "ग्राहक"];
const SELLER_WORDS = ["seller", "selling", "supplier", "available for sale", "विक्रेता"];
const FRESHNESS_WORDS = ["fresh", "how old", "stale", "updated", "last updated", "ताज़ा", "कितना पुराना"];
const PRICE_WORDS = ["price", "prices", "rate", "rates", "bhav", "mandi rate", "भाव", "दाम", "कीमत"];
const HELP_WORDS = ["what can you do", "help", "how do i", "क्या कर सकते"];

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function longestMatch(haystack: string, candidates: string[]): string | undefined {
  const normalizedHay = ` ${normalizeName(haystack)} `;
  let best: string | undefined;
  for (const candidate of candidates) {
    const norm = normalizeName(candidate);
    if (!norm || norm.length < 3) continue;
    if (normalizedHay.includes(` ${norm} `) || normalizedHay.includes(`${norm}`)) {
      if (!best || candidate.length > best.length) best = candidate;
    }
  }
  return best;
}

const UNIT_WORDS = [
  "quintal",
  "quintals",
  "qtl",
  "tonne",
  "tonnes",
  "ton",
  "tons",
  "kg",
  "kgs",
  "kilo",
  "kilos",
  "क्विंटल",
  "टन",
  "किलो",
];

/**
 * Rule-based intent + entity extraction. This is the deterministic stand-in for
 * the model's function-calling: it never guesses values it cannot find.
 */
export function parseIntent(question: string, known: KnownEntities): ParsedIntent {
  const text = question.toLowerCase();
  const matched: string[] = [];

  const commodity = longestMatch(text, known.commodities);
  if (commodity) matched.push(commodity);

  const quantityMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(quintals?|qtl|tonnes?|tons?|kgs?|kilos?|क्विंटल|टन|किलो)/i,
  );
  let quantity: number | undefined;
  let quantityUnit: Unit | undefined;
  if (quantityMatch) {
    quantity = Number(quantityMatch[1].replace(",", "."));
    quantityUnit = normalizeUnit(quantityMatch[2]) ?? undefined;
  }

  let days: number | undefined;
  const daysMatch = text.match(/(\d+)\s*(?:day|days|दिन)/i);
  if (daysMatch) days = Number(daysMatch[1]);

  const market = longestMatch(text, known.markets);
  if (market) matched.push(market);
  const district = !market ? longestMatch(text, known.districts) : longestMatch(text, known.districts);
  if (district) matched.push(district);
  const state = longestMatch(text, known.states);
  if (state) matched.push(state);

  let kind: IntentKind = "unknown";
  if (hasAny(text, COMPARE_WORDS)) kind = "compare";
  else if (hasAny(text, BUYER_WORDS)) kind = "buyers";
  else if (hasAny(text, SELLER_WORDS)) kind = "sellers";
  else if (hasAny(text, FRESHNESS_WORDS)) kind = "freshness";
  else if (hasAny(text, HISTORY_WORDS)) kind = "history";
  else if (hasAny(text, PRICE_WORDS)) kind = "prices";
  else if (hasAny(text, HELP_WORDS)) kind = "help";

  // "compare" beats a bare price question when both appear.
  if (kind === "prices" && hasAny(text, ["compare", "tulna", "तुलना"])) kind = "compare";

  if (kind === "unknown") {
    // A commodity plus a quantity is a comparison even without an explicit
    // "compare" keyword; a commodity on its own is a price lookup.
    if (commodity && quantity) kind = "compare";
    else if (commodity) kind = "prices";
  }

  return {
    kind,
    commodity,
    quantity,
    quantityUnit,
    market,
    district,
    state,
    days,
    matched: [...new Set(matched)],
  };
}

export { UNIT_WORDS };
