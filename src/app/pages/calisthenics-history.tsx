import { CaliSessionProvider } from "../components/cali/cali-context";
import { CaliEligibleShell } from "../components/cali/cali-eligible-shell";
import { CaliHistory } from "../components/cali/cali-history";

function Inner() {
  return (
    <CaliEligibleShell loaderVariant="list">
      <CaliHistory />
    </CaliEligibleShell>
  );
}

export function CalisthenicsHistoryPage() {
  return (
    <CaliSessionProvider>
      <Inner />
    </CaliSessionProvider>
  );
}
