import { describe, it, expect } from "vitest";
import {
  inferMapping,
  parseCsv,
  parseJson,
  mapRowsToRecords,
} from "@/lib/data-sources/importer";

describe("inferMapping", () => {
  it("maps common AGMARKNET-style headers", () => {
    const mapping = inferMapping([
      "State",
      "District",
      "Market Name",
      "Commodity",
      "Arrival_Date",
      "Min Price",
      "Max Price",
      "Modal Price",
    ]);
    expect(mapping.state).toBe("State");
    expect(mapping.district).toBe("District");
    expect(mapping.market).toBe("Market Name");
    expect(mapping.commodity).toBe("Commodity");
    expect(mapping.arrival_date).toBe("Arrival_Date");
    expect(mapping.modal_price).toBe("Modal Price");
  });
});

describe("parseCsv / parseJson", () => {
  it("parses CSV with a header row", () => {
    const parsed = parseCsv("state,district,market\nBihar,Patna,Patna Mandi\n");
    expect(parsed.headers).toEqual(["state", "district", "market"]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].market).toBe("Patna Mandi");
  });

  it("parses a JSON array", () => {
    const parsed = parseJson(JSON.stringify([{ state: "Bihar", modal_price: "2000" }]));
    expect(parsed.headers).toContain("modal_price");
    expect(parsed.rows[0].modal_price).toBe("2000");
  });

  it("parses an object with a records array", () => {
    const parsed = parseJson(JSON.stringify({ records: [{ a: 1 }, { a: 2 }] }));
    expect(parsed.rows).toHaveLength(2);
  });

  it("rejects JSON that is not an array or records/data object", () => {
    expect(() => parseJson(JSON.stringify({ foo: "bar" }))).toThrow();
  });
});

describe("mapRowsToRecords", () => {
  const mapping = inferMapping([
    "state",
    "district",
    "market",
    "commodity",
    "arrival_date",
    "min_price",
    "max_price",
    "modal_price",
  ]);

  it("normalises valid rows and builds a dedupe key", () => {
    const rows = [
      {
        state: "Bihar",
        district: "Samastipur",
        market: "Samastipur",
        commodity: "Maize",
        arrival_date: "05/03/2026",
        min_price: "1,800",
        max_price: "2,000",
        modal_price: "1,900",
      },
    ];
    const { records, errors, previewRows } = mapRowsToRecords(rows, mapping, {
      sourceKey: "admin_csv",
    });
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    expect(records[0].modalPrice).toBe(1900);
    expect(records[0].minPrice).toBe(1800);
    expect(records[0].priceDate.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(records[0].dedupeKey).toContain("maize");
    expect(records[0].recordType).toBe("reported_market_price");
    expect(records[0].validationStatus).toBe("valid");
    expect(previewRows).toHaveLength(1);
  });

  it("flags a missing modal price but keeps the row using a fallback", () => {
    const rows = [
      {
        state: "Bihar",
        district: "Patna",
        market: "Patna",
        commodity: "Wheat",
        arrival_date: "2026-03-05",
        min_price: "2000",
        max_price: "2200",
        modal_price: "",
      },
    ];
    const { records, errors } = mapRowsToRecords(rows, mapping, { sourceKey: "admin_csv" });
    expect(errors).toHaveLength(0);
    expect(records[0].validationStatus).toBe("warned");
    expect(records[0].modalPrice).toBe(2000);
    expect(records[0].validationNotes[0]).toMatch(/modal price missing/i);
  });

  it("rejects rows missing required dimensions", () => {
    const rows = [{ state: "Bihar", district: "", market: "Patna", commodity: "Wheat", arrival_date: "2026-03-05" }];
    const { records, errors } = mapRowsToRecords(rows, mapping, { sourceKey: "admin_csv" });
    expect(records).toHaveLength(0);
    expect(errors[0].message).toMatch(/missing state, district, market or commodity/i);
  });

  it("rejects rows with an unparseable date", () => {
    const rows = [
      { state: "Bihar", district: "Patna", market: "Patna", commodity: "Wheat", arrival_date: "not-a-date", modal_price: "2000" },
    ];
    const { records, errors } = mapRowsToRecords(rows, mapping, { sourceKey: "admin_csv" });
    expect(records).toHaveLength(0);
    expect(errors[0].message).toMatch(/unparseable date/i);
  });

  it("rejects rows with no price at all", () => {
    const rows = [
      { state: "Bihar", district: "Patna", market: "Patna", commodity: "Wheat", arrival_date: "2026-03-05" },
    ];
    const { records, errors } = mapRowsToRecords(rows, mapping, { sourceKey: "admin_csv" });
    expect(records).toHaveLength(0);
    expect(errors[0].message).toMatch(/no price value/i);
  });

  it("rejects rows where min price exceeds max price", () => {
    const rows = [
      {
        state: "Bihar",
        district: "Patna",
        market: "Patna",
        commodity: "Wheat",
        arrival_date: "2026-03-05",
        min_price: "3000",
        max_price: "2000",
        modal_price: "2500",
      },
    ];
    const { records, errors } = mapRowsToRecords(rows, mapping, { sourceKey: "admin_csv" });
    expect(records).toHaveLength(0);
    expect(errors[0].message).toMatch(/min_price is greater than max_price/i);
  });

  it("marks imported records as demo when requested", () => {
    const rows = [
      {
        state: "Bihar",
        district: "Patna",
        market: "Patna",
        commodity: "Wheat",
        arrival_date: "2026-03-05",
        modal_price: "2000",
      },
    ];
    const { records } = mapRowsToRecords(rows, mapping, { sourceKey: "admin_csv", isDemo: true });
    expect(records[0].isDemo).toBe(true);
    expect(records[0].recordType).toBe("historical_price");
  });
});
