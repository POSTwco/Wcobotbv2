import { CaliSessionProvider, useCaliSession } from "../components/cali/cali-context";
import { CaliGate } from "../components/cali/cali-gate";
import { CaliPRs } from "../components/cali/cali-prs";

function Inner() {
  const cali = useCaliSession();
  if (cali.phase !== "eligible") return <CaliGate />;
  return <CaliPRs />;
}

export function CalisthenicsPRsPage() {
  return (
    <CaliSessionProvider>
      <Inner />
    </CaliSessionProvider>
  );
}
