import { loadEnv } from "./_env";

loadEnv();

/**
 * `pnpm db:dev` starts a temporary, throwaway MongoDB (in-process) and seeds the
 * demo dataset into it. Keep this process running, copy the printed MONGODB_URI
 * into `.env.local`, and run `pnpm dev` in a second terminal.
 *
 * All data lives only for as long as this process runs.
 */
async function main() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const { generateDemoPrices } = await import("@/lib/demo/dataset");
  const { ingestRecords, syncDataSourceRegistry } = await import("@/lib/services/ingestion");
  const { connectToDatabase, disconnectFromDatabase } = await import("@/lib/db/connect");

  console.log("Starting a temporary in-memory MongoDB (mongodb-memory-server)…");
  const server = await MongoMemoryServer.create({ instance: { dbName: "mandilens" } });
  const uri = server.getUri();

  process.env.MONGODB_URI = uri;

  await connectToDatabase();
  await syncDataSourceRegistry();
  const summary = await ingestRecords(generateDemoPrices({ days: 45 }));

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("  Temporary MongoDB is ready. Put this line in .env.local:");
  console.log("");
  console.log(`  MONGODB_URI="${uri}"`);
  console.log("");
  console.log(
    `  Seeded ${summary.inserted} demo price rows (${summary.duplicates} duplicates skipped).`,
  );
  console.log("  Press Ctrl+C to stop and delete the database.");
  console.log("──────────────────────────────────────────────────────────────\n");

  const shutdown = async () => {
    console.log("\nShutting down temporary MongoDB…");
    await disconnectFromDatabase().catch(() => undefined);
    await server.stop().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive.
  await new Promise<void>(() => {});
}

main().catch((error) => {
  console.error("Failed to start the temporary database:", error instanceof Error ? error.message : error);
  process.exit(1);
});
