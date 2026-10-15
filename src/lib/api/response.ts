import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "bad_request", message, details);
  }
  static unauthorized(message = "Authentication required.") {
    return new ApiError(401, "unauthorized", message);
  }
  static forbidden(message = "You do not have access to this resource.") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, "not_found", message);
  }
  static conflict(message: string) {
    return new ApiError(409, "conflict", message);
  }
  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, "unprocessable_entity", message, details);
  }
  static tooMany(message = "Too many requests. Please slow down.") {
    return new ApiError(429, "rate_limited", message);
  }
  static unavailable(message: string) {
    return new ApiError(503, "service_unavailable", message);
  }
}

export function ok<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, data, ...(meta ? { meta } : {}) },
    init,
  );
}

export function created<T>(data: T, meta?: Record<string, unknown>) {
  return ok(data, meta, { status: 201 });
}

/**
 * Convert any thrown value into a safe API response. Internal error details and
 * stack traces are logged server-side but never returned to the client.
 */
export function toErrorResponse(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ApiError) {
    return NextResponse.json<ApiFailure>(
      {
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json<ApiFailure>(
      {
        success: false,
        error: {
          code: "validation_error",
          message: "The submitted data is invalid.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  if (/MONGODB_URI is not set/i.test(message)) {
    return NextResponse.json<ApiFailure>(
      {
        success: false,
        error: {
          code: "database_not_configured",
          message:
            "The database is not configured. Set MONGODB_URI in .env.local (see README).",
        },
      },
      { status: 503 },
    );
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        code: "internal_error",
        message: "Something went wrong while processing the request.",
      },
    },
    { status: 500 },
  );
}

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): Pagination {
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const rawLimit = Number.parseInt(
    searchParams.get("limit") ?? String(defaultLimit),
    10,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(total: number, pagination: Pagination) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
  };
}
