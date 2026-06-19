import { CaliSessionProvider } from "../components/cali/cali-context";
import { CaliEligibleShell } from "../components/cali/cali-eligible-shell";
import { CaliPRs } from "../components/cali/cali-prs";

function Inner() {
  return (
    <CaliEligibleShell loaderVariant="list">
      <CaliPRs />
    </CaliEligibleShell>
  );
}

export function CalisthenicsPRsPage() {
  return (
    <CaliSessionProvider>
      <Inner />
    </CaliSessionProvider>
  );
}
