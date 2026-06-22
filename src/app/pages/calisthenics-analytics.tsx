import { CaliAnalytics } from "../components/cali/cali-analytics";
import { CaliEligibleShell } from "../components/cali/cali-eligible-shell";
import { CaliSessionProvider } from "../components/cali/cali-context";

export function CalisthenicsAnalyticsPage() {
  return (
    <CaliSessionProvider>
      <CaliEligibleShell>
        <CaliAnalytics />
      </CaliEligibleShell>
    </CaliSessionProvider>
  );
}