import type { ReactNode } from "react";
import { useEliteSession } from "./elite-context";
import { EliteGate } from "./elite-gate";
import { CaliLoader } from "../cali/cali-loader";

export function EliteEligibleShell({ children, loaderVariant = "dashboard" }: { children: ReactNode; loaderVariant?: "dashboard" | "workout" | "session" }) {
  const elite = useEliteSession();
  if (elite.phase === "checking") return <CaliLoader variant={loaderVariant} />;
  if (elite.phase !== "eligible") return <EliteGate />;
  return <>{children}</>;
}