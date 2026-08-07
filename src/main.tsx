import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ScrollProvider } from "./motion/ScrollProvider";
import "./i18n/config";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ScrollProvider>
      <App />
    </ScrollProvider>
  </React.StrictMode>,
);
