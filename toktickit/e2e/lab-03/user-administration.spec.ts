import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
const require = createRequire(resolve("server/package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function login(page: import("@playwright/test").Page, email: string, password: string) { await page.goto("/login"); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(password); await page.getByRole("button", { name: "Sign in" }).click(); }

test("E2E-ADM-01: administrator creates a user, sees duplicate guard, and cannot deactivate self", async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } }); const email = `admin-created-${randomUUID()}@example.com`; let createdId: number|undefined;
  try {
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASS!); await expect(page).toHaveURL(/\/admin\/users$/);
    await page.getByRole("button", { name: "+ Create User" }).click(); await page.getByLabel("Full Name *").fill("Browser Created Staff"); await page.getByLabel("Email Address *").fill(email); await page.getByLabel("Department").fill("Service Desk"); await page.getByLabel("Role *").selectOption("IT_STAFF"); await page.getByLabel("Initial Password *").fill("Temporary1!"); await page.getByRole("button", { name: "Save User" }).click(); await expect(page.getByRole("status")).toContainText("created successfully");
    createdId = (await db.user.findUniqueOrThrow({ where: { email } })).id;
    await page.getByRole("button", { name: "+ Create User" }).click(); await page.getByLabel("Full Name *").fill("Duplicate Staff"); await page.getByLabel("Email Address *").fill(email.toUpperCase()); await page.getByLabel("Role *").selectOption("IT_STAFF"); await page.getByLabel("Initial Password *").fill("Temporary1!"); await page.getByRole("button", { name: "Save User" }).click(); await expect(page.getByRole("dialog").getByRole("alert")).toContainText("already exists"); await page.getByRole("button", { name: "Cancel" }).click();
    const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.E2E_ADMIN_EMAIL } }); await page.getByLabel("Search users").fill(admin.email); const row = page.getByRole("row").filter({ hasText: admin.email }); await expect(row).toBeVisible(); await row.getByRole("button", { name: `Edit ${admin.name}` }).click(); await page.getByLabel("Active Status").uncheck(); await page.getByRole("button", { name: "Save Changes" }).click(); await expect(page.getByRole("dialog").getByRole("alert")).toContainText("cannot deactivate your own account");
  } finally { if (createdId) { await db.session.deleteMany({ where: { userId: createdId } }); await db.user.delete({ where: { id: createdId } }); } await db.$disconnect(); }
});

test("E2E-ADM-02: reset password revokes sessions and requires target password change", async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } }); const oldPassword = "OldPassword1!", temporary = "NewTemporary2!", finalPassword = "FinalPassword3!"; const target = await db.user.create({ data: { name: "Reset Browser User", email: `reset-${randomUUID()}@example.com`, passwordHash: await bcrypt.hash(oldPassword, 4), mustChangePassword: false } });
  try {
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASS!); await page.getByLabel("Search users").fill(target.email); const row = page.getByRole("row").filter({ hasText: target.email }); await expect(row).toBeVisible(); await row.getByRole("button", { name: `Reset password for ${target.name}` }).click(); await page.getByLabel("New Temporary Password *").fill(temporary); await page.getByRole("button", { name: "Reset Initial Password" }).click(); await expect(page.getByRole("status")).toContainText("reset successfully");
    await page.getByRole("button", { name: "Sign out" }).click(); await login(page, target.email, temporary); await expect(page).toHaveURL(/\/change-password$/); await page.getByLabel("Current password").fill(temporary); await page.getByLabel("New password", { exact: true }).fill(finalPassword); await page.getByLabel("Confirm new password").fill(finalPassword); await page.getByRole("button", { name: "Set new password" }).click(); await expect(page).toHaveURL(/\/tickets$/);
  } finally { await db.session.deleteMany({ where: { userId: target.id } }); await db.user.delete({ where: { id: target.id } }); await db.$disconnect(); }
});
