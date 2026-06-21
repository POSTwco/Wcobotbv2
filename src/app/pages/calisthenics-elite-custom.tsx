import { EliteSessionProvider } from "../components/elite/elite-context";
import { EliteEligibleShell } from "../components/elite/elite-eligible-shell";
import { EliteCustomBuilder } from "../components/elite/elite-custom-builder";

export function CalisthenicsEliteCustomPage() {
  return (
    <EliteSessionProvider>
      <EliteEligibleShell loaderVariant="dashboard">
        <EliteCustomBuilder />
      </EliteEligibleShell>
    </EliteSessionProvider>
  );
}