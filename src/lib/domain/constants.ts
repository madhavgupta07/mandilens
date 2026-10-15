/**
 * Domain constants shared across the whole application.
 * Keeping these in one place avoids "magic strings" leaking into models, APIs
 * and the AI tool layer.
 */

export const CURRENCY = "INR" as const;

/**
 * How a price observation came to exist. These are never merged silently:
 * the comparison engine ranks only within a single record type.
 */
export const RECORD_TYPES = [
  "reported_market_price", // published by an official market source (AGMARKNET)
  "historical_price", // archived observation from a past date
  "user_submitted", // typed in by a trader, not officially reported
  "buyer_offer", // an offer attached to a buy listing
  "confirmed_transaction", // a completed trade recorded by a user
] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  reported_market_price: "Reported market price",
  historical_price: "Historical price",
  user_submitted: "User-submitted price",
  buyer_offer: "Buyer offer",
  confirmed_transaction: "Confirmed transaction",
};

export const RECORD_TYPE_DESCRIPTIONS: Record<RecordType, string> = {
  reported_market_price:
    "Published by an official agricultural market source for a given date.",
  historical_price: "An archived observation from a previous reporting day.",
  user_submitted: "Entered by a user and not verified by an official source.",
  buyer_offer: "A price offered by a buyer on a listing.",
  confirmed_transaction: "A completed trade recorded by a user.",
};

/** Weights and conversions. Base unit is the kilogram. */
export const UNITS = ["kg", "quintal", "tonne"] as const;
export type Unit = (typeof UNITS)[number];

export const UNIT_TO_KG: Record<Unit, number> = {
  kg: 1,
  quintal: 100,
  tonne: 1000,
};

export const UNIT_LABELS: Record<Unit, string> = {
  kg: "kilogram",
  quintal: "quintal",
  tonne: "tonne",
};

/** Most Indian mandi reporting uses quintals. */
export const DEFAULT_PRICE_UNIT: Unit = "quintal";
export const DEFAULT_QUANTITY_UNIT: Unit = "quintal";

export const USER_ROLES = ["farmer", "trader", "buyer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  farmer: "Farmer / producer",
  trader: "Trader / wholesaler",
  buyer: "Buyer / aggregator",
  admin: "Administrator",
};

export const LISTING_TYPES = ["sell", "buy"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = [
  "active",
  "paused",
  "closed",
  "expired",
  "removed",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const INQUIRY_STATUSES = ["open", "responded", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const CONTACT_PREFERENCES = ["in_app", "phone", "email"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export const ALERT_METRICS = ["modal", "min", "max"] as const;
export type AlertMetric = (typeof ALERT_METRICS)[number];

export const ALERT_COMPARATORS = ["above", "below"] as const;
export type AlertComparator = (typeof ALERT_COMPARATORS)[number];

export const DATA_MODES = ["real", "demo"] as const;
export type DataMode = (typeof DATA_MODES)[number];

/**
 * Freshness thresholds (in days) applied to the source-reported price date.
 * Freshness is a property of the *observation date*, never of the retrieval time.
 */
export const FRESHNESS_THRESHOLDS = {
  freshDays: 2,
  recentDays: 7,
  agingDays: 30,
} as const;

export type FreshnessLevel = "fresh" | "recent" | "aging" | "stale";

export const DEMO_SOURCE_KEY = "mandilens_demo";
export const AGMARKNET_SOURCE_KEY = "agmarknet_data_gov_in";

export const DISCLAIMER =
  "Estimates are based on the data shown and the assumptions you supplied. They are not a guarantee of profit, and prices may change before you sell.";
