import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/montserrat/400.css"; // Normal
import "@fontsource/montserrat/700.css"; // Bold
import "@fontsource/montserrat/400-italic.css"; // Italic

// Import Plus Jakarta Sans
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/700.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
