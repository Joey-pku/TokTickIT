
import { useState } from "react";
import { checkSystem } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");

  async function handleCheck() {
    setState("loading");

    try {
      await checkSystem();
      setState("success");
    } catch (error) {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <p className="mt-3">Checking backend...</p>
      )}

      {state === "success" && (
        <p className="mt-3 text-success">Backend: Online</p>
      )}

      {state === "error" && (
        <p className="mt-3 text-danger">
          Backend: Offline. Please make sure the server is running.
        </p>
      )}
    </div>
  );
}
