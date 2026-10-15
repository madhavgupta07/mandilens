import Link from "next/link";
import {
  ArrowRight,
  Scale,
  Sparkles,
  Store,
  BellRing,
  DatabaseZap,
  ShieldCheck,
  LineChart,
  MapPinned,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QuickCompareForm } from "@/components/features/quick-compare-form";
import { DataNote } from "@/components/domain/notes";

const FEATURES = [
  {
    icon: Scale,
    title: "Compare by net proceeds, not just price",
    body: "A higher mandi price can still leave you worse off once transport, loading, market charges and commission are subtracted. MandiLens ranks every market by what you actually keep.",
    href: "/compare",
    cta: "Open the compare workbench",
  },
  {
    icon: Sparkles,
    title: "An AI Copilot that only uses real data",
    body: "Ask a plain-language question. The assistant must call a validated tool to fetch prices, run the deterministic calculation engine, and then explain the result — it never invents numbers.",
    href: "/copilot",
    cta: "Try the Copilot",
  },
  {
    icon: Store,
    title: "A marketplace with explained matches",
    body: "Post a buy or sell listing, then see potential counterparties ranked with the reasons why they match — quantity fit, distance and price — presented as leads to investigate.",
    href: "/listings",
    cta: "Browse the marketplace",
  },
  {
    icon: BellRing,
    title: "Alerts that never cry wolf",
    body: "Set target prices and get notified only when a new observation actually crosses your threshold. Missing data is reported as missing — never read as a price crash.",
    href: "/alerts",
    cta: "Set a price alert",
  },
];

const STEPS = [
  {
    icon: MapPinned,
    title: "Pick a commodity and your quantity",
    body: "Choose what you are selling, how much, and the markets you are considering. Add the costs you expect to pay.",
  },
  {
    icon: LineChart,
    title: "We do the arithmetic, precisely",
    body: "Prices are converted to a common unit and every expense is computed with exact decimal maths — no floating-point surprises.",
  },
  {
    icon: ShieldCheck,
    title: "You see the sources and the gaps",
    body: "Every figure shows its source, its observation date and how fresh it is, plus what is missing before you decide.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="surface-grid border-b border-border">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="space-y-6">
            <Badge className="w-fit">Open source · Open data · Open models</Badge>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Find the market that puts more money in your pocket.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              MandiLens compares crop prices across markets and subtracts the real cost of getting
              there — so you can see which mandi actually pays best, with the data and the maths
              shown openly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/compare" className="gap-2">
                  Compare markets <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/copilot">Ask the AI Copilot</Link>
              </Button>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-4 pt-2">
              {[
                { label: "Money maths", value: "Decimal-exact" },
                { label: "Every figure", value: "Sourced & dated" },
                { label: "Demo data", value: "Always labelled" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Card className="shadow-md">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">See your best market in seconds</h2>
                <p className="text-sm text-muted-foreground">
                  Start with a commodity, quantity and unit. You can refine the costs afterwards.
                </p>
              </div>
              <QuickCompareForm />
              <DataNote>
                Results depend on the data that has been imported. If no prices exist yet, MandiLens
                says so plainly and shows how to add data — it never guesses.
              </DataNote>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Why this exists
          </p>
          <h2 className="text-3xl font-bold tracking-tight">
            Published prices hide the cost of reaching them
          </h2>
          <p className="text-muted-foreground">
            A mandi quoting ₹2,240 a quintal twenty kilometres away can beat one quoting ₹2,320 an
            hour away. Most price feeds stop at the quote. MandiLens finishes the calculation — and
            shows its working.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="flex-1 text-sm text-muted-foreground">{feature.body}</p>
                <Link
                  href={feature.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {feature.cta} <ArrowRight className="size-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="container-page py-16">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              How it works
            </p>
            <h2 className="text-3xl font-bold tracking-tight">Transparent from query to figure</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <step.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-8 p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="space-y-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-accent-muted text-accent">
                <DatabaseZap className="size-5" />
              </span>
              <h2 className="text-2xl font-bold tracking-tight">
                Honest by design about where numbers come from
              </h2>
              <p className="text-sm text-muted-foreground">
                Market data is messy. MandiLens keeps every observation tied to its source, its
                reported date and its type, and refuses to blend demo data with real prices.
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link href="/data" className="gap-2">
                  See data sources &amp; licences <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Each price carries its source, the date the market reported it, and when it was imported.",
                "Demo records are badged DEMO DATA everywhere and are never silently merged with real prices.",
                "Stale or missing data is labelled — never presented as a live quote or as a market closure.",
                "Every calculation shows its assumptions, warnings and the information it is missing.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="container-page pb-20">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Run it locally, plug in a data source, and sell smarter.
          </h2>
          <p className="max-w-xl text-sm text-primary-foreground/80">
            MandiLens is MIT-licensed. Bring your own MongoDB and an open-weight model, or run it
            fully offline in deterministic mode.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">Create an account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/methodology">Read the methodology</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
