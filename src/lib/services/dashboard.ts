import { connectToDatabase } from "@/lib/db/connect";
import {
  Inquiry,
  Listing,
  Notification,
  PriceAlert,
  SavedComparison,
  Watchlist,
} from "@/lib/db/models";
import { serialize } from "@/lib/utils/serialize";

export interface DashboardSummary {
  counts: {
    activeListings: number;
    openInquiries: number;
    unreadNotifications: number;
    activeAlerts: number;
    watchlists: number;
    savedComparisons: number;
  };
  recentListings: Record<string, unknown>[];
  recentInquiries: Record<string, unknown>[];
  recentNotifications: Record<string, unknown>[];
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  await connectToDatabase();

  const [
    activeListings,
    openInquiries,
    unreadNotifications,
    activeAlerts,
    watchlists,
    savedComparisons,
    recentListings,
    recentInquiries,
    recentNotifications,
  ] = await Promise.all([
    Listing.countDocuments({ user: userId, status: "active" }),
    Inquiry.countDocuments({ to: userId, status: { $ne: "closed" } }),
    Notification.countDocuments({ user: userId, isRead: false }),
    PriceAlert.countDocuments({ user: userId, isActive: true }),
    Watchlist.countDocuments({ user: userId }),
    SavedComparison.countDocuments({ user: userId }),
    Listing.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Inquiry.find({ $or: [{ to: userId }, { from: userId }] })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("listing", "commodityName type")
      .lean(),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  return {
    counts: {
      activeListings,
      openInquiries,
      unreadNotifications,
      activeAlerts,
      watchlists,
      savedComparisons,
    },
    recentListings: serialize(recentListings),
    recentInquiries: serialize(recentInquiries),
    recentNotifications: serialize(recentNotifications),
  };
}
