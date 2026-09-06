import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { RequesterApp } from "./RequesterApp.js";
import "./zen-green.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RequesterApp />
  </React.StrictMode>
);
