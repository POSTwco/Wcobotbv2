/**
 * /calisthenics/workout/:id — render + log a generated workout.
 *
 * Same provider mount + gate fallthrough as the dashboard page, so a user
 * landing here via a deep link still hits the gate if they're not eligible.
 */

import { CaliSessionProvider, useCaliSession } from "../components/cali/cali-context";
import { CaliGate } from "../components/cali/cali-gate";
import { CaliWorkout } from "../components/cali/cali-workout";

function Inner() {
  const cali = useCaliSession();
  if (cali.phase !== "eligible") return <CaliGate />;
  return <CaliWorkout />;
}

export function CalisthenicsWorkoutPage() {
  return (
    <CaliSessionProvider>
      <Inner />
    </CaliSessionProvider>
  );
}
