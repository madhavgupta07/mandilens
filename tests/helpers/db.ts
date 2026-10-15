import mongoose from "mongoose";

/**
 * Wipe all collections between tests so cases stay independent. We deliberately
 * keep the single in-memory MongoDB instance alive for the whole run.
 */
export async function clearDatabase(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}
