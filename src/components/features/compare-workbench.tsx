"use client";

import * as React from "react";
import Link from "next/link";
import {
  Scale,
  Sparkles,
  Plus,
  X,
  Trophy,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DemoDataBadge, FreshnessBadge, SourceBadge } from "@/components/domain/badges";
import { DisclaimerNote } from "@/components/domain/notes";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatINR } from "@/lib/utils/decimal";
import { UNITS } from "@/lib/domain/constants";
import { cn } from "@/lib/utils/cn";

interface CommodityOption {
  id: string;
  name: string;
  slug: string;
  defaultUnit: string;
}
interface MarketOption {
  id: string;
  name: string;
  slug: string;
  state: string;
  district: string;
}
interface MetaResponse {
  states: string[];
  districts: string[];
}

interface CandidateResult {
  marketId: string;
  marketName: string;
  district?: string;
  state?: string;
  pricePerUnit: number | null;
  priceUnit: string;
  priceSource: string;
  priceDate: string | null;
  recordTypeLabel: string;
  dataSource?: string;
  dataSourceLabel?: string;
  isDemo: boolean;
  quantityInPriceUnit: number;
  grossSaleValue: number;
  expenseLines: Array<{ key: string; label: string; amount: number; provided: boolean }>;
  totalExpenses: number;
  estimatedNetProceeds: number;
  differenceFromBest: number | null;
  rank: number | null;
  isBest: boolean;
  usable: boolean;
  unusableReason?: string;
  freshness: { level: string; ageDays: number; label: string } | null;
  warnings: string[];
  missingInformation: string[];
}

interface OpportunityResult {
  candidates: CandidateResult[];
  usableCount: number;
  bestMarketId: string | null;
  bestMarketName: string | null;
  bestNetProceeds: number | null;
  runnerUp: { marketId: string; marketName: string; netProceeds: number } | null;
  assumptions: {
    assumptions: string[];
    warnings: string[];
    missingInformation: string[];
    alternatives: string[];
    disclaimer: string;
  };
}

interface ComparisonOutput {
  commodity: { id: string; name: string; slug: string; defaultUnit: string; isDemo: boolean };
  mode: string;
  result: OpportunityResult;
  dataProvenance: {
    rows: Array<{
      marketId: string;
      marketName: string;
      dataSource: string;
      dataSourceLabel: string;
      priceDate: string | null;
      isDemo: boolean;
      freshnessLevel: string | null;
    }>;
    hasDemoData: boolean;
  };
}

const EMPTY_EXPENSES = {
  transportation: "",
  loading: "",
  unloading: "",
  marketCharges: "",
  commissionPercent: "",
  other: "",
};

type ExpenseForm = typeof EMPTY_EXPENSES;

function expensesToPayload(form: ExpenseForm) {
  const payload: Record<string, number> = {};
  for (const [key, value] of Object.entries(form)) {
    if (value !== "" && !Number.isNaN(Number(value))) payload[key] = Number(value);
  }
  return payload;
}

export function CompareWorkbench({
  initialCommoditySlug,
  initialQuantity,
  initialUnit,
}: {
  initialCommoditySlug?: string;
  initialQuantity?: string;
  initialUnit?: string;
}) {
  const { user } = useAuth();

  const [commodities, setCommodities] = React.useState<CommodityOption[]>([]);
  const [markets, setMarkets] = React.useState<MarketOption[]>([]);
  const [meta, setMeta] = React.useState<MetaResponse>({ states: [], districts: [] });

  const [commoditySlug, setCommoditySlug] = React.useState(initialCommoditySlug ?? "");
  const [quantity, setQuantity] = React.useState(initialQuantity ?? "50");
  const [quantityUnit, setQuantityUnit] = React.useState(initialUnit ?? "quintal");
  const [mode, setMode] = React.useState<"real" | "demo" | "all">("all");

  const [strategy, setStrategy] = React.useState<"auto" | "manual">("auto");
  const [state, setState] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [marketLimit, setMarketLimit] = React.useState("3");

  const [selectedMarkets, setSelectedMarkets] = React.useState<MarketOption[]>([]);
  const [marketSearch, setMarketSearch] = React.useState("");

  const [expenses, setExpenses] = React.useState<ExpenseForm>(EMPTY_EXPENSES);
  const [saveTitle, setSaveTitle] = React.useState("");

  const [result, setResult] = React.useState<ComparisonOutput | null>(null);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    apiFetch<CommodityOption[]>("/api/commodities?limit=100")
      .then((items) => {
        setCommodities(items);
        setCommoditySlug((current) => current || items[0]?.slug || "");
      })
      .catch(() => setCommodities([]));
    apiFetch<MarketOption[]>("/api/markets?limit=100")
      .then((items) => setMarkets(items))
      .catch(() => setMarkets([]));
    apiFetch<MetaResponse>("/api/markets/meta")
      .then((data) => setMeta(data))
      .catch(() => setMeta({ states: [], districts: [] }));
  }, []);

  const districtsForState = React.useMemo(
    () => meta.districts.filter(Boolean),
    [meta.districts],
  );

  const filteredMarkets = React.useMemo(() => {
    const term = marketSearch.trim().toLowerCase();
    const pool = markets.filter(
      (market) => !selectedMarkets.some((selected) => selected.id === market.id),
    );
    if (!term) return pool.slice(0, 12);
    return pool
      .filter(
        (market) =>
          market.name.toLowerCase().includes(term) ||
          market.district.toLowerCase().includes(term) ||
          market.state.toLowerCase().includes(term),
      )
      .slice(0, 12);
  }, [markets, selectedMarkets, marketSearch]);

  function addMarket(market: MarketOption) {
    if (selectedMarkets.length >= 8) {
      toast.error("You can compare up to 8 markets at once.");
      return;
    }
    setSelectedMarkets((current) => [...current, market]);
  }

  async function run() {
    if (!commoditySlug) {
      toast.error("Pick a commodity first.");
      return;
    }
    setRunning(true);
    try {
      const expensePayload = expensesToPayload(expenses);
      let output: ComparisonOutput;
      if (strategy === "auto") {
        output = await apiFetch<ComparisonOutput>("/api/compare/auto", {
          method: "POST",
          json: {
            commoditySlug,
            quantity: Number(quantity),
            quantityUnit,
            mode,
            state: state || undefined,
            district: district || undefined,
            marketLimit: Number(marketLimit),
            defaultExpenses: expensePayload,
          },
        });
      } else {
        if (selectedMarkets.length === 0) {
          toast.error("Add at least one market, or switch to auto-pick.");
          setRunning(false);
          return;
        }
        output = await apiFetch<ComparisonOutput>("/api/compare", {
          method: "POST",
          json: {
            commoditySlug,
            quantity: Number(quantity),
            quantityUnit,
            mode,
            saveAs: user && saveTitle.trim().length >= 2 ? saveTitle.trim() : undefined,
            candidates: selectedMarkets.map((market) => ({
              marketId: market.id,
              expenses: expensePayload,
            })),
          },
        });
      }
      setResult(output);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
      <div className="space-y-5 lg:sticky lg:top-20">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="commodity">Commodity</Label>
              <Select
                id="commodity"
                value={commoditySlug}
                onChange={(event) => setCommoditySlug(event.target.value)}
              >
                {commodities.length === 0 ? <option>Loading…</option> : null}
                {commodities.map((commodity) => (
                  <option key={commodity.id} value={commodity.slug}>
                    {commodity.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantityUnit">Unit</Label>
                <Select
                  id="quantityUnit"
                  value={quantityUnit}
                  onChange={(event) => setQuantityUnit(event.target.value)}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <div className="flex rounded-md border border-border p-0.5">
                {(["real", "demo", "all"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={cn(
                      "flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                      mode === option
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {option === "real" ? "Real only" : option === "demo" ? "Demo only" : "All data"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Real and demo records are never mixed silently when you filter to real.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex rounded-md border border-border p-0.5">
              {(["auto", "manual"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStrategy(option)}
                  className={cn(
                    "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                    strategy === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option === "auto" ? "Auto-pick markets" : "Choose markets"}
                </button>
              ))}
            </div>

            {strategy === "auto" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <Select
                      id="state"
                      value={state}
                      onChange={(event) => {
                        setState(event.target.value);
                        setDistrict("");
                      }}
                    >
                      <option value="">Any</option>
                      {meta.states.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="district">District</Label>
                    <Select
                      id="district"
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                    >
                      <option value="">Any</option>
                      {districtsForState.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="marketLimit">Markets to compare</Label>
                  <Select
                    id="marketLimit"
                    value={marketLimit}
                    onChange={(event) => setMarketLimit(event.target.value)}
                  >
                    {[2, 3, 4, 5, 6, 8].map((count) => (
                      <option key={count} value={count}>
                        Top {count} by most recent report
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="marketSearch">Add markets</Label>
                  <Input
                    id="marketSearch"
                    placeholder="Search markets…"
                    value={marketSearch}
                    onChange={(event) => setMarketSearch(event.target.value)}
                  />
                </div>
                {marketSearch ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                    {filteredMarkets.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">No matches.</p>
                    ) : (
                      filteredMarkets.map((market) => (
                        <button
                          key={market.id}
                          type="button"
                          onClick={() => addMarket(market)}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                        >
                          <span>
                            {market.name}
                            <span className="block text-xs text-muted-foreground">
                              {market.district}, {market.state}
                            </span>
                          </span>
                          <Plus className="size-4 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  {selectedMarkets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No markets selected yet. Search above to add up to 8.
                    </p>
                  ) : (
                    selectedMarkets.map((market) => (
                      <div
                        key={market.id}
                        className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span>
                          {market.name}
                          <span className="block text-xs text-muted-foreground">
                            {market.district}, {market.state}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMarkets((current) =>
                              current.filter((item) => item.id !== market.id),
                            )
                          }
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${market.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div>
              <p className="text-sm font-semibold">Your costs</p>
              <p className="text-xs text-muted-foreground">
                These are subtracted from every market. Leave blank to treat as unknown (₹0).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["transportation", "Transport ₹"],
                  ["loading", "Loading ₹"],
                  ["unloading", "Unloading ₹"],
                  ["marketCharges", "Market charges ₹"],
                  ["commissionPercent", "Commission %"],
                  ["other", "Other ₹"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenses[key]}
                    placeholder="0"
                    onChange={(event) =>
                      setExpenses((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            {user ? (
              <div className="space-y-1.5">
                <Label htmlFor="saveTitle" className="text-xs">
                  Save this comparison as (optional)
                </Label>
                <Input
                  id="saveTitle"
                  value={saveTitle}
                  placeholder="e.g. Paddy in Samastipur, Oct"
                  onChange={(event) => setSaveTitle(event.target.value)}
                />
              </div>
            ) : null}

            <Button onClick={run} disabled={running} className="w-full gap-2">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Scale className="size-4" />}
              {running ? "Calculating…" : "Estimate my best market"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        {!result ? (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-muted text-primary">
                <Scale className="size-6" />
              </span>
              <h2 className="text-lg font-semibold">Your estimate will appear here</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Pick a commodity, enter your quantity and costs, then choose whether MandiLens
                should auto-pick the best-reported markets or compare markets you select. Every
                rupee is computed with exact decimal arithmetic.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <ResultSummary output={result} />
            <ResultTable output={result} />
            <AssumptionsPanel output={result} />
          </>
        )}
      </div>
    </div>
  );
}

function ResultSummary({ output }: { output: ComparisonOutput }) {
  const { result } = output;
  const best = result.candidates.find((candidate) => candidate.isBest);

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-accent" />
          <h2 className="text-lg font-semibold">
            {result.bestMarketName
              ? `${result.bestMarketName} gives the highest net proceeds`
              : "No market could be ranked"}
          </h2>
        </div>

        {result.bestNetProceeds !== null ? (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Best estimated net proceeds
              </p>
              <p className="text-3xl font-bold tabular-nums text-primary">
                {formatINR(result.bestNetProceeds)}
              </p>
            </div>
            {best ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Gross sale value
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatINR(best.grossSaleValue)}
                </p>
              </div>
            ) : null}
            {result.runnerUp ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Runner-up advantage
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatINR(result.runnerUp.netProceeds)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {result.runnerUp.marketName}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <Alert variant="warning">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              None of the selected markets had a usable price. Add a manual price or import market
              data, then try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">{output.commodity.name}</Badge>
          <Badge variant="outline">{output.mode} mode</Badge>
          <Badge variant="outline">{result.usableCount} usable markets</Badge>
          {output.dataProvenance.hasDemoData ? <DemoDataBadge /> : null}
          <Button asChild size="sm" variant="ghost" className="gap-1">
            <Link href={`/copilot?q=${encodeURIComponent(`Explain the best market for ${output.commodity.name}`)}`}>
              <Sparkles className="size-3.5" /> Ask the Copilot to explain
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultTable({ output }: { output: ComparisonOutput }) {
  const { candidates } = output.result;
  const provenanceByMarket = new Map(
    output.dataProvenance.rows.map((row) => [row.marketId, row]),
  );

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="font-semibold">Ranking by net proceeds</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Market</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Gross value</TableHead>
              <TableHead className="text-right">Costs</TableHead>
              <TableHead className="text-right">Net proceeds</TableHead>
              <TableHead className="text-right">vs best</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => {
              const provenance = provenanceByMarket.get(candidate.marketId);
              return (
                <TableRow
                  key={candidate.marketId}
                  className={cn(candidate.isBest && "bg-primary-muted/60")}
                >
                  <TableCell className="font-semibold">
                    {candidate.rank ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {candidate.marketName}
                      {candidate.isBest ? (
                        <Badge variant="default" className="ml-2">
                          Best
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {candidate.usable ? (
                        <>
                          {candidate.freshness ? (
                            <FreshnessBadge
                              level={candidate.freshness.level}
                              label={candidate.freshness.label}
                              ageDays={candidate.freshness.ageDays}
                            />
                          ) : null}
                          {provenance ? <SourceBadge dataSource={provenance.dataSource} /> : null}
                          {candidate.isDemo ? <DemoDataBadge /> : null}
                        </>
                      ) : (
                        <Badge variant="destructive" className="font-normal">
                          {candidate.unusableReason ?? "No usable price"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {candidate.pricePerUnit !== null
                      ? `${formatINR(candidate.pricePerUnit)}/${candidate.priceUnit}`
                      : "—"}
                    <span className="block text-xs text-muted-foreground">
                      {candidate.priceSource === "user" ? "manual" : candidate.priceSource}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {candidate.usable ? formatINR(candidate.grossSaleValue) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {candidate.usable ? `-${formatINR(candidate.totalExpenses)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {candidate.usable ? formatINR(candidate.estimatedNetProceeds) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {typeof candidate.differenceFromBest === "number" ? (
                      candidate.differenceFromBest === 0 ? (
                        <span className="text-primary">best</span>
                      ) : (
                        <span className="text-destructive">
                          {formatINR(candidate.differenceFromBest)}
                        </span>
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          Quantities are converted to each market&apos;s reported unit before multiplication. Costs
          are applied per market as entered.
        </p>
      </CardContent>
    </Card>
  );
}

function AssumptionsPanel({ output }: { output: ComparisonOutput }) {
  const { assumptions } = output.result;
  const allWarnings = [
    ...assumptions.warnings,
    ...output.result.candidates.flatMap((c) => c.warnings),
  ];
  const allMissing = [
    ...assumptions.missingInformation,
    ...output.result.candidates.flatMap((c) => c.missingInformation),
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            <h3 className="font-semibold">Assumptions</h3>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {assumptions.assumptions.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-semibold">What to watch</h3>
          {[...new Set(allWarnings)].length > 0 ? (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[...new Set(allWarnings)].map((item, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No warnings for this comparison.</p>
          )}
          {[...new Set(allMissing)].length > 0 ? (
            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Missing information
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {[...new Set(allMissing)].map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <DisclaimerNote text={assumptions.disclaimer} />
      </div>

      {output.dataProvenance.rows.length > 0 ? (
        <Card className="md:col-span-2">
          <CardContent className="space-y-3 p-5">
            <h3 className="font-semibold">Where these numbers came from</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-1.5 text-left">Market</th>
                    <th className="py-1.5 text-left">Source</th>
                    <th className="py-1.5 text-left">Reported date</th>
                    <th className="py-1.5 text-left">Freshness</th>
                  </tr>
                </thead>
                <tbody>
                  {output.dataProvenance.rows.map((row) => (
                    <tr key={row.marketId} className="border-t border-border">
                      <td className="py-1.5">{row.marketName}</td>
                      <td className="py-1.5">{row.dataSourceLabel}</td>
                      <td className="py-1.5">
                        {row.priceDate
                          ? new Date(row.priceDate).toLocaleDateString("en-IN")
                          : "manual entry"}
                      </td>
                      <td className="py-1.5 capitalize">
                        {row.freshnessLevel ?? "—"}
                        {row.isDemo ? " · demo" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
