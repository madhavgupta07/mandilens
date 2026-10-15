import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db/connect";
import { Commodity, User } from "@/lib/db/models";
import { createListing, listListings, getListingById, reportListing, findMatches } from "@/lib/services/listings";
import { createInquiry, listInquiries, replyToInquiry, countOpenInquiries } from "@/lib/services/inquiries";
import type { ListingCreateInput } from "@/lib/validation/listing";
import { clearDatabase } from "../helpers/db";

type Plain = Record<string, unknown>;

let sellerId: string;
let buyerId: string;

async function makeUser(name: string, email: string) {
  const user = await User.create({ name, email, passwordHash: "x", roles: ["trader"] });
  return String(user._id);
}

function listingInput(overrides: Partial<ListingCreateInput> = {}): ListingCreateInput {
  return {
    type: "sell",
    commodityName: "Maize",
    quantity: 50,
    unit: "quintal",
    state: "Bihar",
    district: "Samastipur",
    pricePerUnit: 1900,
    priceUnit: "quintal",
    description: "Fresh maize available for immediate pickup from the mandi.",
    contactPreference: "in_app",
    ...overrides,
  } as ListingCreateInput;
}

const idOf = (doc: Plain): string => String(doc._id ?? doc.id);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongoose.connection.close().catch(() => undefined);
});

beforeEach(async () => {
  await clearDatabase();
  await Commodity.create({
    name: "Maize",
    slug: "maize",
    category: "cereal",
    aliases: ["makka"],
    defaultUnit: "quintal",
    isActive: true,
  });
  sellerId = await makeUser("Seller", "seller@example.com");
  buyerId = await makeUser("Buyer", "buyer@example.com");
});

describe("listings service", () => {
  it("creates a listing and resolves the commodity", async () => {
    const listing = (await createListing(sellerId, listingInput())) as Plain;
    expect(idOf(listing)).toBeTruthy();
    expect(listing.commodityName).toBe("Maize");
    expect(listing.status).toBe("active");
  });

  it("rejects a listing for an unknown commodity", async () => {
    await expect(
      createListing(sellerId, listingInput({ commodityName: "Dragonfruit" })),
    ).rejects.toThrow(/not in the catalogue/i);
  });

  it("lists active listings and filters by type", async () => {
    await createListing(sellerId, listingInput());
    await createListing(sellerId, listingInput({ type: "buy" }));
    const all = await listListings({ mode: "all", sort: "recent" }, { skip: 0, limit: 50 });
    expect(all.items.length).toBe(2);
    expect(all.total).toBe(2);
    const sells = await listListings(
      { type: "sell", mode: "all", sort: "recent" },
      { skip: 0, limit: 50 },
    );
    expect(sells.items.length).toBe(1);
    expect(sells.items[0].type).toBe("sell");
  });

  it("retrieves a listing with its owner", async () => {
    const created = (await createListing(sellerId, listingInput())) as Plain;
    const found = await getListingById(idOf(created));
    expect(found).not.toBeNull();
  });

  it("marks reported listings for moderation", async () => {
    const created = (await createListing(sellerId, listingInput())) as Plain;
    await reportListing(buyerId, idOf(created), "This looks like a duplicate scam listing.");
    const found = (await getListingById(idOf(created))) as Plain | null;
    expect(found?.moderationStatus).toBe("reported");
  });

  it("finds matches in the opposite direction with reasons", async () => {
    await createListing(sellerId, listingInput({ type: "sell", commodityName: "Maize" }));
    const buy = (await createListing(buyerId, listingInput({ type: "buy", commodityName: "Maize" }))) as Plain;
    const { source, matches } = await findMatches(idOf(buy));
    expect(source).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].listing.type).toBe("sell");
    expect(matches[0].reasons.length).toBeGreaterThan(0);
  });
});

describe("inquiries service", () => {
  it("creates an inquiry from a buyer to a seller", async () => {
    const listing = (await createListing(sellerId, listingInput())) as Plain;
    const inquiry = (await createInquiry(buyerId, {
      listingId: idOf(listing),
      message: "Is this still available? I can pick up this week.",
      quantityInterested: 20,
    })) as Plain;
    expect(inquiry.status).toBe("open");
    expect(await countOpenInquiries(sellerId)).toBe(1);
  });

  it("prevents inquiring about your own listing", async () => {
    const listing = (await createListing(sellerId, listingInput())) as Plain;
    await expect(
      createInquiry(sellerId, {
        listingId: idOf(listing),
        message: "Talking to myself here.",
      }),
    ).rejects.toThrow(/your own listing/i);
  });

  it("lists received and sent boxes separately", async () => {
    const listing = (await createListing(sellerId, listingInput())) as Plain;
    await createInquiry(buyerId, {
      listingId: idOf(listing),
      message: "Interested, please share the grade.",
    });
    const received = await listInquiries(sellerId, { box: "received" });
    const sent = await listInquiries(buyerId, { box: "sent" });
    expect(received.length).toBe(1);
    expect(sent.length).toBe(1);
  });

  it("lets the seller reply and marks the inquiry responded", async () => {
    const listing = (await createListing(sellerId, listingInput())) as Plain;
    const inquiry = (await createInquiry(buyerId, {
      listingId: idOf(listing),
      message: "Interested, please share the grade.",
    })) as Plain;
    const replied = (await replyToInquiry(sellerId, idOf(inquiry), "Grade A, ready now.")) as Plain;
    expect(replied.status).toBe("responded");
  });
});
