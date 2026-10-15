"use client";

import * as React from "react";
import Link from "next/link";
import {
  Package,
  MessageSquare,
  Bell,
  BellRing,
  Bookmark,
  Star,
  ArrowRight,
  ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/domain/layout";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch } from "@/lib/client/api";
import { formatDate } from "@/lib/utils/dates";

interface DashboardSummary {
  counts: {
    activeListings: number;
    openInquiries: number;
    unreadNotifications: number;
    activeAlerts: number;
    watchlists: number;
    savedComparisons: number;
  };
  recentListings: Array<Record<string, unknown>>;
  recentInquiries: Array<Record<string, unknown>>;
  recentNotifications: Array<Record<string, unknown>>;
}

export function DashboardView() {
  const { user } = useAuth();
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<DashboardSummary>("/api/dashboard")
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const counts = summary?.counts;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Hello, {user?.name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what needs your attention across markets, listings and conversations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active listings" value={counts?.activeListings ?? 0} icon={Package} />
        <StatCard label="Open inquiries" value={counts?.openInquiries ?? 0} icon={MessageSquare} />
        <StatCard label="Unread notifications" value={counts?.unreadNotifications ?? 0} icon={Bell} />
        <StatCard label="Active price alerts" value={counts?.activeAlerts ?? 0} icon={BellRing} />
        <StatCard label="Watchlists" value={counts?.watchlists ?? 0} icon={Star} />
        <StatCard label="Saved comparisons" value={counts?.savedComparisons ?? 0} icon={Bookmark} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent listings</h2>
              <Link href="/listings/new" className="text-xs text-primary hover:underline">
                Post new
              </Link>
            </div>
            {(summary?.recentListings.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">You haven&apos;t posted any listings yet.</p>
            ) : (
              <ul className="space-y-2">
                {summary?.recentListings.map((listing) => (
                  <li key={String(listing._id)}>
                    <Link
                      href={`/listings/${String(listing._id)}`}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span>
                        {String(listing.commodityName)}{" "}
                        <span className="text-muted-foreground">
                          · {String(listing.quantity)} {String(listing.unit)}
                        </span>
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {String(listing.type)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent conversations</h2>
              <Link href="/inquiries" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            {(summary?.recentInquiries.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No inquiries yet.</p>
            ) : (
              <ul className="space-y-2">
                {summary?.recentInquiries.map((inquiry) => (
                  <li key={String(inquiry._id)}>
                    <Link
                      href={`/inquiries#${String(inquiry._id)}`}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="truncate">
                        {String((inquiry.listing as Record<string, unknown>)?.commodityName ?? "Listing")}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {String(inquiry.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/compare", label: "Run a comparison", icon: ListChecks },
              { href: "/copilot", label: "Ask the Copilot", icon: Star },
              { href: "/alerts", label: "Manage alerts", icon: BellRing },
              { href: "/listings/new", label: "Post a listing", icon: Package },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-medium hover:border-primary hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <action.icon className="size-4 text-primary" />
                  {action.label}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {summary && summary.recentNotifications.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Latest notifications</h2>
              <Link href="/notifications" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-2">
              {summary.recentNotifications.map((notification) => (
                <li key={String(notification._id)} className="flex items-start gap-2 text-sm">
                  <Bell className="mt-0.5 size-3.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{String(notification.title)}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(notification.body ?? "")} · {formatDate(String(notification.createdAt))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
