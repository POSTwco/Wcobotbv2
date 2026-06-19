/**
 * /calisthenics/workout/:id — render + log a generated workout.
 *
 * Same provider mount + gate fallthrough as the dashboard page, so a user
 * landing here via a deep link still hits the gate if they're not eligible.
 */

import { CaliSessionProvider } from "../components/cali/cali-context";
import { CaliEligibleShell } from "../components/cali/cali-eligible-shell";
import { CaliWorkout } from "../components/cali/cali-workout";

function Inner() {
  return (
    <CaliEligibleShell loaderVariant="workout">
      <CaliWorkout />
    </CaliEligibleShell>
  );
}

export function CalisthenicsWorkoutPage() {
  return (
    <CaliSessionProvider>
      <Inner />
    </CaliSessionProvider>
  );
}
