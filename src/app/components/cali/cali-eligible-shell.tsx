/**
 * CaliEligibleShell — session gate wrapper for all calisthenics routes.
 * Shows BOTBSpinner while restoring/validating session, then gate or content.
 */

import type { ReactNode } from "react";
import { useCaliSession } from "./cali-context";
import { CaliGate } from "./cali-gate";
import { CaliLoader, type CaliLoaderVariant } from "./cali-loader";

export function CaliEligibleShell({
  children,
  loaderVariant = "session",
}: {
  children: ReactNode;
  loaderVariant?: CaliLoaderVariant;
}) {
  const cali = useCaliSession();

  if (cali.phase === "checking") {
    return <CaliLoader variant={loaderVariant} />;
  }
  if (cali.phase !== "eligible") {
    return <CaliGate />;
  }
  return <>{children}</>;
}