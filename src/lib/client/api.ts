export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = "error", status = 0, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Fetch a JSON API route and unwrap the `{ success, data }` envelope. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(
      payload?.error?.message ?? `Request failed (${response.status}).`,
      payload?.error?.code ?? "error",
      response.status,
      payload?.error?.details,
    );
  }

  return payload.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
