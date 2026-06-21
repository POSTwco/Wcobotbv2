import { EliteSessionProvider } from "../components/elite/elite-context";
import { EliteEligibleShell } from "../components/elite/elite-eligible-shell";
import { EliteDashboard } from "../components/elite/elite-dashboard";

export function CalisthenicsElitePage() {
  return (
    <EliteSessionProvider>
      <EliteEligibleShell loaderVariant="dashboard">
        <EliteDashboard />
      </EliteEligibleShell>
    </EliteSessionProvider>
  );
}