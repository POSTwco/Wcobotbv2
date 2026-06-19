/**
 * /calisthenics — HBAR-gated free workout plans.
 *
 * Provider mounted at the page level so other tabs don't pay the cost of the
 * session probe + 24h localStorage restore. Gate component handles the
 * connect/sign/verify funnel; the post-eligible dashboard arrives in the
 * next UI slice.
 */

import { CaliSessionProvider } from "../components/cali/cali-context";
import { CaliEligibleShell } from "../components/cali/cali-eligible-shell";
import { CaliDashboard } from "../components/cali/cali-dashboard";

function CaliInner() {
  return (
    <CaliEligibleShell loaderVariant="dashboard">
      <CaliDashboard />
    </CaliEligibleShell>
  );
}

export function CalisthenicsPage() {
  return (
    <CaliSessionProvider>
      <CaliInner />
    </CaliSessionProvider>
  );
}
