import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { listUserListings } from "@/lib/services/listings";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireUser();
  const items = await listUserListings(user.id);
  return ok(items);
});
