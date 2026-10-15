# MandiLens

MandiLens is an open-source AI-powered agricultural market intelligence application that helps farmers, traders and buyers compare mandi prices, estimate net proceeds, discover counterparties, and act with confidence. It is built for the Hacktoberfest 2026 DEV Open-Source AI Challenge Week 2 ("Side Hustle").

## Why MandiLens

- **Deterministic decision engine** — Net proceeds are computed purely by arithmetic (gross − your expenses, with correct unit conversion). The engine is testable and the AI never overwrites its numbers.
- **Source-traceable** — Every price stores its source and source-reported date. Demo data is never disguised and is badged everywhere.
- **Grounded AI Copilot** — A deterministic-first assistant that calls tools (search, prices, comparisons, listings, freshness) to answer questions. If no real data is available, it says so. It never claims model authorship when running in deterministic mode.
- **Listings marketplace** — Post buy/sell offers, send inquiries, and discover plausible matches with scoring and reasons.
- **Admin console** — Manage sources, run ingestion, import CSV/JSON, moderate listings, and audit actions.
- **Open-weight friendly** — Pluggable AI providers (Ollama, OpenAI-compatible), so you can run fully local or use an open-weight hosted model.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [lucide-react](https://lucide.dev/) + [sonner](https://sonner.emilkowal.ski/)
- [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/)
- [Zod](https://zod.dev/) for validation, [Decimal.js](https://mikemcl.github.io/decimal.js/) for money, [Papaparse](https://www.papaparse.com/) for CSV
- [vitest](https://vitest.dev/) + [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) for tests

## Getting Started

### Prerequisites

- Node.js 20.9.0+ (Node 24.14.0 used in development)
- pnpm 11.9.0+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Setup

1. Clone the repository.
2. Copy `.env.example` to `.env.local` and configure the required values (especially `MONGODB_URI`, `AUTH_SECRET`).
3. Install dependencies:

```bash
pnpm install
```

4. (Optional) Seed demo data for a quick walkthrough:

```bash
pnpm seed:demo
```

5. Run the development server:

```bash
pnpm dev
```

Open http://localhost:3000.

## Environment Variables

Key variables (see `.env.example` for the full list):

- `MONGODB_URI` — MongoDB connection string (required)
- `AUTH_SECRET` — Secret for signing sessions (required in production)
- `APP_URL` — Public app URL
- `AI_PROVIDER` — `openai_compatible` | `ollama` | `deterministic` (default `deterministic`)
- `OPEN_MODEL_BASE_URL`, `OPEN_MODEL_API_KEY`, `OPEN_MODEL_MODEL` — for OpenAI-compatible APIs (e.g. Google AI Studio, Cerebras, Together)
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL` — for local Ollama
- `AGRICULTURAL_DATA_API_KEY` — API key for AGMARKNET via data.gov.in (to run ingestion)

## Useful Scripts

- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm start` — Start production server
- `pnpm lint` — Lint the codebase
- `pnpm typecheck` — Type-check with TypeScript
- `pnpm test` — Run all tests
- `pnpm test:watch` — Run tests in watch mode
- `pnpm seed:demo` — Load deterministic demo dataset (8 Bihar APMCs × 8 commodities × 45 days)
- `pnpm seed:agmarknet` — Fetch from AGMARKNET (requires API key and MongoDB)
- `pnpm admin:create` — Create an administrator account
- `pnpm db:dev` — Create a temporary local MongoDB instance
- `pnpm import:csv` — Import a CSV via CLI

## Data & Provenance

- AGMARKNET price data is redistributed via the Open Government Data (OGD) Platform India under the **Government Open Data License - India**. Attribution: "Source: AGMARKNET, Directorate of Marketing & Inspection, via data.gov.in".
- Every `MarketPrice` stores `provenance.dataSource`, `provenance.fetchedAt`, `sourceMarketName`, `sourceCommodityName`, `priceDate` (source-reported), `recordType`, `isDemo`, `dedupeKey` and validation notes.
- Demo records are marked `isDemo=true` and are **never** mixed silently with real prices. They are explicitly badged as DEMO DATA across the UI.
- The opportunity engine operates on reported price dates (`getFreshness`), not retrieval times. Empty result sets are reported as "missing", not "market closed".

## AI Grounding

- Deterministic mode (`AI_PROVIDER=deterministic`) uses rule-based NLU, real DB tools, and the same `buildComparison` engine. Each answer includes a provenance banner and a tool trace.
- The assistant may only answer based on tool outputs; it does not fabricate prices, net proceeds, or listing counts.
- AI API calls are disabled by default. Tests verify grounding, determinism, and absence of hallucinated data.

## Testing

Unit, integration and reliability tests:

```bash
pnpm test
```

Coverage areas: unit conversions, dates/freshness, opportunity engine (ranking, expenses, unusability), NLU intent/entity extraction, importer mapping/dedupe, ingestion idempotency, listings/inquiries services, deterministic AI grounding.

## Deployment

`render.yaml` is included for [Render](https://render.com/). Requires setting `MONGODB_URI`, `AUTH_SECRET`, `APP_URL`, AI provider keys and `AGRICULTURAL_DATA_API_KEY` as environment variables.

## License

MIT — see [LICENSE](./LICENSE).

## Attribution

MandiLens is an independent project and is not affiliated with or endorsed by AGMARKNET, the Directorate of Marketing & Inspection, or the Government of India.
