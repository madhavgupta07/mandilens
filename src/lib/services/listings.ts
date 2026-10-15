import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Commodity, Listing, type IListing } from "@/lib/db/models";
import { ApiError } from "@/lib/api/response";
import { escapeRegex, serialize } from "@/lib/utils/serialize";
import { findCommodityByName } from "@/lib/services/catalog";
import type {
  ListingCreateInput,
  ListingQueryInput,
  ListingUpdateInput,
} from "@/lib/validation/listing";
import type { DataMode } from "@/lib/domain/constants";

const CONTACT_FIELDS = ["contactPhone", "contactEmail"];

async function resolveCommodity(value: { commodityId?: string; commodityName?: string }) {
  if (value.commodityId && Types.ObjectId.isValid(value.commodityId)) {
    const commodity = await Commodity.findById(value.commodityId).lean();
    if (commodity) return commodity;
  }
  if (value.commodityName) {
    const commodity = await findCommodityByName(value.commodityName, "all");
    if (commodity) return commodity;
  }
  throw ApiError.unprocessable(
    "That commodity is not in the catalogue. Pick an existing commodity or ask an administrator to add it.",
  );
}

export async function createListing(userId: string, input: ListingCreateInput) {
  await connectToDatabase();
  const commodity = await resolveCommodity(input);

  const listing = await Listing.create({
    type: input.type,
    user: userId,
    commodity: commodity._id,
    commodityName: commodity.name,
    quantity: input.quantity,
    unit: input.unit,
    grade: input.grade,
    state: input.state,
    district: input.district,
    marketRef: input.marketRef && Types.ObjectId.isValid(input.marketRef) ? input.marketRef : undefined,
    pricePerUnit: input.pricePerUnit,
    priceUnit: input.priceUnit,
    availabilityDate: input.availabilityDate,
    expiresAt: input.expiresAt,
    description: input.description,
    contactPreference: input.contactPreference,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    status: "active",
  });

  return serialize(listing.toObject());
}

export async function updateListing(
  actor: { id: string; isAdmin: boolean },
  listingId: string,
  input: ListingUpdateInput,
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(listingId)) throw ApiError.notFound("Listing not found.");

  const listing = await Listing.findById(listingId).select("+contactPhone +contactEmail");
  if (!listing) throw ApiError.notFound("Listing not found.");
  if (!actor.isAdmin && String(listing.user) !== actor.id) {
    throw ApiError.forbidden("You can only edit your own listings.");
  }

  if (input.commodityId || input.commodityName) {
    const commodity = await resolveCommodity(input);
    listing.commodity = commodity._id;
    listing.commodityName = commodity.name;
  }

  const editable: (keyof ListingUpdateInput)[] = [
    "type",
    "quantity",
    "unit",
    "grade",
    "state",
    "district",
    "pricePerUnit",
    "priceUnit",
    "availabilityDate",
    "expiresAt",
    "description",
    "contactPreference",
    "contactPhone",
    "contactEmail",
  ];
  for (const key of editable) {
    const value = input[key];
    if (value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (listing as any)[key] = value;
    }
  }
  if (input.marketRef && Types.ObjectId.isValid(input.marketRef)) {
    listing.marketRef = new Types.ObjectId(input.marketRef);
  }

  await listing.save();
  return serialize(listing.toObject());
}

export async function changeListingStatus(
  actor: { id: string; isAdmin: boolean },
  listingId: string,
  action: "pause" | "resume" | "close",
) {
  await connectToDatabase();
  const listing = await Listing.findById(listingId);
  if (!listing) throw ApiError.notFound("Listing not found.");
  if (!actor.isAdmin && String(listing.user) !== actor.id) {
    throw ApiError.forbidden("You can only change your own listings.");
  }
  if (listing.moderationStatus === "removed") {
    throw ApiError.conflict("This listing was removed by an administrator.");
  }

  listing.status =
    action === "pause" ? "paused" : action === "resume" ? "active" : "closed";
  await listing.save();
  return serialize(listing.toObject());
}

export async function getListingById(
  listingId: string,
  viewer?: { id: string; isAdmin: boolean } | null,
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(listingId)) return null;

  const listing = await Listing.findById(listingId)
    .select("+contactPhone +contactEmail")
    .populate("commodity", "name slug")
    .populate("user", "name state district createdAt")
    .lean();

  if (!listing) return null;
  if (listing.moderationStatus === "removed" && !viewer?.isAdmin && String(listing.user) !== viewer?.id) {
    return null;
  }

  const plain = serialize<Record<string, unknown>>(listing);
  const isOwner = Boolean(viewer && (viewer.isAdmin || String(listing.user) === viewer.id));
  if (!isOwner) {
    for (const field of CONTACT_FIELDS) delete plain[field];
  }
  plain.isOwner = isOwner;
  return plain;
}

function modeFilter(mode: DataMode | "all") {
  if (mode === "all") return {};
  return { isDemo: mode === "demo" };
}

export async function listListings(
  query: ListingQueryInput,
  pagination: { skip: number; limit: number },
  viewer?: { id: string } | null,
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { ...modeFilter(query.mode) };
  filter.status = query.status ?? "active";
  if (query.status === "active") {
    filter.$or = [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: new Date() } }];
  }
  if (query.type) filter.type = query.type;
  if (query.commodityId && Types.ObjectId.isValid(query.commodityId)) {
    filter.commodity = new Types.ObjectId(query.commodityId);
  }
  if (query.state) filter.state = query.state;
  if (query.district) filter.district = query.district;
  if (query.minQuantity) filter.quantity = { $gte: query.minQuantity };
  if (query.maxPrice) filter.pricePerUnit = { $lte: query.maxPrice };
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q.trim()), "i");
    filter.$and = [
      ...(Array.isArray(filter.$and) ? (filter.$and as unknown[]) : []),
      { $or: [{ commodityName: rx }, { description: rx }, { district: rx }, { state: rx }] },
    ];
  }
  if (viewer?.id) {
    // public browsing shows active listings; owners see their own via /my-listings
  }

  const sort: Record<string, 1 | -1> =
    query.sort === "quantity"
      ? { quantity: -1, createdAt: -1 }
      : query.sort === "price"
        ? { pricePerUnit: -1, createdAt: -1 }
        : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Listing.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("commodity", "name slug")
      .lean(),
    Listing.countDocuments(filter),
  ]);

  const sanitized = items.map((item) => {
    const plain = serialize<Record<string, unknown>>(item);
    for (const field of CONTACT_FIELDS) delete plain[field];
    return plain;
  });

  return { items: sanitized, total };
}

export async function listUserListings(userId: string, status?: string) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { user: userId };
  if (status) filter.status = status;
  const items = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .populate("commodity", "name slug")
    .lean();
  return items.map((item) => serialize<Record<string, unknown>>(item));
}

export async function reportListing(userId: string, listingId: string, reason: string) {
  await connectToDatabase();
  const listing = await Listing.findById(listingId);
  if (!listing) throw ApiError.notFound("Listing not found.");
  if (String(listing.user) === userId) {
    throw ApiError.badRequest("You cannot report your own listing.");
  }
  if (listing.reports.some((report) => String(report.by) === userId)) {
    throw ApiError.conflict("You have already reported this listing.");
  }
  listing.reports.push({ by: new Types.ObjectId(userId), reason, at: new Date() });
  listing.moderationStatus = "reported";
  await listing.save();
  return { reported: true, reportCount: listing.reports.length };
}

export async function incrementView(listingId: string) {
  await connectToDatabase();
  await Listing.updateOne({ _id: listingId }, { $inc: { viewCount: 1 } });
}

/** Expire listings whose expiry date has passed. Safe to run repeatedly. */
export async function expireListings() {
  await connectToDatabase();
  const result = await Listing.updateMany(
    { status: "active", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } },
  );
  return result.modifiedCount;
}

export interface MatchResult {
  listing: Record<string, unknown>;
  score: number;
  reasons: string[];
}

/**
 * Find potential counterparties for a listing. A match is presented as an
 * opportunity to investigate — never as a guaranteed transaction — and every
 * result explains why it was returned.
 */
export async function findMatches(
  listingId: string,
  options: { limit?: number; viewerId?: string } = {},
): Promise<{ source: Record<string, unknown> | null; matches: MatchResult[] }> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(listingId)) {
    return { source: null, matches: [] };
  }

  const source = await Listing.findById(listingId).populate("commodity", "name slug").lean();
  if (!source) return { source: null, matches: [] };

  const oppositeType = source.type === "sell" ? "buy" : "sell";
  const candidates = await Listing.find({
    type: oppositeType,
    status: "active",
    commodity: source.commodity,
    moderationStatus: { $ne: "removed" },
    _id: { $ne: source._id },
  })
    .limit(60)
    .populate("commodity", "name slug")
    .lean();

  const matches: MatchResult[] = [];

  for (const candidate of candidates) {
    const reasons: string[] = [];
    let score = 40;

    reasons.push(`Both listings are for ${source.commodityName}.`);

    if (candidate.district === source.district) {
      score += 25;
      reasons.push(`Same district (${source.district}).`);
    } else if (candidate.state === source.state) {
      score += 12;
      reasons.push(`Same state (${source.state}) but a different district.`);
    } else {
      reasons.push(
        `Different state (${candidate.state}); transport costs are likely to matter.`,
      );
    }

    const qtyRatio = candidate.quantity / source.quantity;
    if (qtyRatio >= 0.5 && qtyRatio <= 2) {
      score += 18;
      reasons.push(
        `Requested quantity (${candidate.quantity} ${candidate.unit}) is close to this listing's size (${source.quantity} ${source.unit}).`,
      );
    } else if (qtyRatio < 0.5) {
      reasons.push(
        `Requested quantity (${candidate.quantity} ${candidate.unit}) is much smaller than this listing.`,
      );
    } else {
      reasons.push(
        `Requested quantity (${candidate.quantity} ${candidate.unit}) is much larger than this listing.`,
      );
    }

    if (candidate.grade && source.grade && candidate.grade === source.grade) {
      score += 7;
      reasons.push(`Same grade (${source.grade}).`);
    }

    if (candidate.pricePerUnit && source.pricePerUnit) {
      const offerRatio = candidate.pricePerUnit / source.pricePerUnit;
      if (candidate.type === "buy" && offerRatio >= 0.9 && offerRatio <= 1.2) {
        score += 10;
        reasons.push(
          `The offered price (₹${candidate.pricePerUnit}/${candidate.priceUnit}) is close to the asking price.`,
        );
      } else if (offerRatio < 0.9) {
        reasons.push(
          `The offered price (₹${candidate.pricePerUnit}/${candidate.priceUnit}) is below the asking price.`,
        );
      }
    } else {
      reasons.push("One side has not published a price, so price fit is unknown.");
    }

    matches.push({
      listing: serialize<Record<string, unknown>>(candidate),
      score: Math.min(score, 100),
      reasons,
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return {
    source: serialize<Record<string, unknown>>(source),
    matches: matches.slice(0, options.limit ?? 8),
  };
}
