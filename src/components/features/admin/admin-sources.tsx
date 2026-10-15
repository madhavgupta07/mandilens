"use client";

import * as React from "react";
import { Database, Play, Loader2, CircleCheck, TriangleAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/utils/dates";

interface SourceInfo {
  key: string;
  name: string;
  type: string;
  url?: string;
  license?: string;
  attribution?: string;
  updateFrequency?: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  configured: boolean;
  lastRunAt?: string;
  lastStatus?: string;
  lastError?: string;
  lastRecordCount?: number;
}

interface IngestionSummary {
  sourceKey: string;
  fetched: number;
  received: number;
  inserted: number;
  duplicates: number;
  invalid: number;
  marketsCreated: number;
  commoditiesCreated: number;
  rejected: Array<{ row: number; reason: string }>;
  notes: string[];
  status: string;
  error?: string;
}

export function AdminSources() {
  const [sources, setSources] = React.useState<SourceInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [summary, setSummary] = React.useState<IngestionSummary | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await apiFetch<SourceInfo[]>("/api/admin/sources");
      setSources(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runIngestion() {
    setRunning(true);
    setSummary(null);
    try {
      const result = await apiFetch<IngestionSummary>("/api/admin/ingestion/run", {
        method: "POST",
        json: { sourceKey: "agmarknet_data_gov_in" },
      });
      setSummary(result);
      toast.success(`Imported ${result.inserted} records.`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sources are the only places MandiLens accepts prices from. Each record keeps its source.
        </p>
        <Button size="sm" variant="ghost" onClick={() => void load()} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>

      {summary ? (
        <Alert variant={summary.status === "failed" ? "destructive" : "success"}>
          {summary.status === "failed" ? (
            <TriangleAlert className="size-4" />
          ) : (
            <CircleCheck className="size-4" />
          )}
          <AlertDescription>
            <p className="font-medium">
              Last run: {summary.status} — fetched {summary.fetched}, inserted {summary.inserted},{" "}
              {summary.duplicates} duplicates, {summary.invalid} invalid. {summary.marketsCreated}{" "}
              markets and {summary.commoditiesCreated} commodities created.
            </p>
            {summary.error ? <p className="mt-1">{summary.error}</p> : null}
            {summary.notes.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-xs">
                {summary.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {sources.map((source) => (
        <Card key={source.key}>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-primary" />
                  <p className="font-semibold">{source.name}</p>
                  <Badge variant="outline" className="capitalize">
                    {source.type}
                  </Badge>
                  {source.configured ? (
                    <Badge variant="success">Configured</Badge>
                  ) : (
                    <Badge variant="warning">Needs API key</Badge>
                  )}
                </div>
                {source.attribution ? (
                  <p className="text-sm text-muted-foreground">{source.attribution}</p>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {source.license ? <span>Licence: {source.license}</span> : null}
                  {source.updateFrequency ? <span>Updates: {source.updateFrequency}</span> : null}
                  {source.requiresApiKey && source.apiKeyEnvVar ? (
                    <span>Env var: {source.apiKeyEnvVar}</span>
                  ) : null}
                  {source.lastRunAt ? (
                    <span>Last run: {formatDateTime(source.lastRunAt)}</span>
                  ) : null}
                </div>
                {source.lastError ? (
                  <p className="text-xs text-destructive">{source.lastError}</p>
                ) : null}
              </div>

              {source.key === "agmarknet_data_gov_in" ? (
                <Button
                  size="sm"
                  onClick={runIngestion}
                  disabled={running || !source.configured}
                  className="gap-1.5"
                >
                  {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Run ingestion
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
