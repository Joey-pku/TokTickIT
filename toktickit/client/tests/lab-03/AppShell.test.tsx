import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../../src/AppShell.js";
import { useAuth } from "../../src/AuthContext.js";

vi.mock("../../src/AuthContext.js", () => ({ useAuth: vi.fn() }));
vi.mock("../../src/navigation.js", () => ({ navigate: vi.fn(), usePathname: () => "/tickets" }));

const logout = vi.fn();
const requestPasswordChange = vi.fn();

beforeEach(() => {
  logout.mockReset();
  requestPasswordChange.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    state: "authenticated",
    user: { id: 1, name: "Jennifer Anderson", email: "j@example.com", role: "REQUESTER", isActive: true, mustChangePassword: false },
    login: vi.fn(), logout, changePassword: vi.fn(), requestPasswordChange, reload: vi.fn(),
  });
});

it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const)("UI-SHELL-01: uses the shared profile menu for %s", async role => {
  vi.mocked(useAuth).mockReturnValue({ ...vi.mocked(useAuth)(), user: { id: 1, name: "Jennifer Anderson", email: "j@example.com", role, isActive: true, mustChangePassword: false } });
  const user = userEvent.setup();
  render(<AppShell><h1>Content</h1></AppShell>);
  const trigger = screen.getByRole("button", { name: "Open profile menu" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
  await user.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Jennifer Anderson")).toBeVisible();
  expect(screen.getByText(role.replace("_", " "))).toBeVisible();
});

it("UI-SHELL-02: runs Change Password and closes the menu", async () => {
  const user = userEvent.setup();
  render(<AppShell><h1>Content</h1></AppShell>);
  await user.click(screen.getByRole("button", { name: "Open profile menu" }));
  await user.click(screen.getByRole("menuitem", { name: "Change Password" }));
  expect(requestPasswordChange).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("UI-SHELL-03: runs Logout and closes the menu", async () => {
  const user = userEvent.setup();
  render(<AppShell><h1>Content</h1></AppShell>);
  await user.click(screen.getByRole("button", { name: "Open profile menu" }));
  await user.click(screen.getByRole("menuitem", { name: "Logout" }));
  await waitFor(() => expect(logout).toHaveBeenCalledOnce());
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("UI-SHELL-04: dismisses on outside click", async () => {
  const user = userEvent.setup();
  render(<AppShell><h1>Content</h1></AppShell>);
  await user.click(screen.getByRole("button", { name: "Open profile menu" }));
  await user.click(screen.getByRole("heading", { name: "Content" }));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("UI-SHELL-05: supports keyboard opening and Escape dismissal with restored focus", async () => {
  const user = userEvent.setup();
  render(<AppShell><h1>Content</h1></AppShell>);
  const trigger = screen.getByRole("button", { name: "Open profile menu" });
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "Change Password" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
