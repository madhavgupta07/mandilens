import { z } from "zod";
import {
  findCommodityByName,
  findMarketByName,
  getCommodityById,
  getMarketById,
  searchCommodities,
  searchMarkets,
  toCommodityListItem,
} from "@/lib/services/catalog";
import { getFreshnessSummary, getLatestPricesByMarket, getPriceHistory } from "@/lib/services/prices";
import { runAutoComparison, runComparison } from "@/lib/services/comparison";
import { computeCandidate } from "@/lib/services/opportunity";
import { listListings } from "@/lib/services/listings";
import { formatINR } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/dates";
import { sourceLabel } from "@/lib/domain/sources";
import type { AuthUser } from "@/lib/auth/current-user";
import type { ToolDefinition } from "@/lib/ai/types";
import {
  objectIdSchema,
  positiveMoney,
  positiveQuantity,
  recordTypeSchema,
  unitSchema,
} from "@/lib/validation/common";

export interface ToolContext {
  user: AuthUser | null;
  now: Date;
  requestedBy?: string;
}

export interface ToolResult {
  summary: string;
  data: unknown;
}

export interface AppTool {
  definition: ToolDefinition;
  schema: z.ZodTypeAny;
  execute: (args: unknown, ctx: ToolContext) => Promise<ToolResult>;
}

const expensesSchema = z.object({
  transportation: positiveMoney.optional(),
  loading: positiveMoney.optional(),
  unloading: positiveMoney.optional(),
  marketCharges: positiveMoney.optional(),
  commission: positiveMoney.optional(),
  other: positiveMoney.optional(),
});

function def(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = [],
): ToolDefinition {
  return {
    name,
    description,
    parameters: { type: "object", properties, required, additionalProperties: false },
  };
}

const modeParam = {
  type: "string",
  enum: ["real", "demo", "all"],
  description:
    "Which dataset to read. 'real' = genuine imported/reported data, 'demo' = illustrative demo records, 'all' = everything (default).",
};

async function resolveCommodityToken(token: string) {
  const byId = objectIdSchema.safeParse(token).success ? await getCommodityById(token) : null;
  return byId ?? (await findCommodityByName(token, "all"));
}

async function resolveMarketToken(token: string) {
  const byId = objectIdSchema.safeParse(token).success ? await getMarketById(token) : null;
  return byId ?? (await findMarketByName(token, "all"));
}

/* -------------------------------------------------------------------------- */
/*  Tool definitions + executors                                             */
/* -------------------------------------------------------------------------- */

export const APP_TOOLS: AppTool[] = [
  {
    definition: def(
      "searchMarkets",
      "Find agricultural markets (mandis) by name, district or state. Returns market ids usable in other tools.",
      {
        q: { type: "string", description: "Free-text market / district / state name." },
        state: { type: "string" },
        district: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 25 },
        mode: modeParam,
      },
    ),
    schema: z.object({
      q: z.string().max(120).optional(),
      state: z.string().max(80).optional(),
      district: z.string().max(80).optional(),
      limit: z.number().int().min(1).max(25).optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        q?: string;
        state?: string;
        district?: string;
        limit?: number;
        mode?: "real" | "demo" | "all";
      };
      const { items, total } = await searchMarkets({
        q: args.q,
        state: args.state,
        district: args.district,
        limit: args.limit ?? 10,
        mode: args.mode ?? "all",
      });
      return {
        summary:
          items.length === 0
            ? "No markets matched that search."
            : `Found ${items.length} of ${total} matching markets: ${items.map((m) => `${m.name} (${m.district}, ${m.state})`).join("; ")}.`,
        data: { markets: items, total },
      };
    },
  },
  {
    definition: def(
      "searchCommodities",
      "Find commodities in the MandiLens catalogue by name, alias or category.",
      {
        q: { type: "string" },
        category: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 25 },
        mode: modeParam,
      },
    ),
    schema: z.object({
      q: z.string().max(120).optional(),
      category: z.string().max(80).optional(),
      limit: z.number().int().min(1).max(25).optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        q?: string;
        category?: string;
        limit?: number;
        mode?: "real" | "demo" | "all";
      };
      const { items, total } = await searchCommodities({
        q: args.q,
        category: args.category,
        limit: args.limit ?? 10,
        mode: args.mode ?? "all",
      });
      return {
        summary:
          items.length === 0
            ? "No commodities matched that search."
            : `Found ${items.length} of ${total} commodities: ${items.map((c) => c.name).join(", ")}.`,
        data: { commodities: items, total },
      };
    },
  },
  {
    definition: def(
      "getMarketPrices",
      "Get the latest recorded price for a commodity per market, with source and observation date.",
      {
        commodity: { type: "string", description: "Commodity name or id." },
        market: { type: "string", description: "Optional market name or id." },
        state: { type: "string" },
        district: { type: "string" },
        recordType: {
          type: "string",
          description: "reported_market_price | historical_price | user_submitted | buyer_offer | confirmed_transaction",
        },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        mode: modeParam,
      },
      ["commodity"],
    ),
    schema: z.object({
      commodity: z.string().min(1),
      market: z.string().optional(),
      state: z.string().max(80).optional(),
      district: z.string().max(80).optional(),
      recordType: recordTypeSchema.optional(),
      limit: z.number().int().min(1).max(50).optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        commodity: string;
        market?: string;
        district?: string;
        recordType?: "reported_market_price";
        limit?: number;
        mode?: "real" | "demo" | "all";
      };
      const commodity = await resolveCommodityToken(args.commodity);
      if (!commodity) {
        return {
          summary: `Commodity "${args.commodity}" is not in the catalogue.`,
          data: { found: false, commodity: args.commodity },
        };
      }
      const market = args.market ? await resolveMarketToken(args.market) : null;
      if (args.market && !market) {
        return {
          summary: `Market "${args.market}" was not found.`,
          data: { found: false, market: args.market },
        };
      }

      const prices = await getLatestPricesByMarket({
        commodityId: String(commodity._id),
        marketIds: market ? [String(market._id)] : undefined,
        district: args.district,
        recordType: args.recordType,
        mode: args.mode ?? "all",
        limit: args.limit ?? 20,
      });

      if (prices.length === 0) {
        return {
          summary: `No recorded prices for ${commodity.name} match that request. No price data is available — do not estimate one.`,
          data: { found: false, commodity: toCommodityListItem(commodity), prices: [] },
        };
      }

      const lines = prices
        .slice(0, 12)
        .map(
          (p) =>
            `${market?.name ?? p.marketId}: modal ${formatINR(p.modalPrice ?? p.minPrice ?? 0)}/${p.unit} on ${formatDate(p.priceDate)} (${sourceLabel(p.dataSource)}${p.isDemo ? ", demo data" : ""})`,
        );

      return {
        summary: `Latest recorded prices for ${commodity.name} — ${lines.join("; ")}.`,
        data: {
          found: true,
          commodity: toCommodityListItem(commodity),
          prices,
          disclaimer:
            "These are recorded observations for the dates shown, not live quotes or guaranteed sale prices.",
        },
      };
    },
  },
  {
    definition: def(
      "getPriceHistory",
      "Get the recorded price history for a commodity over the last N days, with the observed change.",
      {
        commodity: { type: "string" },
        market: { type: "string" },
        district: { type: "string" },
        days: { type: "integer", minimum: 1, maximum: 365 },
        mode: modeParam,
      },
      ["commodity"],
    ),
    schema: z.object({
      commodity: z.string().min(1),
      market: z.string().optional(),
      district: z.string().max(80).optional(),
      days: z.number().int().min(1).max(365).optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        commodity: string;
        market?: string;
        district?: string;
        days?: number;
        mode?: "real" | "demo" | "all";
      };
      const commodity = await resolveCommodityToken(args.commodity);
      if (!commodity) {
        return { summary: `Commodity "${args.commodity}" is not in the catalogue.`, data: { found: false } };
      }
      const market = args.market ? await resolveMarketToken(args.market) : null;
      const days = args.days ?? 30;
      const points = await getPriceHistory({
        commodityId: String(commodity._id),
        marketId: market ? String(market._id) : undefined,
        district: args.district,
        sinceDays: days,
        mode: args.mode ?? "all",
      });

      if (points.length === 0) {
        return {
          summary: `No recorded price history for ${commodity.name} in the last ${days} days.`,
          data: { found: false, commodity: commodity.name, points: [] },
        };
      }

      const first = points.find((p) => p.modalPrice !== null);
      const last = [...points].reverse().find((p) => p.modalPrice !== null);
      const change =
        first?.modalPrice && last?.modalPrice
          ? last.modalPrice - first.modalPrice
          : null;
      const changePct =
        change !== null && first?.modalPrice
          ? Math.round((change / first.modalPrice) * 1000) / 10
          : null;

      return {
        summary: `Between ${formatDate(first?.date ?? points[0].date)} and ${formatDate(last?.date ?? points[points.length - 1].date)}, the recorded modal price for ${commodity.name} moved from ${formatINR(first?.modalPrice ?? 0)} to ${formatINR(last?.modalPrice ?? 0)} (${change === null ? "change unavailable" : `${change >= 0 ? "+" : ""}${change}, ${changePct}%`}) across ${points.length} observations.`,
        data: {
          found: true,
          commodity: toCommodityListItem(commodity),
          points,
          change,
          changePct,
        },
      };
    },
  },
  {
    definition: def(
      "calculateNetProceeds",
      "Deterministically compute gross value, total expenses and estimated net proceeds for a single price and expense set. Always use this instead of doing arithmetic yourself.",
      {
        quantity: { type: "number" },
        quantityUnit: { type: "string", enum: ["kg", "quintal", "tonne"] },
        pricePerUnit: { type: "number" },
        priceUnit: { type: "string", enum: ["kg", "quintal", "tonne"] },
        expenses: { type: "object", description: "transportation, loading, unloading, marketCharges, commission, other" },
      },
      ["quantity", "quantityUnit", "pricePerUnit", "priceUnit"],
    ),
    schema: z.object({
      quantity: positiveQuantity,
      quantityUnit: unitSchema,
      pricePerUnit: positiveMoney,
      priceUnit: unitSchema,
      expenses: expensesSchema.optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        quantity: number;
        quantityUnit: "kg" | "quintal" | "tonne";
        pricePerUnit: number;
        priceUnit: "kg" | "quintal" | "tonne";
        expenses?: Record<string, number | undefined>;
      };
      const result = computeCandidate(
        {
          marketId: "manual",
          marketName: "Manual calculation",
          pricePerUnit: args.pricePerUnit,
          priceUnit: args.priceUnit,
          priceSource: "user",
          recordType: "user_submitted",
          priceDate: new Date(),
          expenses: args.expenses ?? {},
        },
        args.quantity,
        args.quantityUnit,
      );
      return {
        summary: `For ${args.quantity} ${args.quantityUnit} at ${formatINR(args.pricePerUnit)}/${args.priceUnit}: gross ${formatINR(result.grossSaleValue)}, expenses ${formatINR(result.totalExpenses)}, estimated net proceeds ${formatINR(result.estimatedNetProceeds)} (${formatINR(result.netPerQuantityUnit)} per ${args.quantityUnit}).`,
        data: result,
      };
    },
  },
  {
    definition: def(
      "compareMarkets",
      "Run the deterministic opportunity engine: compare candidate markets by estimated net proceeds using recorded prices (or explicit prices) and the user's expense inputs.",
      {
        commodity: { type: "string" },
        quantity: { type: "number" },
        quantityUnit: { type: "string", enum: ["kg", "quintal", "tonne"] },
        markets: {
          type: "array",
          description: "Optional explicit list of markets with per-market expenses.",
          items: {
            type: "object",
            properties: {
              market: { type: "string" },
              pricePerUnit: { type: "number" },
              priceUnit: { type: "string", enum: ["kg", "quintal", "tonne"] },
              expenses: { type: "object" },
            },
            required: ["market"],
          },
        },
        defaultExpenses: { type: "object" },
        state: { type: "string" },
        district: { type: "string" },
        marketLimit: { type: "integer", minimum: 2, maximum: 6 },
        recordType: { type: "string" },
        mode: modeParam,
      },
      ["commodity", "quantity", "quantityUnit"],
    ),
    schema: z.object({
      commodity: z.string().min(1),
      quantity: positiveQuantity,
      quantityUnit: unitSchema,
      markets: z
        .array(
          z.object({
            market: z.string().min(1),
            pricePerUnit: positiveMoney.optional(),
            priceUnit: unitSchema.optional(),
            expenses: expensesSchema.optional(),
          }),
        )
        .max(8)
        .optional(),
      defaultExpenses: expensesSchema.optional(),
      state: z.string().max(80).optional(),
      district: z.string().max(80).optional(),
      marketLimit: z.number().int().min(2).max(6).optional(),
      recordType: recordTypeSchema.optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        commodity: string;
        quantity: number;
        quantityUnit: "kg" | "quintal" | "tonne";
        markets?: Array<{
          market: string;
          pricePerUnit?: number;
          priceUnit?: "kg" | "quintal" | "tonne";
          expenses?: Record<string, number | undefined>;
        }>;
        defaultExpenses?: Record<string, number | undefined>;
        district?: string;
        marketLimit?: number;
        recordType?: "reported_market_price";
        mode?: "real" | "demo" | "all";
      };

      const commodity = await resolveCommodityToken(args.commodity);
      if (!commodity) {
        return {
          summary: `Commodity "${args.commodity}" is not in the catalogue, so no comparison can be run.`,
          data: { found: false },
        };
      }

      if (args.markets?.length) {
        const resolved = [];
        const unresolved: string[] = [];
        for (const entry of args.markets) {
          const market = await resolveMarketToken(entry.market);
          if (!market) {
            unresolved.push(entry.market);
            continue;
          }
          resolved.push({
            marketId: String(market._id),
            pricePerUnit: entry.pricePerUnit,
            priceUnit: entry.priceUnit,
            expenses: entry.expenses ?? args.defaultExpenses ?? {},
          });
        }
        if (resolved.length < 2) {
          return {
            summary: `Could not resolve enough markets to compare (unresolved: ${unresolved.join(", ") || "none"}).`,
            data: { found: false, unresolved },
          };
        }
        const output = await runComparison({
          commodityId: String(commodity._id),
          quantity: args.quantity,
          quantityUnit: args.quantityUnit,
          mode: args.mode ?? "all",
          recordType: args.recordType ?? "reported_market_price",
          candidates: resolved,
        });
        return { summary: summarizeComparison(output), data: output };
      }

      const output = await runAutoComparison({
        commodityId: String(commodity._id),
        quantity: args.quantity,
        quantityUnit: args.quantityUnit,
        mode: args.mode ?? "all",
        recordType: args.recordType ?? "reported_market_price",
        district: args.district,
        marketLimit: args.marketLimit ?? 3,
        defaultExpenses: args.defaultExpenses ?? {},
      });
      return { summary: summarizeComparison(output), data: output };
    },
  },
  {
    definition: def(
      "searchListings",
      "Search buyer requirements and seller listings. Listings are user-posted opportunities, never guaranteed transactions.",
      {
        type: { type: "string", enum: ["sell", "buy"] },
        commodity: { type: "string" },
        state: { type: "string" },
        district: { type: "string" },
        q: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 20 },
        mode: modeParam,
      },
    ),
    schema: z.object({
      type: z.enum(["sell", "buy"]).optional(),
      commodity: z.string().optional(),
      state: z.string().max(80).optional(),
      district: z.string().max(80).optional(),
      q: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(20).optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        type?: "sell" | "buy";
        commodity?: string;
        state?: string;
        district?: string;
        q?: string;
        limit?: number;
        mode?: "real" | "demo" | "all";
      };
      const commodity = args.commodity ? await resolveCommodityToken(args.commodity) : null;
      if (args.commodity && !commodity) {
        return { summary: `No commodity matched "${args.commodity}".`, data: { found: false, listings: [] } };
      }
      const { items, total } = await listListings(
        {
          type: args.type,
          status: "active",
          commodityId: commodity ? String(commodity._id) : undefined,
          state: args.state,
          district: args.district,
          q: args.q,
          sort: "recent",
          mode: args.mode ?? "all",
        },
        { skip: 0, limit: args.limit ?? 8 },
      );
      if (items.length === 0) {
        return {
          summary: "No matching active listings were found.",
          data: { found: false, listings: [] },
        };
      }
      const lines = items.map(
        (l) => {
          const row = l as Record<string, unknown>;
          return `${row.type === "sell" ? "Selling" : "Buying"} ${row.quantity} ${row.unit} of ${row.commodityName} in ${row.district}, ${row.state}${row.pricePerUnit ? ` at ${formatINR(Number(row.pricePerUnit))}/${row.priceUnit}` : ""}`;
        },
      );
      return {
        summary: `${items.length} of ${total} matching listings: ${lines.join("; ")}. These are user posts to investigate, not confirmed trades.`,
        data: { found: true, listings: items, total },
      };
    },
  },
  {
    definition: def(
      "getDataFreshness",
      "Report how current the stored price data is for a commodity: latest observation date, number of markets covered and how many are stale.",
      {
        commodity: { type: "string" },
        market: { type: "string" },
        district: { type: "string" },
        mode: modeParam,
      },
      ["commodity"],
    ),
    schema: z.object({
      commodity: z.string().min(1),
      market: z.string().optional(),
      district: z.string().max(80).optional(),
      mode: z.enum(["real", "demo", "all"]).optional(),
    }),
    async execute(raw) {
      const args = this.schema.parse(raw) as {
        commodity: string;
        market?: string;
        district?: string;
        mode?: "real" | "demo" | "all";
      };
      const commodity = await resolveCommodityToken(args.commodity);
      if (!commodity) {
        return { summary: `Commodity "${args.commodity}" is not in the catalogue.`, data: { found: false } };
      }
      const market = args.market ? await resolveMarketToken(args.market) : null;
      const summary = await getFreshnessSummary({
        commodityId: String(commodity._id),
        marketIds: market ? [String(market._id)] : undefined,
        district: args.district,
        mode: args.mode ?? "all",
      });
      if (summary.totalRecords === 0) {
        return {
          summary: `No price records are stored for ${commodity.name}. This means data is missing — it does not mean the market is closed.`,
          data: summary,
        };
      }
      return {
        summary: `For ${commodity.name}, the latest stored observation is ${formatDate(summary.latestPriceDate!)} (${summary.freshness?.label}, ${summary.freshness?.ageDays} days old), covering ${summary.marketsCovered} markets; ${summary.staleMarkets} are aging or stale.`,
        data: summary,
      };
    },
  },
];

function summarizeComparison(output: Awaited<ReturnType<typeof runAutoComparison>>): string {
  const { result } = output;
  if (!result.bestMarketName) {
    return "No comparison could be produced because no usable prices were available.";
  }
  const top = result.candidates
    .filter((c) => c.usable)
    .slice(0, 4)
    .map(
      (c) =>
        `${c.rank}. ${c.marketName}: ${formatINR(c.estimatedNetProceeds)} net (price ${formatINR(c.pricePerUnit ?? 0)}/${c.priceUnit}, ${c.priceDate ? `observed ${formatDate(c.priceDate)}` : "date unknown"}${c.isDemo ? ", demo data" : ""})`,
    );
  return `Estimated net proceeds ranking for ${output.commodity.name} (${result.input.quantity} ${result.input.quantityUnit}): ${top.join("; ")}. Highest estimated net proceeds based on the available data: ${result.bestMarketName}. This is an estimate from the assumptions provided, not a guaranteed return.`;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = APP_TOOLS.map((tool) => tool.definition);

export function getTool(name: string): AppTool | undefined {
  return APP_TOOLS.find((tool) => tool.definition.name === name);
}

export { formatINR };
