import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireUser, isAdmin } from "@/lib/auth/current-user";
import { getInquiryById } from "@/lib/services/inquiries";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  const inquiry = await getInquiryById(id, { id: user.id, isAdmin: isAdmin(user) });
  if (!inquiry) throw ApiError.notFound("Conversation not found.");
  return ok(inquiry);
});
