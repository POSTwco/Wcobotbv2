/**
 * Elite Tech Vault — "Become a Pro WCO Sponsored Athlete" CTA
 * Links to the existing /apply athlete application flow.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import type { Athlete } from "../../lib/types";
import { MiniAthleteCardTeaser } from "./mini-athlete-card-teaser";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const STYLES_ID = "elite-athlete-cta-keyframes";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    @keyframes elite-cta-pulse-ring {
      0%   { transform: scale(0.98); opacity: 0.55; }
      50%  { transform: scale(1.02); opacity: 0.25; }
      100% { transform: scale(1.06); opacity: 0; }
    }
    @keyframes elite-cta-sparkle {
      0%, 100% { opacity: 0; transform: scale(0); }
      50%      { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

const SPARKLES = [
  { top: "12%", left: "8%", delay: 0 },
  { top: "22%", right: "10%", delay: 0.6 },
  { bottom: "18%", left: "14%", delay: 1.2 },
  { bottom: "28%", right: "12%", delay: 1.8 },
] as const;

function pickTopAthlete(athletes: Athlete[]): Athlete | null {
  if (!athletes.length) return null;
  const sorted = [...athletes].sort((a, b) => (b.totalPowerRating || 0) - (a.totalPowerRating || 0));
  return sorted[0];
}

export function EliteSponsoredAthleteCta() {
  const [topAthlete, setTopAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    ensureStyles();
    api.getAthletes().then((res) => {
      if (res.success && res.data?.length) {
        setTopAthlete(pickTopAthlete(res.data));
      }
    }).catch(() => {});
  }, []);

  return (
    <Link
      to="/apply"
      className="block group outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] rounded-2xl"
      aria-label="Become a Pro WCO Sponsored Athlete — apply on Battle of the Bars"
    >
      <motion.div
        className="relative"
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        {/* Static iridescent radiance */}
        <div
          className="absolute -inset-1 rounded-[1.35rem] opacity-50 mix-blend-screen pointer-events-none"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(212,168,67,0.45) 0%,
              rgba(168,216,234,0.35) 35%,
              rgba(196,181,253,0.3) 65%,
              rgba(232,180,184,0.25) 100%
            )`,
            filter: "blur(14px)",
          }}
          aria-hidden
        />

        {/* Pulsing glow ring */}
        <div
          className="absolute -inset-0.5 rounded-[1.25rem] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(212,168,67,0.35) 0%, transparent 70%)",
            animation: "elite-cta-pulse-ring 2.8s ease-out infinite",
          }}
          aria-hidden
        />

        {/* Static gradient border */}
        <div
          className="absolute -inset-[2px] rounded-[1.25rem] pointer-events-none"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(212,168,67,0.7) 0%,
              rgba(168,216,234,0.5) 40%,
              rgba(196,181,253,0.5) 70%,
              rgba(212,168,67,0.7) 100%
            )`,
          }}
          aria-hidden
        />

        {/* Glass body */}
        <div
          className="relative rounded-2xl overflow-hidden border border-white/[0.12]"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(212,168,67,0.12) 0%,
              rgba(11,17,32,0.75) 35%,
              rgba(66,116,185,0.08) 65%,
              rgba(212,168,67,0.1) 100%
            )`,
            backdropFilter: "blur(20px) saturate(1.6)",
            WebkitBackdropFilter: "blur(20px) saturate(1.6)",
            boxShadow:
              "0 0 40px rgba(212,168,67,0.12), inset 0 1px 0 rgba(255,248,220,0.15), inset 0 -8px 24px rgba(0,0,0,0.2)",
          }}
        >
          {/* Frost layer */}
          <div
            className="absolute inset-0 backdrop-blur-[2px] bg-white/[0.03] pointer-events-none"
            style={{ boxShadow: "inset 0 0 28px rgba(255,255,255,0.04)" }}
            aria-hidden
          />

          {/* Iridescent wash */}
          <motion.div
            className="absolute inset-0 mix-blend-screen pointer-events-none"
            style={{
              background: `linear-gradient(
                125deg,
                transparent 0%,
                rgba(201,162,39,0.1) 18%,
                rgba(168,216,234,0.16) 38%,
                rgba(196,181,253,0.14) 52%,
                rgba(232,180,184,0.12) 68%,
                transparent 88%
              )`,
              backgroundSize: "220% 220%",
            }}
            animate={{ backgroundPosition: ["0% 40%", "100% 60%", "0% 40%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          {/* Shine sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 28%, rgba(255,255,255,0.28) 44%, rgba(212,168,67,0.22) 50%, transparent 62%)",
            }}
            animate={{ x: ["-130%", "230%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8 }}
            aria-hidden
          />

          {/* Hover shimmer band */}
          <div
            className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)",
              animation: "vip-shine-sweep 3s ease-in-out infinite",
            }}
            aria-hidden
          />

          {/* Floating sparkles */}
          {SPARKLES.map((s, i) => (
            <Sparkles
              key={i}
              className="absolute w-3 h-3 text-[#F0D078] pointer-events-none opacity-70"
              style={{
                top: "top" in s ? s.top : undefined,
                left: "left" in s ? s.left : undefined,
                right: "right" in s ? s.right : undefined,
                bottom: "bottom" in s ? s.bottom : undefined,
                animation: `elite-cta-sparkle 3s ease-in-out ${s.delay}s infinite`,
              }}
              aria-hidden
            />
          ))}

          {/* Content */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
            <div className="flex-1 min-w-0">
              <p
                className="text-[0.6rem] sm:text-xs font-bold tracking-[0.28em] text-[#A8D8EA] mb-1"
                style={orbitron}
              >
                OFFICIAL ROSTER
              </p>
              <h2
                className="text-sm sm:text-base font-bold leading-snug vip-gold-text"
                style={orbitron}
              >
                Become a Pro WCO Sponsored Athlete
              </h2>
              <p className="text-[0.7rem] sm:text-xs text-[#A3B0C2] mt-1.5 leading-relaxed" style={dmSans}>
                Apply to Battle of the Bars — compete on the official athlete roster.
              </p>
            </div>

            {topAthlete && (
              <div className="relative shrink-0">
                <div
                  className="absolute -inset-1 rounded-xl opacity-60 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 50%, ${topAthlete.nftCardBorderColor || "#D4A843"}40 0%, transparent 70%)`,
                    filter: "blur(6px)",
                  }}
                  aria-hidden
                />
                <MiniAthleteCardTeaser athlete={topAthlete} />
              </div>
            )}

            <div
              className="shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-[#D4A843]/40"
              style={{
                background: "linear-gradient(135deg, rgba(212,168,67,0.2), rgba(184,134,11,0.15))",
                boxShadow: "0 0 20px rgba(212,168,67,0.2)",
              }}
            >
              <ArrowRight className="w-5 h-5 text-[#F0D078] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}