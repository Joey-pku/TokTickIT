import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { allocateTicketNumber } from '../dist/src/ticket-number.js';

const serverRoot = resolve('.');
const migrationsRoot = join(serverRoot, 'prisma', 'migrations');
const featureMigration = '20260919000000_lab3_user_migration_seed';
const forbiddenNames = new Set(['toktickit', 'toktickit_test', 'toktickit_e2e_test', 'postgres', 'template0', 'template1']);
const createdDatabases = new Set();
const clients = new Set();
const temporaryRoot = await mkdtemp(join(tmpdir(), 'toktickit-feature10-'));
const attachmentRoot = await mkdtemp(join(tmpdir(), 'toktickit-feature10-attachments-'));

function readUrl(file, key) {
  if (!existsSync(file)) return undefined;
  return readFileSync(file, 'utf8').match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)`, 'm'))?.[1];
}

const source = process.env.TEST_DATABASE_URL || readUrl('.env.test', 'TEST_DATABASE_URL') || process.env.DATABASE_URL || readUrl('.env', 'DATABASE_URL');
if (!source) throw new Error('Feature 10 verification requires a configured PostgreSQL connection.');
const sourceUrl = new URL(source);
const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres';

function databaseUrl(name) {
  const value = new URL(sourceUrl); value.pathname = `/${name}`; return value.toString();
}

function safeName(kind) {
  const name = `toktickit_feature10_${kind}_${randomBytes(6).toString('hex')}_test`;
  assert.match(name, /^toktickit_feature10_(migration|seed|collision)_[a-f0-9]{12}_test$/);
  assert(!forbiddenNames.has(name));
  return name;
}

function quotedIdentifier(name) {
  assert.match(name, /^toktickit_feature10_(migration|seed|collision)_[a-f0-9]{12}_test$/);
  return `"${name.replaceAll('"', '""')}"`;
}

function client(url) {
  const value = new PrismaClient({ datasources: { db: { url } } });
  clients.add(value); return value;
}

async function closeClient(value) {
  if (clients.delete(value)) await value.$disconnect();
}

function runNode(args, url, expectedSuccess = true) {
  const result = spawnSync(process.execPath, args, {
    cwd: serverRoot,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, TEST_DATABASE_URL: url },
    encoding: 'utf8',
  });
  if (expectedSuccess && result.status !== 0) throw new Error(`Command failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  return result;
}

async function createDatabase(admin, kind) {
  const name = safeName(kind);
  if (forbiddenNames.has(name)) throw new Error('Refusing a shared or development database name.');
  await admin.$executeRawUnsafe(`CREATE DATABASE ${quotedIdentifier(name)}`);
  createdDatabases.add(name);
  return { name, url: databaseUrl(name) };
}

async function historicalFixture() {
  const prismaRoot = join(temporaryRoot, 'historical-prisma');
  const migrationTarget = join(prismaRoot, 'migrations');
  await mkdir(migrationTarget, { recursive: true });
  await cp(join(serverRoot, 'prisma', 'schema.prisma'), join(prismaRoot, 'schema.prisma'));
  await cp(join(migrationsRoot, 'migration_lock.toml'), join(migrationTarget, 'migration_lock.toml'));
  for (const name of ['20260816131547_init', '20260906000000_lab2_foundation', '20260906010000_ticket_number_counter']) {
    await cp(join(migrationsRoot, name), join(migrationTarget, name), { recursive: true });
  }
  return join(prismaRoot, 'schema.prisma');
}

async function migrateDeploy(url, schema = join(serverRoot, 'prisma', 'schema.prisma'), expectedSuccess = true) {
  return runNode(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', schema], url, expectedSuccess);
}

async function runSeed(url) {
  const db = client(url);
  try {
    const { seed } = await import('../dist/prisma/seed-data.js');
    await seed(db);
  } finally {
    await closeClient(db);
  }
}

async function insertLegacyData(db, attachmentPath) {
  await db.$transaction([
    db.$executeRawUnsafe(`INSERT INTO "DevelopmentRequester" ("id", "name", "email", "department", "isActive", "createdAt", "updatedAt") VALUES
      (41, 'Legacy Active', 'jennifer.anderson@example.com', 'Marketing', true, '2025-01-01', '2025-02-01'),
      (42, 'Legacy Inactive', 'legacy.inactive@example.com', 'Archive', false, '2025-01-02', '2025-02-02')`),
    db.$executeRawUnsafe(`SELECT setval('"DevelopmentRequester_id_seq"', 42, true)`),
    db.$executeRawUnsafe(`INSERT INTO "Category" ("id", "name", "createdAt") VALUES (1, 'Legacy Category', '2025-01-01')`),
    db.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("id", "name", "isActive", "createdAt") VALUES (31, 'Legacy System', true, '2025-01-01')`),
    db.$executeRawUnsafe(`INSERT INTO "Ticket" ("id", "ticketNumber", "summary", "description", "requestedPriority", "currentStatus", "requesterId", "categoryId", "relatedSystemId", "createdAt", "updatedAt")
      VALUES (77, 'TKT-2026-000123', 'Legacy ticket', 'Legacy ticket content remains intact.', 'HIGH', 'LEGACY_CUSTOM', 41, 1, 31, '2026-01-01', '2026-01-02')`),
    db.$executeRawUnsafe(`INSERT INTO "Attachment" ("id", "ticketId", "originalFileName", "storedFileName", "filePath", "mimeType", "fileSizeBytes", "isRemoved", "removedAt", "removedById", "removalReason", "uploadedById", "createdAt")
      VALUES (91, 77, 'legacy.txt', 'legacy-stored.txt', '${attachmentPath.replaceAll("'", "''")}', 'text/plain', 23, true, '2026-01-03', 41, 'Legacy removal reason', 41, '2026-01-01')`),
  ]);
}

async function migrationPreservationTest(admin, historicalSchema) {
  const target = await createDatabase(admin, 'migration');
  await migrateDeploy(target.url, historicalSchema);
  const bytes = Buffer.from('legacy attachment bytes');
  const path = join(attachmentRoot, 'legacy-stored.txt');
  await writeFile(path, bytes);
  let db = client(target.url);
  await insertLegacyData(db, path);
  await closeClient(db);
  await migrateDeploy(target.url);
  db = client(target.url);
  const [user] = await db.$queryRawUnsafe('SELECT * FROM "User" WHERE id = 41');
  assert.equal(user.name, 'Legacy Active');
  assert.equal(user.email, 'jennifer.anderson@example.com');
  assert.equal(user.department, 'Marketing');
  assert.equal(user.isActive, true);
  assert.equal(user.role, 'REQUESTER');
  assert.equal(user.seedKey, 'seed:req:1');
  assert.equal(user.mustChangePassword, true);
  assert.equal(user.createdAt.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(user.updatedAt.toISOString(), '2025-02-01T00:00:00.000Z');
  assert.equal(await bcrypt.compare('Initial123!', user.passwordHash), true);
  assert.equal(await bcrypt.getRounds(user.passwordHash), 10);
  const inactive = await db.user.findUniqueOrThrow({ where: { id: 42 } });
  assert.equal(inactive.isActive, false);
  assert.equal(inactive.seedKey, null);
  const ticket = await db.ticket.findUniqueOrThrow({ where: { id: 77 } });
  assert.equal(ticket.ticketNumber, 'TKT-2026-000123');
  assert.equal(ticket.description, 'Legacy ticket content remains intact.');
  assert.equal(ticket.currentStatus, 'LEGACY_CUSTOM');
  assert.equal(ticket.requesterId, 41);
  assert.equal(ticket.categoryId, 1);
  assert.equal(ticket.relatedSystemId, 31);
  assert.equal(ticket.createdAt.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(ticket.updatedAt.toISOString(), '2026-01-02T00:00:00.000Z');
  assert.equal(ticket.itPriority, ticket.requestedPriority);
  assert.equal(ticket.requesterResolved, false);
  const attachment = await db.attachment.findUniqueOrThrow({ where: { id: 91 } });
  assert.equal(attachment.ticketId, 77);
  assert.equal(attachment.filePath, path);
  assert.equal(attachment.isRemoved, true);
  assert.equal(attachment.removedAt?.toISOString(), '2026-01-03T00:00:00.000Z');
  assert.equal(attachment.uploadedById, 41);
  assert.equal(attachment.removedById, 41);
  assert.equal(attachment.removalReason, 'Legacy removal reason');
  assert.deepEqual(await readFile(path), bytes);
  const allocated = await db.$transaction(async tx => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    const ticketNumber = await allocateTicketNumber(tx, now);
    return tx.ticket.create({ data: {
      ticketNumber, summary: 'Allocator verification', description: 'Verifies the shared allocator after migration.',
      requestedPriority: 'MEDIUM', itPriority: 'MEDIUM', requesterId: 41, categoryId: 1, relatedSystemId: 31,
      createdAt: now, updatedAt: now,
    } });
  });
  assert.equal(allocated.ticketNumber, 'TKT-2026-000124');
  assert.equal(await db.ticket.count({ where: { ticketNumber: allocated.ticketNumber } }), 1);
  await closeClient(db);
}

async function collisionRollbackTest(admin, historicalSchema) {
  const target = await createDatabase(admin, 'collision');
  await migrateDeploy(target.url, historicalSchema);
  let db = client(target.url);
  await db.$executeRawUnsafe(`INSERT INTO "DevelopmentRequester" ("name", "email", "department", "isActive", "createdAt", "updatedAt") VALUES
    ('One', 'Case@Test.invalid', 'Test', true, now(), now()),
    ('Two', 'case@test.invalid', 'Test', true, now(), now())`);
  await closeClient(db);
  const result = await migrateDeploy(target.url, join(serverRoot, 'prisma', 'schema.prisma'), false);
  assert.notEqual(result.status, 0, 'migration should reject case-insensitive legacy collisions');
  db = client(target.url);
  const tables = await db.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('DevelopmentRequester', 'User') ORDER BY table_name`);
  assert.deepEqual(tables.map(row => row.table_name), ['DevelopmentRequester']);
  assert.equal(await db.$queryRawUnsafe('SELECT count(*)::int AS count FROM "DevelopmentRequester"').then(rows => rows[0].count), 2);
  await closeClient(db);
}

async function seedInvarianceTest(admin) {
  const target = await createDatabase(admin, 'seed');
  await migrateDeploy(target.url);
  await runSeed(target.url);
  let db = client(target.url);
  const initialUsers = await db.user.findMany({ where: { seedKey: { not: null } }, orderBy: { seedKey: 'asc' } });
  assert.equal(initialUsers.length, 10);
  assert.equal(initialUsers.filter(row => row.role === 'REQUESTER' && row.isActive).length, 4);
  assert.equal(initialUsers.filter(row => row.role === 'REQUESTER' && !row.isActive).length, 1);
  assert.equal(initialUsers.filter(row => row.role === 'IT_STAFF' && row.isActive).length, 3);
  assert.equal(initialUsers.filter(row => row.role === 'IT_STAFF' && !row.isActive).length, 1);
  assert.equal(initialUsers.filter(row => row.role === 'ADMINISTRATOR' && row.isActive).length, 1);
  assert.equal(await db.ticket.count({ where: { seedKey: { not: null } } }), 3);
  assert.equal(await db.comment.count({ where: { seedKey: { not: null } } }), 3);
  assert.equal(await db.internalNote.count({ where: { seedKey: { not: null } } }), 2);
  assert.equal(await db.session.count(), 0);
  const requester = await db.user.findUniqueOrThrow({ where: { seedKey: 'seed:req:1' } });
  const category = await db.category.findUniqueOrThrow({ where: { name: 'Hardware' } });
  const system = await db.relatedSystem.findUniqueOrThrow({ where: { name: 'Corporate Laptop' } });
  const allocatedAfterSeed = await db.$transaction(async tx => {
    const [clock] = await tx.$queryRaw`SELECT CURRENT_TIMESTAMP AS now`;
    const ticketNumber = await allocateTicketNumber(tx, clock.now);
    return tx.ticket.create({ data: {
      ticketNumber, summary: 'Post-seed allocator verification', description: 'Verifies normal allocation remains collision-free after seeding.',
      requestedPriority: 'LOW', itPriority: 'LOW', requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id,
      createdAt: clock.now, updatedAt: clock.now,
    } });
  });
  assert.equal(await db.ticket.count({ where: { ticketNumber: allocatedAfterSeed.ticketNumber } }), 1);
  const ids = {
    user: initialUsers.find(row => row.seedKey === 'seed:staff:1').id,
    ticket: (await db.ticket.findUniqueOrThrow({ where: { seedKey: 'seed:ticket:2' } })).id,
    comment: (await db.comment.findUniqueOrThrow({ where: { seedKey: 'seed:comment:2-1' } })).id,
    note: (await db.internalNote.findUniqueOrThrow({ where: { seedKey: 'seed:note:2-1' } })).id,
  };
  const changedHash = await bcrypt.hash('Changed123!', 10);
  await db.user.update({ where: { seedKey: 'seed:staff:1' }, data: { name: 'Edited Staff', email: 'edited.staff@example.net', role: 'REQUESTER', isActive: false, passwordHash: changedHash, mustChangePassword: false } });
  await db.ticket.update({ where: { seedKey: 'seed:ticket:2' }, data: { summary: 'Edited ticket', ownerId: null, requestedPriority: 'LOW', itPriority: 'MEDIUM', currentStatus: 'CLOSED', requesterResolved: true, requesterResolvedAt: new Date('2026-04-01') } });
  await db.comment.update({ where: { seedKey: 'seed:comment:2-1' }, data: { content: 'Edited comment' } });
  await db.internalNote.update({ where: { seedKey: 'seed:note:2-1' }, data: { content: 'Edited note' } });
  await closeClient(db);
  await runSeed(target.url);
  db = client(target.url);
  const edited = await db.user.findUniqueOrThrow({ where: { seedKey: 'seed:staff:1' } });
  assert.equal(edited.id, ids.user); assert.equal(edited.name, 'Edited Staff'); assert.equal(edited.email, 'edited.staff@example.net');
  assert.equal(edited.role, 'REQUESTER'); assert.equal(edited.isActive, false); assert.equal(edited.passwordHash, changedHash); assert.equal(edited.mustChangePassword, false);
  assert.equal(await db.user.count({ where: { email: { equals: 'staff.mike@toktickit.com', mode: 'insensitive' } } }), 0);
  const editedTicket = await db.ticket.findUniqueOrThrow({ where: { seedKey: 'seed:ticket:2' } });
  assert.equal(editedTicket.id, ids.ticket); assert.equal(editedTicket.summary, 'Edited ticket'); assert.equal(editedTicket.ownerId, null); assert.equal(editedTicket.currentStatus, 'CLOSED');
  assert.equal(editedTicket.requestedPriority, 'LOW'); assert.equal(editedTicket.itPriority, 'MEDIUM'); assert.equal(editedTicket.requesterResolved, true);
  assert.equal(editedTicket.requesterResolvedAt?.toISOString(), '2026-04-01T00:00:00.000Z');
  const editedComment = await db.comment.findUniqueOrThrow({ where: { seedKey: 'seed:comment:2-1' } });
  const editedNote = await db.internalNote.findUniqueOrThrow({ where: { seedKey: 'seed:note:2-1' } });
  assert.equal(editedComment.id, ids.comment); assert.equal(editedComment.content, 'Edited comment');
  assert.equal(editedNote.id, ids.note); assert.equal(editedNote.content, 'Edited note');
  assert.equal(await db.user.count({ where: { seedKey: { not: null } } }), 10);
  assert.equal(await db.ticket.count({ where: { seedKey: { not: null } } }), 3);
  assert.equal(await db.comment.count({ where: { seedKey: { not: null } } }), 3);
  assert.equal(await db.internalNote.count({ where: { seedKey: { not: null } } }), 2);
  assert.equal(await db.session.count(), 0);
  await assert.rejects(db.user.create({ data: { name: 'Collision', email: 'JENNIFER.ANDERSON@example.com', passwordHash: changedHash } }));
  const maximums = await db.$queryRawUnsafe(`SELECT substring("ticketNumber" from 5 for 4)::int AS year, max(substring("ticketNumber" from 10 for 6)::int) AS maximum FROM "Ticket" WHERE "ticketNumber" ~ '^TKT-[0-9]{4}-[0-9]{6}$' GROUP BY 1`);
  for (const row of maximums) {
    const counter = await db.ticketNumberCounter.findUniqueOrThrow({ where: { year: row.year } });
    assert(counter.lastValue >= row.maximum);
  }
  // Existing comments are not revalidated, but recreating a missing comment
  // must reject a staff identity that was demoted to Requester.
  await db.user.update({ where: { id: ids.user }, data: { isActive: true } });
  await db.comment.delete({ where: { id: ids.comment } });
  await closeClient(db);
  await assert.rejects(runSeed(target.url), /SEED_CONFLICT: seed:comment:2-1 requires an authorized public-comment author/);
  db = client(target.url);
  assert.equal(await db.comment.count({ where: { seedKey: 'seed:comment:2-1' } }), 0);
  // A missing key plus an occupied canonical email is a conflict, not an
  // invitation to adopt the occupying account. The seed transaction rolls back.
  await db.user.update({ where: { id: ids.user }, data: { seedKey: null } });
  const unrelated = await db.user.create({ data: { name: 'Unrelated account', email: 'staff.mike@toktickit.com', passwordHash: changedHash } });
  await closeClient(db);
  await assert.rejects(runSeed(target.url), /SEED_CONFLICT/);
  db = client(target.url);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: unrelated.id } })).seedKey, null);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids.user } })).seedKey, null);
  assert.equal(await db.user.count(), 11);
  await closeClient(db);
}

let admin;
try {
  admin = client(adminUrl.toString());
  const historicalSchema = await historicalFixture();
  await migrationPreservationTest(admin, historicalSchema);
  await collisionRollbackTest(admin, historicalSchema);
  await seedInvarianceTest(admin);
  console.log('Feature 10 API-MIG-01 and API-SEED-01 verification passed.');
} finally {
  for (const value of [...clients]) if (value !== admin) await closeClient(value);
  if (admin) {
    for (const name of createdDatabases) {
      if (!createdDatabases.has(name) || forbiddenNames.has(name)) throw new Error('Refusing cleanup of an untracked database.');
      await admin.$executeRawUnsafe(`DROP DATABASE ${quotedIdentifier(name)} WITH (FORCE)`);
    }
    await closeClient(admin);
  }
  if (basename(temporaryRoot).startsWith('toktickit-feature10-')) await rm(temporaryRoot, { recursive: true, force: true });
  if (basename(attachmentRoot).startsWith('toktickit-feature10-attachments-')) await rm(attachmentRoot, { recursive: true, force: true });
}
