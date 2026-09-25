/**
 * Full athlete profile dialog — same footprint as a top-3 card.
 * Opened from compact roster tiles and from the top-3 cards.
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
  Target,
  TrendingUp,
  Trophy,
  Twitter,
  User,
  Volume2,
  VolumeX,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import type { Athlete, AthleteCompetitionCategory } from "../lib/types";
import { competitionCategoryLabel } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { InlineFlag } from "./country-flag";
import { formatPower } from "../lib/format";
import {
  athleteSfxEnabled,
  playAthleteClose,
  playAthleteOpen,
  playAthletePop,
  playAthleteTick,
  setAthleteSfxEnabled,
} from "../lib/athlete-sounds";

const SKILL_COLORS: Record<string, string> = {
  energy: "#f59e0b",
  performance: "#8B5CF6",
  static: "#22C55E",
  aggression: "#EF4444",
  dynamic: "#6AA3E0",
};

const SKILL_LABELS: Record<string, string> = {
  energy: "Pwr Dyn",
  performance: "Flow",
  static: "Statics",
  aggression: "Off/Def",
  dynamic: "Dynamics",
};

const SKILL_KEYS = ["energy", "performance", "static", "aggression", "dynamic"] as const;

const CATEGORY_ICON: Record<AthleteCompetitionCategory, typeof Zap> = {
  freestyle: Zap,
  statics: Target,
  freestyle_statics: Flame,
  reps_sets: Trophy,
};

function socialHref(
  kind: "instagram" | "twitter" | "youtube" | "website",
  raw: string,
): string {
  if (kind === "website" || raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "twitter") return `https://x.com/${handle}`;
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

function CountUp({ value, decimals = 0, duration = 700 }: { value: number; decimals?: number; duration?: number }) {
  const reduce = usePrefersReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setN(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);
  return <>{decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString()}</>;
}

function SkillMeter({
  label,
  value,
  color,
  animate,
}: {
  label: string;
  value: number;
  color: string;
  animate: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const [width, setWidth] = useState(animate ? 0 : pct);
  useEffect(() => {
    if (!animate) {
      setWidth(pct);
      return;
    }
    setWidth(0);
    const t = window.setTimeout(() => setWidth(pct), 40);
    return () => window.clearTimeout(t);
  }, [pct, animate, value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.6rem] text-[#8494A7] w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#162033] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: color,
            boxShadow: `0 0 8px ${color}88`,
            transition: animate ? "width 700ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          }}
        />
      </div>
      <span className="text-[0.6rem] font-mono w-6 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function AthleteDossier({
  athlete,
  roster,
  onClose,
  onSelect,
}: {
  athlete: Athlete;
  roster: Athlete[];
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
  const athleteIdRef = useRef(athlete.id);
  const rosterRef = useRef(roster);
  const closingRef = useRef(false);
  onCloseRef.current = onClose;
  onSelectRef.current = onSelect;
  athleteIdRef.current = athlete.id;
  rosterRef.current = roster;

  const index = Math.max(0, roster.findIndex((a) => a.id === athlete.id));
  const canStep = roster.length > 1;

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
    const i = list.findIndex((a) => a.id === athleteIdRef.current);
    const next = list[(i + dir + list.length) % list.length];
    if (next && next.id !== athleteIdRef.current) onSelectRef.current(next.id);
  }, []);

  const closeRef = useRef(requestClose);
  const stepRef = useRef(step);
  closeRef.current = requestClose;
  stepRef.current = step;

  useEffect(() => {
    playAthleteOpen();
  }, [athlete.id]);

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
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
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

  const borderColor = athlete.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete.pfpUrl && athlete.pfpUrl !== "placeholder";
  const winRate =
    athlete.wins + athlete.losses > 0
      ? (athlete.wins / (athlete.wins + athlete.losses)) * 100
      : 0;
  const category = competitionCategoryLabel(athlete.competitionCategory);
  const CategoryIcon = athlete.competitionCategory
    ? CATEGORY_ICON[athlete.competitionCategory] || Zap
    : null;
  const socials = [
    athlete.socials?.instagram
      ? { key: "instagram" as const, label: "Instagram", icon: Instagram, href: socialHref("instagram", athlete.socials.instagram), color: "#f472b6" }
      : null,
    athlete.socials?.twitter
      ? { key: "twitter" as const, label: "X", icon: Twitter, href: socialHref("twitter", athlete.socials.twitter), color: "#38bdf8" }
      : null,
    athlete.socials?.youtube
      ? { key: "youtube" as const, label: "YouTube", icon: Youtube, href: socialHref("youtube", athlete.socials.youtube), color: "#f87171" }
      : null,
    athlete.socials?.website
      ? { key: "website" as const, label: "Website", icon: Link2, href: socialHref("website", athlete.socials.website), color: "#6AA3E0" }
      : null,
  ].filter((s): s is NonNullable<typeof s> => !!s);

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
        aria-label={`${athlete.name} profile`}
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={closing ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-[#111827] border outline-none overflow-hidden"
        style={{
          borderColor: `${borderColor}88`,
          ["--glow" as string]: borderColor,
          animation: motionOff ? undefined : "dossierGlow 2.8s ease-in-out infinite",
          boxShadow: `0 0 32px ${borderColor}55, 0 0 80px ${borderColor}22`,
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
            aria-label="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="dossier-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="relative h-72 sm:h-96 bg-[#0B1120] overflow-hidden">
            {hasPfp ? (
              <ImageWithFallback
                src={athlete.pfpUrl}
                alt={athlete.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-[#4274B9]/15" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-black/25" />
            <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
              <div
                className="px-3 py-1 rounded-lg"
                style={{ background: `${borderColor}20`, border: `1px solid ${borderColor}40` }}
              >
                <span className="text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif", color: borderColor }}>
                  #{athlete.rank}
                </span>
              </div>
              {athlete.streak > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/40">
                  <Flame className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span className="text-xs text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {athlete.streak}
                  </span>
                </div>
              )}
              {athlete.status !== "active" && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold ${
                    athlete.status === "champion" ? "bg-[#D4A843]/20 text-[#D4A843]" : "bg-red-500/20 text-red-400"
                  }`}
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {athlete.status.toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute bottom-3 right-3 text-xs text-[#E8ECF0] flex items-center gap-1.5">
              <InlineFlag country={athlete.country} />
              <span>{athlete.country}</span>
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-4 -mt-2">
            <div className="flex items-center gap-2 mb-1 min-w-0 flex-wrap">
              <h2
                className="text-[#E8ECF0] font-bold text-base sm:text-lg"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                {athlete.name}
              </h2>
              {category && CategoryIcon && (
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
                  <CategoryIcon className="w-3 h-3" />
                  {category}
                </span>
              )}
            </div>
            {athlete.nickname && (
              <p className="text-sm mb-1" style={{ color: borderColor }}>
                "{athlete.nickname}"
              </p>
            )}
            {athlete.weightClass && (
              <p className="text-[0.65rem] text-[#8494A7]/80 mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {athlete.weightClass}
              </p>
            )}

            <div key={athlete.id} className="grid grid-cols-3 gap-2 mb-1">
              <div className="text-center rounded-lg py-1.5 transition-shadow hover:shadow-[0_0_18px_rgba(16,185,129,0.35)]">
                <p className="text-[#10b981] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <CountUp value={athlete.wins} />
                </p>
                <p className="text-[#8494A7] text-xs">Wins</p>
              </div>
              <div className="text-center rounded-lg py-1.5 transition-shadow hover:shadow-[0_0_18px_rgba(248,113,113,0.28)]">
                <p className="text-red-400 text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <CountUp value={athlete.losses} />
                </p>
                <p className="text-[#8494A7] text-xs">Losses</p>
              </div>
              <div className="text-center rounded-lg py-1.5 transition-shadow hover:shadow-[0_0_18px_rgba(66,116,185,0.4)]">
                <p className="text-[#4274B9] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <CountUp value={Number(formatPower(athlete.totalPowerRating)) || 0} decimals={1} duration={800} />
                </p>
                <p className="text-[#8494A7] text-xs">Power</p>
              </div>
            </div>
            <p className="text-center text-[0.6rem] text-[#D4A843]/90 mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
              Tournament {(athlete.tournamentWins || 0)}W-{(athlete.tournamentLosses || 0)}L
            </p>

            {athlete.skills && (
              <div className="space-y-1.5 mb-3">
                {SKILL_KEYS.map((skill) => (
                  <SkillMeter
                    key={`${athlete.id}-${skill}`}
                    label={SKILL_LABELS[skill]}
                    value={athlete.skills[skill] || 0}
                    color={SKILL_COLORS[skill]}
                    animate={!reduce}
                  />
                ))}
              </div>
            )}

            {athlete.bio && (
              <div className="pt-3 border-t border-[#4274B9]/15">
                <p
                  className="text-[0.55rem] tracking-[0.22em] text-[#6AA3E0] mb-1.5"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  PROFILE
                </p>
                <p className="text-sm text-[#C5CED6] leading-relaxed">{athlete.bio}</p>
              </div>
            )}

            <div className="space-y-2.5 pt-3 mt-3 border-t border-[#4274B9]/15">
              {athlete.specialMove && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#8494A7] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#f59e0b]" /> Special Move
                  </span>
                  <span className="text-[#f59e0b] text-right">{athlete.specialMove}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8494A7] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#10b981]" /> Win Rate
                </span>
                <span className="text-[#10b981]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  {winRate.toFixed(1)}%
                </span>
              </div>
              {athlete.totalVotes > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8494A7] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#4274B9]" /> Total Votes
                  </span>
                  <span className="text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                    {athlete.totalVotes.toLocaleString()}
                  </span>
                </div>
              )}
              {athlete.nftSeriesName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8494A7] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#D4A843]" /> NFT Series
                  </span>
                  <span className="text-[#D4A843] text-xs text-right" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {athlete.nftSeriesName}
                    {athlete.nftRarity ? ` · ${athlete.nftRarity}` : ""}
                  </span>
                </div>
              )}
              {!athlete.nftSeriesName && athlete.nftRarity && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8494A7] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#D4A843]" /> Rarity
                  </span>
                  <span className="text-[#D4A843] text-xs" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {athlete.nftRarity}
                  </span>
                </div>
              )}
            </div>

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-[#4274B9]/15">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playAthletePop()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      style={{ color: s.color }}
                    >
                      <Icon className="w-5 h-5" />
                      {s.label}
                    </a>
                  );
                })}
              </div>
            )}
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
            aria-label="Previous athlete"
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
            aria-label="Next athlete"
          >
            NEXT <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
