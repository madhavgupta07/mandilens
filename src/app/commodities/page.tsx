import Link from "next/link";
import { Search, Wheat, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/domain/layout";
import { DemoDataBadge } from "@/components/domain/badges";
import { listCommodities, listCommodityCategories } from "@/lib/services/catalog";
import type { ICommodity } from "@/lib/db/models";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Commodity explorer",
  description:
    "Browse agricultural commodities and open their latest mandi prices, trends and freshness.",
};

function CategoryChips({ categories, active }: { categories: string[]; active?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/commodities">
        <Badge variant={!active ? "default" : "outline"} className="cursor-pointer">
          All
        </Badge>
      </Link>
      {categories.map((category) => (
        <Link key={category} href={`/commodities?category=${encodeURIComponent(category)}`}>
          <Badge
            variant={active === category ? "default" : "outline"}
            className="cursor-pointer capitalize"
          >
            {category}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

export default async function CommoditiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const mode = (params.mode as "real" | "demo" | "all" | undefined) ?? "all";

  let items: ICommodity[] = [];
  let categories: string[] = [];
  let failed = false;

  try {
    const [commodities, cats] = await Promise.all([
      listCommodities({ q: params.q, category: params.category, mode, limit: 100 }),
      listCommodityCategories("all"),
    ]);
    items = commodities.items;
    categories = cats;
  } catch {
    failed = true;
  }

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        eyebrow="Explorer"
        title="Commodity explorer"
        description="Search for a crop to see its latest reported prices, trends and how fresh the data is."
      />

      <form className="flex flex-wrap items-center gap-3" action="/commodities" method="get">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search paddy, wheat, onion, tomato…"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
        <Button type="submit">Search</Button>
      </form>

      {categories.length > 0 ? (
        <CategoryChips categories={categories} active={params.category} />
      ) : null}

      {failed ? (
        <EmptyState
          icon={Wheat}
          title="No data source connected"
          description="MandiLens couldn't reach its database. Configure MONGODB_URI, then run the demo seed or import AGMARKNET data."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="No commodities found"
          description="Try a different search term, or import market data to populate the catalogue."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((commodity) => (
            <Link key={String(commodity._id)} href={`/commodities/${commodity.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{commodity.name}</p>
                      {commodity.hindiName ? (
                        <p className="text-sm text-muted-foreground">{commodity.hindiName}</p>
                      ) : null}
                    </div>
                    {commodity.isDemo ? <DemoDataBadge /> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <Badge variant="outline" className="capitalize">
                      {commodity.category}
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
