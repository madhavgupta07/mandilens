import { connectToDatabase } from "@/lib/db/connect";
import { SavedComparison, Watchlist, Market, Commodity } from "@/lib/db/models";
import { ApiError } from "@/lib/api/response";
import { serialize } from "@/lib/utils/serialize";
import type { WatchlistCreateInput } from "@/lib/validation/listing";

export async function createWatchlist(userId: string, input: WatchlistCreateInput) {
  await connectToDatabase();
  const doc = await Watchlist.create({ user: userId, ...input });
  return serialize(doc.toObject());
}

export async function listWatchlists(userId: string) {
  await connectToDatabase();
  const items = await Watchlist.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("markets", "name slug district state isDemo")
    .populate("commodities", "name slug category isDemo")
    .lean();
  return items.map((item) => serialize<Record<string, unknown>>(item));
}

export async function updateWatchlist(
  userId: string,
  id: string,
  input: Partial<WatchlistCreateInput>,
) {
  await connectToDatabase();
  const doc = await Watchlist.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: input },
    { new: true },
  );
  if (!doc) throw ApiError.notFound("Watchlist not found.");
  return serialize(doc.toObject());
}

export async function deleteWatchlist(userId: string, id: string) {
  await connectToDatabase();
  const result = await Watchlist.deleteOne({ _id: id, user: userId });
  if (result.deletedCount === 0) throw ApiError.notFound("Watchlist not found.");
  return { deleted: true };
}

export async function saveComparison(
  userId: string,
  input: { title: string; input: Record<string, unknown>; result: Record<string, unknown> },
) {
  await connectToDatabase();
  const doc = await SavedComparison.create({ user: userId, ...input });
  return serialize(doc.toObject());
}

export async function listSavedComparisons(userId: string) {
  await connectToDatabase();
  const items = await SavedComparison.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return items.map((item) => serialize<Record<string, unknown>>(item));
}

export async function deleteSavedComparison(userId: string, id: string) {
  await connectToDatabase();
  const result = await SavedComparison.deleteOne({ _id: id, user: userId });
  if (result.deletedCount === 0) throw ApiError.notFound("Saved comparison not found.");
  return { deleted: true };
}

/** Watchlist rows enriched with the latest price per commodity/market pair. */
export async function getWatchlistOverview(userId: string) {
  await connectToDatabase();
  const watchlists = await Watchlist.find({ user: userId })
    .populate("markets", "name slug district state isDemo")
    .populate("commodities", "name slug category isDemo")
    .lean();
  return watchlists.map((list) => serialize<Record<string, unknown>>(list));
}

export async function resolveNames(ids: { markets?: string[]; commodities?: string[] }) {
  await connectToDatabase();
  const [markets, commodities] = await Promise.all([
    ids.markets?.length ? Market.find({ _id: { $in: ids.markets } }).select("name slug").lean() : [],
    ids.commodities?.length
      ? Commodity.find({ _id: { $in: ids.commodities } }).select("name slug").lean()
      : [],
  ]);
  return serialize({ markets, commodities });
}
