import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, created, parsePagination, paginationMeta, ApiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { DataImportJob } from "@/lib/db/models";
import { parseUploadedFile, inferMapping, mapRowsToRecords } from "@/lib/data-sources/importer";
import { recordAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 5000;

interface UploadPayload {
  fileName: string;
  fileType: "csv" | "json";
  text: string;
  mapping?: Record<string, string>;
  sourceKey: string;
  isDemo?: boolean;
}

async function readUpload(request: NextRequest): Promise<UploadPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw ApiError.badRequest("Attach a CSV or JSON file as the `file` field.");
    }
    const name = file.name || "upload";
    const fileType = name.toLowerCase().endsWith(".json") ? "json" : "csv";
    const mappingRaw = form.get("mapping");
    return {
      fileName: name,
      fileType,
      text: await file.text(),
      mapping: mappingRaw ? JSON.parse(String(mappingRaw)) : undefined,
      sourceKey: String(form.get("sourceKey") ?? "admin_csv"),
      isDemo: String(form.get("isDemo") ?? "false") === "true",
    };
  }

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Send JSON with { fileName, fileType, text } or a multipart file.");
  });
  if (typeof body.text !== "string") {
    throw ApiError.badRequest("Field `text` (the file contents) is required.");
  }
  return {
    fileName: String(body.fileName ?? "upload.csv"),
    fileType: body.fileType === "json" ? "json" : "csv",
    text: body.text,
    mapping: body.mapping,
    sourceKey: String(body.sourceKey ?? "admin_csv"),
    isDemo: Boolean(body.isDemo),
  };
}

export const GET = withApi(async (request: NextRequest) => {
  await requireAdmin();
  await connectToDatabase();
  const pagination = parsePagination(request.nextUrl.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    DataImportJob.find()
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    DataImportJob.countDocuments(),
  ]);

  return ok(
    items.map((job) => ({
      id: String(job._id),
      sourceKey: job.sourceKey,
      fileName: job.fileName,
      fileType: job.fileType,
      status: job.status,
      rowCount: job.rowCount,
      validCount: job.validCount,
      invalidCount: job.invalidCount,
      importedCount: job.importedCount,
      duplicateCount: job.duplicateCount,
      summary: job.summary,
      createdAt: job.createdAt,
    })),
    { pagination: paginationMeta(total, pagination) },
  );
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();

  const upload = await readUpload(request);
  if (upload.text.length > 15 * 1024 * 1024) {
    throw ApiError.badRequest("File is larger than 15 MB. Split it into smaller files.");
  }

  const parsed = parseUploadedFile(upload.text, upload.fileType);
  if (parsed.rows.length === 0) {
    throw ApiError.unprocessable("No data rows were found in the uploaded file.");
  }
  if (parsed.rows.length > MAX_ROWS) {
    throw ApiError.unprocessable(
      `This file has ${parsed.rows.length} rows; the limit per import is ${MAX_ROWS}. Split the file.`,
    );
  }

  const mapping = { ...inferMapping(parsed.headers), ...(upload.mapping ?? {}) };
  const { records, errors, previewRows } = mapRowsToRecords(parsed.rows, mapping, {
    sourceKey: upload.sourceKey,
    isDemo: upload.isDemo,
    importedBy: admin.id,
  });

  await connectToDatabase();
  const job = await DataImportJob.create({
    sourceKey: upload.sourceKey,
    fileName: upload.fileName,
    fileType: upload.fileType,
    sizeBytes: upload.text.length,
    status: "validated",
    mapping,
    rowCount: parsed.rows.length,
    validCount: records.length,
    invalidCount: errors.length,
    rowErrors: errors.slice(0, 100),
    // Staged records are held here until the admin commits the import.
    previewRows: records as unknown as Record<string, unknown>[],
    createdBy: admin.id,
  });

  await recordAudit({
    actor: admin,
    action: "data_import.validated",
    entityType: "DataImportJob",
    entityId: String(job._id),
    meta: { fileName: upload.fileName, valid: records.length, invalid: errors.length },
    request,
  });

  return created(
    {
      jobId: String(job._id),
      headers: parsed.headers,
      mapping,
      rowCount: parsed.rows.length,
      validCount: records.length,
      invalidCount: errors.length,
      errors: errors.slice(0, 50),
      previewRows: previewRows.slice(0, 20),
    },
    { hint: "Review the preview, then POST to /api/admin/imports/{jobId}/commit to import." },
  );
});
