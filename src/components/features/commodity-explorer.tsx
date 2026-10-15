"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, DatabaseZap, Scale, BellRing, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/domain/layout";
import { FreshnessBadge, DemoDataBadge, SourceBadge } from "@/components/domain/badges";
import { DataNote } from "@/components/domain/notes";
import { PriceHistoryChart, type HistoryPoint } from "@/components/features/price-history-chart";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatINR, formatNumberIN } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface CommodityDetail {
  commodity: {
    id: string;
    name: string;
    slug: string;
    hindiName?: string;
    category: string;
    defaultUnit: string;
    isDemo: boolean;
  };
  latest: Array<{
    marketId: string;
    unit: string;
    minPrice?: number;
    maxPrice?: number;
    modalPrice?: number;
    priceDate: string;
    recordType: string;
    dataSource: string;
    dataSourceLabel?: string;
    isDemo: boolean;
    variety?: string;
    freshness: { level: string; ageDays: number; label: string };
    market: { name: string; slug: string; district: string; state: string } | null;
  }>;
  history: HistoryPoint[];
  freshness: {
    totalRecords: number;
    marketsCovered: number;
    latestPriceDate: string | null;
    freshness: { level: string; ageDays: number; label: string } | null;
    staleMarkets: number;
    dataSources: string[];
  };
}

const DAY_OPTIONS = [7, 30, 90, 180];

export function CommodityExplorer({
  slug,
  initialDays = 30,
}: {
  slug: string;
  initialDays?: number;
}) {
  const [days, setDays] = React.useState(initialDays);
  const [mode, setMode] = React.useState<"real" | "demo" | "all">("all");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [data, setData] = React.useState<CommodityDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<CommodityDetail>(`/api/commodities/${slug}?days=${days}&mode=${mode}`)
      .then((result) => setData(result))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [slug, days, mode, reloadKey]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6">
          <p className="font-semibold">We couldn&apos;t load this commodity</p>
          <p className="text-sm text-muted-foreground">{error ?? "Unknown error."}</p>
          <Button variant="outline" size="sm" onClick={() => setDays((d) => d)}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { commodity, latest, history, freshness } = data;
  const prices = latest.map((row) => row.modalPrice ?? row.minPrice ?? row.maxPrice ?? 0).filter(Boolean);
  const best = prices.length ? Math.max(...prices) : null;
  const avg = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{commodity.name}</h1>
            {commodity.hindiName ? (
              <span className="text-lg text-muted-foreground">{commodity.hindiName}</span>
            ) : null}
            <Badge variant="outline">{commodity.category}</Badge>
            {commodity.isDemo ? <DemoDataBadge /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Latest observations, trends and freshness across reporting markets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/compare?commodity=${commodity.slug}`} className="gap-1.5">
              <Scale className="size-4" /> Compare markets
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/alerts" className="gap-1.5">
              <BellRing className="size-4" /> Set alert
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Markets reporting"
          value={freshness.marketsCovered}
          hint={`${freshness.totalRecords} observations`}
        />
        <StatCard
          label="Highest modal"
          value={best !== null ? formatINR(best) : "—"}
          hint={`per ${commodity.defaultUnit}`}
        />
        <StatCard
          label="Average modal"
          value={avg !== null ? formatINR(avg) : "—"}
          hint={`per ${commodity.defaultUnit}`}
        />
        <StatCard
          label="Latest report"
          value={freshness.latestPriceDate ? formatDate(freshness.latestPriceDate) : "No data"}
          hint={freshness.freshness ? freshness.freshness.label : "Awaiting data"}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DatabaseZap className="size-4 text-primary" />
              <h2 className="font-semibold">Modal price trend</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-border p-0.5">
                {(["all", "real", "demo"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      mode === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex rounded-md border border-border p-0.5">
                {DAY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDays(option)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      days === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {option}d
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => setReloadKey((key) => key + 1)}
                aria-label="Refresh"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <PriceHistoryChart points={history} loading={loading} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Latest price by market</h2>
            <span className="text-xs text-muted-foreground">{latest.length} markets</span>
          </div>

          {latest.length === 0 ? (
            <DataNote>
              No recorded prices for this commodity yet. An empty result means &ldquo;nothing has
              been imported&rdquo; — it does not mean the market is closed. Import AGMARKNET data
              or run the demo seed to populate it.
            </DataNote>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Modal</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Freshness</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.map((row) => (
                  <TableRow key={row.marketId}>
                    <TableCell>
                      <div className="font-medium">
                        {row.market ? (
                          <Link href={`/markets/${row.market.slug}`} className="hover:underline">
                            {row.market.name}
                          </Link>
                        ) : (
                          "Unknown market"
                        )}
                      </div>
                      {row.market ? (
                        <div className="text-xs text-muted-foreground">
                          {row.market.district}, {row.market.state}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.minPrice !== undefined ? formatINR(row.minPrice) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.modalPrice !== undefined ? formatINR(row.modalPrice) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.maxPrice !== undefined ? formatINR(row.maxPrice) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(row.priceDate)}
                      <span className="block">per {row.unit}</span>
                    </TableCell>
                    <TableCell>
                      <FreshnessBadge
                        level={row.freshness.level}
                        label={row.freshness.label}
                        ageDays={row.freshness.ageDays}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <SourceBadge dataSource={row.dataSource} />
                        {row.isDemo ? <DemoDataBadge /> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DataNote>
            Prices shown are as reported by each market on the date shown. Verify with your local
            mandi before selling.{" "}
            <Link href="/methodology" className="underline">
              How MandiLens computes results
            </Link>
            .
          </DataNote>
        </CardContent>
      </Card>
    </div>
  );
}
