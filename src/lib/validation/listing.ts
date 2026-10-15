import { z } from "zod";
import {
  contactPreferenceSchema,
  objectIdSchema,
  positiveMoney,
  positiveQuantity,
  listingTypeSchema,
  unitSchema,
} from "./common";

export const listingBaseSchema = z.object({
  type: listingTypeSchema,
  commodityId: objectIdSchema.optional(),
  commodityName: z.string().min(2).max(160).optional(),
  quantity: positiveQuantity,
  unit: unitSchema.default("quintal"),
  grade: z.string().max(80).optional(),
  state: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  marketRef: objectIdSchema.optional(),
  pricePerUnit: positiveMoney.optional(),
  priceUnit: unitSchema.default("quintal"),
  availabilityDate: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  description: z.string().min(20, "Describe the listing in at least 20 characters.").max(2000),
  contactPreference: contactPreferenceSchema.default("in_app"),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email().max(200).optional(),
});

export const listingCreateSchema = listingBaseSchema
  .refine((value) => Boolean(value.commodityId || value.commodityName), {
    message: "Choose a commodity or type its name.",
    path: ["commodityName"],
  })
  .refine(
    (value) => !value.expiresAt || !value.availabilityDate || value.expiresAt >= value.availabilityDate,
    { message: "Expiry must be after the availability date.", path: ["expiresAt"] },
  );

export const listingUpdateSchema = listingBaseSchema.partial();

export const listingQuerySchema = z.object({
  type: listingTypeSchema.optional(),
  status: z.enum(["active", "paused", "closed", "expired", "removed"]).optional(),
  commodityId: objectIdSchema.optional(),
  q: z.string().max(160).optional(),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  minQuantity: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["recent", "quantity", "price"]).default("recent"),
  mode: z.enum(["real", "demo", "all"]).default("all"),
});

export const listingStatusActionSchema = z.object({
  action: z.enum(["pause", "resume", "close"]),
});

export const listingReportSchema = z.object({
  reason: z.string().min(10, "Give a short reason.").max(500),
});

export const inquiryCreateSchema = z.object({
  listingId: objectIdSchema,
  message: z.string().min(10, "Write at least 10 characters.").max(2000),
  quantityInterested: positiveQuantity.optional(),
  offeredPricePerUnit: positiveMoney.optional(),
});

export const inquiryReplySchema = z.object({
  body: z.string().min(1).max(2000),
  status: z.enum(["open", "responded", "closed"]).optional(),
});

export const alertCreateSchema = z.object({
  commodityId: objectIdSchema,
  marketId: objectIdSchema.optional(),
  district: z.string().max(80).optional(),
  metric: z.enum(["modal", "min", "max"]).default("modal"),
  comparator: z.enum(["above", "below"]),
  threshold: positiveMoney,
  unit: unitSchema.default("quintal"),
});

export const watchlistCreateSchema = z.object({
  name: z.string().min(2).max(120),
  marketIds: z.array(objectIdSchema).max(50).default([]),
  commodityIds: z.array(objectIdSchema).max(50).default([]),
  districts: z.array(z.string().max(80)).max(50).default([]),
});

export const savedComparisonSchema = z.object({
  title: z.string().min(2).max(200),
  input: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
});

export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
export type AlertCreateInput = z.infer<typeof alertCreateSchema>;
export type WatchlistCreateInput = z.infer<typeof watchlistCreateSchema>;
