import mongoose from "mongoose";

/**
 * Mongoose connection helper with a global cache so that Next.js hot reloads
 * and route handlers reuse the same pool instead of opening new connections.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mandilensMongoose: MongooseCache | undefined;
}

const cached: MongooseCache =
  global.__mandilensMongoose ?? { conn: null, promise: null };

global.__mandilensMongoose = cached;

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and configure MONGODB_URI, or run `pnpm db:dev` for a temporary local database.",
    );
  }
  return uri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = getMongoUri();
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15_000,
        maxPoolSize: 10,
        dbName: process.env.MONGODB_DB || undefined,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
