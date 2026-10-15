import { z } from "zod";
import {
  objectIdSchema,
  positiveMoney,
  positiveQuantity,
  recordTypeSchema,
  unitSchema,
} from "./common";

export const expenseSchema = z.object({
  transportation: positiveMoney.optional(),
  loading: positiveMoney.optional(),
  unloading: positiveMoney.optional(),
  marketCharges: positiveMoney.optional(),
  commission: positiveMoney.optional(),
  commissionPercent: z.number().finite().min(0).max(100).optional(),
  other: positiveMoney.optional(),
});

export const compareCandidateSchema = z.object({
  marketId: objectIdSchema,
  /** Optional manual price override; otherwise the latest recorded price is used. */
  pricePerUnit: positiveMoney.optional(),
  priceUnit: unitSchema.optional(),
  expenses: expenseSchema.default({}),
  note: z.string().max(300).optional(),
});

export const compareInputSchema = z
  .object({
    commodityId: objectIdSchema.optional(),
    commoditySlug: z.string().max(160).optional(),
    commodityName: z.string().max(160).optional(),
    quantity: positiveQuantity,
    quantityUnit: unitSchema.default("quintal"),
    mode: z.enum(["real", "demo", "all"]).default("real"),
    recordType: recordTypeSchema.default("reported_market_price"),
    candidates: z.array(compareCandidateSchema).min(1).max(12),
  })
  .refine(
    (value) => Boolean(value.commodityId || value.commoditySlug || value.commodityName),
    { message: "Provide a commodity (id, slug or name).", path: ["commodityId"] },
  );

export type CompareInput = z.infer<typeof compareInputSchema>;

export const autoCompareSchema = z.object({
  commodityId: objectIdSchema.optional(),
  commoditySlug: z.string().optional(),
  commodityName: z.string().optional(),
  quantity: positiveQuantity,
  quantityUnit: unitSchema.default("quintal"),
  mode: z.enum(["real", "demo", "all"]).default("real"),
  recordType: recordTypeSchema.default("reported_market_price"),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  marketLimit: z.number().int().min(1).max(8).default(3),
  defaultExpenses: expenseSchema.default({}),
});
export type AutoCompareInput = z.infer<typeof autoCompareSchema>;
