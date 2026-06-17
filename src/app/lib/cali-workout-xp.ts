/**
 * Session-local XP gamification — motivational only, no backend persistence.
 */

export const XP_PER_SET = 10;
export const XP_PER_BLOCK = 40;
export const XP_PER_PR = 25;
export const XP_WORKOUT_COMPLETE = 150;

export const XP_THRESHOLDS = [100, 250, 500, 1000];

export function xpForSet(): number { return XP_PER_SET; }
export function xpForBlock(): number { return XP_PER_BLOCK; }
export function xpForPr(): number { return XP_PER_PR; }
export function xpForWorkoutComplete(): number { return XP_WORKOUT_COMPLETE; }

export function getXpLevel(xp: number): number {
  let level = 1;
  for (const t of XP_THRESHOLDS) {
    if (xp >= t) level++;
  }
  return level;
}

export function getXpLevelLabel(xp: number): string {
  const lvl = getXpLevel(xp);
  if (lvl >= 5) return "Elite Athlete";
  if (lvl >= 4) return "Warrior";
  if (lvl >= 3) return "Contender";
  if (lvl >= 2) return "Rising";
  return "Rookie";
}

export function xpProgressInLevel(xp: number): { current: number; next: number; pct: number } {
  const thresholds = [0, ...XP_THRESHOLDS];
  const lvl = getXpLevel(xp);
  const floor = thresholds[lvl - 1] ?? 0;
  const ceiling = thresholds[lvl] ?? thresholds[thresholds.length - 1] + 500;
  const current = xp - floor;
  const next = ceiling - floor;
  return { current, next, pct: Math.min(100, Math.round((current / next) * 100)) };
}