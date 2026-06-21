import { EliteSessionProvider } from "../components/elite/elite-context";
import { EliteEligibleShell } from "../components/elite/elite-eligible-shell";
import { EliteWorkout } from "../components/elite/elite-workout";

export function CalisthenicsEliteWorkoutPage() {
  return (
    <EliteSessionProvider>
      <EliteEligibleShell loaderVariant="workout">
        <EliteWorkout />
      </EliteEligibleShell>
    </EliteSessionProvider>
  );
}