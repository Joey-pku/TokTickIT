import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Fail closed: never let API tests fall back to the development datasource.
if (!process.env.TEST_DATABASE_URL) {
  try {
    const contents = readFileSync(resolve(".env.test"), "utf8");
    process.env.TEST_DATABASE_URL = contents.match(/^TEST_DATABASE_URL=["']?([^"'\r\n]+)/m)?.[1];
  } catch { /* The explicit error below explains the missing configuration. */ }
}
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for API tests.");
const target = new URL(process.env.TEST_DATABASE_URL);
if (!target.pathname.endsWith("_test")) throw new Error("Test database name must end in _test.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
