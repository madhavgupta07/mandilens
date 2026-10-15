import { ListingDetail } from "@/components/features/listing-detail";
import { getListingById } from "@/lib/services/listings";
import { getCurrentUser, isAdmin } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const viewer = await getCurrentUser();
    const listing = await getListingById(
      id,
      viewer ? { id: viewer.id, isAdmin: isAdmin(viewer) } : null,
    );
    if (!listing) return { title: "Listing not found" };
    const name = String((listing as Record<string, unknown>).commodityName ?? "Listing");
    return {
      title: `${name} — listing`,
      description: `Trading listing for ${name}.`,
    };
  } catch {
    return { title: "Listing" };
  }
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container-page py-10">
      <ListingDetail id={id} />
    </div>
  );
}
