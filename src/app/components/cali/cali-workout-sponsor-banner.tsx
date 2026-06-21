/**
 * Routine sponsor tab — below exercises in generated workout blocks.
 */

import { useMemo } from "react";
import { Dumbbell } from "lucide-react";
import { useSponsors } from "../../lib/hooks";
import { hasTier } from "../../lib/sponsor-display";
import { SponsorBannerStrip } from "../sponsor-banner-strip";

export function CaliWorkoutSponsorBanner() {
  const { data: sponsors, loading } = useSponsors();
  const routine = useMemo(
    () => sponsors.filter((s) => hasTier(s, "routine")),
    [sponsors],
  );

  if (loading || routine.length === 0) return null;

  return (
    <SponsorBannerStrip
      sponsors={routine}
      variant="routine"
      label="ROUTINE SPONSOR"
      icon={Dumbbell}
      impressionSpot="routine"
    />
  );
}