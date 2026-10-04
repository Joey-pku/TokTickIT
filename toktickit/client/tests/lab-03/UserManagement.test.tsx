import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { UserManagement } from "../../src/UserManagement.js";
import * as admin from "../../src/admin-api.js";

vi.mock("../../src/admin-api.js", async importOriginal => ({ ...await importOriginal<typeof admin>(), listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), resetUserPassword: vi.fn() }));
vi.mock("../../src/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 1, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR" }, reload: vi.fn() }) }));
const member: admin.ManagedUser = { id: 2, name: "Staff User", email: "staff@example.com", department: "Support", role: "IT_STAFF", isActive: true, mustChangePassword: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(admin.listUsers).mockResolvedValue({ items: [member], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } }); });

it("UI-ADM-01/02: renders users and validates/provisions a new account", async () => {
  const user = userEvent.setup(); vi.mocked(admin.createUser).mockResolvedValue({ user: member }); render(<UserManagement/>);
  expect((await screen.findAllByText("Staff User"))[0]).toBeVisible(); expect(screen.getAllByText("Support")[0]).toBeVisible(); expect(screen.getAllByText("Active")[0]).toBeVisible();
  await user.click(screen.getByRole("button", { name: "+ Create User" })); expect(screen.getByRole("dialog")).toBeVisible(); expect(screen.getByLabelText("Full Name *")).toHaveFocus();
  await user.type(screen.getByLabelText("Full Name *"), "New Person"); await user.type(screen.getByLabelText("Email Address *"), "new@example.com"); await user.selectOptions(screen.getByLabelText("Role *"), "REQUESTER"); await user.type(screen.getByLabelText("Initial Password *"), "Temporary1!"); await user.click(screen.getByRole("button", { name: "Save User" }));
  expect(admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ name: "New Person", initialPassword: "Temporary1!", isActive: true }));
});

it("UI-ADM-03/04: edits users and clears reset-password input when dialog closes", async () => {
  const user = userEvent.setup(); render(<UserManagement/>); await screen.findAllByText("Staff User");
  await user.click(screen.getByRole("button", { name: "Edit Staff User" })); expect(screen.getByRole("dialog")).toBeVisible(); expect(screen.getByLabelText("Full Name *")).toHaveValue("Staff User"); await user.click(screen.getByRole("button", { name: "Cancel" }));
  await user.click(screen.getByRole("button", { name: "Reset password for Staff User" })); const password = screen.getByLabelText("New Temporary Password *"); await user.type(password, "NeverStored1!"); await user.keyboard("{Escape}"); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reset password for Staff User" })); expect(screen.getByLabelText("New Temporary Password *")).toHaveValue("");
});
