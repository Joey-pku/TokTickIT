import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ChangePasswordPage } from "../../src/ChangePasswordPage.js";
import { useAuth } from "../../src/AuthContext.js";

vi.mock("../../src/AuthContext.js", () => ({ useAuth: vi.fn() }));

const changePassword = vi.fn();
const logout = vi.fn();
beforeEach(() => {
  changePassword.mockReset(); logout.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    state: "must-change-password",
    user: { id: 1, name: "Jennifer Anderson", email: "j@example.com", role: "REQUESTER", isActive: true, mustChangePassword: true },
    login: vi.fn(),
    logout,
    changePassword,
    requestPasswordChange: vi.fn(),
    reload: vi.fn(),
  });
});

it("UI-GATE-01,02: focuses current password and enables submit only when every rule passes", async () => {
  const user = userEvent.setup();
  render(<ChangePasswordPage />);
  const current = screen.getByLabelText("Current password");
  const next = screen.getByLabelText("New password");
  const confirm = screen.getByLabelText("Confirm new password");
  const submit = screen.getByRole("button", { name: "Set new password" });
  expect(current).toHaveFocus();
  expect(submit).toBeDisabled();
  await user.type(current, "Initial123!");
  await user.type(next, "Changed456!");
  await user.type(confirm, "Changed456!");
  expect(submit).toBeEnabled();
  expect(screen.getAllByRole("listitem").every(item => item.classList.contains("is-valid"))).toBe(true);
  await user.click(submit);
  expect(changePassword).toHaveBeenCalledWith("Initial123!", "Changed456!", "Changed456!");
});

it("UI-GATE-03: permits signing out of the mandatory-change gate", async () => {
  const user = userEvent.setup();
  render(<ChangePasswordPage />);
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  expect(logout).toHaveBeenCalledOnce();
});
