import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  return ok({ user });
});
