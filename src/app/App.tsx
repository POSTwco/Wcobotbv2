import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { WalletProvider } from "./components/wallet-context";
import { VIPProvider } from "./components/vip/vip-context";
import { BattleThemeProvider } from "./components/battle-theme-context";
import { ErrorBoundary } from "./components/error-boundary";
import { api } from "./lib/api";

// One ping per browser session — sessionStorage flag prevents repeat hits
// during in-app navigation. Server-side dedupe handles cross-session repeats
// per (IP, UA, day) so this is just a polite client-side optimisation.
function VisitPing() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const FLAG = "botb_visit_pinged";
      if (sessionStorage.getItem(FLAG)) return;
      sessionStorage.setItem(FLAG, "1");
      api.trackVisit().catch(() => {});
    } catch {
      // sessionStorage may be disabled (private mode) — fail silent
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <VIPProvider>
          <BattleThemeProvider>
            <VisitPing />
            <RouterProvider router={router} />
          </BattleThemeProvider>
        </VIPProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}