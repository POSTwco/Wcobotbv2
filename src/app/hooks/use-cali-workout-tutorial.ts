import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CaliTutorialLevel,
  type TutorialStep,
  clearTutorialDone,
  getNextStep,
  hasFirstSetValue,
  isExerciseFullyLogged,
  isTutorialDone,
  markTutorialDone,
  shouldRunTutorial,
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
  forceActive?: boolean;
}

interface UseCaliWorkoutTutorialResult {
  step: TutorialStep;
  isActive: boolean;
  advance: () => void;
  skip: () => void;
  replay: () => void;
  completeTutorial: () => void;
}

export function useCaliWorkoutTutorial({
  level,
  planBlocks,
  setsLogged,
  setsTotal,
  activeBlock,
  loggedSets,
  actuals,
  completedBlocks,
  forceActive = false,
}: UseCaliWorkoutTutorialInput): UseCaliWorkoutTutorialResult {
  const tutorialLevel = level === 1 || level === 2 ? (level as CaliTutorialLevel) : null;

  const [step, setStep] = useState<TutorialStep>("done");
  const [manuallyActive, setManuallyActive] = useState(false);

  const shouldAutoStart = useMemo(() => {
    if (!tutorialLevel || !shouldRunTutorial(level)) return false;
    return !isTutorialDone(tutorialLevel);
  }, [tutorialLevel, level]);

  useEffect(() => {
    if (!tutorialLevel) {
      setStep("done");
      return;
    }
    if (forceActive || manuallyActive) {
      if (step === "done") setStep("welcome");
      return;
    }
    if (shouldAutoStart && step === "done") {
      setStep("welcome");
    } else if (!shouldAutoStart && !manuallyActive && step !== "done") {
      setStep("done");
    }
  }, [tutorialLevel, shouldAutoStart, forceActive, manuallyActive, step]);

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
      return getNextStep(current);
    });
  }, []);

  const skip = useCallback(() => {
    if (tutorialLevel) markTutorialDone(tutorialLevel);
    setManuallyActive(false);
    setStep("done");
  }, [tutorialLevel]);

  const completeTutorial = useCallback(() => {
    if (tutorialLevel) markTutorialDone(tutorialLevel);
    setManuallyActive(false);
    setStep("done");
  }, [tutorialLevel]);

  const replay = useCallback(() => {
    if (!tutorialLevel) return;
    clearTutorialDone(tutorialLevel);
    setManuallyActive(true);
    setStep("welcome");
  }, [tutorialLevel]);

  useEffect(() => {
    if (step === "done" || !tutorialLevel) return;

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

    if (step === "switchBlock" && setsTotal > 0 && setsLogged >= setsTotal) {
      setStep("finish");
      return;
    }

    if (step === "nextExercise" && setsTotal > 0 && setsLogged >= setsTotal) {
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