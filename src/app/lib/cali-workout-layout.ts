/** Shared layout offsets for active workout screens (mobile safe areas). */

export const CALI_WORKOUT_ACTION_BAR_BOTTOM =
  "max(1rem, env(safe-area-inset-bottom, 0px))";

/** Coach toast sits above the fixed workout action bar + safe area. */
export const CALI_COACH_TOAST_BOTTOM =
  "calc(var(--workout-action-bar-h) + var(--workout-bar-offset) + 0.75rem)";