"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Package, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { DemoDataBadge } from "@/components/domain/badges";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatINR } from "@/lib/utils/decimal";
import { UNITS } from "@/lib/domain/constants";
import { cn } from "@/lib/utils/cn";

interface ListingItem {
  _id: string;
  type: "sell" | "buy";
  commodityName: string;
  commodity?: { name?: string; slug?: string } | null;
  quantity: number;
  unit: string;
  grade?: string;
  state: string;
  district: string;
  pricePerUnit?: number;
  priceUnit?: string;
  status: string;
  isDemo?: boolean;
  createdAt: string;
}

const TYPE_TABS = [
  { value: "", label: "All" },
  { value: "sell", label: "Selling" },
  { value: "buy", label: "Buying" },
] as const;

export function ListingBoard() {
  const [type, setType] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [minQuantity, setMinQuantity] = React.useState("");
  const [sort, setSort] = React.useState("recent");
  const [items, setItems] = React.useState<ListingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ sort });
    if (type) params.set("type", type);
    if (search.trim()) params.set("q", search.trim());
    if (minQuantity) params.set("minQuantity", minQuantity);
    try {
      const data = await apiFetch<ListingItem[]>(`/api/listings?${params.toString()}`);
      setItems(data);
    } catch (err) {
      setError(errorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type, search, minQuantity, sort]);

  React.useEffect(() => {
    const handle = setTimeout(() => void load(), 250);
    return () => clearTimeout(handle);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border border-border p-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                type === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/listings/new">
            <Plus className="size-4" /> Post a listing
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search commodity, district…"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={minQuantity}
          onChange={(event) => setMinQuantity(event.target.value)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Any quantity</option>
          <option value="10">10+ quintals</option>
          <option value="50">50+ quintals</option>
          <option value="100">100+ quintals</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="recent">Newest</option>
          <option value="quantity">Largest quantity</option>
          <option value="price">Highest price</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Package}
          title="Couldn't load listings"
          description={error}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No listings match your search"
          description="Try clearing filters, or be the first to post a listing for this commodity."
          actionHref="/listings/new"
          actionLabel="Post a listing"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <Link key={listing._id} href={`/listings/${listing._id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={listing.type === "sell" ? "default" : "accent"}
                        className="capitalize"
                      >
                        {listing.type === "sell" ? "Selling" : "Buying"}
                      </Badge>
                      {listing.isDemo ? <DemoDataBadge /> : null}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{listing.commodityName}</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.quantity} {listing.unit}
                      {listing.grade ? ` · ${listing.grade}` : ""}
                    </p>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {listing.district}, {listing.state}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="font-semibold tabular-nums">
                      {listing.pricePerUnit
                        ? `${formatINR(listing.pricePerUnit)}/${listing.priceUnit ?? "quintal"}`
                        : "Price on request"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      View <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
