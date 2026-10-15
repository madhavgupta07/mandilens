import type { NextRequest } from "next/server";
import { ApiError, toErrorResponse } from "./response";

type Handler<C = unknown> = (
  request: NextRequest,
  context: C,
) => Promise<Response> | Response;

/**
 * Wraps a route handler so that every thrown error becomes a consistent,
 * non-leaking JSON error response.
 */
export function withApi<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/**
 * Basic same-origin check for state-changing requests (defence in depth on top
 * of SameSite=Lax session cookies). Rejects cross-site form posts.
 */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser or same-origin fetch without Origin
  const host = request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      throw ApiError.forbidden("Cross-site request blocked.");
    }
  } catch {
    throw ApiError.forbidden("Cross-site request blocked.");
  }
}
