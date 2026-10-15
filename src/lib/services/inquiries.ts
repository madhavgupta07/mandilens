import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Inquiry, Listing } from "@/lib/db/models";
import { ApiError } from "@/lib/api/response";
import { serialize } from "@/lib/utils/serialize";
import { createNotification } from "@/lib/services/notifications";
import type { InquiryCreateInput } from "@/lib/validation/listing";

export async function createInquiry(fromUserId: string, input: InquiryCreateInput) {
  await connectToDatabase();
  const listing = await Listing.findById(input.listingId);
  if (!listing) throw ApiError.notFound("Listing not found.");
  if (listing.moderationStatus === "removed") {
    throw ApiError.notFound("Listing not found.");
  }
  if (listing.status !== "active") {
    throw ApiError.conflict("This listing is no longer active.");
  }
  if (String(listing.user) === fromUserId) {
    throw ApiError.badRequest("You cannot send an inquiry about your own listing.");
  }

  const inquiry = await Inquiry.create({
    listing: listing._id,
    from: fromUserId,
    to: listing.user,
    message: input.message,
    quantityInterested: input.quantityInterested,
    offeredPricePerUnit: input.offeredPricePerUnit,
    status: "open",
    messages: [{ sender: fromUserId, body: input.message, at: new Date() }],
  });

  await createNotification({
    userId: String(listing.user),
    type: "inquiry_received",
    title: `New inquiry about ${listing.commodityName}`,
    body: input.message.slice(0, 200),
    link: `/inquiries#${inquiry._id}`,
    dedupeKey: `inquiry:${inquiry._id}`,
    meta: { inquiryId: String(inquiry._id), listingId: String(listing._id) },
  });

  return serialize(inquiry.toObject());
}

export async function listInquiries(
  userId: string,
  options: { box?: "received" | "sent"; status?: string; limit?: number } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (options.box === "sent") filter.from = userId;
  else filter.to = userId;
  if (options.status) filter.status = options.status;

  const items = await Inquiry.find(filter)
    .sort({ updatedAt: -1 })
    .limit(Math.min(options.limit ?? 50, 100))
    .populate("listing", "commodityName quantity unit type status district state")
    .populate("from", "name district state")
    .populate("to", "name district state")
    .lean();

  return items.map((item) => serialize<Record<string, unknown>>(item));
}

export async function getInquiryById(inquiryId: string, viewer: { id: string; isAdmin: boolean }) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(inquiryId)) return null;
  const inquiry = await Inquiry.findById(inquiryId)
    .populate("listing", "commodityName quantity unit type status district state user")
    .populate("from", "name district state")
    .populate("to", "name district state")
    .lean();
  if (!inquiry) return null;
  const isParticipant =
    String(inquiry.from._id ?? inquiry.from) === viewer.id ||
    String(inquiry.to._id ?? inquiry.to) === viewer.id;
  if (!isParticipant && !viewer.isAdmin) {
    throw ApiError.forbidden("You are not part of this conversation.");
  }
  return serialize<Record<string, unknown>>(inquiry);
}

export async function replyToInquiry(
  userId: string,
  inquiryId: string,
  body: string,
  status?: "open" | "responded" | "closed",
) {
  await connectToDatabase();
  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) throw ApiError.notFound("Conversation not found.");
  const isFrom = String(inquiry.from) === userId;
  const isTo = String(inquiry.to) === userId;
  if (!isFrom && !isTo) throw ApiError.forbidden("You are not part of this conversation.");

  inquiry.messages.push({ sender: new Types.ObjectId(userId), body, at: new Date() });
  inquiry.status = status ?? (isTo ? "responded" : "open");
  await inquiry.save();

  const recipient = isTo ? inquiry.from : inquiry.to;
  await createNotification({
    userId: String(recipient),
    type: "inquiry_reply",
    title: "New reply to your inquiry",
    body: body.slice(0, 200),
    link: `/inquiries#${inquiry._id}`,
    dedupeKey: `inquiry-reply:${inquiry._id}:${inquiry.messages.length}`,
    meta: { inquiryId: String(inquiry._id) },
  });

  return serialize(inquiry.toObject());
}

export async function countOpenInquiries(userId: string) {
  await connectToDatabase();
  return Inquiry.countDocuments({ to: userId, status: { $ne: "closed" } });
}
