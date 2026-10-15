import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db/connect";
import { Commodity, Market, MarketPrice } from "@/lib/db/models";
import { ingestRecords, type NormalizedInput } from "@/lib/services/ingestion";
import { buildDedupeKey, slugify } from "@/lib/utils/slug";
import { clearDatabase } from "../helpers/db";

function record(overrides: Partial<NormalizedInput> = {}): NormalizedInput {
  const base: NormalizedInput = {
    sourceKey: "admin_csv",
    state: "Bihar",
    district: "Samastipur",
    marketName: "Samastipur Mandi",
    commodityName: "Maize",
    unit: "quintal",
    currency: "INR",
    minPrice: 1800,
    maxPrice: 2000,
    modalPrice: 1900,
    priceDate: new Date("2026-03-05T00:00:00.000Z"),
    recordType: "reported_market_price",
    dedupeKey: "",
    validationStatus: "valid",
    validationNotes: [],
    ...overrides,
  };
  base.dedupeKey =
    overrides.dedupeKey ??
    buildDedupeKey([
      base.sourceKey,
      slugify(base.marketName),
      slugify(base.commodityName),
      base.variety ?? "",
      base.grade ?? "",
      base.priceDate.toISOString().slice(0, 10),
    ]);
  return base;
}

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongoose.connection.close().catch(() => undefined);
});

beforeEach(async () => {
  await clearDatabase();
});

describe("ingestRecords", () => {
  it("inserts new records and creates market + commodity documents", async () => {
    const summary = await ingestRecords([record()]);
    expect(summary.inserted).toBe(1);
    expect(summary.duplicates).toBe(0);
    expect(summary.marketsCreated).toBe(1);
    expect(summary.commoditiesCreated).toBe(1);
    expect(await MarketPrice.countDocuments()).toBe(1);
    expect(await Market.countDocuments()).toBe(1);
    expect(await Commodity.countDocuments()).toBe(1);
  });

  it("is idempotent: re-running the same import adds no duplicates", async () => {
    await ingestRecords([record()]);
    const second = await ingestRecords([record()]);
    expect(second.inserted).toBe(0);
    expect(second.duplicates).toBe(1);
    expect(await MarketPrice.countDocuments()).toBe(1);
  });

  it("de-duplicates within a single batch", async () => {
    const summary = await ingestRecords([record(), record()]);
    expect(summary.inserted).toBe(1);
    expect(summary.duplicates).toBe(1);
  });

  it("skips records marked rejected", async () => {
    const summary = await ingestRecords([record({ validationStatus: "rejected" })]);
    expect(summary.invalid).toBe(1);
    expect(summary.inserted).toBe(0);
    expect(await MarketPrice.countDocuments()).toBe(0);
  });

  it("keeps demo and real records separate but both stored", async () => {
    await ingestRecords([record()]);
    await ingestRecords([
      record({
        sourceKey: "mandilens_demo",
        isDemo: true,
        commodityName: "Paddy",
        dedupeKey: buildDedupeKey(["mandilens_demo", "samastipur-mandi", "paddy", "", "", "2026-03-05"]),
      }),
    ]);
    expect(await MarketPrice.countDocuments({ isDemo: false })).toBe(1);
    expect(await MarketPrice.countDocuments({ isDemo: true })).toBe(1);
  });

  it("records provenance for each price", async () => {
    await ingestRecords([record({ sourceRecordId: "rec-123" })]);
    const stored = await MarketPrice.findOne().lean();
    expect(stored?.provenance.dataSource).toBe("admin_csv");
    expect(stored?.provenance.sourceRecordId).toBe("rec-123");
    expect(stored?.provenance.validationStatus).toBe("valid");
  });

  it("handles an empty batch gracefully", async () => {
    const summary = await ingestRecords([]);
    expect(summary.status).toBe("partial");
    expect(summary.inserted).toBe(0);
    expect(summary.notes.length).toBeGreaterThan(0);
  });
});
