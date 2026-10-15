import Link from "next/link";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/domain/layout";
import { DemoDataBadge } from "@/components/domain/badges";
import { listMarkets, listMarketStates, listMarketDistricts } from "@/lib/services/catalog";
import type { IMarket } from "@/lib/db/models";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market explorer",
  description: "Browse agricultural markets (mandis) and see the commodities they report.",
};

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; district?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const mode = (params.mode as "real" | "demo" | "all" | undefined) ?? "all";

  let items: IMarket[] = [];
  let states: string[] = [];
  let districts: string[] = [];
  let failed = false;

  try {
    const [markets, stateList, districtList] = await Promise.all([
      listMarkets({
        q: params.q,
        state: params.state,
        district: params.district,
        mode,
        limit: 100,
      }),
      listMarketStates("all"),
      listMarketDistricts(params.state, "all"),
    ]);
    items = markets.items;
    states = stateList;
    districts = districtList;
  } catch {
    failed = true;
  }

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        eyebrow="Explorer"
        title="Market explorer"
        description="Browse the agricultural markets that report prices, then open one to see its latest commodity prices."
      />

      <form className="flex flex-wrap items-center gap-3" action="/markets" method="get">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search a market…"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          name="state"
          defaultValue={params.state ?? ""}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All states</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <select
          name="district"
          defaultValue={params.district ?? ""}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <Button type="submit">Filter</Button>
      </form>

      {failed ? (
        <EmptyState
          icon={MapPin}
          title="No data source connected"
          description="MandiLens couldn't reach its database. Configure MONGODB_URI and import data."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No markets found"
          description="Try a different filter, or import market data to populate the catalogue."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((market) => (
            <Link key={String(market._id)} href={`/markets/${market.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{market.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {market.district}, {market.state}
                      </p>
                    </div>
                    {market.isDemo ? <DemoDataBadge /> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <Badge variant="outline" className="capitalize">
                      {market.marketType || "market"}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Prices <ArrowRight className="size-3.5" />
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
