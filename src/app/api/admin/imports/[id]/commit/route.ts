import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { DataImportJob } from "@/lib/db/models";
import { ingestRecords, syncDataSourceRegistry, type NormalizedInput } from "@/lib/services/ingestion";
import { recordAudit } from "@/lib/services/audit";

export const maxDuration = 60;

export const POST = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;

    await connectToDatabase();
    const job = await DataImportJob.findById(id);
    if (!job) throw ApiError.notFound("Import job not found.");
    if (job.status === "committed") {
      throw ApiError.conflict("This import has already been committed.");
    }

    const records = (job.previewRows ?? []) as unknown as NormalizedInput[];
    if (!records.length) {
      throw ApiError.unprocessable("This import has no staged records to commit.");
    }

    await syncDataSourceRegistry();
    const summary = await ingestRecords(records);

    job.status = "committed";
    job.importedCount = summary.inserted;
    job.duplicateCount = summary.duplicates;
    job.invalidCount = summary.invalid;
    job.finishedAt = new Date();
    job.summary = `Inserted ${summary.inserted}, ${summary.duplicates} duplicates skipped, ${summary.invalid} invalid.`;
    // Free the staged records once committed.
    job.previewRows = [];
    await job.save();

    await recordAudit({
      actor: admin,
      action: "data_import.committed",
      entityType: "DataImportJob",
      entityId: id,
      meta: {
        inserted: summary.inserted,
        duplicates: summary.duplicates,
        invalid: summary.invalid,
        marketsCreated: summary.marketsCreated,
        commoditiesCreated: summary.commoditiesCreated,
      },
      request,
    });

    return ok(summary);
  },
);
