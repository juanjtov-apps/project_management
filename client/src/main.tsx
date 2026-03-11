import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import App from "./App";
import "./index.css";
import "./i18n";

// Filter out browser extension errors from console (harmless noise)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out common browser extension errors
    if (
      message.includes('runtime.lastError') ||
      message.includes('background.js') ||
      message.includes('NoRelayedListener') ||
      message.includes('Could not get default saving location') ||
      message.includes('message port closed')
    ) {
      // Silently ignore extension errors
      return;
    }
    // Log real application errors
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div className="min-h-screen bg-[#0F1115]" />}>
    <App />
  </Suspense>
);
