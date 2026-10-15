import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Commodity, Market, type ICommodity, type IMarket } from "@/lib/db/models";
import { normalizeName, slugify } from "@/lib/utils/slug";
import { escapeRegex } from "@/lib/utils/serialize";
import type { DataMode } from "@/lib/domain/constants";

export interface MarketQuery {
  q?: string;
  state?: string;
  district?: string;
  mode?: DataMode | "all";
  activeOnly?: boolean;
  limit?: number;
  skip?: number;
}

function modeFilter(mode: MarketQuery["mode"]) {
  if (!mode || mode === "all") return {};
  return { isDemo: mode === "demo" };
}

export interface MarketListItem {
  id: string;
  name: string;
  slug: string;
  state: string;
  district: string;
  isDemo: boolean;
}

export function toMarketListItem(market: IMarket): MarketListItem {
  return {
    id: String(market._id),
    name: market.name,
    slug: market.slug,
    state: market.state,
    district: market.district,
    isDemo: market.isDemo,
  };
}

export async function listMarkets(query: MarketQuery = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { ...modeFilter(query.mode) };
  if (query.state) filter.state = query.state;
  if (query.district) filter.district = query.district;
  if (query.activeOnly !== false) filter.isActive = true;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q.trim()), "i");
    filter.$or = [{ name: rx }, { district: rx }, { state: rx }];
  }

  const limit = Math.min(query.limit ?? 20, 100);
  const skip = query.skip ?? 0;

  const [items, total] = await Promise.all([
    Market.find(filter).sort({ state: 1, district: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Market.countDocuments(filter),
  ]);

  return { items: items as unknown as IMarket[], total };
}

export async function searchMarkets(query: MarketQuery = {}) {
  const { items, total } = await listMarkets({ ...query, limit: query.limit ?? 10 });
  return { items: items.map(toMarketListItem), total };
}

export async function getMarketBySlug(slug: string) {
  await connectToDatabase();
  return Market.findOne({ slug }).lean<IMarket | null>();
}

export async function getMarketById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return Market.findById(id).lean<IMarket | null>();
}

export async function listMarketStates(mode: DataMode | "all" = "all") {
  await connectToDatabase();
  return Market.distinct("state", modeFilter(mode));
}

export async function listMarketDistricts(state?: string, mode: DataMode | "all" = "all") {
  await connectToDatabase();
  const filter: Record<string, unknown> = { ...modeFilter(mode) };
  if (state) filter.state = state;
  return Market.distinct("district", filter);
}

/* -------------------------------------------------------------------------- */
/*  Commodities                                                               */
/* -------------------------------------------------------------------------- */

export interface CommodityQuery {
  q?: string;
  category?: string;
  mode?: DataMode | "all";
  activeOnly?: boolean;
  limit?: number;
  skip?: number;
}

export interface CommodityListItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  defaultUnit: string;
  isDemo: boolean;
}

export function toCommodityListItem(commodity: ICommodity): CommodityListItem {
  return {
    id: String(commodity._id),
    name: commodity.name,
    slug: commodity.slug,
    category: commodity.category,
    defaultUnit: commodity.defaultUnit,
    isDemo: commodity.isDemo,
  };
}

export async function listCommodities(query: CommodityQuery = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (query.mode && query.mode !== "all") filter.isDemo = query.mode === "demo";
  if (query.category) filter.category = query.category;
  if (query.activeOnly !== false) filter.isActive = true;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q.trim()), "i");
    filter.$or = [{ name: rx }, { aliases: rx }, { hindiName: rx }];
  }

  const limit = Math.min(query.limit ?? 24, 100);
  const skip = query.skip ?? 0;

  const [items, total] = await Promise.all([
    Commodity.find(filter)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Commodity.countDocuments(filter),
  ]);

  return { items: items as unknown as ICommodity[], total };
}

export async function searchCommodities(query: CommodityQuery = {}) {
  const { items, total } = await listCommodities({ ...query, limit: query.limit ?? 10 });
  return { items: items.map(toCommodityListItem), total };
}

export async function getCommodityBySlug(slug: string) {
  await connectToDatabase();
  return Commodity.findOne({ slug }).lean<ICommodity | null>();
}

export async function getCommodityById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return Commodity.findById(id).lean<ICommodity | null>();
}

export async function listCommodityCategories(mode: DataMode | "all" = "all") {
  await connectToDatabase();
  return Commodity.distinct("category", modeFilter(mode));
}

/**
 * Resolve a commodity from free text (used by the assistant and listings).
 * Matches on exact name, then slug, then aliases, then substring.
 */
export async function findCommodityByName(
  name: string,
  mode: DataMode | "all" = "all",
): Promise<ICommodity | null> {
  await connectToDatabase();
  const filter = modeFilter(mode);
  const trimmed = name.trim();
  if (!trimmed) return null;

  const slug = slugify(trimmed);
  const normalized = normalizeName(trimmed);

  const exact = await Commodity.findOne({
    ...filter,
    $or: [{ slug }, { name: new RegExp(`^${escapeRegex(trimmed)}$`, "i") }],
  }).lean<ICommodity | null>();
  if (exact) return exact;

  const all = await Commodity.find(filter).lean<ICommodity[]>();
  const normTarget = normalized;
  const aliasHit = all.find((c) =>
    [c.name, ...(c.aliases ?? []), c.hindiName ?? ""]
      .map((n) => normalizeName(n))
      .includes(normTarget),
  );
  if (aliasHit) return aliasHit;

  const substring = all.find(
    (c) =>
      normalizeName(c.name).includes(normTarget) ||
      normTarget.includes(normalizeName(c.name)) ||
      (c.aliases ?? []).some((a) => normalizeName(a).includes(normTarget)),
  );
  return substring ?? null;
}

export async function findMarketByName(
  name: string,
  mode: DataMode | "all" = "all",
): Promise<IMarket | null> {
  await connectToDatabase();
  const filter = modeFilter(mode);
  const trimmed = name.trim();
  if (!trimmed) return null;

  const slug = slugify(trimmed);
  const exact = await Market.findOne({
    ...filter,
    $or: [{ slug }, { name: new RegExp(`^${escapeRegex(trimmed)}$`, "i") }],
  }).lean<IMarket | null>();
  if (exact) return exact;

  const all = await Market.find(filter).lean<IMarket[]>();
  const normTarget = normalizeName(trimmed);
  return (
    all.find((m) => normalizeName(m.name).includes(normTarget)) ?? null
  );
}
