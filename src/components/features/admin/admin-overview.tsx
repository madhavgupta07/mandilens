"use client";

import * as React from "react";
import { Users, MapPin, Wheat, LineChart, Store, BellRing, MessageSquare, Upload, FlaskConical } from "lucide-react";
import { StatCard } from "@/components/domain/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoDataBadge } from "@/components/domain/badges";
import { DataNote } from "@/components/domain/notes";
import { apiFetch } from "@/lib/client/api";
import { formatDate } from "@/lib/utils/dates";

interface AdminStats {
  counts: {
    users: number;
    markets: number;
    commodities: number;
    priceRecords: number;
    realPriceRecords: number;
    demoPriceRecords: number;
    listings: number;
    activeListings: number;
    activeAlerts: number;
    inquiries: number;
    importJobs: number;
  };
  latestPriceDate: string | null;
}

export function AdminOverview() {
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <DataNote>Could not load admin statistics.</DataNote>;
  }

  const { counts } = stats;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={counts.users} icon={Users} />
        <StatCard label="Markets" value={counts.markets} icon={MapPin} />
        <StatCard label="Commodities" value={counts.commodities} icon={Wheat} />
        <StatCard
          label="Price records"
          value={counts.priceRecords}
          hint={`${counts.realPriceRecords} real · ${counts.demoPriceRecords} demo`}
          icon={LineChart}
        />
        <StatCard label="Active listings" value={counts.activeListings} hint={`${counts.listings} total`} icon={Store} />
        <StatCard label="Active alerts" value={counts.activeAlerts} icon={BellRing} />
        <StatCard label="Inquiries" value={counts.inquiries} icon={MessageSquare} />
        <StatCard label="Import jobs" value={counts.importJobs} icon={Upload} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DataNote>
          Latest price observation date:{" "}
          <strong className="text-foreground">
            {stats.latestPriceDate ? formatDate(stats.latestPriceDate) : "no data yet"}
          </strong>
        </DataNote>
        {counts.demoPriceRecords > 0 ? <DemoDataBadge /> : null}
      </div>
    </div>
  );
}
