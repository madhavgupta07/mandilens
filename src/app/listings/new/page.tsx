import { PageHeader } from "@/components/domain/layout";
import { ListingForm } from "@/components/features/listing-form";

export const metadata = {
  title: "Post a listing",
  description: "Create a buy or sell listing and see explained matches with potential counterparties.",
};

export default function NewListingPage() {
  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <PageHeader
        eyebrow="Marketplace"
        title="Post a listing"
        description="Describe what you're selling or looking for. Clear details get better matches."
      />
      <ListingForm />
    </div>
  );
}
