/**
 * /calisthenics — HBAR-gated free workout plans.
 *
 * Provider mounted at the page level so other tabs don't pay the cost of the
 * session probe + 24h localStorage restore. Gate component handles the
 * connect/sign/verify funnel; the post-eligible dashboard arrives in the
 * next UI slice.
 */

import { CaliSessionProvider, useCaliSession } from "../components/cali/cali-context";
import { CaliGate } from "../components/cali/cali-gate";
import { CaliDashboard } from "../components/cali/cali-dashboard";

function CaliInner() {
  const cali = useCaliSession();
  if (cali.phase !== "eligible") return <CaliGate />;
  return <CaliDashboard />;
}

export function CalisthenicsPage() {
  return (
    <CaliSessionProvider>
      <CaliInner />
    </CaliSessionProvider>
  );
}
