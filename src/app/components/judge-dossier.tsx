/**
 * Judge profile dialog. Same footprint, motion, and controls as an athlete dossier.
 * Only the public card is shown.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Instagram,
  Link2,
  Scale,
  Target,
  Volume2,
  VolumeX,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import type { PublicJudge } from "../lib/types";
import { orgDisciplineLabel } from "../lib/org-sign";
import { InlineFlag } from "./country-flag";
import { JudgeBadge } from "./judge-badge";
import { JudgeMark } from "./judge-mark";
import {
  athleteSfxEnabled,
  playAthleteClose,
  playAthleteOpen,
  playAthletePop,
  playAthleteTick,
  setAthleteSfxEnabled,
} from "../lib/athlete-sounds";

const BORDER = "#4274B9";

const DISCIPLINE_ICON = {
  freestyle: Zap,
  statics: Target,
  freestyle_statics: Flame,
} as const;

function socialHref(kind: "instagram" | "youtube" | "website", raw: string): string {
  if (kind === "website" || raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  return `https://youtube.com/${handle}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export function JudgeDossier({
  judge,
  roster,
  onClose,
  onSelect,
}: {
  judge: PublicJudge;
  roster: PublicJudge[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const reduce = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [soundOn, setSoundOn] = useState(athleteSfxEnabled);
  const tickAt = useRef(0);
  const onCloseRef = useRef(onClose);
  const onSelectRef = useRef(onSelect);
  const judgeIdRef = useRef(judge.id);
  const rosterRef = useRef(roster);
  const closingRef = useRef(false);
  onCloseRef.current = onClose;
  onSelectRef.current = onSelect;
  judgeIdRef.current = judge.id;
  rosterRef.current = roster;

  const index = Math.max(0, roster.findIndex((row) => row.id === judge.id));
  const canStep = roster.length > 1;
  const discipline = orgDisciplineLabel(judge.discipline);
  const DisciplineIcon = DISCIPLINE_ICON[judge.discipline as keyof typeof DISCIPLINE_ICON] || Scale;
  const socials = [
    judge.instagram
      ? { key: "instagram", label: "Instagram", icon: Instagram, href: socialHref("instagram", judge.instagram), color: "#f472b6" }
      : null,
    judge.youtube
      ? { key: "youtube", label: "YouTube", icon: Youtube, href: socialHref("youtube", judge.youtube), color: "#f87171" }
      : null,
    judge.website
      ? { key: "website", label: "Website", icon: Link2, href: socialHref("website", judge.website), color: "#6AA3E0" }
      : null,
  ].filter((row): row is NonNullable<typeof row> => !!row);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    playAthleteClose();
    if (reduce) {
      onCloseRef.current();
      return;
    }
    setClosing(true);
  }, [reduce]);

  const step = useCallback((dir: -1 | 1) => {
    if (closingRef.current) return;
    const list = rosterRef.current;
    if (list.length < 2) return;
    const i = list.findIndex((row) => row.id === judgeIdRef.current);
    const next = list[(i + dir + list.length) % list.length];
    if (next && next.id !== judgeIdRef.current) onSelectRef.current(next.id);
  }, []);

  const closeRef = useRef(requestClose);
  const stepRef = useRef(step);
  closeRef.current = requestClose;
  stepRef.current = step;

  useEffect(() => {
    playAthleteOpen();
  }, [judge.id]);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(() => onCloseRef.current(), 180);
    return () => window.clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    root?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepRef.current(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepRef.current(-1);
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (nodes.length === 0) return;
      const i = nodes.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        nodes[nodes.length - 1].focus();
      } else if (!e.shiftKey && (i === -1 || i === nodes.length - 1)) {
        e.preventDefault();
        nodes[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prevFocus?.focus?.();
    };
  }, []);

  const hoverTick = () => {
    const now = performance.now();
    if (now - tickAt.current < 90) return;
    tickAt.current = now;
    playAthleteTick();
  };

  const motionOff = reduce || closing;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: reduce ? 0 : 0.18 }}
      onClick={() => closeRef.current()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${judge.name} judge profile`}
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={closing ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-[#111827] border outline-none overflow-hidden"
        style={{
          borderColor: `${BORDER}88`,
          ["--glow" as string]: BORDER,
          animation: motionOff ? undefined : "dossierGlow 2.8s ease-in-out infinite",
          boxShadow: `0 0 32px ${BORDER}55, 0 0 80px ${BORDER}22`,
        }}
      >
        <style>{`
          @keyframes dossierGlow {
            0%, 100% { box-shadow: 0 0 28px color-mix(in srgb, var(--glow) 42%, transparent), 0 0 72px color-mix(in srgb, var(--glow) 16%, transparent); }
            50% { box-shadow: 0 0 46px color-mix(in srgb, var(--glow) 72%, transparent), 0 0 110px color-mix(in srgb, var(--glow) 30%, transparent); }
          }
          .dossier-scroll { scrollbar-width: thin; scrollbar-color: rgba(106,163,224,0.45) transparent; }
          .dossier-scroll::-webkit-scrollbar { width: 8px; }
          .dossier-scroll::-webkit-scrollbar-track { background: transparent; }
          .dossier-scroll::-webkit-scrollbar-thumb { background: rgba(106,163,224,0.4); border-radius: 99px; }
        `}</style>

        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setAthleteSfxEnabled(next);
              setSoundOn(next);
              if (next) playAthletePop();
            }}
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-white"
            aria-label={soundOn ? "Mute profile sounds" : "Enable profile sounds"}
            title={soundOn ? "Mute sounds" : "Enable sounds"}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => closeRef.current()}
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-white"
            aria-label="Close judge profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="dossier-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="relative bg-[#0B1120]">
            <JudgeMark
              id={judge.id}
              hasPhoto={judge.hasPhoto}
              name={judge.name}
              iconClassName="w-16 h-16 text-[#4274B9]/15"
              className={`block w-full h-auto max-h-[70vh] object-contain ${judge.hasPhoto ? "" : "min-h-48"}`}
            />
            <div className="absolute top-3 left-3">
              <JudgeBadge />
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-4 pt-3">
            <div className="flex items-center gap-2 mb-1 min-w-0 flex-wrap">
              <h2 className="text-[#E8ECF0] font-bold text-base sm:text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {judge.name}
              </h2>
              {discipline ? (
                <span
                  className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[0.55rem] font-bold tracking-wide"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    background: "rgba(66,116,185,0.18)",
                    border: "1px solid rgba(106,163,224,0.45)",
                    color: "#6AA3E0",
                    boxShadow: "0 0 12px rgba(106,163,224,0.25)",
                  }}
                >
                  <DisciplineIcon className="w-3 h-3" />
                  {discipline}
                </span>
              ) : null}
            </div>
            {judge.country ? (
              <p className="mt-1 text-sm text-[#C5D0DC] flex items-center gap-1.5">
                <InlineFlag country={judge.country} /> {judge.country}
              </p>
            ) : null}
            <p className="text-[0.65rem] text-[#8494A7]/80 mb-3 mt-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
              OFFICIAL PRO JUDGE
            </p>

            {judge.bio ? (
              <div className="pt-3 border-t border-[#4274B9]/15">
                <p
                  className="text-[0.55rem] tracking-[0.22em] text-[#6AA3E0] mb-1.5"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  PROFILE
                </p>
                <p className="text-sm text-[#C5CED6] leading-relaxed whitespace-pre-wrap">{judge.bio}</p>
              </div>
            ) : null}

            {socials.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-[#4274B9]/15">
                {socials.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playAthletePop()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      style={{ color: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-t border-[#4274B9]/20 bg-[#0B1120]/80">
          <button
            type="button"
            disabled={!canStep}
            onMouseEnter={canStep ? hoverTick : undefined}
            onClick={() => step(-1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.6rem] text-[#6AA3E0] border border-[#4274B9]/30 hover:border-[#6AA3E0]/60 hover:shadow-[0_0_14px_rgba(106,163,224,0.35)] disabled:opacity-30 disabled:pointer-events-none"
            style={{ fontFamily: "Orbitron, sans-serif" }}
            aria-label="Previous judge"
          >
            <ChevronLeft className="w-4 h-4" /> PREV
          </button>
          <span className="text-[0.55rem] text-[#8494A7] tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {index + 1} OF {Math.max(roster.length, 1)}
          </span>
          <button
            type="button"
            disabled={!canStep}
            onMouseEnter={canStep ? hoverTick : undefined}
            onClick={() => step(1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.6rem] text-[#6AA3E0] border border-[#4274B9]/30 hover:border-[#6AA3E0]/60 hover:shadow-[0_0_14px_rgba(106,163,224,0.35)] disabled:opacity-30 disabled:pointer-events-none"
            style={{ fontFamily: "Orbitron, sans-serif" }}
            aria-label="Next judge"
          >
            NEXT <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
