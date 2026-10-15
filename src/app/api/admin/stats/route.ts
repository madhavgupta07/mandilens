import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Commodity,
  DataImportJob,
  Market,
  MarketPrice,
  Listing,
  PriceAlert,
  User,
  Inquiry,
} from "@/lib/db/models";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdmin();
  await connectToDatabase();

  const [
    users,
    markets,
    commodities,
    priceRecords,
    realPriceRecords,
    demoPriceRecords,
    listings,
    activeListings,
    alerts,
    inquiries,
    importJobs,
    latestPrice,
  ] = await Promise.all([
    User.countDocuments(),
    Market.countDocuments(),
    Commodity.countDocuments(),
    MarketPrice.countDocuments(),
    MarketPrice.countDocuments({ isDemo: false }),
    MarketPrice.countDocuments({ isDemo: true }),
    Listing.countDocuments(),
    Listing.countDocuments({ status: "active" }),
    PriceAlert.countDocuments({ isActive: true }),
    Inquiry.countDocuments(),
    DataImportJob.countDocuments(),
    MarketPrice.findOne().sort({ priceDate: -1 }).select("priceDate").lean(),
  ]);

  return ok({
    counts: {
      users,
      markets,
      commodities,
      priceRecords,
      realPriceRecords,
      demoPriceRecords,
      listings,
      activeListings,
      activeAlerts: alerts,
      inquiries,
      importJobs,
    },
    latestPriceDate: latestPrice?.priceDate ?? null,
  });
});
