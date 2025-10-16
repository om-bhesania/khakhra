import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/themeProvider.tsx";
import { Toaster } from "sonner";
import { AuthProvider } from "./wrappers/authWrapper.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <App />
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  </StrictMode>
);

// paritima ben na khakhra
