import { PrismaClient } from "@prisma/client";
// Lazy singleton keeps the health endpoint independent of the database.
let client: PrismaClient | null = null;
export function getPrisma(): PrismaClient {
  if (!client) {
    if (process.env.NODE_ENV === "test") {
      const url = process.env.TEST_DATABASE_URL;
      if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("An isolated TEST_DATABASE_URL is required.");
      client = new PrismaClient({ datasources: { db: { url } } });
    } else {
      client = new PrismaClient();
    }
  }
  return client;
}
