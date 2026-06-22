/**
 * Spotlight tutorial overlay for L1/L2 workout onboarding.
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, Sparkles, X } from "lucide-react";
import {
  type CaliTutorialLevel,
  type TutorialStep,
  TUTORIAL_TARGET,
  getStepCount,
  getStepIndex,
  getTutorialCopy,
} from "../../lib/cali-workout-tutorial";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  step: TutorialStep;
  level: CaliTutorialLevel;
  onAdvance: () => void;
  onSkip: () => void;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function SpotlightCard({
  rect,
  title,
  body,
  bullets,
  stepNum,
  totalSteps,
  onAdvance,
  onSkip,
  showNext,
  advanceLabel,
}: {
  rect: Rect | null;
  title: string;
  body: string;
  bullets?: string[];
  stepNum: number;
  totalSteps: number;
  onAdvance: () => void;
  onSkip: () => void;
  showNext: boolean;
  advanceLabel: string;
}) {
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 400;

  let cardTop = viewportH / 2 - 80;
  let cardLeft = 16;
  const cardWidth = Math.min(360, viewportW - 32);

  if (rect) {
    const spaceBelow = viewportH - (rect.top + rect.height);
    const spaceAbove = rect.top;
    if (spaceBelow >= 180) {
      cardTop = rect.top + rect.height + TOOLTIP_GAP;
    } else if (spaceAbove >= 180) {
      cardTop = Math.max(16, rect.top - TOOLTIP_GAP - 160);
    } else {
      cardTop = Math.max(16, viewportH - 200);
    }
    cardLeft = Math.max(16, Math.min(rect.left, viewportW - cardWidth - 16));
  }

  return (
    <>
      {rect && (
        <div
          className="fixed z-[59] pointer-events-none"
          style={{
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            borderRadius: 12,
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}
      {!rect && <div className="fixed inset-0 z-[59] bg-black/72 pointer-events-auto" />}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="fixed z-[60] pointer-events-auto"
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <div
          className="rounded-2xl border shadow-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(66,116,185,0.18), rgba(11,17,32,0.98))",
            borderColor: "rgba(212,168,67,0.4)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(212,168,67,0.1)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <p className="text-[0.55rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
                QUICK GUIDE · {stepNum}/{totalSteps}
              </p>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="p-1 rounded-lg text-[#8494A7] hover:text-white hover:bg-white/5"
              aria-label="Skip tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-sm font-bold text-white mb-1.5" style={dmSans}>{title}</h3>
          <p className="text-xs text-[#C8D0DC] leading-relaxed mb-3" style={dmSans}>{body}</p>

          {bullets && bullets.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {bullets.map((b, i) => (
                <li key={i} className="text-xs text-[#A3B0C2] flex items-start gap-2" style={dmSans}>
                  <span className="text-[#D4A843] font-bold mt-0.5">{i + 1}.</span>
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            {showNext && (
              <button
                type="button"
                onClick={onAdvance}
                className="flex-1 min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold"
                style={{
                  ...dmSans,
                  background: "linear-gradient(135deg, #4274B9, #3563A0)",
                  color: "#fff",
                }}
              >
                {advanceLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#8494A7] hover:text-white border border-white/10"
              style={dmSans}
            >
              Skip
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function WelcomeModal({
  level,
  onAdvance,
  onSkip,
}: {
  level: CaliTutorialLevel;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const copy = getTutorialCopy("welcome", level);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75"
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border p-5 sm:p-6"
        style={{
          background: "linear-gradient(160deg, rgba(66,116,185,0.12), rgba(11,17,32,0.98))",
          borderColor: "rgba(212,168,67,0.4)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
          >
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[0.55rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
              L{level} WORKOUT GUIDE
            </p>
            <h2 className="text-base font-bold text-white" style={dmSans}>{copy.title}</h2>
          </div>
        </div>

        <p className="text-sm text-[#C8D0DC] mb-4" style={dmSans}>{copy.body}</p>

        {copy.bullets && (
          <ul className="space-y-2 mb-5">
            {copy.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-[#A3B0C2] px-3 py-2 rounded-xl"
                style={{ ...dmSans, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(66,116,185,0.15)" }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[0.6rem] font-bold"
                  style={{ background: "rgba(66,116,185,0.25)", color: "#6AA3E0" }}
                >
                  {i + 1}
                </span>
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdvance}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{
              ...dmSans,
              background: "linear-gradient(135deg, #4274B9, #3563A0)",
              color: "#fff",
              boxShadow: "0 4px 18px rgba(66,116,185,0.4)",
            }}
          >
            Let's go
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold text-[#8494A7] border border-white/10 hover:text-white"
            style={dmSans}
          >
            Skip
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const MANUAL_ADVANCE_STEPS: TutorialStep[] = ["progress", "preview", "nextExercise", "switchBlock", "finish"];

export function CaliWorkoutTutorial({ step, level, onAdvance, onSkip }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  const updateRect = useCallback(() => {
    if (step === "welcome" || step === "done") {
      setRect(null);
      return;
    }
    const selector = TUTORIAL_TARGET[step as keyof typeof TUTORIAL_TARGET];
    if (!selector) {
      setRect(null);
      return;
    }
    setRect(measureTarget(selector));
  }, [step]);

  useEffect(() => {
    updateRect();
    const t = window.setTimeout(updateRect, 100);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateRect) : null;
    const selector = step !== "welcome" && step !== "done"
      ? TUTORIAL_TARGET[step as keyof typeof TUTORIAL_TARGET]
      : null;
    const el = selector ? document.querySelector(selector) : null;
    if (ro && el) ro.observe(el);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      ro?.disconnect();
    };
  }, [step, updateRect]);

  if (step === "done") return null;

  const totalSteps = getStepCount();
  const stepNum = getStepIndex(step);
  const advanceLabel =
    step === "finish" ? "Start training"
    : step === "nextExercise" ? "Got it — keep going"
    : "Got it";

  return (
    <AnimatePresence mode="wait">
      {step === "welcome" ? (
        <WelcomeModal key="welcome" level={level} onAdvance={onAdvance} onSkip={onSkip} />
      ) : (
        <SpotlightCard
          key={step}
          rect={rect}
          title={getTutorialCopy(step, level).title}
          body={getTutorialCopy(step, level).body}
          stepNum={stepNum}
          totalSteps={totalSteps}
          onAdvance={onAdvance}
          onSkip={onSkip}
          showNext={MANUAL_ADVANCE_STEPS.includes(step)}
          advanceLabel={advanceLabel}
        />
      )}
    </AnimatePresence>
  );
}