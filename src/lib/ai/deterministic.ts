import { getTool } from "@/lib/ai/tools";
import { loadKnownEntities, parseIntent, type ParsedIntent } from "@/lib/ai/nlu";
import { DETERMINISTIC_BANNER } from "@/lib/ai/prompts";
import type { AssistantToolTrace, AssistantResult } from "@/lib/ai/agent";
import type { AuthUser } from "@/lib/auth/current-user";
import { formatINR } from "@/lib/utils/decimal";
import { formatDate, formatRelativeDays } from "@/lib/utils/dates";
import { sourceLabel } from "@/lib/domain/sources";

interface RunDeterministicParams {
  question: string;
  user: AuthUser | null;
  now: Date;
}

interface ToolRun {
  ok: boolean;
  summary: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  trace: AssistantToolTrace;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { user: AuthUser | null; now: Date },
): Promise<ToolRun> {
  const tool = getTool(name);
  if (!tool) {
    return {
      ok: false,
      summary: `Unknown tool ${name}`,
      data: null,
      trace: { name, arguments: args, ok: false, summary: "Unknown tool" },
    };
  }
  try {
    const result = await tool.execute(args, ctx);
    return {
      ok: true,
      summary: result.summary,
      data: result.data,
      trace: { name, arguments: args, ok: true, summary: result.summary },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool failed";
    return {
      ok: false,
      summary: message,
      data: null,
      trace: { name, arguments: args, ok: false, summary: `Tool failed: ${message}` },
    };
  }
}

function listLines(items: string[]): string {
  return items.map((line) => `• ${line}`).join("\n");
}

/**
 * Deterministic assistant: rule-based parsing, real database queries and the
 * same calculation engine the UI uses. It never invents data and is explicitly
 * identified as non-model output.
 */
export async function runDeterministicAssistant(
  params: RunDeterministicParams,
): Promise<Omit<AssistantResult, "provider">> {
  const known = await loadKnownEntities();
  const intent: ParsedIntent = parseIntent(params.question, known);
  const ctx = { user: params.user, now: params.now };
  const trace: AssistantToolTrace[] = [];
  let missingData = false;
  const notes: string[] = [];

  const interpreted = `Interpreted as: ${intent.kind}${intent.commodity ? `, commodity "${intent.commodity}"` : ""}${intent.quantity ? `, ${intent.quantity} ${intent.quantityUnit ?? "quintal"}` : ""}${intent.district ? `, ${intent.district}` : ""}.`;

  if (intent.kind === "help" || (intent.kind === "unknown" && !intent.commodity)) {
    return {
      answer: [
        DETERMINISTIC_BANNER,
        "",
        "I can help with things like:",
        listLines([
          "Compare maize prices across nearby markets and account for transport costs.",
          "Show the latest reported wheat prices in a district.",
          "Explain the price trend for a commodity over the last 30 days.",
          "Find buyers looking for 20–50 quintals of a commodity.",
          "Tell you how fresh the stored price data is.",
        ]),
        "",
        `Try: "Compare 50 quintals of maize with transport costs" or "latest paddy prices in Samastipur".`,
      ].join("\n"),
      mode: "deterministic",
      toolTrace: trace,
      grounded: false,
      missingData: false,
      notes: [interpreted],
    };
  }

  if (!intent.commodity) {
    return {
      answer: [
        DETERMINISTIC_BANNER,
        "",
        "Which commodity do you mean? For example: maize, paddy, wheat, potato or onion.",
        "",
        interpreted,
      ].join("\n"),
      mode: "deterministic",
      toolTrace: trace,
      grounded: false,
      missingData: false,
      notes: [interpreted],
    };
  }

  /* ----------------------------- compare ---------------------------------- */
  if (intent.kind === "compare") {
    if (!intent.quantity) {
      const prices = await runTool(
        "getMarketPrices",
        { commodity: intent.commodity, district: intent.district, limit: 6 },
        ctx,
      );
      trace.push(prices.trace);
      missingData = true;
      return {
        answer: [
          DETERMINISTIC_BANNER,
          "",
          prices.summary,
          "",
          `To estimate net proceeds I need the quantity you plan to sell (for example "50 quintals").`,
          "",
          "Missing information: quantity (and ideally your transportation and market-charge costs).",
        ].join("\n"),
        mode: "deterministic",
        toolTrace: trace,
        grounded: true,
        missingData: true,
        notes: [interpreted],
      };
    }

    const comparison = await runTool(
      "compareMarkets",
      {
        commodity: intent.commodity,
        quantity: intent.quantity,
        quantityUnit: intent.quantityUnit ?? "quintal",
        district: intent.district,
        marketLimit: 3,
        mode: "all",
      },
      ctx,
    );
    trace.push(comparison.trace);

    if (!comparison.ok || !comparison.data?.result) {
      missingData = true;
      return {
        answer: [DETERMINISTIC_BANNER, "", comparison.summary].join("\n"),
        mode: "deterministic",
        toolTrace: trace,
        grounded: true,
        missingData: true,
        notes: [interpreted],
      };
    }

    const { result, commodity } = comparison.data as {
      result: {
        candidates: Array<{
          rank: number | null;
          marketName: string;
          usable: boolean;
          pricePerUnit: number | null;
          priceUnit: string;
          priceDate: string | null;
          estimatedNetProceeds: number;
          grossSaleValue: number;
          totalExpenses: number;
          differenceFromBest: number | null;
          isDemo: boolean;
          recordTypeLabel: string;
          dataSourceLabel?: string;
          freshness?: { label: string; ageDays: number } | null;
          unusableReason?: string;
        }>;
        bestMarketName: string | null;
        runnerUp: { marketName: string; netProceeds: number } | null;
        assumptions: { warnings: string[]; missingInformation: string[]; alternatives: string[]; disclaimer: string };
      };
      commodity: { name: string; slug: string };
    };

    const ranked = result.candidates.filter((candidate) => candidate.usable);
    const lines = ranked.map(
      (candidate) =>
        `${candidate.rank}. ${candidate.marketName}: net ${formatINR(candidate.estimatedNetProceeds)} from gross ${formatINR(candidate.grossSaleValue)} − expenses ${formatINR(candidate.totalExpenses)} (price ${formatINR(candidate.pricePerUnit ?? 0)}/${candidate.priceUnit}${candidate.priceDate ? `, observed ${formatDate(candidate.priceDate)}` : ""}${candidate.isDemo ? ", demo data" : ""})`,
    );

    const unavailable = result.candidates.filter((candidate) => !candidate.usable);
    const missingInfo = [...result.assumptions.missingInformation];
    if (unavailable.length) {
      missingInfo.push(
        ...unavailable.map((c) => `${c.marketName}: ${c.unusableReason ?? "no usable price"}`),
      );
    }

    missingData = missingInfo.length > 0;

    return {
      answer: [
        DETERMINISTIC_BANNER,
        "",
        `Highest estimated net proceeds based on the available data: ${result.bestMarketName ?? "none available"}.`,
        "",
        "Figures",
        listLines(lines.length ? lines : ["No market with a usable price could be ranked."]),
        "",
        "Source & date",
        listLines(
          ranked.map(
            (c) =>
              `${c.marketName}: ${c.recordTypeLabel}${c.dataSourceLabel ? ` via ${c.dataSourceLabel}` : ""}${c.priceDate ? `, observed ${formatDate(c.priceDate)} (${c.freshness?.label ?? "unknown freshness"}, ${c.freshness?.ageDays ?? "?"} days old)` : ""}`,
          ),
        ),
        "",
        "Assumptions",
        listLines([
          `Quantity: ${intent.quantity} ${intent.quantityUnit ?? "quintal"}.`,
          "Gross = quantity × price; net = gross − expenses.",
          ...result.assumptions.alternatives,
        ]),
        missingInfo.length ? `\nMissing / to verify\n${listLines(missingInfo)}` : "",
        result.assumptions.warnings.length
          ? `\nWarnings\n${listLines(result.assumptions.warnings)}`
          : "",
        "",
        result.assumptions.disclaimer,
        `\nOpen the full comparison: /compare?commodity=${commodity.slug}`,
      ]
        .filter(Boolean)
        .join("\n"),
      mode: "deterministic",
      toolTrace: trace,
      grounded: true,
      missingData,
      notes: [interpreted, "Net proceeds were calculated by the MandiLens opportunity engine, not by a language model."],
    };
  }

  /* ----------------------------- prices ----------------------------------- */
  if (intent.kind === "prices") {
    const prices = await runTool(
      "getMarketPrices",
      { commodity: intent.commodity, market: intent.market, district: intent.district, limit: 8 },
      ctx,
    );
    trace.push(prices.trace);
    const rows = (prices.data?.prices ?? []) as Array<{
      marketId: string;
      modalPrice?: number;
      minPrice?: number;
      maxPrice?: number;
      unit: string;
      priceDate: string;
      dataSource: string;
      isDemo: boolean;
      freshness?: { label: string; ageDays: number };
    }>;
    missingData = rows.length === 0;

    return {
      answer: [
        DETERMINISTIC_BANNER,
        "",
        prices.summary,
        rows.length ? "\nFigures" : "",
        rows.length
          ? listLines(
              rows.map(
                (row) =>
                  `modal ${formatINR(row.modalPrice ?? row.minPrice ?? 0)}/${row.unit} (min ${formatINR(row.minPrice ?? 0)}, max ${formatINR(row.maxPrice ?? 0)}) — observed ${formatDate(row.priceDate)}, ${row.freshness?.label ?? "freshness unknown"} (${row.freshness?.ageDays ?? "?"} days old), source ${sourceLabel(row.dataSource)}${row.isDemo ? ", demo data" : ""}`,
              ),
            )
          : "",
        rows.length ? "\nWarnings" : "",
        rows.length
          ? listLines(
              rows.some((row) => row.isDemo)
                ? ["Some of these records are demo data and must not be treated as real market prices."]
                : ["Reported prices are observations for the dates shown, not live quotes."],
            )
          : "",
        "\nMissing information: confirm the current price with the market or your buyer, since stored observations can lag the market.",
        `\nSee commodity page: /commodities`,
      ]
        .filter(Boolean)
        .join("\n"),
      mode: "deterministic",
      toolTrace: trace,
      grounded: true,
      missingData,
      notes: [interpreted],
    };
  }

  /* ----------------------------- history ---------------------------------- */
  if (intent.kind === "history") {
    const history = await runTool(
      "getPriceHistory",
      { commodity: intent.commodity, market: intent.market, district: intent.district, days: intent.days ?? 30 },
      ctx,
    );
    trace.push(history.trace);
    missingData = !history.data?.found;
    return {
      answer: [
        DETERMINISTIC_BANNER,
        "",
        history.summary,
        "",
        "Missing information: this trend only reflects stored observations. Gaps mean no data for those days — not that the market was closed.",
        `\nSee the full chart: /commodities`,
      ].join("\n"),
      mode: "deterministic",
      toolTrace: trace,
      grounded: true,
      missingData,
      notes: [interpreted],
    };
  }

  /* ----------------------------- buyers / sellers ------------------------- */
  if (intent.kind === "buyers" || intent.kind === "sellers") {
    const listings = await runTool(
      "searchListings",
      {
        type: intent.kind === "buyers" ? "buy" : "sell",
        commodity: intent.commodity,
        district: intent.district,
        state: intent.state,
        limit: 8,
      },
      ctx,
    );
    trace.push(listings.trace);
    const rows = (listings.data?.listings ?? []) as Array<Record<string, unknown>>;
    missingData = rows.length === 0;

    return {
      answer: [
        DETERMINISTIC_BANNER,
        "",
        listings.summary,
        rows.length ? "\nListings" : "",
        rows.length
          ? listLines(
              rows.map((row) => {
                const posted = row.createdAt ? ` (posted ${formatRelativeDays(new Date(String(row.createdAt)), params.now)})` : "";
                return `${row.type === "sell" ? "Selling" : "Buying"} ${row.quantity} ${row.unit} of ${row.commodityName} in ${row.district}, ${row.state}${row.pricePerUnit ? ` at ${formatINR(Number(row.pricePerUnit))}/${row.priceUnit}` : ""}${posted}${row.isDemo ? " — demo listing" : ""}`;
              }),
            )
          : "",
        "\nImportant: these are user-posted opportunities to investigate. MandiLens has not contacted anyone and does not guarantee a transaction.",
        `\nBrowse all listings: /listings`,
      ]
        .filter(Boolean)
        .join("\n"),
      mode: "deterministic",
      toolTrace: trace,
      grounded: true,
      missingData,
      notes: [interpreted],
    };
  }

  /* ----------------------------- freshness -------------------------------- */
  const freshness = await runTool(
    "getDataFreshness",
    { commodity: intent.commodity, market: intent.market, district: intent.district },
    ctx,
  );
  trace.push(freshness.trace);
  missingData = !freshness.data?.totalRecords;
  return {
    answer: [
      DETERMINISTIC_BANNER,
      "",
      freshness.summary,
      "",
      "Note: an empty dataset means no data has been imported — it does not mean the market is closed.",
    ].join("\n"),
    mode: "deterministic",
    toolTrace: trace,
    grounded: true,
    missingData,
    notes: [interpreted],
  };
}
