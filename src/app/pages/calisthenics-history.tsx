import { CaliSessionProvider, useCaliSession } from "../components/cali/cali-context";
import { CaliGate } from "../components/cali/cali-gate";
import { CaliHistory } from "../components/cali/cali-history";

function Inner() {
  const cali = useCaliSession();
  if (cali.phase !== "eligible") return <CaliGate />;
  return <CaliHistory />;
}

export function CalisthenicsHistoryPage() {
  return (
    <CaliSessionProvider>
      <Inner />
    </CaliSessionProvider>
  );
}
