import Link from "next/link";
import { Sprout, HeartHandshake, Code2, Mail, Server, Cpu, Database } from "lucide-react";
import { PageHeader } from "@/components/domain/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataNote } from "@/components/domain/notes";

export const metadata = {
  title: "About",
  description: "What MandiLens is, who it is for, and the open stack it is built on.",
};

const STACK = [
  { icon: Code2, label: "Next.js 16 · React 19 · TypeScript" },
  { icon: Server, label: "MongoDB + Mongoose" },
  { icon: Cpu, label: "Open-weight AI (Gemma via an OpenAI-compatible API, or local Ollama)" },
  { icon: Database, label: "AGMARKNET prices via data.gov.in" },
];

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl space-y-10 py-10">
      <PageHeader
        eyebrow="About the project"
        title="MandiLens"
        description="Open-source AI market intelligence for agricultural trading."
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Why this exists</p>
              <p className="text-sm text-muted-foreground">A side project with a real-world shape</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A small farmer or trader often has to choose which mandi to sell in with incomplete
            information. Public price data exists, but turning it into a decision — accounting for
            transport, commission and market charges — is the hard part. MandiLens makes that
            comparison explicit, keeps every number traceable to its source, and never pretends an
            estimate is a promise.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            It was built as a Week&nbsp;2 entry for the Hacktoberfest 2026 DEV Open-Source AI
            Challenge. It is intentionally open: the engine is deterministic and tested, the data
            sources are cited, and the AI layer is grounded in the same calculations you can inspect
            yourself.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Principles</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Honesty over wow.</strong> Missing data is shown as
              missing; demo data is badged; nothing is fabricated to look impressive.
            </span>
          </li>
          <li className="flex gap-2">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Traceable by default.</strong> Prices keep their
              source and reported date, and the assistant shows which tools produced its answer.
            </span>
          </li>
          <li className="flex gap-2">
            <HeartHandshake className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Open and local-friendly.</strong> You can run the AI
              fully locally with Ollama, or use a hosted open-weight model. No proprietary lock-in.
            </span>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Built with</h2>
        <div className="flex flex-wrap gap-2">
          {STACK.map((item) => (
            <Badge key={item.label} variant="outline" className="gap-1.5 py-1">
              <item.icon className="size-3.5" />
              {item.label}
            </Badge>
          ))}
        </div>
      </section>

      <DataNote>
        MandiLens is an independent, non-commercial project and is not affiliated with AGMARKNET or
        the Government of India.
      </DataNote>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/data" className="text-primary underline">
          Data sources & licences
        </Link>
        <Link href="/methodology" className="text-primary underline">
          Methodology
        </Link>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Mail className="size-4" /> Feedback via the project repository issues
        </span>
      </div>
    </div>
  );
}
