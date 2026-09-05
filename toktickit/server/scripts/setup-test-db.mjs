import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// The development URL is used only to locate the PostgreSQL server. All schema
// and seed commands below are explicitly bound to the dedicated test database.
const readUrl = (file, key) => readFileSync(file, 'utf8').match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)`, 'm'))?.[1];
let testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl && existsSync('.env.test')) testUrl = readUrl('.env.test', 'TEST_DATABASE_URL');
if (!testUrl) {
  const source = process.env.DATABASE_URL || readUrl('.env', 'DATABASE_URL');
  const target = new URL(source);
  target.pathname = '/toktickit_test';
  testUrl = target.toString();
}
const target = new URL(testUrl);
const name = target.pathname.slice(1);
if (!/^[a-zA-Z0-9_]+_test$/.test(name)) throw new Error('Test database name must end in _test.');
const adminUrl = new URL(target); adminUrl.pathname = '/postgres';
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
try {
  const found = await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname = ${name}`;
  if (!found.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
} catch {
  console.error('Unable to prepare isolated test database. Configure TEST_DATABASE_URL with a usable PostgreSQL role.');
  process.exitCode = 1;
} finally { await admin.$disconnect(); }
if (!process.exitCode) {
  if (!existsSync('.env.test')) writeFileSync('.env.test', `TEST_DATABASE_URL="${testUrl}"\n`);
  const env = { ...process.env, NODE_ENV: 'test', TEST_DATABASE_URL: testUrl, DATABASE_URL: testUrl };
  for (const args of [['node_modules/prisma/build/index.js', 'migrate', 'deploy'], ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts']]) {
    const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
    if (result.status !== 0) { process.exitCode = result.status || 1; break; }
  }
}
