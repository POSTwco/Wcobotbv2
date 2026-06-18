/**
 * WCO Calisthenics Admin — Blue Anodized Envelope
 * ===============================================
 * Special Admin Envelope for the ROUTINE OPERATIONS CONSOLE.
 * 
 * Same visual language and interaction as Golden/Silver/Bronze envelopes
 * but in a striking anodized blue metallic style.
 *
 * Contains a motivational speech + practical instruction manual explaining:
 * - How the calisthenics engine actually works
 * - Treating this as a personal business (quality traffic compounds everything)
 * - Daily health checks
 * - Exact smoke-test protocol for the live updateable panel
 *
 * Includes a toggle for the technical engine details.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Target, Heart, CheckCircle2, BarChart3, Flame,
} from "lucide-react";

// WCO Official Logo (reuse existing asset import path style)
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";

// ------------------------------------------------------------------------
// Blue Anodized Color Palette (metallic, professional, calm power)
// ------------------------------------------------------------------------
const BLUE = {
  primary: "#1E40AF",
  accent: "#3B82F6",
  light: "#60A5FA",
  dark: "#1E3A8A",
  glow: "rgba(59, 130, 246, 0.25)",
};

// ------------------------------------------------------------------------
// Letter Content — Motivational + Instructional
// Structured as stages for a "manual" feel
// ------------------------------------------------------------------------

interface LetterStage {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  paragraphs: string[];
}

const LETTER_STAGES: LetterStage[] = [
  {
    id: "mission",
    title: "THE MISSION",
    subtitle: "This Is Your Personal Business",
    icon: <Flame className="w-5 h-5" />,
    color: BLUE.primary,
    paragraphs: [
      "Stop for a moment. This panel is not just another admin screen. This is the control room for the entire calisthenics user experience on WCO.",
      "Even though there is no direct cost or revenue attached to these workouts today, the quality and consistency of what people experience here directly fuels every other part of the ecosystem. Every great routine builds habit. Every beautiful card builds trust. Every accurate cue builds loyalty.",
      "Treat this like your own business. The traffic, the engagement, the word-of-mouth from athletes who love their daily sessions — all of it lifts the battles, the NFTs, the governance, the culture, the entire brand. Quality routines are the quiet engine behind everything else growing.",
      "You are not maintaining a feature. You are curating a daily athletic ritual for real human beings who train on bars around the world.",
    ],
  },
  {
    id: "heart",
    title: "THE HEART",
    subtitle: "Create a Lasting User Experience",
    icon: <Heart className="w-5 h-5" />,
    color: BLUE.accent,
    paragraphs: [
      "The updateable panel you are looking at right now is one of the most powerful levers we have. When you edit a cue, change a description, perfect a photo URL, or carefully tune a dose — real people feel it the next time they generate a workout.",
      "This is how you build something that lasts. Not through hype. Through thousands of small, excellent moments that add up to athletes trusting that every time they open the calisthenics tab, the experience will be better than yesterday.",
      "Your job here is sacred: keep the library alive, accurate, educational, and beautiful. When users feel the care you put into this, they return. They bring friends. They engage deeper with the rest of the site. This is the foundation.",
    ],
  },
  {
    id: "daily",
    title: "DAILY HEALTH",
    subtitle: "Check the Pulse Every Day",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "#22C55E",
    paragraphs: [
      "Make it a ritual. Open this console daily. Look at the live numbers at the top: how many people signed in today, how many workouts were generated. These are heartbeats.",
      "Scan your overrides. Are the most important exercises getting the love they deserve — great cues, clear educational descriptions, perfect images? Is anything looking stale?",
      "A healthy control room means a healthy user experience. Neglect it and the routines slowly degrade. Nurture it and the entire calisthenics experience feels premium and cared for.",
      "This is not busy work. This is leadership. The athletes don't see the backend — they feel the result. Your daily attention is what makes it feel alive.",
    ],
  },
  {
    id: "testing",
    title: "SMOKE TEST PROTOCOL",
    subtitle: "Verify Every Change Like a Pro",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "#F59E0B",
    paragraphs: [
      "Never assume a change worked. Always smoke test properly. Here's the exact process:",
      "1. Make your edit (new cue, better description, custom bucket URL, new exercise, dose tweak).",
      "2. Hit Save to Live Engine. Wait for the success banner and library reload.",
      "3. Open a normal user session (or incognito) → go to the Calisthenics tab.",
      "4. Generate a workout at the appropriate level that would include your exercise.",
      "5. Find the exercise in the generated workout and open its card.",
      "6. Verify: cues match exactly what you wrote, description appears as Educational note, image shows if you set a custom URL, name and dose feel right.",
      "For new exercises: set a low level + correct category/pattern, generate at that level, confirm it appears cleanly.",
      "Test the visual too — narrow the window to see if your bucket image replaces the motion preview.",
      "Do this every time. It takes two minutes and it builds unbreakable confidence in the system.",
    ],
  },
];

// ------------------------------------------------------------------------
// BLUE ANODIZED ENVELOPE BUTTON (exact replica style, anodized blue theme)
// ------------------------------------------------------------------------

export function BlueEnvelopeButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative group cursor-pointer"
      aria-label="Open Calisthenics Admin Operations Envelope"
    >
      {/* Outer glow - anodized blue */}
      <motion.div
        className="absolute -inset-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at center, ${BLUE.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Envelope shape */}
      <div className="relative">
        {/* Main envelope body */}
        <div
          className="relative w-[200px] h-[140px] rounded-xl overflow-hidden border-2 transition-all duration-500"
          style={{
            borderColor: isHovered ? BLUE.accent : `${BLUE.accent}aa`,
            background: `linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #0f172a 100%)`,
            boxShadow: isHovered
              ? `0 0 30px ${BLUE.glow}, 0 0 60px rgba(59,130,246,0.1), inset 0 0 20px rgba(59,130,246,0.08)`
              : `0 0 15px rgba(59,130,246,0.1), inset 0 0 10px rgba(59,130,246,0.04)`,
          }}
        >
          {/* Envelope flap (triangle) */}
          <div className="absolute top-0 left-0 right-0">
            <svg viewBox="0 0 200 60" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="blueFlapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={BLUE.accent} stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.18" />
                  <stop offset="100%" stopColor={BLUE.accent} stopOpacity="0.25" />
                </linearGradient>
              </defs>
              <polygon points="0,0 200,0 100,55" fill="url(#blueFlapGrad)" />
              <polygon
                points="0,0 200,0 100,55"
                fill="none"
                stroke={BLUE.accent}
                strokeWidth="1"
                strokeOpacity="0.45"
              />
            </svg>
          </div>

          {/* Diagonal fold lines */}
          <svg viewBox="0 0 200 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="140" x2="100" y2="55" stroke={BLUE.accent} strokeWidth="0.5" strokeOpacity="0.25" />
            <line x1="200" y1="140" x2="100" y2="55" stroke={BLUE.accent} strokeWidth="0.5" strokeOpacity="0.25" />
          </svg>

          {/* Wax seal - anodized blue metallic */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-[38px] w-10 h-10 rounded-full flex items-center justify-center z-10"
            animate={isHovered ? { rotate: [0, -4, 4, 0], scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.6 }}
            style={{
              background: `radial-gradient(circle at 40% 35%, #60A5FA, ${BLUE.primary} 45%, #1E3A8A 90%)`,
              boxShadow: `0 2px 8px ${BLUE.glow}, inset 0 -1px 3px rgba(0,0,0,0.35)`,
            }}
          >
            <Target className="w-5 h-5 text-[#0B1120]" strokeWidth={2.5} />
          </motion.div>

          {/* Shimmer sweep - blue */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            animate={isHovered ? { x: ["-100%", "200%"] } : { x: "-100%" }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.8 }}
            style={{
              background: `linear-gradient(105deg, transparent 40%, rgba(96,165,250,0.1) 45%, rgba(96,165,250,0.22) 50%, rgba(96,165,250,0.1) 55%, transparent 60%)`,
              width: "100%",
            }}
          />

          {/* Label */}
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <div
              className="text-[9px] tracking-[2px] font-bold"
              style={{
                color: isHovered ? BLUE.light : BLUE.accent,
                fontFamily: "Orbitron, sans-serif",
                textShadow: isHovered ? "0 0 8px rgba(59,130,246,0.5)" : "none",
              }}
            >
              ADMIN ENVELOPE
            </div>
            <div className="text-[8px] text-[#64748B] tracking-wider mt-px" style={{ fontFamily: "DM Sans, sans-serif" }}>
              OPERATIONS &amp; ENGINE
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ------------------------------------------------------------------------
// THE MODAL — Motivational Speech + Instruction Manual + Technical Toggle
// ------------------------------------------------------------------------

export function CalisthenicsAdminEnvelopeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeStage, setActiveStage] = useState(0);
  const [hasRead, setHasRead] = useState<Set<number>>(new Set([0]));
  const [showTechnical, setShowTechnical] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setActiveStage(0);
      setHasRead(new Set([0]));
      setShowTechnical(false);
    }
  }, [open]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStage]);

  const goToStage = (i: number) => {
    setActiveStage(i);
    setHasRead((prev) => new Set([...prev, i]));
  };

  const stage = LETTER_STAGES[activeStage];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal — anodized blue theme */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
            initial={{ scale: 0.92, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 25 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={{
              background: "linear-gradient(180deg, #0f172a 0%, #0B1120 28%, #020617 100%)",
              border: `1px solid ${BLUE.accent}30`,
              boxShadow: `0 0 90px ${BLUE.glow}, 0 25px 60px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#3B82F6]/15 shrink-0">
              <div className="flex items-center gap-3">
                <img src={wcoLogoWhite} alt="WCO" className="h-8 w-auto object-contain opacity-80" />
                <div className="w-px h-7 bg-[#3B82F6]/20" />
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 40% 35%, #60A5FA, ${BLUE.primary} 48%, #1E3A8A 92%)`,
                    boxShadow: `0 0 16px ${BLUE.glow}`,
                  }}
                >
                  <Target className="w-4 h-4 text-[#0B1120]" strokeWidth={2.6} />
                </div>
                <div>
                  <h2
                    className="text-[#60A5FA] text-sm font-bold tracking-wider"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    ADMIN ENVELOPE
                  </h2>
                  <p className="text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Calisthenics Routine Operations Console — From the Protocol to You
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-[#E8ECF0] hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stage Navigation — blue accents */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-[#3B82F6]/10 overflow-x-auto shrink-0">
              {LETTER_STAGES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goToStage(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    i === activeStage ? "border" : hasRead.has(i) ? "bg-transparent opacity-70 hover:opacity-100" : "bg-transparent opacity-40 hover:opacity-70"
                  }`}
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    color: i === activeStage ? s.color : "#8494A7",
                    background: i === activeStage ? `${s.color}12` : undefined,
                    borderColor: i === activeStage ? `${s.color}35` : "transparent",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[0.4rem] font-bold shrink-0"
                    style={{
                      background: hasRead.has(i) ? `${s.color}18` : "rgba(132,148,167,0.1)",
                      color: hasRead.has(i) ? s.color : "#8494A7",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.28 }}
                  className="px-5 sm:px-8 py-6"
                >
                  {/* Stage header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${stage.color}12`,
                        border: `1px solid ${stage.color}30`,
                        boxShadow: `0 0 18px ${stage.color}10`,
                      }}
                    >
                      {stage.icon}
                    </div>
                    <div>
                      <div className="text-xs tracking-[1.5px] font-bold" style={{ color: "#64748B", fontFamily: "Orbitron, sans-serif" }}>
                        {stage.subtitle.toUpperCase()}
                      </div>
                      <div className="text-xl font-bold tracking-tight" style={{ color: stage.color, fontFamily: "Orbitron, sans-serif" }}>
                        {stage.title}
                      </div>
                    </div>
                  </div>

                  {/* Paragraphs */}
                  <div className="space-y-4 text-[15px] leading-relaxed text-[#C8D0DC]" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {stage.paragraphs.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>

                  {/* Special Technical Engine Toggle — only on the MISSION or HEART stage, or always show on last */}
                  {(stage.id === "mission" || stage.id === "heart" || stage.id === "testing") && (
                    <div className="mt-8 pt-6 border-t border-[#3B82F6]/15">
                      <button
                        onClick={() => setShowTechnical(!showTechnical)}
                        className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#3B82F6] hover:text-[#60A5FA] transition-colors mb-3"
                        style={{ fontFamily: "Orbitron, sans-serif" }}
                      >
                        {showTechnical ? "HIDE TECHNICAL ENGINE" : "SHOW TECHNICAL ENGINE — HOW THE WORKOUTS ARE MADE"} <span className="ml-1 opacity-70">({showTechnical ? "ON" : "OFF"})</span>
                      </button>

                      <AnimatePresence>
                        {showTechnical && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-xl border border-[#3B82F6]/25 bg-[#0B1120]/60 p-4 text-sm space-y-3 text-[#A3B0C2]">
                              <div className="font-semibold text-[#60A5FA] tracking-wide text-xs mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
                                HOW THE ENGINE ACTUALLY WORKS
                              </div>
                              <p>
                                Base library lives in cali_library.tsx (111 exercises across 6 categories and 14 movement patterns).
                                Your changes in this console are saved as <strong>overrides</strong> (cues, description, name, previewImageRef, dose, difficulty, etc.) and <strong>added exercises</strong> into Supabase KV.
                              </p>
                              <p>
                                Every workout generation calls the merge: base exercises + your added + overrides applied. The live list is handed to buildWorkoutPlan. Your cues become the exact "FORM CUES" the user sees. Your description shows as the Educational note. Your bucket URL can replace the default motion image on cards.
                              </p>
                              <p>
                                Pattern + category + level + equipment + difficulty weighting control selection. The panel you are using is the live map for all of it.
                              </p>
                              <div className="pt-1 text-[12px] text-[#64748B]">
                                Changes are instant for new generations. No redeploy needed for content edits.
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Extra motivation footer on final stage */}
                  {stage.id === "testing" && (
                    <div className="mt-8 pt-6 border-t border-[#3B82F6]/15 text-sm">
                      <div className="text-[#60A5FA] font-bold tracking-wider text-xs mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                        A FINAL NOTE FROM THE PROTOCOL
                      </div>
                      <p className="text-[#C8D0DC]">
                        You are not just editing exercises. You are shaping the daily physical experience of an entire community. Every time you open this envelope, remember: the athletes training right now are counting on the care you put into these routines.
                      </p>
                      <p className="mt-3 text-[#A3B0C2]">
                        Check the health. Smoke test properly. Update with intention. This panel is one of the most direct ways you can make WCO feel premium and alive every single day.
                      </p>
                      <p className="mt-4 text-right text-xs text-[#64748B]">Only Gains. Always.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#3B82F6]/10 flex items-center justify-between text-[10px] shrink-0" style={{ color: "#64748B" }}>
              <div>Blue Anodized Operations Envelope • WCO Calisthenics</div>
              <button onClick={onClose} className="hover:text-[#E8ECF0] transition-colors">Close Manual</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
