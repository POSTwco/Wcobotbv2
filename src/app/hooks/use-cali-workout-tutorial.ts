import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CaliTutorialLevel,
  type TutorialStep,
  clearTutorialDone,
  getNextStep,
  hasFirstSetValue,
  isExerciseFullyLogged,
  isTutorialDone,
  markTutorialDone,
} from "../lib/cali-workout-tutorial";

interface PlanBlock {
  items: Array<{ sets: number }>;
}

interface UseCaliWorkoutTutorialInput {
  level: number;
  planBlocks: PlanBlock[] | null;
  setsLogged: number;
  setsTotal: number;
  activeBlock: number;
  loggedSets: Set<string>;
  actuals: Record<string, { value: string; rpe: string; note: string }>;
  completedBlocks: Set<number>;
}

interface UseCaliWorkoutTutorialResult {
  step: TutorialStep;
  isActive: boolean;
  advance: () => void;
  skip: () => void;
  replay: () => void;
  completeTutorial: () => void;
}

const TERMINAL_STEPS: TutorialStep[] = ["nextExercise", "switchBlock", "finish"];

export function useCaliWorkoutTutorial({
  level,
  planBlocks,
  setsLogged,
  setsTotal,
  activeBlock,
  loggedSets,
  actuals,
  completedBlocks,
}: UseCaliWorkoutTutorialInput): UseCaliWorkoutTutorialResult {
  const tutorialLevel = level === 1 || level === 2 ? (level as CaliTutorialLevel) : null;

  const [step, setStep] = useState<TutorialStep>("done");
  const dismissedRef = useRef(false);
  const armedRef = useRef(false);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setStep("done");
  }, []);

  const skip = useCallback(() => {
    if (tutorialLevel) markTutorialDone(tutorialLevel);
    dismiss();
  }, [tutorialLevel, dismiss]);

  const completeTutorial = useCallback(() => {
    if (tutorialLevel) markTutorialDone(tutorialLevel);
    dismiss();
  }, [tutorialLevel, dismiss]);

  const replay = useCallback(() => {
    if (!tutorialLevel) return;
    clearTutorialDone(tutorialLevel);
    dismissedRef.current = false;
    armedRef.current = true;
    setStep("welcome");
  }, [tutorialLevel]);

  // Auto-start once per workout load — never re-fires after skip/dismiss.
  useEffect(() => {
    if (!tutorialLevel || !planBlocks?.length) return;
    if (armedRef.current || dismissedRef.current) return;

    armedRef.current = true;
    if (isTutorialDone(tutorialLevel)) {
      dismissedRef.current = true;
      return;
    }
    setStep("welcome");
  }, [tutorialLevel, planBlocks]);

  const firstExerciseSets = planBlocks?.[0]?.items?.[0]?.sets ?? 0;
  const firstExerciseLogged = useMemo(
    () => isExerciseFullyLogged(loggedSets, 0, 0, firstExerciseSets),
    [loggedSets, firstExerciseSets],
  );
  const firstSetHasValue = useMemo(
    () => hasFirstSetValue(actuals, 0, 0),
    [actuals],
  );

  const advance = useCallback(() => {
    setStep((current) => {
      if (current === "done") return "done";

      if (TERMINAL_STEPS.includes(current)) {
        dismissedRef.current = true;
        if (tutorialLevel) markTutorialDone(tutorialLevel);
        return "done";
      }

      return getNextStep(current);
    });
  }, [tutorialLevel]);

  // Event-driven transitions — forward only, never rewind.
  useEffect(() => {
    if (step === "done" || dismissedRef.current || !tutorialLevel) return;

    if (step === "enterSet" && firstSetHasValue) {
      setStep("logSets");
      return;
    }

    if (step === "logSets" && firstExerciseLogged) {
      setStep("nextExercise");
      return;
    }

    if (step === "nextExercise" && completedBlocks.has(activeBlock)) {
      setStep("switchBlock");
      return;
    }

    if (
      (step === "nextExercise" || step === "switchBlock")
      && setsTotal > 0
      && setsLogged >= setsTotal
    ) {
      setStep("finish");
    }
  }, [
    step,
    tutorialLevel,
    firstSetHasValue,
    firstExerciseLogged,
    completedBlocks,
    activeBlock,
    setsLogged,
    setsTotal,
  ]);

  const isActive = step !== "done" && !!tutorialLevel;

  return {
    step,
    isActive,
    advance,
    skip,
    replay,
    completeTutorial,
  };
}