import { afterAll, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seed } from "../../prisma/seed-data.js";
const prisma = getPrisma();
afterAll(() => prisma.$disconnect());
it("seeds exact reference data idempotently without changing identities", async () => {
  const snapshot = async () => ({
    categories: await prisma.category.findMany({ orderBy: { id: "asc" } }),
    systems: await prisma.relatedSystem.findMany({ orderBy: { id: "asc" } }),
    requesters: await prisma.user.findMany({ where: { seedKey: { startsWith: "seed:req:" } }, select: { id: true, name: true, email: true, department: true, isActive: true }, orderBy: { seedKey: "asc" } }),
  });
  await seed(prisma);
  const first = await snapshot();
  await seed(prisma);
  expect(await snapshot()).toEqual(first);
  expect(first.categories.map(c => c.name)).toEqual(["Account and Access", "Hardware", "Software", "Network"]);
  expect(first.systems).toHaveLength(7);
  expect(first.systems.every(s => s.isActive)).toBe(true);
  expect(first.requesters.slice(0, 4).map(({ name, email, department, isActive }) => ({ name, email, department, isActive }))).toEqual([
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Marketing", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", department: "Engineering", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", department: "Human Resources", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", department: "Finance", isActive: true },
  ]);
  // Fresh Lab 3 installs use the contract display name; Lab 2 upgrades retain
  // the original repository value as required by the preservation contract.
  expect(["Alex Taylor", "Alex Taylor (Inactive)"]).toContain(first.requesters[4].name);
  expect(first.requesters[4]).toMatchObject({ email: "alex.taylor@example.com", department: "Former Staff", isActive: false });
});
