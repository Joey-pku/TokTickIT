import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { LoginPage } from "../../src/LoginPage.js";
import { useAuth } from "../../src/AuthContext.js";

vi.mock("../../src/AuthContext.js", () => ({ useAuth: vi.fn() }));

const login = vi.fn();
beforeEach(() => {
  login.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    state: "unauthenticated",
    user: null,
    login,
    logout: vi.fn(),
    changePassword: vi.fn(),
    requestPasswordChange: vi.fn(),
    reload: vi.fn(),
  });
});

it("UI-AUTH-01: submits credentials and provides an accessible visibility toggle", async () => {
  const user = userEvent.setup();
  render(<LoginPage />);
  const password = screen.getByLabelText("Password");
  expect(password).toHaveAttribute("type", "password");
  await user.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  await user.type(screen.getByLabelText("Email address"), "person@example.com");
  await user.type(password, "Initial123!");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(login).toHaveBeenCalledWith("person@example.com", "Initial123!");
});

it("UI-AUTH-02: reports a connection failure without clearing credentials", async () => {
  login.mockRejectedValueOnce(new Error("offline"));
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText("Email address"), "person@example.com");
  await user.type(screen.getByLabelText("Password"), "Initial123!");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to connect");
  expect(screen.getByLabelText("Email address")).toHaveValue("person@example.com");
  expect(screen.getByLabelText("Password")).toHaveValue("Initial123!");
});
