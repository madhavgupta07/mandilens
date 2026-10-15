import { MongoMemoryServer } from "mongodb-memory-server";

process.env.MONGODB_URI = "";
process.env.MONGODB_DB = "mandilens_test";
process.env.AUTH_SECRET = "test-secret-that-is-definitely-long-enough-1234567890";
process.env.APP_URL = "http://localhost:3000";
process.env.AI_PROVIDER = "deterministic";

const globalForMongo = globalThis as unknown as {
  __mongoServer?: MongoMemoryServer;
};

if (!globalForMongo.__mongoServer) {
  globalForMongo.__mongoServer = await MongoMemoryServer.create();
}

process.env.MONGODB_URI = globalForMongo.__mongoServer.getUri();
