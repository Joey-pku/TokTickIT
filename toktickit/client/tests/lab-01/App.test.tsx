import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — success state
  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Check System" })
    );

    expect(
      await screen.findByText("Backend: Online")
    ).toBeInTheDocument();

    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  // Issue 4 — error state
  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Backend unavailable")
    );

    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Check System" })
    );

    expect(
      await screen.findByText(
        "Backend: Offline. Please make sure the server is running."
      )
    ).toBeInTheDocument();
  });
});