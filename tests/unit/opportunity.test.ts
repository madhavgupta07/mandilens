import { describe, it, expect } from "vitest";
import {
  computeCandidate,
  buildComparison,
  recommendationSentence,
  type CandidateInput,
} from "@/lib/services/opportunity";

const NOW = new Date("2026-03-20T00:00:00.000Z");

function candidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    marketId: "m1",
    marketName: "Market A",
    pricePerUnit: 2000,
    priceUnit: "quintal",
    expenses: {},
    priceSource: "recorded",
    priceDate: new Date("2026-03-19T00:00:00.000Z"),
    recordType: "reported_market_price",
    ...overrides,
  };
}

describe("computeCandidate", () => {
  it("computes gross and net proceeds for a quintal sale", () => {
    const result = computeCandidate(
      candidate({
        pricePerUnit: 2100,
        expenses: { transportation: 1200, marketCharges: 400, commissionPercent: 5 },
      }),
      20,
      "quintal",
      NOW,
    );

    expect(result.usable).toBe(true);
    expect(result.quantityInPriceUnit).toBe(20);
    expect(result.grossSaleValue).toBe(42000);
    // commission = 5% of 42000 = 2100; transport 1200 + charges 400
    expect(result.totalExpenses).toBe(3700);
    expect(result.estimatedNetProceeds).toBe(38300);
  });

  it("converts quantity into a mixed price unit before multiplying", () => {
    // 1 tonne priced per quintal -> 10 quintals
    const result = computeCandidate(candidate({ pricePerUnit: 2000, priceUnit: "quintal" }), 1, "tonne", NOW);
    expect(result.quantityInPriceUnit).toBe(10);
    expect(result.grossSaleValue).toBe(20000);
  });

  it("marks a candidate unusable when there is no price", () => {
    const result = computeCandidate(candidate({ pricePerUnit: null }), 10, "quintal", NOW);
    expect(result.usable).toBe(false);
    expect(result.unusableReason).toMatch(/no usable price/i);
    expect(result.missingInformation.length).toBeGreaterThan(0);
  });

  it("treats a non-positive price as unusable", () => {
    expect(computeCandidate(candidate({ pricePerUnit: 0 }), 10, "quintal", NOW).usable).toBe(false);
    expect(computeCandidate(candidate({ pricePerUnit: -5 }), 10, "quintal", NOW).usable).toBe(false);
  });

  it("flags demo data and user-supplied prices with warnings", () => {
    const result = computeCandidate(
      candidate({ isDemo: true, priceSource: "user" }),
      10,
      "quintal",
      NOW,
    );
    expect(result.warnings.some((w) => /demo/i.test(w))).toBe(true);
    expect(result.warnings.some((w) => /not verified/i.test(w))).toBe(true);
  });

  it("warns when the reported price is stale", () => {
    const result = computeCandidate(
      candidate({ priceDate: new Date("2026-01-01T00:00:00.000Z") }),
      10,
      "quintal",
      NOW,
    );
    expect(result.freshness?.level).toBe("stale");
    expect(result.warnings.some((w) => /stale/i.test(w))).toBe(true);
  });

  it("warns when expenses exceed the gross value", () => {
    const result = computeCandidate(
      candidate({ pricePerUnit: 1000, expenses: { transportation: 50000 } }),
      10,
      "quintal",
      NOW,
    );
    expect(result.estimatedNetProceeds).toBeLessThan(0);
    expect(result.warnings.some((w) => /higher than the gross/i.test(w))).toBe(true);
  });

  it("sums a percentage commission from the gross value", () => {
    const result = computeCandidate(
      candidate({ pricePerUnit: 1000, expenses: { commissionPercent: 10 } }),
      10,
      "quintal",
      NOW,
    );
    // gross = 10,000 ; commission = 1,000 ; net = 9,000
    expect(result.totalExpenses).toBe(1000);
    expect(result.estimatedNetProceeds).toBe(9000);
  });
});

describe("buildComparison", () => {
  it("ranks by net proceeds, not by headline price", () => {
    const result = buildComparison(
      {
        quantity: 20,
        quantityUnit: "quintal",
        candidates: [
          // Higher price but expensive transport
          candidate({
            marketId: "far",
            marketName: "Far Mandi",
            pricePerUnit: 2100,
            expenses: { transportation: 5000 },
          }),
          // Lower price but cheap transport -> should win on net
          candidate({
            marketId: "near",
            marketName: "Near Mandi",
            pricePerUnit: 2000,
            expenses: { transportation: 500 },
          }),
        ],
      },
      NOW,
    );

    expect(result.bestMarketId).toBe("near");
    // 20 quintals x ₹2,000 = ₹40,000 gross, minus ₹500 transport = ₹39,500 net
    expect(result.bestNetProceeds).toBe(39500);
  });

  it("picks the near market when transport outweighs the price gap", () => {
    const result = buildComparison(
      {
        quantity: 20,
        quantityUnit: "quintal",
        candidates: [
          candidate({ marketId: "far", marketName: "Far", pricePerUnit: 2100, expenses: { transportation: 5000 } }),
          candidate({ marketId: "near", marketName: "Near", pricePerUnit: 2000, expenses: { transportation: 500 } }),
        ],
      },
      NOW,
    );
    expect(result.bestMarketName).toBe("Near");
    expect(result.runnerUp?.marketName).toBe("Far");
    // Far nets 42,000 - 5,000 = 37,000 ; Near nets 40,000 - 500 = 39,500
    expect(result.candidates.find((c) => c.marketId === "far")!.estimatedNetProceeds).toBe(37000);
    expect(result.candidates.find((c) => c.marketId === "near")!.estimatedNetProceeds).toBe(39500);
  });

  it("excludes unusable candidates from the ranking", () => {
    const result = buildComparison(
      {
        quantity: 10,
        quantityUnit: "quintal",
        candidates: [
          candidate({ marketId: "ok", marketName: "OK", pricePerUnit: 2000 }),
          candidate({ marketId: "missing", marketName: "Missing", pricePerUnit: null }),
        ],
      },
      NOW,
    );
    expect(result.usableCount).toBe(1);
    expect(result.bestMarketId).toBe("ok");
    expect(result.candidates.find((c) => c.marketId === "missing")!.usable).toBe(false);
  });

  it("returns nulls and a helpful message when nothing is usable", () => {
    const result = buildComparison(
      { quantity: 10, quantityUnit: "quintal", candidates: [candidate({ pricePerUnit: null })] },
      NOW,
    );
    expect(result.bestMarketId).toBeNull();
    expect(result.bestNetProceeds).toBeNull();
    expect(result.assumptions.missingInformation.some((m) => /no market with a usable price/i.test(m))).toBe(
      true,
    );
    expect(recommendationSentence(result)).toMatch(/no market/i);
  });

  it("warns when mixing different record types", () => {
    const result = buildComparison(
      {
        quantity: 10,
        quantityUnit: "quintal",
        candidates: [
          candidate({ marketId: "a", marketName: "A", recordType: "reported_market_price" }),
          candidate({ marketId: "b", marketName: "B", recordType: "user_submitted", priceSource: "user" }),
        ],
      },
      NOW,
    );
    expect(result.assumptions.warnings.some((w) => /different kinds of price records/i.test(w))).toBe(true);
  });

  it("always carries the disclaimer", () => {
    const result = buildComparison(
      { quantity: 10, quantityUnit: "quintal", candidates: [candidate()] },
      NOW,
    );
    expect(result.assumptions.disclaimer).toMatch(/not a guarantee/i);
  });

  it("is deterministic for identical input", () => {
    const input = {
      quantity: 33,
      quantityUnit: "quintal" as const,
      candidates: [
        candidate({ marketId: "a", marketName: "A", pricePerUnit: 1888, expenses: { transportation: 350 } }),
        candidate({ marketId: "b", marketName: "B", pricePerUnit: 1901, expenses: { transportation: 700 } }),
      ],
    };
    const first = buildComparison(input, NOW);
    const second = buildComparison(input, NOW);
    expect(second.bestMarketId).toBe(first.bestMarketId);
    expect(second.candidates.map((c) => c.estimatedNetProceeds)).toEqual(
      first.candidates.map((c) => c.estimatedNetProceeds),
    );
  });
});
