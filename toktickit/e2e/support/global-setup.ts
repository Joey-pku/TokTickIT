import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

export default async function setup() {
  const server = resolve('server');
  const source = process.env.DATABASE_URL || readFileSync(join(server, '.env'), 'utf8').match(/^DATABASE_URL=["']?([^"'\r\n]+)/m)?.[1];
  if (!source) throw new Error('Configure the local PostgreSQL connection.');
  const target = new URL(source); target.pathname = '/toktickit_e2e_test';
  process.env.TEST_DATABASE_URL = target.toString();
  process.env.UPLOAD_DIR = await mkdtemp(join(tmpdir(), 'toktickit-attachments-test-e2e-'));
  const env = { ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test' };
  const children: ChildProcess[] = [];
  async function cleanup() {
    for (const child of children) {
      if (child.exitCode === null) { child.kill(); await new Promise<void>(done => child.once('exit', () => done())); }
    }
    const directory = process.env.UPLOAD_DIR!;
    if (!relative(tmpdir(), directory).startsWith('toktickit-attachments-test-e2e-')) throw new Error('Unsafe cleanup directory.');
    await rm(directory, { recursive: true, force: true });
  }
  try {
    // Do not write server/.env.test: API tests and E2E have separate databases.
    const { PrismaClient } = createRequire(join(server, 'package.json'))('@prisma/client');
    const adminUrl = new URL(target); adminUrl.pathname = '/postgres';
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    try {
      const found = await admin.$queryRawUnsafe("SELECT datname FROM pg_database WHERE datname = 'toktickit_e2e_test'");
      if (!found.length) await admin.$executeRawUnsafe('CREATE DATABASE toktickit_e2e_test');
    } finally { await admin.$disconnect(); }
    for (const args of [['node_modules/prisma/build/index.js', 'migrate', 'deploy'], ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts']]) {
      const prepared = spawnSync(process.execPath, args, { cwd: server, env, stdio: 'inherit' });
      if (prepared.status !== 0) throw new Error('Isolated E2E database preparation failed.');
    }
    const testDb = new PrismaClient({ datasources: { db: { url: target.toString() } } });
    try {
      await testDb.user.updateMany({ data: { mustChangePassword: false } });
    } finally {
      await testDb.$disconnect();
    }
    process.env.E2E_REQUESTER_EMAIL = 'jennifer.anderson@example.com';
    process.env.E2E_REQUESTER_PASS = 'Initial123!';
    process.env.E2E_STAFF_EMAIL = 'staff.mike@toktickit.com';
    process.env.E2E_STAFF_PASS = 'Initial123!';
    process.env.E2E_ADMIN_EMAIL = 'admin@toktickit.com';
    process.env.E2E_ADMIN_PASS = 'Initial123!';

    for (const [port, cwd, args, extra] of [
      [3001, server, ['--import', 'tsx', 'src/index.ts'], { PORT: '3001' }],
      [5174, resolve('client'), ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5174', '--strictPort'], { VITE_API_URL: 'http://localhost:3001' }],
    ] as const) {
      try { await fetch(`http://localhost:${port}`); throw new Error(`Port ${port} is already in use.`); }
      catch (error) { if (!(error instanceof TypeError)) throw error; }
      const child = spawn(process.execPath, [...args], { cwd, env: { ...env, ...extra }, stdio: 'inherit', windowsHide: true }); children.push(child);
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null) throw new Error(`Server on ${port} exited.`);
        try { if ((await fetch(`http://localhost:${port}${port === 3001 ? '/api/health' : ''}`)).ok) { ready = true; break; } } catch { }
        await new Promise(done => setTimeout(done, 100));
      }
      if (!ready) throw new Error(`Server on ${port} did not become ready.`);
    }
    return cleanup;
  } catch (error) { await cleanup(); throw error; }
}
