import Link from "next/link";
import { Sprout, Code, ExternalLink } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="size-4" />
            </span>
            MandiLens
          </div>
          <p className="text-sm text-muted-foreground">
            Open-source, AI-assisted market intelligence for farmers, traders and buyers.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">Product</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/compare">Compare markets</Link></li>
            <li><Link className="hover:text-foreground" href="/commodities">Commodity explorer</Link></li>
            <li><Link className="hover:text-foreground" href="/listings">Marketplace</Link></li>
            <li><Link className="hover:text-foreground" href="/copilot">AI Copilot</Link></li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">Trust & transparency</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/data">Data sources & licences</Link></li>
            <li><Link className="hover:text-foreground" href="/methodology">How the estimate works</Link></li>
            <li><Link className="hover:text-foreground" href="/legal/privacy">Privacy</Link></li>
            <li><Link className="hover:text-foreground" href="/legal/terms">Terms</Link></li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">Project</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link className="inline-flex items-center gap-1 hover:text-foreground" href="/about">
                About MandiLens
              </Link>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-1 hover:text-foreground"
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Code className="size-3.5" /> Source code
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-1 hover:text-foreground"
                href="https://data.gov.in"
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="size-3.5" /> AGMARKNET via data.gov.in
              </a>
            </li>
            <li>MIT licensed</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page space-y-2 py-6 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Attribution:</strong> Source: AGMARKNET,
            Directorate of Marketing &amp; Inspection, via data.gov.in — distributed under the
            Government Open Data License - India. Demo records are illustrative and are never mixed
            with real prices.
          </p>
          <p>
            MandiLens provides estimates, not advice. It is not a guarantee of any price or profit.
            Verify prices with your local market or buyer before committing to a sale.
          </p>
          <p>Built for Hacktoberfest 2026 · DEV Open-Source AI Challenge, Week 2.</p>
        </div>
      </div>
    </footer>
  );
}
