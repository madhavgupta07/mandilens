import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { replyToInquiry } from "@/lib/services/inquiries";
import { inquiryReplySchema } from "@/lib/validation/listing";

export const POST = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const { body: messageBody, status } = inquiryReplySchema.parse(body);
    const inquiry = await replyToInquiry(user.id, id, messageBody, status);
    return ok(inquiry);
  },
);
