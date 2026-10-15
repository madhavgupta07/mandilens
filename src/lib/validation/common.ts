import { z } from "zod";
import {
  ALERT_COMPARATORS,
  ALERT_METRICS,
  CONTACT_PREFERENCES,
  DATA_MODES,
  INQUIRY_STATUSES,
  LISTING_STATUSES,
  LISTING_TYPES,
  RECORD_TYPES,
  UNITS,
  USER_ROLES,
} from "@/lib/domain/constants";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Expected a valid identifier.");

export const optionalObjectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Expected a valid identifier.")
  .optional()
  .or(z.literal(""));

export const unitSchema = z.enum(UNITS);
export const recordTypeSchema = z.enum(RECORD_TYPES);
export const dataModeSchema = z.enum(DATA_MODES);
export const userRoleSchema = z.enum(USER_ROLES);
export const listingTypeSchema = z.enum(LISTING_TYPES);
export const listingStatusSchema = z.enum(LISTING_STATUSES);
export const inquiryStatusSchema = z.enum(INQUIRY_STATUSES);
export const contactPreferenceSchema = z.enum(CONTACT_PREFERENCES);
export const alertMetricSchema = z.enum(ALERT_METRICS);
export const alertComparatorSchema = z.enum(ALERT_COMPARATORS);

export const positiveMoney = z
  .number()
  .finite()
  .min(0, "Value cannot be negative.")
  .max(1_000_000_000, "Value is unrealistically large.");

export const positiveQuantity = z
  .number()
  .finite()
  .positive("Quantity must be greater than zero.")
  .max(1_000_000, "Quantity is unrealistically large.");
