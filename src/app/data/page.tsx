import Link from "next/link";
import {
  Database,
  ShieldCheck,
  FlaskConical,
  Scale,
  Clock,
  TriangleAlert,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/domain/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataNote } from "@/components/domain/notes";
import { SOURCE_DEFINITIONS } from "@/lib/domain/sources";

export const metadata = {
  title: "Data sources & licences",
  description:
    "Where MandiLens data comes from, how it is licensed, and how demo data is kept separate from real prices.",
};

const GUARANTEES = [
  {
    icon: Database,
    title: "Every record keeps its source",
    body: "Each price stores which source produced it and its source record id, so any figure can be traced back.",
  },
  {
    icon: Clock,
    title: "Reported date ≠ import date",
    body: "We keep the date the market reported a price separate from when MandiLens retrieved it, and show both.",
  },
  {
    icon: FlaskConical,
    title: "Demo data is never disguised",
    body: "Illustrative records are flagged and badged DEMO DATA everywhere, and excluded whenever you filter to real data.",
  },
  {
    icon: TriangleAlert,
    title: "Missing is reported as missing",
    body: "An empty result means “nothing has been imported”, not “the market is closed” or “the price crashed”.",
  },
];

export default function DataPage() {
  return (
    <div className="container-page max-w-4xl space-y-10 py-10">
      <PageHeader
        eyebrow="Trust & transparency"
        title="Data sources & licences"
        description="MandiLens only displays prices from sources it is permitted to use, and it keeps each observation tied to its origin."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Registered sources</h2>
        <div className="grid gap-4">
          {SOURCE_DEFINITIONS.map((source) => (
            <Card key={source.key}>
              <CardContent className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{source.name}</p>
                  <Badge variant="outline" className="capitalize">
                    {source.type}
                  </Badge>
                  {source.requiresApiKey ? (
                    <Badge variant="warning">Requires API key</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{source.attribution}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {source.license ? (
                    <span>
                      Licence:{" "}
                      {source.licenseUrl ? (
                        <a
                          href={source.licenseUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline"
                        >
                          {source.license}
                        </a>
                      ) : (
                        source.license
                      )}
                    </span>
                  ) : null}
                  {source.updateFrequency ? <span>Updates: {source.updateFrequency}</span> : null}
                  {source.apiKeyEnvVar ? (
                    <span className="font-mono">{source.apiKeyEnvVar}</span>
                  ) : null}
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 underline"
                    >
                      Endpoint <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">What we guarantee</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {GUARANTEES.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <item.icon className="size-4" />
              </span>
              <p className="mt-3 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">AGMARKNET licence & attribution</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          AGMARKNET price data is published by the Directorate of Marketing &amp; Inspection
          (Department of Agriculture, Cooperation &amp; Farmers Welfare) and redistributed through the
          Open Government Data (OGD) Platform India. It is made available under the{" "}
          <a
            href="https://data.gov.in/government-open-data-license-india"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Government Open Data License - India
          </a>
          , which requires attribution. MandiLens credits the source on every page that shows these
          prices and never hides that attribution behind a filter.
        </p>
        <DataNote>
          MandiLens is an independent project. It is not affiliated with or endorsed by AGMARKNET,
          the Directorate of Marketing &amp; Inspection, or the Government of India.
        </DataNote>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Corrections & takedowns</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you believe a figure is wrong or a source has been used inappropriately,{" "}
          <Link href="/about" className="underline">
            contact the maintainers
          </Link>
          . We would rather show less data than show misleading data.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <Link href="/methodology" className="underline">
            Read how the estimate is calculated
          </Link>
          <Scale className="ml-2 size-4 text-primary" />
          <Link href="/legal/privacy" className="underline">
            Privacy policy
          </Link>
        </div>
      </section>
    </div>
  );
}
