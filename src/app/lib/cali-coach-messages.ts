/**
 * Tony Robbins-style coaching copy — uplifting, identity-shifting, never cheesy-generic.
 */

export type CoachTrigger = "setLogged" | "blockComplete" | "prHit" | "workoutComplete" | "levelCrush";

const SET_LOGGED = [
  "That rep wasn't just movement — it was you choosing to become UNSTOPPABLE.",
  "Every set you log is a vote for the person you're becoming. You just cast another one.",
  "Champions aren't born in comfort zones. You just proved you're willing to go there.",
  "Your body heard that. Your mind registered it. That's how legends are built — one set at a time.",
  "You didn't just do an exercise. You stacked evidence that you're the kind of person who SHOWS UP.",
  "The old you would have skipped this. The new you just logged it. Feel that shift.",
  "Discipline is choosing what you want MOST over what you want NOW. You just chose greatness.",
];

const BLOCK_COMPLETE = [
  "Block CRUSHED. Your future self is already thanking you for this.",
  "That's not a workout block — that's a declaration. And you just delivered.",
  "Momentum is a superpower. You just built more of it. Keep riding.",
  "Most people quit here. You didn't. That's the difference between wishing and DOING.",
  "Block down. Standards up. You're operating at a different level now.",
];

const PR_HIT = [
  "NEW RECORD. The old you couldn't do that. The new you just DID.",
  "You didn't beat a number — you beat your former self. That's the only competition that matters.",
  "Personal best! This is what happens when commitment meets consistency.",
  "PR ALERT. Your body just learned a new ceiling. And you're just getting started.",
];

const WORKOUT_COMPLETE = [
  "VICTORY. You didn't work out — you declared war on your limits and WON.",
  "Workout complete. You showed up, you executed, you FINISHED. That's elite behavior.",
  "The hardest part wasn't the last rep — it was showing up. You did both. Respect.",
  "You just turned intention into action. That's the alchemy of transformation.",
  "Done. Not perfect — POWERFUL. And powerful beats perfect every single day.",
];

const LEVEL_CRUSH: Record<number, string[]> = {
  1: ["Level 1 conquered. You're building the foundation of something extraordinary."],
  2: ["Level 2 isn't a label — it's evidence of who you're becoming. You just crushed it."],
  3: ["Level 3. ELITE territory. You're training like the athlete you were born to be."],
};

let lastIndex: Partial<Record<CoachTrigger, number>> = {};

function pick(pool: string[], trigger: CoachTrigger): string {
  let idx = Math.floor(Math.random() * pool.length);
  if (lastIndex[trigger] === idx && pool.length > 1) {
    idx = (idx + 1) % pool.length;
  }
  lastIndex[trigger] = idx;
  return pool[idx];
}

export function getCoachMessage(trigger: CoachTrigger, level?: number): string {
  switch (trigger) {
    case "setLogged": return pick(SET_LOGGED, trigger);
    case "blockComplete": return pick(BLOCK_COMPLETE, trigger);
    case "prHit": return pick(PR_HIT, trigger);
    case "workoutComplete": return pick(WORKOUT_COMPLETE, trigger);
    case "levelCrush": {
      const pool = LEVEL_CRUSH[level ?? 1] ?? LEVEL_CRUSH[1];
      return pick(pool, trigger);
    }
  }
}