import Link from "next/link";
import { Calculator, Scale, Ruler, Percent, Clock, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/domain/layout";
import { Card, CardContent } from "@/components/ui/card";
import { DataNote } from "@/components/domain/notes";

export const metadata = {
  title: "Methodology",
  description:
    "How MandiLens turns mandi prices and your expenses into an estimated net proceeds comparison.",
};

const STEPS = [
  {
    icon: Ruler,
    title: "1. Normalise units",
    body: "Quantities and prices are converted to a common base unit (kilograms) using fixed factors — 1 quintal = 100 kg, 1 tonne = 1,000 kg. Your quantity is converted into each market's price unit before any money is calculated, so you are never comparing quintals to tonnes.",
  },
  {
    icon: Calculator,
    title: "2. Compute gross sale value",
    body: "Gross sale value = quantity (in the market's price unit) × the recorded price per unit. Prices that are missing or not usable for the commodity are marked unusable and excluded from ranking rather than treated as zero.",
  },
  {
    icon: Percent,
    title: "3. Subtract your expenses",
    body: "We subtract transportation, loading, unloading, market charges/cess, commission/arhat (entered as a flat amount or as a percentage of gross value) and other selling costs. Estimated net proceeds = gross sale value − total estimated expenses.",
  },
  {
    icon: Scale,
    title: "4. Rank the options",
    body: "Usable markets are ranked by estimated net proceeds (highest first). The difference from the best option is shown for each market, along with a runner-up figure so you can see how close the decision is.",
  },
  {
    icon: Clock,
    title: "5. Attach freshness",
    body: "Every price carries the date the market reported it. Freshness is derived from that reported date — never from when we imported it — and shown on each result so you know how current the comparison is.",
  },
  {
    icon: Sparkles,
    title: "6. Explain with AI (never calculate)",
    body: "The AI Copilot can describe, summarise and explain the numbers. It cannot invent them: it must call the same deterministic engine you see here, and every answer shows which tools it used and flags anything it could not ground in data.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="container-page max-w-4xl space-y-10 py-10">
      <PageHeader
        eyebrow="How it works"
        title="Methodology"
        description="MandiLens is a decision aid, not a price oracle. Here is exactly what it does with your numbers."
      />

      <DataNote>
        The core calculation is deterministic and testable. The same inputs always produce the same
        output, and the assistant is never allowed to override it.
      </DataNote>

      <section className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardContent className="space-y-2 p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <step.icon className="size-4" />
              </span>
              <p className="font-semibold">{step.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What the estimate excludes</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Quality/grading premiums or discounts that a specific buyer may apply.</li>
          <li>Time-sensitive price movement between the reported date and your actual sale.</li>
          <li>Weighment disputes, moisture loss, and spoilage.</li>
          <li>Taxes or levies you did not enter as an expense.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Because of this, the result should always be treated as an estimate to compare options —
          never as a guaranteed payout.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Worked example</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Step</th>
                <th className="px-4 py-2 text-left">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2">Quantity</td>
                <td className="px-4 py-2">20 quintal = 2,000 kg</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Recorded price</td>
                <td className="px-4 py-2">₹2,100 / quintal</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Gross sale value</td>
                <td className="px-4 py-2">20 × ₹2,100 = ₹42,000</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Transport + loading</td>
                <td className="px-4 py-2">₹1,200</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Market charges + commission (5%)</td>
                <td className="px-4 py-2">₹400 + ₹2,100 = ₹2,500</td>
              </tr>
              <tr className="font-medium">
                <td className="px-4 py-2">Estimated net proceeds</td>
                <td className="px-4 py-2">₹42,000 − ₹3,700 = ₹38,300</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Link href="/data" className="inline-flex items-center gap-2 text-sm text-primary underline">
          <TriangleAlert className="size-4" /> See where the prices come from
        </Link>
        <Link href="/compare" className="text-sm text-primary underline">
          Try a comparison
        </Link>
      </div>
    </div>
  );
}
