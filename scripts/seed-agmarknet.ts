import { loadEnv, requireEnv } from "./_env";

loadEnv();
requireEnv("MONGODB_URI");

const { connectToDatabase, disconnectFromDatabase } = await import("@/lib/db/connect");
const { runAgmarknetIngestion } = await import("@/lib/services/ingestion");
const { createAgmarknetAdapter } = await import("@/lib/data-sources/agmarknet");

const args = process.argv.slice(2);
function argValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const state = argValue("--state") ?? process.env.AGMARKNET_DEFAULT_STATE ?? "Bihar";
const district = argValue("--district");
const commodity = argValue("--commodity");
const maxRecords = argValue("--max") ? Number(argValue("--max")) : 5000;

async function main() {
  if (!process.env.AGRICULTURAL_DATA_API_KEY) {
    console.error(
      "\n✗ AGRICULTURAL_DATA_API_KEY is not set. Register a free key at https://data.gov.in, add it to .env.local, then retry.",
    );
    process.exit(1);
  }

  console.log(
    `Ingesting AGMARKNET data — state: ${state}${district ? `, district: ${district}` : ""}${commodity ? `, commodity: ${commodity}` : ""} (max ${maxRecords} rows)`,
  );

  await connectToDatabase();
  const summary = await runAgmarknetIngestion(
    { state, district, commodity, maxRecords },
    () => createAgmarknetAdapter(process.env),
  );

  if (summary.status === "failed") {
    console.error(`\n✗ Ingestion failed: ${summary.error}`);
    process.exit(1);
  }

  console.log(`\n✓ AGMARKNET ingestion ${summary.status}`);
  console.log(`  • fetched ${summary.fetched} source rows`);
  console.log(`  • inserted ${summary.inserted} new observations`);
  console.log(`  • skipped ${summary.duplicates} duplicates`);
  console.log(`  • rejected ${summary.rejected.length} rows`);
  console.log(`  • created ${summary.marketsCreated} markets and ${summary.commoditiesCreated} commodities`);
  console.log(
    "\n  Attribution (required by the source licence): Source: AGMARKNET, Directorate of Marketing & Inspection, via data.gov.in",
  );
}

main()
  .then(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n✗ AGMARKNET seed failed:", error instanceof Error ? error.message : error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
  });
