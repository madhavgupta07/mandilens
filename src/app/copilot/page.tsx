import { PageHeader } from "@/components/domain/layout";
import { AiCopilot } from "@/components/features/ai-copilot";

export const metadata = {
  title: "AI Copilot",
  description:
    "Ask plain-language questions about crop prices. The assistant answers only from validated data tools and never invents numbers.",
};

export default async function CopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        eyebrow="Assistant"
        title="Ask the MandiLens Copilot"
        description="A grounded assistant: it fetches prices through validated tools, runs the deterministic calculation engine, and explains the result — or tells you what is missing."
      />
      <AiCopilot initialQuestion={params.q} />
    </div>
  );
}
