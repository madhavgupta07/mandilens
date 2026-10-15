import { describe, it, expect } from "vitest";
import { parseIntent, type KnownEntities } from "@/lib/ai/nlu";

const KNOWN: KnownEntities = {
  commodities: ["Maize", "Paddy (Common)", "Wheat", "Potato", "Onion"],
  markets: ["Bhagalpur", "Samastipur", "Muzaffarpur"],
  districts: ["Bhagalpur", "Samastipur", "Muzaffarpur"],
  states: ["Bihar", "Punjab"],
};

describe("parseIntent", () => {
  it("recognises a compare request with commodity and quantity", () => {
    const intent = parseIntent("compare 50 quintals of maize with transport cost", KNOWN);
    expect(intent.kind).toBe("compare");
    expect(intent.commodity).toBe("Maize");
    expect(intent.quantity).toBe(50);
    expect(intent.quantityUnit).toBe("quintal");
  });

  it("recognises a prices question and a district", () => {
    const intent = parseIntent("latest paddy (common) prices in Samastipur", KNOWN);
    expect(intent.kind).toBe("prices");
    expect(intent.commodity).toBe("Paddy (Common)");
    expect(intent.district).toBe("Samastipur");
  });

  it("recognises a history request with a day window", () => {
    const intent = parseIntent("wheat price trend over the last 30 days", KNOWN);
    expect(intent.kind).toBe("history");
    expect(intent.commodity).toBe("Wheat");
    expect(intent.days).toBe(30);
  });

  it("recognises a buyer search", () => {
    const intent = parseIntent("find buyers looking for 20 quintals of potato", KNOWN);
    expect(intent.kind).toBe("buyers");
    expect(intent.commodity).toBe("Potato");
    expect(intent.quantity).toBe(20);
  });

  it("recognises a freshness question", () => {
    const intent = parseIntent("how fresh is the onion data", KNOWN);
    expect(intent.kind).toBe("freshness");
    expect(intent.commodity).toBe("Onion");
  });

  it("recognises help", () => {
    const intent = parseIntent("what can you do", KNOWN);
    expect(intent.kind).toBe("help");
  });

  it("falls back to prices when only a commodity is named", () => {
    const intent = parseIntent("maize", KNOWN);
    expect(intent.kind).toBe("prices");
    expect(intent.commodity).toBe("Maize");
  });

  it("falls back to compare when a commodity and quantity are named", () => {
    const intent = parseIntent("maize 30 quintals", KNOWN);
    expect(intent.kind).toBe("compare");
    expect(intent.quantity).toBe(30);
  });

  it("returns unknown when nothing is recognised", () => {
    const intent = parseIntent("hello there", KNOWN);
    expect(intent.kind).toBe("unknown");
    expect(intent.commodity).toBeUndefined();
  });

  it("prefers compare when both compare and price words appear", () => {
    const intent = parseIntent("compare maize prices", KNOWN);
    expect(intent.kind).toBe("compare");
  });

  it("never invents an entity that is not in the vocabulary", () => {
    const intent = parseIntent("compare 10 quintals of dragonfruit", KNOWN);
    expect(intent.commodity).toBeUndefined();
  });
});
