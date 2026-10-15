import { loadEnv, requireEnv } from "./_env";
import type { Types } from "mongoose";

loadEnv();
requireEnv("MONGODB_URI");

const { connectToDatabase, disconnectFromDatabase } = await import("@/lib/db/connect");
const { DEMO_COMMODITIES, DEMO_MARKETS, DEMO_STATE, generateDemoPrices } = await import(
  "@/lib/demo/dataset"
);
const { ingestRecords, syncDataSourceRegistry } = await import("@/lib/services/ingestion");
const { Commodity, Market, User, Listing } = await import("@/lib/db/models");
const { hashPassword } = await import("@/lib/auth/password");

const DEMO_PASSWORD = "DemoPass123";
const DEMO_USERS = [
  {
    name: "Demo Farmer (Samastipur)",
    email: "farmer@demo.mandilens.test",
    roles: ["farmer"],
    state: DEMO_STATE,
    district: "Samastipur",
  },
  {
    name: "Demo Trader (Muzaffarpur)",
    email: "trader@demo.mandilens.test",
    roles: ["trader", "buyer"],
    state: DEMO_STATE,
    district: "Muzaffarpur",
  },
  {
    name: "Demo Buyer (Patna)",
    email: "buyer@demo.mandilens.test",
    roles: ["buyer"],
    state: DEMO_STATE,
    district: "Patna",
  },
] as const;

async function seedUsers() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const byEmail = new Map<string, { id: string }>();
  for (const user of DEMO_USERS) {
    const doc = await User.findOneAndUpdate(
      { email: user.email },
      {
        $setOnInsert: {
          name: user.name,
          email: user.email,
          passwordHash,
          roles: [...user.roles],
          state: user.state,
          district: user.district,
          emailVerified: true,
          isActive: true,
          isDemo: true,
        },
      },
      { upsert: true, new: true },
    );
    byEmail.set(user.email, { id: String(doc._id) });
  }
  return byEmail;
}

async function seedListings(users: Map<string, { id: string }>) {
  const farmer = users.get("farmer@demo.mandilens.test")!;
  const trader = users.get("trader@demo.mandilens.test")!;
  const buyer = users.get("buyer@demo.mandilens.test")!;

  const commodityByName = new Map<string, { _id: Types.ObjectId; name: string }>();
  for (const commodity of DEMO_COMMODITIES) {
    const doc = await Commodity.findOne({ name: commodity.name }).select("name").lean();
    if (doc) commodityByName.set(commodity.name, { _id: doc._id, name: doc.name });
  }
  const marketByName = new Map<string, { _id: Types.ObjectId }>();
  for (const market of DEMO_MARKETS) {
    const doc = await Market.findOne({ name: market.name }).select("_id").lean();
    if (doc) marketByName.set(market.name, { _id: doc._id });
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const listings = [
    {
      type: "sell" as const,
      user: farmer.id,
      commodityName: "Maize",
      quantity: 80,
      pricePerUnit: 2180,
      district: "Samastipur",
      state: DEMO_STATE,
      grade: "FAQ",
      description:
        "Demo listing: 80 quintals of maize, freshly harvested, stored dry at the farm near Samastipur. Ready for pickup within a week.",
      market: "Samastipur APMC",
    },
    {
      type: "sell" as const,
      user: farmer.id,
      commodityName: "Paddy (Common)",
      quantity: 120,
      pricePerUnit: 2350,
      district: "Samastipur",
      state: DEMO_STATE,
      grade: "Common",
      description:
        "Demo listing: paddy from the kharif season, moisture tested, bagged and ready. Can arrange loading.",
      market: "Samastipur APMC",
    },
    {
      type: "buy" as const,
      user: trader.id,
      commodityName: "Maize",
      quantity: 200,
      pricePerUnit: 2240,
      district: "Muzaffarpur",
      state: DEMO_STATE,
      grade: "FAQ",
      description:
        "Demo listing: buying up to 200 quintals of feed-grade maize in Muzaffarpur. Payment on delivery.",
      market: "Muzaffarpur APMC",
    },
    {
      type: "buy" as const,
      user: buyer.id,
      commodityName: "Potato",
      quantity: 150,
      pricePerUnit: 1480,
      district: "Patna",
      state: DEMO_STATE,
      grade: "A",
      description:
        "Demo listing: a retail chain looking for graded potatoes around Patna, weekly pickup.",
      market: "Patna (Musallahpur) APMC",
    },
    {
      type: "sell" as const,
      user: trader.id,
      commodityName: "Mustard",
      quantity: 60,
      pricePerUnit: 5700,
      district: "Muzaffarpur",
      state: DEMO_STATE,
      grade: "FAQ",
      description:
        "Demo listing: clean mustard seed, low moisture, available in Muzaffarpur godown.",
      market: "Muzaffarpur APMC",
    },
  ];

  let created = 0;
  for (const listing of listings) {
    const commodity = commodityByName.get(listing.commodityName);
    const market = marketByName.get(listing.market);
    if (!commodity) continue;
    const exists = await Listing.findOne({
      user: listing.user,
      commodityName: listing.commodityName,
      type: listing.type,
      isDemo: true,
    })
      .select("_id")
      .lean();
    if (exists) continue;

    await Listing.create({
      type: listing.type,
      user: listing.user,
      commodity: commodity._id,
      commodityName: commodity.name,
      quantity: listing.quantity,
      unit: "quintal",
      grade: listing.grade,
      state: listing.state,
      district: listing.district,
      marketRef: market?._id,
      pricePerUnit: listing.pricePerUnit,
      priceUnit: "quintal",
      availabilityDate: new Date(now + 3 * day),
      expiresAt: new Date(now + 45 * day),
      description: listing.description,
      contactPreference: "in_app",
      status: "active",
      isDemo: true,
    });
    created += 1;
  }
  return created;
}

async function main() {
  console.log("Seeding MandiLens demo dataset…");
  await connectToDatabase();
  await syncDataSourceRegistry();

  const records = generateDemoPrices({ days: 45 });
  console.log(`  • generated ${records.length} demo price rows`);

  const summary = await ingestRecords(records);
  console.log(
    `  • prices: ${summary.inserted} inserted, ${summary.duplicates} duplicates skipped, ` +
      `${summary.marketsCreated} markets and ${summary.commoditiesCreated} commodities created`,
  );

  const users = await seedUsers();
  console.log(`  • ${users.size} demo users ready (password: ${DEMO_PASSWORD})`);

  const listings = await seedListings(users);
  console.log(`  • ${listings} demo listings created`);

  console.log("\n✓ Demo data seeded. Every record is labelled DEMO DATA and is never mixed with real prices.");
  console.log(`  Sign in as farmer@demo.mandilens.test / ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n✗ Demo seed failed:", error instanceof Error ? error.message : error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
  });
