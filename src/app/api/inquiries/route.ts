import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, created, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { createInquiry, listInquiries } from "@/lib/services/inquiries";
import { inquiryCreateSchema } from "@/lib/validation/listing";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const user = await requireUser();
  const box = request.nextUrl.searchParams.get("box") === "sent" ? "sent" : "received";
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const items = await listInquiries(user.id, { box, status });
  return ok(items);
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = inquiryCreateSchema.parse(body);
  const inquiry = await createInquiry(user.id, input);
  return created(inquiry);
});
