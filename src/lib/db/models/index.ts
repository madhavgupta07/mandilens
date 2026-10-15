import mongoose, { Schema, model, type Model, type Types } from "mongoose";
const models = mongoose.models;
import {
  AGMARKNET_SOURCE_KEY,
  DEMO_SOURCE_KEY,
  INQUIRY_STATUSES,
  LISTING_STATUSES,
  LISTING_TYPES,
  RECORD_TYPES,
  USER_ROLES,
  type InquiryStatus,
  type ListingStatus,
  type ListingType,
  type RecordType,
  type UserRole,
} from "@/lib/domain/constants";

/* -------------------------------------------------------------------------- */
/*  User                                                                      */
/* -------------------------------------------------------------------------- */

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  roles: UserRole[];
  phone?: string;
  state?: string;
  district?: string;
  bio?: string;
  emailVerified: boolean;
  isActive: boolean;
  isDemo: boolean;
  lastLoginAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    passwordHash: { type: String, required: true, select: false },
    roles: {
      type: [String],
      enum: USER_ROLES,
      default: ["trader"],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "A user must have at least one role.",
      },
    },
    phone: { type: String, trim: true, maxlength: 20, select: false },
    state: { type: String, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, maxlength: 500 },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ roles: 1 });
userSchema.index({ isDemo: 1 });

export const User: Model<IUser> = models.User || model<IUser>("User", userSchema);

/* -------------------------------------------------------------------------- */
/*  Market                                                                    */
/* -------------------------------------------------------------------------- */

export interface IMarket {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  state: string;
  district: string;
  block?: string;
  marketType?: string;
  description?: string;
  sourceIds: Record<string, string>;
  isDemo: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const marketSchema = new Schema<IMarket>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, required: true, trim: true, maxlength: 80 },
    block: { type: String, trim: true, maxlength: 80 },
    marketType: { type: String, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 1000 },
    sourceIds: { type: Map, of: String, default: {} },
    isDemo: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

marketSchema.index({ state: 1, district: 1 });
marketSchema.index({ name: "text", district: "text", state: "text" });
marketSchema.index({ isDemo: 1, isActive: 1 });

export const Market: Model<IMarket> =
  models.Market || model<IMarket>("Market", marketSchema);

/* -------------------------------------------------------------------------- */
/*  Commodity                                                                 */
/* -------------------------------------------------------------------------- */

export interface ICommodity {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  hindiName?: string;
  category: string;
  aliases: string[];
  defaultUnit: string;
  description?: string;
  sourceIds: Record<string, string>;
  isDemo: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commoditySchema = new Schema<ICommodity>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true },
    hindiName: { type: String, trim: true, maxlength: 160 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    aliases: { type: [String], default: [] },
    defaultUnit: { type: String, default: "quintal" },
    description: { type: String, trim: true, maxlength: 1000 },
    sourceIds: { type: Map, of: String, default: {} },
    isDemo: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

commoditySchema.index({ category: 1 });
commoditySchema.index({ name: "text", aliases: "text" });
commoditySchema.index({ isDemo: 1, isActive: 1 });

export const Commodity: Model<ICommodity> =
  models.Commodity || model<ICommodity>("Commodity", commoditySchema);

/* -------------------------------------------------------------------------- */
/*  MarketPrice                                                               */
/* -------------------------------------------------------------------------- */

export interface IPriceProvenance {
  dataSource: string;
  sourceRecordId?: string;
  sourceCommodityName?: string;
  sourceMarketName?: string;
  sourceVariety?: string;
  fetchedAt: Date;
  validationStatus: "valid" | "warned" | "rejected";
  validationNotes?: string[];
  importedBy?: Types.ObjectId;
}

export interface IMarketPrice {
  _id: Types.ObjectId;
  commodity: Types.ObjectId;
  market: Types.ObjectId;
  variety?: string;
  grade?: string;
  unit: string;
  currency: string;
  minPrice?: number;
  maxPrice?: number;
  modalPrice?: number;
  recordType: RecordType;
  priceDate: Date;
  provenance: IPriceProvenance;
  isDemo: boolean;
  notes?: string;
  createdBy?: Types.ObjectId;
  dedupeKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const provenanceSchema = new Schema<IPriceProvenance>(
  {
    dataSource: { type: String, required: true },
    sourceRecordId: { type: String },
    sourceCommodityName: { type: String },
    sourceMarketName: { type: String },
    sourceVariety: { type: String },
    fetchedAt: { type: Date, required: true, default: () => new Date() },
    validationStatus: {
      type: String,
      enum: ["valid", "warned", "rejected"],
      default: "valid",
    },
    validationNotes: { type: [String], default: [] },
    importedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const marketPriceSchema = new Schema<IMarketPrice>(
  {
    commodity: {
      type: Schema.Types.ObjectId,
      ref: "Commodity",
      required: true,
    },
    market: { type: Schema.Types.ObjectId, ref: "Market", required: true },
    variety: { type: String, trim: true, maxlength: 120 },
    grade: { type: String, trim: true, maxlength: 80 },
    unit: { type: String, required: true, default: "quintal" },
    currency: { type: String, required: true, default: "INR" },
    minPrice: { type: Number, min: 0 },
    maxPrice: { type: Number, min: 0 },
    modalPrice: { type: Number, min: 0 },
    recordType: {
      type: String,
      enum: RECORD_TYPES,
      required: true,
      default: "reported_market_price",
    },
    priceDate: { type: Date, required: true },
    provenance: { type: provenanceSchema, required: true },
    isDemo: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    dedupeKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

marketPriceSchema.index({ commodity: 1, market: 1, priceDate: -1 });
marketPriceSchema.index({ market: 1, priceDate: -1 });
marketPriceSchema.index({ commodity: 1, priceDate: -1 });
marketPriceSchema.index({ isDemo: 1, recordType: 1, commodity: 1, market: 1 });
marketPriceSchema.index({ "provenance.dataSource": 1, priceDate: -1 });

marketPriceSchema.pre("validate", function () {
  if (
    this.modalPrice === undefined &&
    this.minPrice === undefined &&
    this.maxPrice === undefined
  ) {
    throw new Error("A price record needs at least one price value.");
  }
  if (
    this.minPrice !== undefined &&
    this.maxPrice !== undefined &&
    this.minPrice > this.maxPrice
  ) {
    throw new Error("minPrice cannot be greater than maxPrice.");
  }
});

export const MarketPrice: Model<IMarketPrice> =
  models.MarketPrice || model<IMarketPrice>("MarketPrice", marketPriceSchema);

/* -------------------------------------------------------------------------- */
/*  DataSource                                                                */
/* -------------------------------------------------------------------------- */

export interface IDataSource {
  _id: Types.ObjectId;
  key: string;
  name: string;
  type: "api" | "csv" | "json" | "manual";
  url?: string;
  license?: string;
  licenseUrl?: string;
  attribution?: string;
  updateFrequency?: string;
  isEnabled: boolean;
  config: Record<string, string>;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  lastRunAt?: Date;
  lastStatus?: "success" | "partial" | "failed" | "never";
  lastError?: string;
  lastRecordCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const dataSourceSchema = new Schema<IDataSource>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["api", "csv", "json", "manual"], required: true },
    url: { type: String },
    license: { type: String },
    licenseUrl: { type: String },
    attribution: { type: String },
    updateFrequency: { type: String },
    isEnabled: { type: Boolean, default: true },
    config: { type: Map, of: String, default: {} },
    requiresApiKey: { type: Boolean, default: false },
    apiKeyEnvVar: { type: String },
    lastRunAt: { type: Date },
    lastStatus: {
      type: String,
      enum: ["success", "partial", "failed", "never"],
      default: "never",
    },
    lastError: { type: String },
    lastRecordCount: { type: Number },
  },
  { timestamps: true },
);

export const DataSource: Model<IDataSource> =
  models.DataSource || model<IDataSource>("DataSource", dataSourceSchema);

/* -------------------------------------------------------------------------- */
/*  DataImportJob                                                             */
/* -------------------------------------------------------------------------- */

export interface IImportRowError {
  row: number;
  message: string;
}

export interface IDataImportJob {
  _id: Types.ObjectId;
  sourceKey: string;
  fileName: string;
  fileType: "csv" | "json";
  sizeBytes: number;
  status: "uploaded" | "validated" | "committed" | "failed";
  mapping: Record<string, string>;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importedCount: number;
  rowErrors: IImportRowError[];
  previewRows: Record<string, unknown>[];
  summary?: string;
  createdBy?: Types.ObjectId;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const importJobSchema = new Schema<IDataImportJob>(
  {
    sourceKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ["csv", "json"], required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["uploaded", "validated", "committed", "failed"],
      default: "uploaded",
    },
    mapping: { type: Map, of: String, default: {} },
    rowCount: { type: Number, default: 0 },
    validCount: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    rowErrors: {
      type: [
        new Schema<IImportRowError>(
          {
            row: { type: Number, required: true },
            message: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    previewRows: { type: Schema.Types.Mixed, default: [] },
    summary: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: { type: Date },
  },
  { timestamps: true },
);

importJobSchema.index({ status: 1, createdAt: -1 });
importJobSchema.index({ sourceKey: 1 });

export const DataImportJob: Model<IDataImportJob> =
  models.DataImportJob ||
  model<IDataImportJob>("DataImportJob", importJobSchema);

/* -------------------------------------------------------------------------- */
/*  Listing                                                                   */
/* -------------------------------------------------------------------------- */

export interface IListingReport {
  by: Types.ObjectId;
  reason: string;
  at: Date;
}

export interface IListing {
  _id: Types.ObjectId;
  type: ListingType;
  user: Types.ObjectId;
  commodity: Types.ObjectId;
  commodityName: string;
  quantity: number;
  unit: string;
  grade?: string;
  state: string;
  district: string;
  marketRef?: Types.ObjectId;
  pricePerUnit?: number;
  priceUnit: string;
  availabilityDate?: Date;
  expiresAt?: Date;
  description: string;
  contactPreference: "in_app" | "phone" | "email";
  contactPhone?: string;
  contactEmail?: string;
  status: ListingStatus;
  moderationStatus: "ok" | "reported" | "removed";
  reports: IListingReport[];
  isDemo: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    type: { type: String, enum: LISTING_TYPES, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    commodity: {
      type: Schema.Types.ObjectId,
      ref: "Commodity",
      required: true,
    },
    commodityName: { type: String, required: true, maxlength: 160 },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true, default: "quintal" },
    grade: { type: String, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, required: true, trim: true, maxlength: 80 },
    marketRef: { type: Schema.Types.ObjectId, ref: "Market" },
    pricePerUnit: { type: Number, min: 0 },
    priceUnit: { type: String, default: "quintal" },
    availabilityDate: { type: Date },
    expiresAt: { type: Date },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    contactPreference: {
      type: String,
      enum: ["in_app", "phone", "email"],
      default: "in_app",
    },
    contactPhone: { type: String, trim: true, maxlength: 20, select: false },
    contactEmail: { type: String, trim: true, maxlength: 200, select: false },
    status: { type: String, enum: LISTING_STATUSES, default: "active" },
    moderationStatus: {
      type: String,
      enum: ["ok", "reported", "removed"],
      default: "ok",
    },
    reports: {
      type: [
        new Schema<IListingReport>(
          {
            by: { type: Schema.Types.ObjectId, ref: "User", required: true },
            reason: { type: String, required: true, maxlength: 500 },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    isDemo: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

listingSchema.index({ type: 1, status: 1, commodity: 1, createdAt: -1 });
listingSchema.index({ "state": 1, "district": 1, status: 1 });
listingSchema.index({ user: 1, status: 1 });
listingSchema.index({ description: "text", commodityName: "text" });
listingSchema.index({ expiresAt: 1 });

export const Listing: Model<IListing> =
  models.Listing || model<IListing>("Listing", listingSchema);

/* -------------------------------------------------------------------------- */
/*  Inquiry                                                                   */
/* -------------------------------------------------------------------------- */

export interface IInquiryMessage {
  sender: Types.ObjectId;
  body: string;
  at: Date;
}

export interface IInquiry {
  _id: Types.ObjectId;
  listing: Types.ObjectId;
  from: Types.ObjectId;
  to: Types.ObjectId;
  message: string;
  quantityInterested?: number;
  offeredPricePerUnit?: number;
  status: InquiryStatus;
  messages: IInquiryMessage[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<IInquiry>(
  {
    listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    quantityInterested: { type: Number, min: 0 },
    offeredPricePerUnit: { type: Number, min: 0 },
    status: { type: String, enum: INQUIRY_STATUSES, default: "open" },
    messages: {
      type: [
        new Schema<IInquiryMessage>(
          {
            sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
            body: { type: String, required: true, maxlength: 2000 },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

inquirySchema.index({ to: 1, status: 1, createdAt: -1 });
inquirySchema.index({ from: 1, createdAt: -1 });
inquirySchema.index({ listing: 1 });

export const Inquiry: Model<IInquiry> =
  models.Inquiry || model<IInquiry>("Inquiry", inquirySchema);

/* -------------------------------------------------------------------------- */
/*  AI Conversation + Message                                                 */
/* -------------------------------------------------------------------------- */

export interface IConversation {
  _id: Types.ObjectId;
  user?: Types.ObjectId;
  sessionId?: string;
  title: string;
  provider?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String },
    title: { type: String, default: "New conversation", maxlength: 200 },
    provider: { type: String },
  },
  { timestamps: true },
);

conversationSchema.index({ user: 1, updatedAt: -1 });
conversationSchema.index({ sessionId: 1, updatedAt: -1 });

export const Conversation: Model<IConversation> =
  models.Conversation ||
  model<IConversation>("Conversation", conversationSchema);

export interface IAiMessage {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: unknown[];
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAiMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },
    content: { type: String, default: "", maxlength: 20000 },
    toolCalls: { type: [Schema.Types.Mixed], default: [] },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiMessageSchema.index({ conversation: 1, createdAt: 1 });

export const AiMessage: Model<IAiMessage> =
  models.AiMessage || model<IAiMessage>("AiMessage", aiMessageSchema);

/* -------------------------------------------------------------------------- */
/*  Watchlist                                                                 */
/* -------------------------------------------------------------------------- */

export interface IWatchlist {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  markets: Types.ObjectId[];
  commodities: Types.ObjectId[];
  districts: string[];
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const watchlistSchema = new Schema<IWatchlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    markets: [{ type: Schema.Types.ObjectId, ref: "Market" }],
    commodities: [{ type: Schema.Types.ObjectId, ref: "Commodity" }],
    districts: { type: [String], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

watchlistSchema.index({ user: 1, createdAt: -1 });

export const Watchlist: Model<IWatchlist> =
  models.Watchlist || model<IWatchlist>("Watchlist", watchlistSchema);

/* -------------------------------------------------------------------------- */
/*  SavedComparison                                                           */
/* -------------------------------------------------------------------------- */

export interface ISavedComparison {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const savedComparisonSchema = new Schema<ISavedComparison>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    input: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

savedComparisonSchema.index({ user: 1, createdAt: -1 });

export const SavedComparison: Model<ISavedComparison> =
  models.SavedComparison ||
  model<ISavedComparison>("SavedComparison", savedComparisonSchema);

/* -------------------------------------------------------------------------- */
/*  PriceAlert                                                                */
/* -------------------------------------------------------------------------- */

export interface IPriceAlert {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  commodity: Types.ObjectId;
  market?: Types.ObjectId;
  district?: string;
  metric: "modal" | "min" | "max";
  comparator: "above" | "below";
  threshold: number;
  unit: string;
  isActive: boolean;
  lastTriggeredAt?: Date;
  lastEvaluatedAt?: Date;
  lastObservedPrice?: number;
  lastObservedDate?: Date;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const priceAlertSchema = new Schema<IPriceAlert>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    commodity: {
      type: Schema.Types.ObjectId,
      ref: "Commodity",
      required: true,
    },
    market: { type: Schema.Types.ObjectId, ref: "Market" },
    district: { type: String, trim: true, maxlength: 80 },
    metric: { type: String, enum: ["modal", "min", "max"], default: "modal" },
    comparator: { type: String, enum: ["above", "below"], required: true },
    threshold: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "quintal" },
    isActive: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date },
    lastEvaluatedAt: { type: Date },
    lastObservedPrice: { type: Number },
    lastObservedDate: { type: Date },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

priceAlertSchema.index({ user: 1, isActive: 1 });
priceAlertSchema.index({ isActive: 1, commodity: 1 });

export const PriceAlert: Model<IPriceAlert> =
  models.PriceAlert || model<IPriceAlert>("PriceAlert", priceAlertSchema);

/* -------------------------------------------------------------------------- */
/*  Notification                                                              */
/* -------------------------------------------------------------------------- */

export interface INotification {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  dedupeKey?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, maxlength: 60 },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    link: { type: String, maxlength: 500 },
    isRead: { type: Boolean, default: false },
    dedupeKey: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $exists: true } } },
);

export const Notification: Model<INotification> =
  models.Notification ||
  model<INotification>("Notification", notificationSchema);

/* -------------------------------------------------------------------------- */
/*  AuditLog                                                                  */
/* -------------------------------------------------------------------------- */

export interface IAuditLog {
  _id: Types.ObjectId;
  actor?: Types.ObjectId;
  actorLabel: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorLabel: { type: String, default: "system", maxlength: 200 },
    action: { type: String, required: true, maxlength: 100 },
    entityType: { type: String, maxlength: 60 },
    entityId: { type: String, maxlength: 120 },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 400 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  models.AuditLog || model<IAuditLog>("AuditLog", auditLogSchema);

export interface IPriceAlertModel extends Model<IPriceAlert> {}
export { DEMO_SOURCE_KEY, AGMARKNET_SOURCE_KEY };
