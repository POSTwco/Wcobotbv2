import { RouterProvider } from "react-router";
import { router } from "./routes";
import { WalletProvider } from "./components/wallet-context";
import { VIPProvider } from "./components/vip/vip-context";
import { BattleThemeProvider } from "./components/battle-theme-context";
import { ErrorBoundary } from "./components/error-boundary";

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <VIPProvider>
          <BattleThemeProvider>
            <RouterProvider router={router} />
          </BattleThemeProvider>
        </VIPProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}