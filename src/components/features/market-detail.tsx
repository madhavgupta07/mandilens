"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Scale, Building2 } from "lucide-react";
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
import { DemoDataBadge, SourceBadge, FreshnessBadge } from "@/components/domain/badges";
import { DataNote } from "@/components/domain/notes";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatINR } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/dates";

interface MarketInfo {
  id: string;
  name: string;
  slug: string;
  state: string;
  district: string;
  block?: string;
  marketType?: string;
  description?: string;
  isDemo: boolean;
}

interface MarketPriceRow {
  commodityId: string;
  commodityName?: string;
  commoditySlug?: string;
  hindiName?: string;
  category?: string;
  unit: string;
  minPrice?: number;
  maxPrice?: number;
  modalPrice?: number;
  priceDate: string;
  dataSource: string;
  isDemo: boolean;
  freshness: { level: string; ageDays: number; label: string };
}

export function MarketDetail({ slug }: { slug: string }) {
  const [market, setMarket] = React.useState<MarketInfo | null>(null);
  const [prices, setPrices] = React.useState<MarketPriceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<MarketInfo>(`/api/markets/${slug}`),
      apiFetch<MarketPriceRow[]>(`/api/markets/${slug}/prices`).catch(() => []),
    ])
      .then(([marketInfo, priceRows]) => {
        setMarket(marketInfo);
        setPrices(priceRows);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="font-semibold">Market not found</p>
          <p className="text-sm text-muted-foreground">{error ?? "Unknown error."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{market.name}</h1>
            <Badge variant="outline" className="capitalize">
              {market.marketType || "market"}
            </Badge>
            {market.isDemo ? <DemoDataBadge /> : null}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {market.block ? `${market.block}, ` : ""}
            {market.district}, {market.state}
          </p>
          {market.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{market.description}</p>
          ) : null}
        </div>
        <Button asChild size="sm">
          <Link href={`/compare`} className="gap-1.5">
            <Scale className="size-4" /> Compare with other markets
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="font-semibold">Commodities reported here</h2>
          </div>

          {prices.length === 0 ? (
            <DataNote>
              No commodity prices have been recorded for this market yet. Empty data means nothing
              has been imported — not that the market is inactive.
            </DataNote>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commodity</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Modal</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Freshness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((row) => (
                  <TableRow key={row.commodityId}>
                    <TableCell>
                      {row.commoditySlug ? (
                        <Link
                          href={`/commodities/${row.commoditySlug}`}
                          className="font-medium hover:underline"
                        >
                          {row.commodityName ?? "Unknown"}
                        </Link>
                      ) : (
                        <span className="font-medium">{row.commodityName ?? "Unknown"}</span>
                      )}
                      {row.hindiName ? (
                        <span className="ml-2 text-xs text-muted-foreground">{row.hindiName}</span>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-wrap gap-2">
            {[...new Set(prices.map((row) => row.dataSource))].map((source) => (
              <SourceBadge key={source} dataSource={source} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
