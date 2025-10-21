import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/index.js";
import "./styles/theme.css";
import App from "./App.jsx";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker (production only). Use BASE_URL to support subpath deployments (e.g., GitHub Pages)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .catch(() => {
        // Ignore SW registration failures
      });
  });
}
