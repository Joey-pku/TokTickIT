import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./AuthContext.js";
import { AuthApp } from "./AuthApp.js";
import "./zen-green.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthApp />
    </AuthProvider>
  </React.StrictMode>
);
