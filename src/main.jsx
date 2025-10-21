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
