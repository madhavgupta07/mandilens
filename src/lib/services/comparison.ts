import type { RecordType, Unit } from "@/lib/domain/constants";
import { DEFAULT_PRICE_UNIT } from "@/lib/domain/constants";
import { ApiError } from "@/lib/api/response";
import { getCommodityById, getCommodityBySlug, findCommodityByName, getMarketById, listMarkets } from "@/lib/services/catalog";
import { getFreshnessSummary, getLatestPricesByMarket, type LatestPrice } from "@/lib/services/prices";
import { buildComparison, type CandidateInput, type OpportunityResult } from "@/lib/services/opportunity";
import { sourceLabel } from "@/lib/domain/sources";
import type { CompareInput, AutoCompareInput } from "@/lib/validation/compare";

export interface ComparisonProvenanceRow {
  marketId: string;
  marketName: string;
  dataSource: string;
  dataSourceLabel: string;
  recordType: RecordType;
  priceDate: string | null;
  fetchedAt: string | null;
  isDemo: boolean;
  freshnessLevel: string | null;
  ageDays: number | null;
}

export interface ComparisonOutput {
  commodity: {
    id: string;
    name: string;
    slug: string;
    hindiName?: string;
    category: string;
    defaultUnit: string;
    isDemo: boolean;
  };
  mode: string;
  result: OpportunityResult;
  dataProvenance: {
    rows: ComparisonProvenanceRow[];
    recordTypes: RecordType[];
    dataSources: string[];
    hasDemoData: boolean;
  };
}

async function resolveCommodity(input: {
  commodityId?: string;
  commoditySlug?: string;
  commodityName?: string;
  mode: "real" | "demo" | "all";
}) {
  const commodity =
    (input.commodityId ? await getCommodityById(input.commodityId) : null) ??
    (input.commoditySlug ? await getCommodityBySlug(input.commoditySlug) : null) ??
    (input.commodityName ? await findCommodityByName(input.commodityName, input.mode) : null);

  if (!commodity) {
    throw ApiError.notFound(
      "That commodity was not found. Try a different name, or import the relevant market data first.",
    );
  }
  return commodity;
}

function resolvePriceUnit(unit?: string): Unit {
  return (unit as Unit) || DEFAULT_PRICE_UNIT;
}

/**
 * Build CandidateInput objects from the request and the latest recorded prices,
 * then run the deterministic engine. The model layer never computes these numbers.
 */
async function buildCandidates(params: {
  mode: "real" | "demo" | "all";
  recordType: RecordType;
  commodityId: string;
  requests: Array<{
    marketId: string;
    pricePerUnit?: number;
    priceUnit?: string;
    expenses: Record<string, number | undefined>;
    note?: string;
  }>;
}) {
  const markets = await Promise.all(
    params.requests.map((request) => getMarketById(request.marketId)),
  );

  const missing = params.requests.filter((_, index) => !markets[index]);
  if (missing.length > 0) {
    throw ApiError.unprocessable("One or more selected markets could not be found.");
  }

  const latest = await getLatestPricesByMarket({
    commodityId: params.commodityId,
    marketIds: params.requests.map((r) => r.marketId),
    mode: params.mode === "all" ? "all" : params.mode,
    recordType: params.recordType,
  });
  const byMarket = new Map<string, LatestPrice>();
  for (const price of latest) byMarket.set(price.marketId, price);

  const candidates: CandidateInput[] = params.requests.map((request, index) => {
    const market = markets[index]!;
    const recorded = byMarket.get(request.marketId);
    const hasManual = request.pricePerUnit !== undefined;

    const priceUnit = hasManual
      ? resolvePriceUnit(request.priceUnit)
      : resolvePriceUnit(recorded?.unit);

    const pricePerUnit = hasManual
      ? request.pricePerUnit!
      : recorded
        ? (recorded.modalPrice ?? recorded.minPrice ?? null) ?? null
        : null;

    return {
      marketId: request.marketId,
      marketName: market.name,
      district: market.district,
      state: market.state,
      pricePerUnit,
      priceUnit,
      priceSource: hasManual ? "user" : recorded ? "recorded" : "recorded",
      recordType: hasManual ? "user_submitted" : params.recordType,
      priceDate: hasManual ? new Date() : recorded ? new Date(recorded.priceDate) : null,
      dataSource: hasManual ? "user_input" : recorded?.dataSource,
      dataSourceLabel: hasManual
        ? "User-supplied estimate"
        : recorded
          ? sourceLabel(recorded.dataSource)
          : undefined,
      fetchedAt: recorded ? new Date(recorded.fetchedAt) : null,
      isDemo: market.isDemo || Boolean(recorded?.isDemo),
      variety: recorded?.variety,
      grade: recorded?.grade,
      note: request.note,
      expenses: request.expenses,
    };
  });

  return { candidates, byMarket };
}

export async function runComparison(input: CompareInput): Promise<ComparisonOutput> {
  const commodity = await resolveCommodity(input);
  const { candidates, byMarket } = await buildCandidates({
    mode: input.mode,
    recordType: input.recordType,
    commodityId: String(commodity._id),
    requests: input.candidates.map((candidate) => ({
      marketId: candidate.marketId,
      pricePerUnit: candidate.pricePerUnit,
      priceUnit: candidate.priceUnit,
      expenses: candidate.expenses,
      note: candidate.note,
    })),
  });

  const result = buildComparison({
    quantity: input.quantity,
    quantityUnit: input.quantityUnit,
    candidates,
  });

  const freshness = await getFreshnessSummary({
    commodityId: String(commodity._id),
    marketIds: input.candidates.map((c) => c.marketId),
    mode: input.mode === "all" ? "all" : input.mode,
    recordType: input.recordType,
  });

  return assembleOutput(commodity, input.mode, result, candidates, byMarket, freshness);
}

/**
 * Convenience path used by the demo walkthrough and the assistant: pick the
 * markets with the most recent recorded prices in an area and compare them.
 */
export async function runAutoComparison(
  input: AutoCompareInput,
): Promise<ComparisonOutput> {
  const commodity = await resolveCommodity(input);

  // Narrow to markets in the requested area before looking up prices, so a
  // district question never ranks a market from somewhere else.
  let marketIds: string[] | undefined;
  if (input.district || input.state) {
    const { items } = await listMarkets({
      district: input.district,
      state: input.state,
      mode: input.mode === "all" ? "all" : input.mode,
      limit: 200,
    });
    if (items.length === 0) {
      throw ApiError.unprocessable(
        "No markets were found in the requested area. Try a nearby district or remove the location filter.",
      );
    }
    marketIds = items.map((market) => String(market._id));
  }

  const latest = await getLatestPricesByMarket({
    commodityId: String(commodity._id),
    marketIds,
    mode: input.mode === "all" ? "all" : input.mode,
    recordType: input.recordType,
    limit: 60,
  });
  if (latest.length === 0) {
    throw ApiError.unprocessable(
      "No recorded prices are available for this commodity yet. Import market data or enter prices manually.",
    );
  }

  const selected = latest.slice(0, input.marketLimit);
  const requests = selected.map((price) => ({
    marketId: price.marketId,
    expenses: input.defaultExpenses as Record<string, number | undefined>,
  }));

  const { candidates, byMarket } = await buildCandidates({
    mode: input.mode,
    recordType: input.recordType,
    commodityId: String(commodity._id),
    requests,
  });

  const result = buildComparison({
    quantity: input.quantity,
    quantityUnit: input.quantityUnit,
    candidates,
  });

  const freshness = await getFreshnessSummary({
    commodityId: String(commodity._id),
    marketIds: selected.map((s) => s.marketId),
    mode: input.mode === "all" ? "all" : input.mode,
    recordType: input.recordType,
  });

  return assembleOutput(commodity, input.mode, result, candidates, byMarket, freshness);
}

function assembleOutput(
  commodity: Awaited<ReturnType<typeof resolveCommodity>>,
  mode: string,
  result: OpportunityResult,
  candidates: CandidateInput[],
  byMarket: Map<string, LatestPrice>,
  freshness: Awaited<ReturnType<typeof getFreshnessSummary>>,
): ComparisonOutput {
  const rows: ComparisonProvenanceRow[] = result.candidates.map((candidate) => {
    const latest = byMarket.get(candidate.marketId);
    return {
      marketId: candidate.marketId,
      marketName: candidate.marketName,
      dataSource: candidate.dataSource ?? "user_input",
      dataSourceLabel: candidate.dataSourceLabel ?? sourceLabel(candidate.dataSource ?? "user_input"),
      recordType: candidate.recordType,
      priceDate: candidate.priceDate,
      fetchedAt: latest ? latest.fetchedAt : null,
      isDemo: candidate.isDemo,
      freshnessLevel: candidate.freshness?.level ?? null,
      ageDays: candidate.freshness?.ageDays ?? null,
    };
  });

  return {
    commodity: {
      id: String(commodity._id),
      name: commodity.name,
      slug: commodity.slug,
      hindiName: commodity.hindiName,
      category: commodity.category,
      defaultUnit: commodity.defaultUnit,
      isDemo: commodity.isDemo,
    },
    mode,
    result,
    dataProvenance: {
      rows,
      recordTypes: [...new Set(candidates.map((c) => c.recordType))],
      dataSources: [...new Set(rows.map((r) => r.dataSource))],
      hasDemoData: rows.some((r) => r.isDemo),
      ...(freshness ? {} : {}),
    },
  };
}
