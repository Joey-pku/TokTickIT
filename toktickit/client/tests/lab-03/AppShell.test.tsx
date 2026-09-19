import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../../src/AppShell.js";
import { useAuth } from "../../src/AuthContext.js";

vi.mock("../../src/AuthContext.js", () => ({ useAuth: vi.fn() }));
vi.mock("../../src/navigation.js", () => ({
  navigate: vi.fn(),
  usePathname: () => "/tickets",
}));

const logout = vi.fn();
const requestPasswordChange = vi.fn();

beforeEach(() => {
  logout.mockReset();
  requestPasswordChange.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    state: "authenticated",
    user: { id: 1, name: "Jennifer Anderson", email: "j@example.com", role: "REQUESTER", isActive: true, mustChangePassword: false },
    login: vi.fn(),
    logout,
    changePassword: vi.fn(),
    requestPasswordChange,
    reload: vi.fn(),
  });
});

it("UI-SHELL-01: renders authenticated identity, role, and requester navigation", () => {
  render(<AppShell><h1>Content</h1></AppShell>);
  expect(screen.getByText("Jennifer Anderson")).toBeVisible();
  expect(screen.getByText("REQUESTER")).toBeVisible();
  expect(screen.getByRole("link", { name: "My Tickets" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Create Ticket" })).toBeVisible();
});

it("UI-SHELL-02: exposes password change and signs out through AuthContext", async () => {
  const user = userEvent.setup();
  render(<AppShell><h1>Content</h1></AppShell>);
  await user.click(screen.getByRole("button", { name: "Change password" }));
  expect(requestPasswordChange).toHaveBeenCalledOnce();
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  expect(logout).toHaveBeenCalledOnce();
});
