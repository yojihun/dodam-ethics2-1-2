import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { LearningProvider } from "./context/LearningContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LearningProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LearningProvider>
  </StrictMode>
);
