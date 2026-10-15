"use client";

import * as React from "react";
import { Upload, Loader2, FileSpreadsheet, CircleCheck, TriangleAlert, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataNote } from "@/components/domain/notes";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/utils/dates";

interface ParsedPreview {
  jobId: string;
  headers: string[];
  mapping: Record<string, string>;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  errors: Array<{ row: number; message: string }>;
  previewRows: Array<Record<string, unknown>>;
}

interface ImportJob {
  id: string;
  sourceKey: string;
  fileName: string;
  fileType: string;
  status: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  importedCount: number;
  duplicateCount: number;
  summary?: string;
  createdAt: string;
}

interface CommitSummary {
  inserted: number;
  duplicates: number;
  invalid: number;
  marketsCreated: number;
  commoditiesCreated: number;
}

export function AdminImports() {
  const [sourceKey, setSourceKey] = React.useState("admin_csv");
  const [isDemo, setIsDemo] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<ParsedPreview | null>(null);
  const [committing, setCommitting] = React.useState(false);
  const [jobs, setJobs] = React.useState<ImportJob[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadJobs = React.useCallback(async () => {
    try {
      const data = await apiFetch<ImportJob[]>("/api/admin/imports");
      setJobs(data);
    } catch {
      setJobs([]);
    }
  }, []);

  React.useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a CSV or JSON file.");
      return;
    }
    setUploading(true);
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceKey", sourceKey);
      formData.append("isDemo", String(isDemo));
      const result = await apiFetch<ParsedPreview>("/api/admin/imports", {
        method: "POST",
        body: formData,
      });
      setPreview(result);
      toast.success(`Validated ${result.validCount} rows. Review then commit.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setCommitting(true);
    try {
      const summary = await apiFetch<CommitSummary>(`/api/admin/imports/${preview.jobId}/commit`, {
        method: "POST",
      });
      toast.success(
        `Committed: ${summary.inserted} inserted, ${summary.duplicates} duplicates, ${summary.invalid} invalid.`,
      );
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadJobs();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCommitting(false);
    }
  }

  const previewColumns = preview
    ? ["state", "district", "market", "commodity", "variety", "date", "min", "max", "modal"]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            <h2 className="font-semibold">Import a file</h2>
          </div>
          <DataNote>
            CSV or JSON up to 5,000 rows / 15&nbsp;MB. Columns are inferred from the header; you can
            adjust the mapping by editing the header names. Nothing is written until you confirm the
            preview.
          </DataNote>
          <form onSubmit={upload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="import-file">File</Label>
                <Input id="import-file" type="file" accept=".csv,.json,text/csv,application/json" ref={fileRef} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="import-source">Source key</Label>
                <Input
                  id="import-source"
                  value={sourceKey}
                  onChange={(event) => setSourceKey(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="import-demo" checked={isDemo} onCheckedChange={setIsDemo} />
              <Label htmlFor="import-demo" className="text-sm">
                Mark these records as DEMO data
              </Label>
            </div>
            <Button type="submit" disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              Validate file
            </Button>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Preview</h2>
                <Badge variant="success">{preview.validCount} valid</Badge>
                {preview.invalidCount > 0 ? (
                  <Badge variant="destructive">{preview.invalidCount} invalid</Badge>
                ) : null}
                <Badge variant="outline">{preview.rowCount} rows</Badge>
              </div>
              <Button onClick={commit} disabled={committing} className="gap-1.5">
                {committing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Commit import
              </Button>
            </div>

            {isDemo ? (
              <Alert variant="warning">
                <TriangleAlert className="size-4" />
                <AlertDescription>
                  These records will be stored as demo data and badged DEMO DATA everywhere. They will
                  never be mixed with real prices.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {previewColumns.map((column) => (
                      <th key={column} className="px-3 py-2 text-left whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.slice(0, 20).map((row, index) => (
                    <tr key={index} className="border-t border-border">
                      {previewColumns.map((column) => (
                        <td key={column} className="px-3 py-1.5 whitespace-nowrap">
                          {String(row[column] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.errors.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Row errors (first {preview.errors.length})
                </p>
                <ul className="space-y-0.5 text-xs text-destructive">
                  {preview.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-semibold">Recent import jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Rows</th>
                    <th className="px-3 py-2 text-right">Inserted</th>
                    <th className="px-3 py-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-t border-border">
                      <td className="px-3 py-2">{job.fileName}</td>
                      <td className="px-3 py-2">{job.sourceKey}</td>
                      <td className="px-3 py-2 capitalize">{job.status}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{job.rowCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{job.importedCount}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatDateTime(job.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
