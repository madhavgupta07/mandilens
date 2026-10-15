import { loadEnv } from "./_env";
import type { Types } from "mongoose";

loadEnv();

async function run() {
  const { connectToDatabase, disconnectFromDatabase } = await import("@/lib/db/connect");
  const {
    User,
    Commodity,
    Market,
    Listing,
    Inquiry,
    Watchlist,
    SavedComparison,
    PriceAlert,
    Notification,
    DataImportJob,
    AuditLog,
  } = await import("@/lib/db/models");

  await connectToDatabase();
  console.log("Seeding rich user activity & admin demo data...");

  const farmer = await User.findOne({ email: "farmer@demo.mandilens.test" });
  const trader = await User.findOne({ email: "trader@demo.mandilens.test" });
  const admin = await User.findOne({ email: "admin@mandilens.test" });

  if (!farmer || !trader) {
    console.error("Farmer or Trader user not found. Run seed:demo first.");
    process.exit(1);
  }

  const maize = await Commodity.findOne({ name: "Maize" });
  const paddy = await Commodity.findOne({ name: "Paddy (Common)" });
  const mustard = await Commodity.findOne({ name: "Mustard" });
  const samastipur = await Market.findOne({ name: "Samastipur APMC" });
  const muzaffarpur = await Market.findOne({ name: "Muzaffarpur APMC" });

  // 1. Seed Price Alert for Farmer
  if (maize) {
    await PriceAlert.findOneAndUpdate(
      { user: farmer._id, commodity: maize._id },
      {
        $set: {
          user: farmer._id,
          commodity: maize._id,
          market: samastipur?._id,
          district: "Samastipur",
          metric: "modal",
          comparator: "above",
          threshold: 2200,
          unit: "quintal",
          isActive: true,
          lastTriggeredAt: new Date(Date.now() - 3600000 * 4),
          lastObservedPrice: 2240,
          lastObservedDate: new Date(),
          isDemo: true,
        },
      },
      { upsert: true },
    );
    console.log("  ✓ Seeded Price Alert for Maize");
  }

  // 2. Seed Watchlist for Farmer
  const watchCommodities = [maize?._id, paddy?._id, mustard?._id].filter(Boolean) as Types.ObjectId[];
  const watchMarkets = [samastipur?._id, muzaffarpur?._id].filter(Boolean) as Types.ObjectId[];
  await Watchlist.findOneAndUpdate(
    { user: farmer._id, name: "Kharif Harvest Focus" },
    {
      $set: {
        user: farmer._id,
        name: "Kharif Harvest Focus",
        commodities: watchCommodities,
        markets: watchMarkets,
        districts: ["Samastipur", "Muzaffarpur"],
        isDemo: true,
      },
    },
    { upsert: true },
  );
  console.log("  ✓ Seeded Watchlist");

  // 3. Seed Saved Comparison for Farmer
  await SavedComparison.findOneAndUpdate(
    { user: farmer._id, title: "Maize 50Q: Samastipur vs Muzaffarpur Net Proceeds" },
    {
      $set: {
        user: farmer._id,
        title: "Maize 50Q: Samastipur vs Muzaffarpur Net Proceeds",
        input: {
          commodityName: "Maize",
          quantity: 50,
          unit: "quintal",
          expenses: {
            transportation: 1200,
            loading: 400,
            unloading: 400,
            marketCharges: 250,
            commissionPercent: 1.5,
          },
        },
        result: {
          winner: "Samastipur APMC",
          netProceeds: 106450,
          grossRevenue: 109000,
          totalExpenses: 2550,
          advantage: 2850,
        },
        isDemo: true,
      },
    },
    { upsert: true },
  );
  console.log("  ✓ Seeded Saved Comparison");

  // 4. Seed Notifications for Farmer
  await Notification.findOneAndUpdate(
    { user: farmer._id, dedupeKey: "demo:welcome:1" },
    {
      $set: {
        user: farmer._id,
        type: "welcome",
        title: "Welcome to MandiLens!",
        body: "Your account is set up for Samastipur, Bihar. Compare local APMCs or ask the Copilot anytime.",
        link: "/compare",
        isRead: true,
        dedupeKey: "demo:welcome:1",
      },
    },
    { upsert: true },
  );
  await Notification.findOneAndUpdate(
    { user: farmer._id, dedupeKey: "demo:alert:maize" },
    {
      $set: {
        user: farmer._id,
        type: "price_alert",
        title: "Price Alert: Maize crossed ₹2,200/quintal",
        body: "Samastipur APMC modal price reported at ₹2,240/quintal today (+₹40 above threshold).",
        link: "/commodities/maize",
        isRead: false,
        dedupeKey: "demo:alert:maize",
      },
    },
    { upsert: true },
  );
  console.log("  ✓ Seeded Notifications");

  // 5. Seed Inquiry from Trader to Farmer
  const farmerListing = await Listing.findOne({ user: farmer._id, status: "active" });
  if (farmerListing) {
    const existingInq = await Inquiry.findOne({ listing: farmerListing._id, from: trader._id });
    if (!existingInq) {
      await Inquiry.create({
        listing: farmerListing._id,
        from: trader._id,
        to: farmer._id,
        message: "Hello! I am interested in lifting 50 quintals of your maize. Can you arrange weighing at the local dharma-kanta?",
        quantityInterested: 50,
        offeredPricePerUnit: 2200,
        status: "open",
        messages: [
          {
            sender: trader._id,
            body: "Hello! I am interested in lifting 50 quintals of your maize. Can you arrange weighing at the local dharma-kanta?",
            at: new Date(Date.now() - 7200000),
          },
        ],
        isDemo: true,
      });
      console.log("  ✓ Seeded Inquiry");
    }
  }

  // 6. Report one listing for Admin Moderation queue
  const buyerListing = await Listing.findOne({ commodityName: "Potato" });
  if (buyerListing) {
    buyerListing.moderationStatus = "reported";
    buyerListing.reports = [
      {
        by: farmer._id,
        reason: "Price quoted seems inconsistent with current retail rates in Patna.",
        at: new Date(Date.now() - 14400000),
      },
    ];
    await buyerListing.save();
    console.log("  ✓ Seeded reported listing for Admin Moderation");
  }

  // 7. Seed DataImportJob for Admin Imports
  await DataImportJob.findOneAndUpdate(
    { fileName: "agmarknet_bihar_oct_batch.csv" },
    {
      $set: {
        sourceKey: "agmarknet",
        fileName: "agmarknet_bihar_oct_batch.csv",
        fileType: "csv",
        sizeBytes: 1048576,
        status: "validated",
        mapping: {
          market: "Market",
          commodity: "Commodity",
          modal_price: "Modal_Price",
          price_date: "Arrival_Date",
        },
        rowCount: 450,
        validCount: 442,
        invalidCount: 8,
        duplicateCount: 0,
        importedCount: 0,
        rowErrors: [
          { row: 14, message: "Missing modal price value" },
          { row: 89, message: "Unrecognized commodity code" },
        ],
        previewRows: [
          { Market: "Samastipur APMC", Commodity: "Maize", Modal_Price: "2180", Arrival_Date: "15/10/2026" },
          { Market: "Muzaffarpur APMC", Commodity: "Paddy", Modal_Price: "2350", Arrival_Date: "15/10/2026" },
          { Market: "Patna APMC", Commodity: "Potato", Modal_Price: "1480", Arrival_Date: "15/10/2026" },
        ],
        summary: "Batch validated: 442 valid records ready for commit.",
        createdBy: admin?._id,
        startedAt: new Date(Date.now() - 1800000),
      },
    },
    { upsert: true },
  );
  console.log("  ✓ Seeded ImportJob for Admin Imports");

  // 8. Seed AuditLog entries
  await AuditLog.create([
    {
      actorLabel: "admin@mandilens.test",
      action: "ingestion.sync_triggered",
      entityType: "DataSource",
      entityId: "agmarknet",
      meta: { state: "Bihar", recordsParsed: 2880 },
    },
    {
      actorLabel: "trader@demo.mandilens.test",
      action: "listing.created",
      entityType: "Listing",
      meta: { commodity: "Mustard", quantity: 60, price: 5700 },
    },
  ]);
  console.log("  ✓ Seeded Audit logs");

  console.log("\nAll user activity & admin demo data seeded successfully!");
  await disconnectFromDatabase();
}

run().catch((err) => {
  console.error("Seeding activity failed:", err);
  process.exit(1);
});
