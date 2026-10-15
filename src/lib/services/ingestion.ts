import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import {
  AuditLog,
  Commodity,
  DataImportJob,
  DataSource,
  Market,
  MarketPrice,
} from "@/lib/db/models";
import { getSourceDefinition } from "@/lib/domain/sources";
import { slugify, normalizeName } from "@/lib/utils/slug";
import { inferCategory } from "@/lib/data-sources/agmarknet";
import type { NormalizedPriceRecord } from "@/lib/data-sources/types";
import { DEMO_SOURCE_KEY, type RecordType } from "@/lib/domain/constants";

export interface IngestionSummary {
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
  status: "success" | "partial" | "failed";
  error?: string;
}

export interface NormalizedInput {
  sourceKey: string;
  sourceRecordId?: string;
  state: string;
  district: string;
  marketName: string;
  sourceMarketName?: string;
  commodityName: string;
  sourceCommodityName?: string;
  variety?: string;
  grade?: string;
  unit: string;
  currency: string;
  minPrice?: number;
  maxPrice?: number;
  modalPrice?: number;
  priceDate: Date;
  recordType: RecordType;
  dedupeKey: string;
  validationStatus: "valid" | "warned" | "rejected";
  validationNotes: string[];
  isDemo?: boolean;
  importedBy?: string;
}

/**
 * Ensures a DataSource document exists for every declared source. Safe to call
 * repeatedly; used at startup, in seeds and before an import.
 */
export async function syncDataSourceRegistry(): Promise<void> {
  await connectToDatabase();
  const definitions = [
    "agmarknet_data_gov_in",
    "mandilens_demo",
    "user_input",
    "admin_csv",
  ];
  for (const key of definitions) {
    const def = getSourceDefinition(key);
    if (!def) continue;
    await DataSource.updateOne(
      { key: def.key },
      {
        $setOnInsert: {
          key: def.key,
          name: def.name,
          type: def.type,
          url: def.url,
          license: def.license,
          licenseUrl: def.licenseUrl,
          attribution: def.attribution,
          updateFrequency: def.updateFrequency,
          requiresApiKey: def.requiresApiKey,
          apiKeyEnvVar: def.apiKeyEnvVar,
          isEnabled: def.enabled,
        },
      },
      { upsert: true },
    );
  }
}

async function resolveCommodity(
  name: string,
  cache: Map<string, Types.ObjectId>,
  counters: { created: number },
  isDemo: boolean,
): Promise<Types.ObjectId> {
  const slug = slugify(name);
  const cached = cache.get(slug);
  if (cached) return cached;

  const existing = await Commodity.findOne({ slug }).select("_id").lean();
  if (existing) {
    cache.set(slug, existing._id);
    return existing._id;
  }

  const created = await Commodity.create({
    name,
    slug,
    category: inferCategory(name),
    aliases: [normalizeName(name)],
    defaultUnit: "quintal",
    isDemo,
    isActive: true,
  });
  counters.created += 1;
  cache.set(slug, created._id);
  return created._id;
}

async function resolveMarket(
  record: NormalizedInput,
  cache: Map<string, Types.ObjectId>,
  counters: { created: number },
): Promise<Types.ObjectId> {
  const slug = slugify(`${record.marketName}-${record.district}`);
  const cached = cache.get(slug);
  if (cached) return cached;

  const existing = await Market.findOne({ slug }).select("_id").lean();
  if (existing) {
    cache.set(slug, existing._id);
    return existing._id;
  }

  const created = await Market.create({
    name: record.marketName,
    slug,
    state: record.state,
    district: record.district,
    sourceIds: { [record.sourceKey]: record.sourceMarketName ?? record.marketName },
    isDemo: record.sourceKey === DEMO_SOURCE_KEY,
    isActive: true,
  });
  counters.created += 1;
  cache.set(slug, created._id);
  return created._id;
}

/**
 * Insert normalised price observations.
 *
 * Duplicates are detected with the record's `dedupeKey` (a unique index also
 * enforces this at the database level), so re-running an import is idempotent
 * and never silently overwrites an existing observation.
 */
export async function ingestRecords(records: NormalizedInput[]): Promise<IngestionSummary> {
  await connectToDatabase();
  const commodityCache = new Map<string, Types.ObjectId>();
  const marketCache = new Map<string, Types.ObjectId>();
  const counters = { created: 0 };
  const commodityCounters = { created: 0 };

  const summary: IngestionSummary = {
    sourceKey: records[0]?.sourceKey ?? "unknown",
    fetched: records.length,
    received: records.length,
    inserted: 0,
    duplicates: 0,
    invalid: 0,
    marketsCreated: 0,
    commoditiesCreated: 0,
    rejected: [],
    notes: [],
    status: "success",
  };

  if (!records.length) {
    summary.status = "partial";
    summary.notes.push("No records were supplied.");
    return summary;
  }

  const valid = records.filter((record) => record.validationStatus !== "rejected");
  summary.invalid = records.length - valid.length;

  const keys = valid.map((record) => record.dedupeKey);
  const existingKeys = new Set<string>();
  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const found = await MarketPrice.find({ dedupeKey: { $in: chunk } })
      .select("dedupeKey")
      .lean();
    for (const doc of found) existingKeys.add(doc.dedupeKey);
  }

  const seen = new Set<string>();
  for (const record of valid) {
    if (existingKeys.has(record.dedupeKey) || seen.has(record.dedupeKey)) {
      summary.duplicates += 1;
      continue;
    }
    seen.add(record.dedupeKey);

    try {
      const commodityId = await resolveCommodity(
        record.commodityName,
        commodityCache,
        commodityCounters,
        record.isDemo ?? record.sourceKey === DEMO_SOURCE_KEY,
      );
      const marketId = await resolveMarket(record, marketCache, counters);

      await MarketPrice.create({
        commodity: commodityId,
        market: marketId,
        variety: record.variety,
        grade: record.grade,
        unit: record.unit,
        currency: record.currency,
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        modalPrice: record.modalPrice,
        recordType: record.recordType,
        priceDate: record.priceDate,
        isDemo: record.isDemo ?? false,
        provenance: {
          dataSource: record.sourceKey,
          sourceRecordId: record.sourceRecordId,
          sourceCommodityName: record.sourceCommodityName ?? record.commodityName,
          sourceMarketName: record.sourceMarketName ?? record.marketName,
          sourceVariety: record.variety,
          fetchedAt: new Date(),
          validationStatus: record.validationStatus,
          validationNotes: record.validationNotes,
          importedBy: record.importedBy && Types.ObjectId.isValid(record.importedBy)
            ? new Types.ObjectId(record.importedBy)
            : undefined,
        },
        dedupeKey: record.dedupeKey,
        createdBy:
          record.importedBy && Types.ObjectId.isValid(record.importedBy)
            ? new Types.ObjectId(record.importedBy)
            : undefined,
      });
      summary.inserted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Insert failed";
      if (/duplicate key/i.test(message)) {
        summary.duplicates += 1;
      } else {
        summary.invalid += 1;
        summary.rejected.push({ row: summary.inserted + summary.invalid, reason: message });
      }
    }
  }

  summary.marketsCreated = counters.created;
  summary.commoditiesCreated = commodityCounters.created;

  await DataSource.updateOne(
    { key: summary.sourceKey },
    {
      $set: {
        lastRunAt: new Date(),
        lastStatus: summary.invalid > 0 ? "partial" : "success",
        lastRecordCount: summary.inserted,
        lastError: undefined,
      },
    },
  ).catch(() => undefined);

  return summary;
}

export interface AgmarknetRunOptions {
  state?: string;
  district?: string;
  commodity?: string;
  maxRecords?: number;
  importedBy?: string;
}

/** Fetch from the AGMARKNET adapter, normalise and ingest in one call. */
export async function runAgmarknetIngestion(
  options: AgmarknetRunOptions,
  adapterFactory: () => import("@/lib/data-sources/types").DataSourceAdapter,
): Promise<IngestionSummary> {
  await connectToDatabase();
  await syncDataSourceRegistry();

  const adapter = adapterFactory();

  try {
    const result = await adapter.fetchAndNormalize({
      state: options.state,
      district: options.district,
      commodity: options.commodity,
      maxRecords: options.maxRecords,
    });

    const mapped: NormalizedInput[] = result.records.map((record) => ({
      ...record,
      importedBy: options.importedBy,
    }));

    const summary = await ingestRecords(mapped);
    summary.fetched = result.fetchedCount;
    summary.rejected.push(
      ...result.rejected.map((row) => ({ row: row.row, reason: row.reason })),
    );
    summary.notes.push(...result.notes);
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    await DataSource.updateOne(
      { key: "agmarknet_data_gov_in" },
      { $set: { lastRunAt: new Date(), lastStatus: "failed", lastError: message } },
    ).catch(() => undefined);
    return {
      sourceKey: "agmarknet_data_gov_in",
      fetched: 0,
      received: 0,
      inserted: 0,
      duplicates: 0,
      invalid: 0,
      marketsCreated: 0,
      commoditiesCreated: 0,
      rejected: [],
      notes: [],
      status: "failed",
      error: message,
    };
  }
}

export interface CommitImportParams {
  jobId: string;
  records: NormalizedInput[];
  actorId?: string;
  actorLabel?: string;
}

/**
 * Commit a validated CSV/JSON import: ingest the records and finalise the
 * DataImportJob so the admin console can show an auditable result.
 */
export async function commitImportJob(
  params: CommitImportParams,
): Promise<IngestionSummary> {
  await connectToDatabase();
  const summary = await ingestRecords(params.records);

  await DataImportJob.updateOne(
    { _id: params.jobId },
    {
      $set: {
        status: "committed",
        importedCount: summary.inserted,
        duplicateCount: summary.duplicates,
        invalidCount: summary.invalid,
        finishedAt: new Date(),
        summary: `Inserted ${summary.inserted}, ${summary.duplicates} duplicates skipped, ${summary.invalid} invalid.`,
      },
    },
  ).catch(() => undefined);

  await AuditLog.create({
    actor: params.actorId && Types.ObjectId.isValid(params.actorId)
      ? new Types.ObjectId(params.actorId)
      : undefined,
    actorLabel: params.actorLabel ?? "admin",
    action: "data_import.committed",
    entityType: "DataImportJob",
    entityId: params.jobId,
    meta: {
      inserted: summary.inserted,
      duplicates: summary.duplicates,
      invalid: summary.invalid,
    },
  }).catch(() => undefined);

  return summary;
}

export type { NormalizedPriceRecord };
