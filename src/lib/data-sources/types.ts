import type { RecordType } from "@/lib/domain/constants";

/**
 * A single normalised observation produced by any data-source adapter.
 * `sourceCommodityName` / `sourceMarketName` keep the provider's original
 * identifiers so nothing is lost during normalisation.
 */
export interface NormalizedPriceRecord {
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
  /** Date *reported by the source* (not the retrieval time). */
  priceDate: Date;
  recordType: RecordType;
  dedupeKey: string;
  validationStatus: "valid" | "warned" | "rejected";
  validationNotes: string[];
}

export interface AdapterFetchOptions {
  state?: string;
  district?: string;
  commodity?: string;
  maxRecords?: number;
  signal?: AbortSignal;
}

export interface AdapterResult {
  records: NormalizedPriceRecord[];
  rejected: Array<{ row: number; reason: string; raw: unknown }>;
  fetchedCount: number;
  sourceKey: string;
  fetchedAt: Date;
  notes: string[];
}

export interface DataSourceAdapter {
  key: string;
  name: string;
  requiresApiKey: boolean;
  isConfigured(env?: NodeJS.ProcessEnv): boolean;
  fetchAndNormalize(options: AdapterFetchOptions): Promise<AdapterResult>;
}
