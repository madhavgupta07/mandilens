import { Types, type PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { MarketPrice, type IMarketPrice } from "@/lib/db/models";
import { getFreshness } from "@/lib/utils/dates";
import { sourceLabel } from "@/lib/domain/sources";
import type { DataMode, RecordType } from "@/lib/domain/constants";

export interface PriceQuery {
  commodityId: string;
  marketIds?: string[];
  state?: string;
  district?: string;
  mode?: DataMode | "all";
  recordType?: RecordType;
  sinceDays?: number;
  limit?: number;
}

function buildMatch(query: PriceQuery) {
  const match: Record<string, unknown> = {};
  if (Types.ObjectId.isValid(query.commodityId)) {
    match.commodity = new Types.ObjectId(query.commodityId);
  }
  if (query.marketIds?.length) {
    match.market = {
      $in: query.marketIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id)),
    };
  }
  if (query.mode && query.mode !== "all") match.isDemo = query.mode === "demo";
  if (query.recordType) match.recordType = query.recordType;
  if (query.sinceDays) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - query.sinceDays);
    match.priceDate = { $gte: since };
  }
  return match;
}

export interface LatestPrice {
  marketId: string;
  priceId: string;
  unit: string;
  currency: string;
  minPrice?: number;
  maxPrice?: number;
  modalPrice?: number;
  priceDate: string;
  recordType: RecordType;
  dataSource: string;
  dataSourceLabel?: string;
  fetchedAt: string;
  isDemo: boolean;
  variety?: string;
  grade?: string;
  freshness: ReturnType<typeof getFreshness>;
}

/** Latest observation per market for a commodity (aggregation, index-backed). */
export async function getLatestPricesByMarket(
  query: PriceQuery,
): Promise<LatestPrice[]> {
  await connectToDatabase();
  const match = buildMatch(query);

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { priceDate: -1, "provenance.fetchedAt": -1 } },
    {
      $group: {
        _id: "$market",
        doc: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { priceDate: -1 } },
  ];
  if (query.limit) pipeline.push({ $limit: query.limit });

  const docs = await MarketPrice.aggregate(pipeline);
  return (docs as IMarketPrice[]).map((doc) => toLatestPrice(doc));
}

export function toLatestPrice(doc: IMarketPrice): LatestPrice {
  const priceDate = new Date(doc.priceDate);
  return {
    marketId: String(doc.market),
    priceId: String(doc._id),
    unit: doc.unit,
    currency: doc.currency,
    minPrice: doc.minPrice,
    maxPrice: doc.maxPrice,
    modalPrice: doc.modalPrice,
    priceDate: priceDate.toISOString(),
    recordType: doc.recordType,
    dataSource: doc.provenance.dataSource,
    dataSourceLabel: sourceLabel(doc.provenance.dataSource),
    fetchedAt: new Date(doc.provenance.fetchedAt).toISOString(),
    isDemo: doc.isDemo,
    variety: doc.variety,
    grade: doc.grade,
    freshness: getFreshness(priceDate),
  };
}

export interface MarketCommodityPrice {
  commodityId: string;
  commodityName?: string;
  commoditySlug?: string;
  hindiName?: string;
  category?: string;
  unit: string;
  currency: string;
  minPrice?: number;
  maxPrice?: number;
  modalPrice?: number;
  priceDate: string;
  recordType: RecordType;
  dataSource: string;
  dataSourceLabel: string;
  isDemo: boolean;
  variety?: string;
  grade?: string;
  freshness: ReturnType<typeof getFreshness>;
}

/** Latest observation per commodity for a single market (index-backed aggregation). */
export async function getLatestPricesByCommodity(query: {
  marketId: string;
  mode?: DataMode | "all";
  limit?: number;
}): Promise<MarketCommodityPrice[]> {
  await connectToDatabase();
  const match: Record<string, unknown> = {};
  if (Types.ObjectId.isValid(query.marketId)) {
    match.market = new Types.ObjectId(query.marketId);
  }
  if (query.mode && query.mode !== "all") match.isDemo = query.mode === "demo";

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { priceDate: -1, "provenance.fetchedAt": -1 } },
    { $group: { _id: "$commodity", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { priceDate: -1 } },
    { $limit: query.limit ?? 100 },
    {
      $lookup: {
        from: "commodities",
        localField: "commodity",
        foreignField: "_id",
        as: "commodityDoc",
      },
    },
    { $unwind: { path: "$commodityDoc", preserveNullAndEmptyArrays: true } },
  ];

  const docs = await MarketPrice.aggregate(pipeline);
  return (docs as (IMarketPrice & { commodityDoc?: Record<string, unknown> })[]).map((doc) => {
    const commodity = doc.commodityDoc as
      | { _id?: Types.ObjectId; name?: string; slug?: string; hindiName?: string; category?: string }
      | undefined;
    return {
      commodityId: String(doc.commodity),
      commodityName: commodity?.name,
      commoditySlug: commodity?.slug,
      hindiName: commodity?.hindiName,
      category: commodity?.category,
      unit: doc.unit,
      currency: doc.currency,
      minPrice: doc.minPrice,
      maxPrice: doc.maxPrice,
      modalPrice: doc.modalPrice,
      priceDate: new Date(doc.priceDate).toISOString(),
      recordType: doc.recordType,
      dataSource: doc.provenance.dataSource,
      dataSourceLabel: sourceLabel(doc.provenance.dataSource),
      isDemo: doc.isDemo,
      variety: doc.variety,
      grade: doc.grade,
      freshness: getFreshness(new Date(doc.priceDate)),
    };
  });
}

export interface PriceHistoryPoint {
  date: string;
  modalPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  unit: string;
  marketId: string;
  marketName?: string;
  isDemo: boolean;
  recordType: RecordType;
  dataSource: string;
}

/** Chronological price series, one point per (date, market). */
export async function getPriceHistory(
  query: PriceQuery & { marketId?: string },
): Promise<PriceHistoryPoint[]> {
  await connectToDatabase();
  const match = buildMatch(query);
  if (query.marketId && Types.ObjectId.isValid(query.marketId)) {
    match.market = new Types.ObjectId(query.marketId);
  }

  const docs = await MarketPrice.find(match)
    .sort({ priceDate: 1 })
    .limit(Math.min(query.limit ?? 400, 1000))
    .populate("market", "name")
    .lean<(IMarketPrice & { market: { _id: Types.ObjectId; name: string } })[]>();

  return docs.map((doc) => ({
    date: new Date(doc.priceDate).toISOString(),
    modalPrice: doc.modalPrice ?? null,
    minPrice: doc.minPrice ?? null,
    maxPrice: doc.maxPrice ?? null,
    unit: doc.unit,
    marketId: String((doc.market as { _id: Types.ObjectId })?._id ?? doc.market),
    marketName: (doc.market as { name?: string })?.name,
    isDemo: doc.isDemo,
    recordType: doc.recordType,
    dataSource: doc.provenance.dataSource,
  }));
}

export interface FreshnessSummary {
  commodityId: string;
  totalRecords: number;
  marketsCovered: number;
  latestPriceDate: string | null;
  latestFetchedAt: string | null;
  freshness: ReturnType<typeof getFreshness> | null;
  staleMarkets: number;
  freshMarkets: number;
  dataSources: string[];
  modes: DataMode[];
}

/**
 * Summarise how current the available data is. An empty result is reported as
 * "no data" — never interpreted as "the market is closed".
 */
export async function getFreshnessSummary(
  query: PriceQuery,
): Promise<FreshnessSummary> {
  await connectToDatabase();
  const match = buildMatch(query);

  const docs = await MarketPrice.find(match)
    .sort({ priceDate: -1 })
    .limit(5000)
    .lean<IMarketPrice[]>();

  if (docs.length === 0) {
    return {
      commodityId: query.commodityId,
      totalRecords: 0,
      marketsCovered: 0,
      latestPriceDate: null,
      latestFetchedAt: null,
      freshness: null,
      staleMarkets: 0,
      freshMarkets: 0,
      dataSources: [],
      modes: [],
    };
  }

  const latestByMarket = new Map<string, IMarketPrice>();
  for (const doc of docs) {
    const key = String(doc.market);
    if (!latestByMarket.has(key)) latestByMarket.set(key, doc);
  }

  let stale = 0;
  let fresh = 0;
  for (const doc of latestByMarket.values()) {
    const info = getFreshness(new Date(doc.priceDate));
    if (info.level === "stale" || info.level === "aging") stale += 1;
    else fresh += 1;
  }

  const newest = docs[0];
  return {
    commodityId: query.commodityId,
    totalRecords: docs.length,
    marketsCovered: latestByMarket.size,
    latestPriceDate: new Date(newest.priceDate).toISOString(),
    latestFetchedAt: new Date(newest.provenance.fetchedAt).toISOString(),
    freshness: getFreshness(new Date(newest.priceDate)),
    staleMarkets: stale,
    freshMarkets: fresh,
    dataSources: [...new Set(docs.map((doc) => doc.provenance.dataSource))],
    modes: [...new Set(docs.map((doc) => (doc.isDemo ? "demo" : "real")))] as DataMode[],
  };
}
