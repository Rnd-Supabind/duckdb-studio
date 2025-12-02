import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ExecutionModeProvider } from "./contexts/ExecutionModeContext";

createRoot(document.getElementById("root")!).render(
    <ExecutionModeProvider>
        <App />
    </ExecutionModeProvider>
);
