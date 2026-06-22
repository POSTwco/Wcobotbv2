/**
 * Beginner/Intermediate workout tutorial — step copy, storage, and gating.
 * Shown once per level (L1, L2). L3+ and Elite are excluded.
 */

export type CaliTutorialLevel = 1 | 2;

export type TutorialStep =
  | "welcome"
  | "progress"
  | "preview"
  | "enterSet"
  | "logSets"
  | "nextExercise"
  | "switchBlock"
  | "finish"
  | "done";

export const TUTORIAL_STEPS: TutorialStep[] = [
  "welcome",
  "progress",
  "preview",
  "enterSet",
  "logSets",
  "nextExercise",
  "switchBlock",
  "finish",
];

export const TUTORIAL_TARGET: Record<Exclude<TutorialStep, "welcome" | "done">, string> = {
  progress: '[data-cali-tutorial="progress"]',
  preview: '[data-cali-tutorial="exercise-card"]',
  enterSet: '[data-cali-tutorial="set-input"]',
  logSets: '[data-cali-tutorial="log-all"]',
  nextExercise: '[data-cali-tutorial="exercise-card"]',
  switchBlock: '[data-cali-tutorial="block-tabs"]',
  finish: '[data-cali-tutorial="complete-workout"]',
};

const STORAGE_KEY = "botb-cali-tutorial-v1";

interface TutorialState {
  "1"?: boolean;
  "2"?: boolean;
}

function readState(): TutorialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TutorialState;
  } catch {
    return {};
  }
}

function writeState(state: TutorialState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function shouldRunTutorial(planLevel: number): boolean {
  return planLevel === 1 || planLevel === 2;
}

export function isTutorialDone(level: CaliTutorialLevel): boolean {
  const state = readState();
  return !!state[String(level)];
}

export function markTutorialDone(level: CaliTutorialLevel): void {
  const state = readState();
  state[String(level)] = true;
  writeState(state);
}

export function clearTutorialDone(level: CaliTutorialLevel): void {
  const state = readState();
  delete state[String(level)];
  writeState(state);
}

export function getStepIndex(step: TutorialStep): number {
  const idx = TUTORIAL_STEPS.indexOf(step);
  return idx >= 0 ? idx + 1 : 0;
}

export function getStepCount(): number {
  return TUTORIAL_STEPS.length;
}

interface StepCopy {
  title: string;
  body: string;
  bullets?: string[];
}

const WELCOME_L1: StepCopy = {
  title: "How your workout works",
  body: "Four quick steps — you'll be logging like a pro in minutes.",
  bullets: [
    "Preview each exercise and check your form cues",
    "Enter reps or seconds for every set",
    "Tap Log all sets to save your work",
    "Hit Complete Workout when every set is logged",
  ],
};

const WELCOME_L2: StepCopy = {
  title: "How your workout works",
  body: "Quick refresher on the logging flow:",
  bullets: [
    "Use the preview and coaching guide before each move",
    "Log reps or time for each set — RPE is optional",
    "Save with Log all sets before moving on",
    "Complete Workout once all sets are logged",
  ],
};

const STEP_COPY_L1: Record<Exclude<TutorialStep, "welcome" | "done">, StepCopy> = {
  progress: {
    title: "Track your progress",
    body: "This ring fills as you log sets. Watch it climb — that's your workout coming together.",
  },
  preview: {
    title: "Learn the movement",
    body: "Check the preview image and open \"How to do it perfectly\" for form cues before you start.",
  },
  enterSet: {
    title: "Log each set",
    body: "Type how many reps or seconds you completed for Set 1. RPE is optional but helpful.",
  },
  logSets: {
    title: "Save your work",
    body: "Tap the gold Log all sets button. Nothing counts toward your workout until you do.",
  },
  nextExercise: {
    title: "Keep moving",
    body: "Great start! Scroll to the next exercise, do the movement, and repeat — enter sets, then log.",
  },
  switchBlock: {
    title: "Next section",
    body: "Block complete! Tap the next tab above (Warm-Up → Push → Pull, etc.) to continue your workout.",
  },
  finish: {
    title: "Finish strong",
    body: "Every set logged? Tap Complete Workout to finish, earn XP, and build your streak.",
  },
};

const STEP_COPY_L2: Record<Exclude<TutorialStep, "welcome" | "done">, StepCopy> = {
  progress: {
    title: "Track your progress",
    body: "The ring tracks sets logged vs. total. Use it to pace yourself through the session.",
  },
  preview: {
    title: "Learn the movement",
    body: "Review the preview and coaching guide — solid form beats rushing through reps.",
  },
  enterSet: {
    title: "Log each set",
    body: "Enter your reps or hold time for Set 1. Add RPE if you want to track intensity.",
  },
  logSets: {
    title: "Save your work",
    body: "Hit Log all sets to commit your numbers. Unlogged sets won't count.",
  },
  nextExercise: {
    title: "Keep moving",
    body: "Move to the next exercise. Same rhythm: perform, enter values, log all sets.",
  },
  switchBlock: {
    title: "Next section",
    body: "Section done. Switch to the next block tab and keep the momentum going.",
  },
  finish: {
    title: "Finish strong",
    body: "All sets logged? Complete Workout to lock in your session and XP.",
  },
};

export function getTutorialCopy(step: TutorialStep, level: CaliTutorialLevel): StepCopy {
  if (step === "welcome") {
    return level === 1 ? WELCOME_L1 : WELCOME_L2;
  }
  if (step === "done") {
    return { title: "", body: "" };
  }
  return level === 1 ? STEP_COPY_L1[step] : STEP_COPY_L2[step];
}

export function getNextStep(step: TutorialStep): TutorialStep {
  const idx = TUTORIAL_STEPS.indexOf(step);
  if (idx < 0 || idx >= TUTORIAL_STEPS.length - 1) return "done";
  return TUTORIAL_STEPS[idx + 1];
}

export function isExerciseFullyLogged(
  loggedSets: Set<string>,
  blockIndex: number,
  itemIndex: number,
  setCount: number,
): boolean {
  for (let s = 0; s < setCount; s++) {
    if (!loggedSets.has(`${blockIndex}|${itemIndex}|${s}`)) return false;
  }
  return setCount > 0;
}

export function hasFirstSetValue(
  actuals: Record<string, { value: string }>,
  blockIndex: number,
  itemIndex: number,
): boolean {
  const key = `${blockIndex}|${itemIndex}|0`;
  const v = Number(actuals[key]?.value);
  return Number.isFinite(v) && v > 0;
}