import fs from "node:fs";
import path from "node:path";
import { loadEnv, requireEnv } from "./_env";

loadEnv();
requireEnv("MONGODB_URI");

const { connectToDatabase, disconnectFromDatabase } = await import("@/lib/db/connect");
const { parseUploadedFile, mapRowsToRecords, inferMapping } = await import(
  "@/lib/data-sources/importer"
);
const { ingestRecords, syncDataSourceRegistry } = await import("@/lib/services/ingestion");

const args = process.argv.slice(2);
function argValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const filePath = argValue("--file") ?? args[0];
const sourceKey = argValue("--source") ?? "admin_csv";

async function main() {
  if (!filePath) {
    console.error("\n✗ Usage: pnpm import:csv -- --file ./data/prices.csv [--source admin_csv]\n");
    process.exit(1);
  }
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`\n✗ File not found: ${resolved}\n`);
    process.exit(1);
  }

  const text = fs.readFileSync(resolved, "utf8");
  const fileType = resolved.toLowerCase().endsWith(".json") ? "json" : "csv";
  const parsed = parseUploadedFile(text, fileType);
  const mapping = inferMapping(parsed.headers);
  console.log(`Detected columns: ${parsed.headers.join(", ")}`);
  console.log(`Inferred mapping: ${JSON.stringify(mapping, null, 2)}`);

  const { records, errors } = mapRowsToRecords(parsed.rows, mapping, { sourceKey });
  console.log(`Parsed ${parsed.rows.length} rows → ${records.length} valid, ${errors.length} invalid.`);
  if (errors.length) {
    for (const error of errors.slice(0, 10)) {
      console.log(`  row ${error.row}: ${error.message}`);
    }
    if (errors.length > 10) console.log(`  …and ${errors.length - 10} more`);
  }

  if (!records.length) {
    console.error("\n✗ No valid rows to import.\n");
    process.exit(1);
  }

  await connectToDatabase();
  await syncDataSourceRegistry();
  const summary = await ingestRecords(records);

  console.log(`\n✓ Import complete: ${summary.inserted} inserted, ${summary.duplicates} duplicates, ${summary.invalid} invalid.`);
  console.log(`  Created ${summary.marketsCreated} markets and ${summary.commoditiesCreated} commodities.`);
}

main()
  .then(async () => {
    await disconnectFromDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n✗ Import failed:", error instanceof Error ? error.message : error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
  });
