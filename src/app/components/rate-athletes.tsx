/**
 * BOTB Rate Athletes — Live Data Centerpiece
 * ============================================
 * Sigma Series NFT cards with live Governor-voted skill ratings.
 *
 * Data flow:
 *   KV athlete:{id} → useAthletes() → AthleteNFTCard → animated skill bars
 *   Admin sets athlete.skills via Admin Panel → totalPowerRating = sum of 5 values
 *   Power rating = sum of 5 live skill values
 *   NFT cards link to HashScan via athlete.nftTokenId
 *
 * Fallback images are provided for the 3 original athletes when no
 * nftImageUrl or pfpUrl is set on the KV record.
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Flame,
  Target,
  Shield,
  Wind,
  ChevronDown,
  Trophy,
  Star,
  TrendingUp,
  Crown,
  Sparkles,
  Vote,
  ArrowUpRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";
import { useAthletes } from "../lib/hooks";
import { getNetworkConfig } from "../lib/hedera-config";
import type { Athlete, AthleteSkills } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getCountryFlag } from "../lib/country-flags";
import { InlineFlag } from "./country-flag";

// Fallback NFT images for known athletes (used when KV record lacks nftImageUrl)
import nftTonyGaste from "figma:asset/bb4c9e2121e2b0c21f1d7d6468c12d5446942a46.png";
import nftStarboy from "figma:asset/27f44f9b528f18c214f9c3973e3bd8fbaae8e742.png";
import nftVitalii from "figma:asset/59d46a6fadc438482fc2483e8e0bce17ea1a59ed.png";

const FALLBACK_IMAGES: Record<string, string> = {
  "tony gaste": nftTonyGaste,
  "starboy": nftStarboy,
  "vitalii": nftVitalii,
};

/** Resolve the best image for an athlete NFT card */
function resolveImage(athlete: Athlete): string | null {
  if (athlete.nftImageUrl && athlete.nftImageUrl !== "placeholder") return athlete.nftImageUrl;
  if (athlete.pfpUrl && athlete.pfpUrl !== "placeholder") return athlete.pfpUrl;
  const key = athlete.name?.toLowerCase().trim();
  return FALLBACK_IMAGES[key] || null;
}

/** Default glow gradients based on card border color */
function resolveGlow(athlete: Athlete): string {
  if (athlete.nftCardGlowGradient) return athlete.nftCardGlowGradient;
  const color = athlete.nftCardBorderColor || "#4274B9";
  return `from-[${color}] via-[${color}80] to-[${color}]`;
}

// ---------------------------------------------------------------------------
// Skill Categories — Official WCO Judging Criteria
// Mapped to: Statics, Dynamics, Power Dynamics, Combinations & Flow,
// Offense & Defense per the WCO Rules of Engagement Framework.
// NOTE: KV keys (energy, performance, static, aggression, dynamic) are
//       retained for backward compatibility with existing athlete data.
// ---------------------------------------------------------------------------

const SKILL_CATEGORIES = [
  {
    id: "energy" as const,
    name: "POWER DYNAMICS",
    abbrev: "PWR",
    icon: Zap,
    color: "#FACC15",
    bgColor: "#FACC1510",
    borderColor: "#FACC1540",
    shortDesc: "Strength-based explosive movements & power control",
    description:
      "Power Dynamics evaluates strength-based dynamic skills derived from static power movements — planche push-ups, front lever pull-ups, pelican curls, Van Gelders, and other advanced power-dynamic elements. Judges score the difficulty, execution, and power displayed in each repetition, with emphasis on explosiveness and control in both the ascent and descent phases.",
    criteria: [
      "Difficulty and execution of strength-based dynamic skills (planche push-ups, front lever pull-ups, pelican, Van Gelder)",
      "Explosiveness and control in both ascent and descent phases",
      "Power displayed in each repetition under fatigue",
      "Maintaining form and amplitude across multiple reps",
      "Advanced power-dynamic movements and creative variations",
    ],
    scoring: "Admin-set rating based on official WCO judging standards. Governors may propose changes via governance.",
  },
  {
    id: "performance" as const,
    name: "COMBINATIONS & FLOW",
    abbrev: "FLO",
    icon: Star,
    color: "#6AA3E0",
    bgColor: "#6AA3E010",
    borderColor: "#6AA3E040",
    shortDesc: "Linking elements, rhythm & routine cohesion",
    description:
      "Combinations & Flow is the defining element of freestyle performance. Judges evaluate the athlete's ability to link elements across multiple subcategories: dynamic combinations (connection and rhythm between multiple dynamic tricks), static combinations (sequencing of multiple holds and transitions), and static-to-dynamic transitions (seamless flow between holds and explosive movements). Overall cohesion, rhythm, and aesthetic of the routine are paramount — two athletes can perform the same moves, yet one will flow more naturally, and that quality is recognized.",
    criteria: [
      "Connection and rhythm between multiple dynamic tricks",
      "Sequencing of multiple static holds and smooth transitions",
      "Seamless static-to-dynamic transitions within the routine",
      "Overall cohesion, rhythm, and aesthetic of the routine as a whole",
      "Creativity — original transitions, unconventional grips, and surprising sequences",
    ],
    scoring: "Admin-set rating based on official WCO judging standards. Governors may propose changes via governance.",
  },
  {
    id: "static" as const,
    name: "STATICS",
    abbrev: "STA",
    icon: Shield,
    color: "#10B981",
    bgColor: "#10B98110",
    borderColor: "#10B98140",
    shortDesc: "Control, strength & aesthetic of static holds",
    description:
      "Statics evaluates an athlete's control, strength, and aesthetic in static holds — planche, front lever, Maltese, inverted cross, handstand variations, and other isometric positions. Judges score the difficulty and execution of each element, transition smoothness and combination quality between holds, and grip and apparatus variation that showcases versatility. Emphasis is on clean lines, full lockouts, and stable control throughout every hold.",
    criteria: [
      "Difficulty and execution of each static element (planche, front lever, Maltese, inverted cross)",
      "Clean lines, full lockouts, and stable control throughout holds",
      "Transition smoothness and combination quality between holds",
      "Grip and apparatus variation showcasing versatility",
      "Balance-based skills (handstands, one-arm holds) add value",
    ],
    scoring: "Admin-set rating based on official WCO judging standards. Governors may propose changes via governance.",
  },
  {
    id: "aggression" as const,
    name: "OFFENSE & DEFENSE",
    abbrev: "O&D",
    icon: Flame,
    color: "#EF4444",
    bgColor: "#EF444410",
    borderColor: "#EF444440",
    shortDesc: "Battle dynamics, initiative & competitive response",
    description:
      "Offense & Defense measures an athlete's battle dynamics in the head-to-head format. Offense: taking initiative, setting the tone with aggressive, high-impact moves or combinations. Defense: responding with equal or higher difficulty, intensity, or originality. Interaction and adaptability within a battle setting are valued — not just executing a pre-set routine. This category rewards athletes who read their opponent, escalate strategically, and demonstrate real-time improvisation under competitive pressure.",
    criteria: [
      "Offense — taking initiative with aggressive, high-impact moves or combinations",
      "Defense — responding with equal or higher difficulty, intensity, or originality",
      "Interaction and adaptability within the battle setting",
      "Strategic escalation and real-time adaptation to opponent's strengths",
      "Risk & improvisation — spontaneous creativity under competitive pressure",
    ],
    scoring: "Admin-set rating based on official WCO judging standards. Governors may propose changes via governance.",
  },
  {
    id: "dynamic" as const,
    name: "DYNAMICS",
    abbrev: "DYN",
    icon: Wind,
    color: "#8B5CF6",
    bgColor: "#8B5CF610",
    borderColor: "#8B5CF640",
    shortDesc: "Swing-based elements, releases & super moves",
    description:
      "Dynamics evaluates swing-based and explosive elements performed on high bar, p-bars, or floor. Judges score difficulty, execution, amplitude, landing control, and flow integration. Super moves (e.g., 720s, 900s) and creative transitions carry higher value when executed cleanly. This is the most visually spectacular category — where athletes push the limits of aerial control and gravity-defying movement.",
    criteria: [
      "Difficulty, execution, and amplitude of swing-based and explosive elements",
      "Super moves (720s, 900s) and creative transitions executed cleanly",
      "Landing control and flow integration between dynamic elements",
      "Rotation speed and aerial body control during releases and spins",
      "Clean catch technique with full bar control — no slips or regrips",
    ],
    scoring: "Admin-set rating based on official WCO judging standards. Governors may propose changes via governance.",
  },
];

type SkillId = keyof AthleteSkills;

// ---------------------------------------------------------------------------
// SkillPanel — expandable judging criteria (unchanged from original)
// ---------------------------------------------------------------------------

function SkillPanel({ skill, isOpen, onToggle }: { skill: typeof SKILL_CATEGORIES[0]; isOpen: boolean; onToggle: () => void }) {
  const Icon = skill.icon;
  return (
    <div className="border rounded-xl overflow-hidden transition-all duration-300" style={{ borderColor: isOpen ? skill.borderColor : "#4274B920" , background: isOpen ? skill.bgColor : "#111827" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: skill.bgColor, border: `1px solid ${skill.borderColor}` }}
        >
          <Icon className="w-5 h-5" style={{ color: skill.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ fontFamily: "Orbitron, sans-serif", color: skill.color }}>
              {skill.name}
            </span>
            <span className="text-[#8494A7] text-xs hidden sm:inline" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              — {skill.shortDesc}
            </span>
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[#8494A7]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[#C0C8D4] text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {skill.description}
              </p>
              <div className="rounded-lg p-3" style={{ background: `${skill.color}08`, border: `1px solid ${skill.color}20` }}>
                <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: skill.color }}>
                  JUDGING CRITERIA
                </p>
                <ul className="space-y-1.5">
                  {skill.criteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: skill.color }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: skill.color }} />
                <span className="text-[10px] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {skill.scoring}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AthleteNFTCard — Live data, HashScan links, animated skill bars
// ---------------------------------------------------------------------------

function AthleteNFTCard({ athlete, index }: { athlete: Athlete; index: number }) {
  const skills = athlete.skills || { energy: 0, performance: 0, static: 0, aggression: 0, dynamic: 0 };
  const totalPower = SKILL_CATEGORIES.reduce((sum, sk) => sum + (skills[sk.id as SkillId] || 0), 0);
  const cardBorder = athlete.nftCardBorderColor || "#4274B9";
  const image = resolveImage(athlete);
  const explorerUrl = getNetworkConfig().explorerUrl;

  // HashScan link: /token/{tokenId} if the athlete has a real minted NFT
  const hashScanUrl = athlete.nftTokenId && /^0\.0\.\d+$/.test(athlete.nftTokenId) && athlete.nftTokenId !== "0.0.0"
    ? `${explorerUrl}/token/${athlete.nftTokenId}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      className="group relative"
    >
      {/* Glow behind card */}
      <div
        className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-500"
        style={{ background: `linear-gradient(to bottom, ${cardBorder}60, ${cardBorder}20, ${cardBorder}60)` }}
      />

      <div
        className="relative bg-[#0B1120] rounded-2xl overflow-hidden border transition-all duration-300 group-hover:scale-[1.02]"
        style={{ borderColor: `${cardBorder}30` }}
      >
        {/* NFT Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {image ? (
            <ImageWithFallback
              src={image}
              alt={`${athlete.name} Sigma Series NFT`}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-[#162033] flex items-center justify-center">
              <Crown className="w-12 h-12" style={{ color: `${cardBorder}30` }} />
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0B1120] to-transparent" />

          {/* HashScan link badge */}
          {hashScanUrl && (
            <a
              href={hashScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[7px] sm:text-[8px] text-[#6AA3E0] hover:text-white hover:border-[#6AA3E0]/40 transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              <span className="hidden sm:inline">HASHSCAN</span>
            </a>
          )}
        </div>

        {/* Info footer */}
        <div className="p-2 sm:p-4 -mt-6 sm:-mt-8 relative">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="min-w-0">
              <p className="text-[8px] sm:text-xs text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {athlete.nftSeriesName || "SIGMA SERIES"}
              </p>
              <p className="text-white font-bold text-xs sm:text-lg truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {athlete.name.toUpperCase()}
              </p>
            </div>
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[8px] sm:text-xs font-bold shrink-0"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: `${cardBorder}20`,
                border: `2px solid ${cardBorder}60`,
                color: cardBorder,
              }}
            >
              #{athlete.rank || "?"}
            </div>
          </div>

          {/* Mini skill bars — animated from live Governor-voted scores */}
          <div className="space-y-1 sm:space-y-1.5 mb-2 sm:mb-3">
            {SKILL_CATEGORIES.map((sk) => {
              const val = skills[sk.id as SkillId] || 0;
              return (
                <div key={sk.id} className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[7px] sm:text-[9px] w-8 sm:w-12 text-right" style={{ fontFamily: "Orbitron, sans-serif", color: sk.color }}>
                    {sk.abbrev}
                  </span>
                  <div className="flex-1 h-1 sm:h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: sk.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${val * 10}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                    />
                  </div>
                  <span className="text-[7px] sm:text-[9px] w-4 sm:w-6 text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {val.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Power rating — computed from live skill values */}
          <div className="flex items-center justify-between pt-1 sm:pt-2 border-t border-white/5">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FACC15]" />
              <span className="text-[8px] sm:text-[10px] text-[#FACC15]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                PWR {totalPower.toFixed(1)}
              </span>
            </div>
            <span
              className="text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: `${cardBorder}15`,
                color: cardBorder,
              }}
            >
              <InlineFlag country={athlete.country} />
              {athlete.country}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// RateAthletesSection — Live data version
// ---------------------------------------------------------------------------

export function RateAthletesSection() {
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  const { data: allAthletes, loading } = useAthletes();

  // Show athletes that have active status, sorted by power score (highest = best)
  // Always display the top 3 highest-power-rated athletes
  const displayAthletes = useMemo(() => {
    if (!allAthletes.length) return [];
    return [...allAthletes]
      .filter((a) => a.status === "active" || a.status === "champion")
      .sort((a, b) => (b.totalPowerRating || 0) - (a.totalPowerRating || 0))
      .slice(0, 3);
  }, [allAthletes]);

  // Dynamic grid: always 3 columns
  const gridCols = "grid-cols-3";

  return (
    <section className="py-12 sm:py-24 bg-[#0A0F1A] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(#4274B9 1px, transparent 1px), linear-gradient(90deg, #4274B9 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#4274B9]/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/20 mb-4">
            <Crown className="w-3.5 h-3.5 text-[#FACC15]" />
            <span className="text-[#FACC15] text-[10px] tracking-widest font-semibold" style={{ fontFamily: "Orbitron, sans-serif" }}>
              SIGMA SERIES NFT COLLECTION
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl mb-4" style={{ fontFamily: "Orbitron, sans-serif", lineHeight: 1.1 }}>
            <span className="text-white">RATE OUR </span>
            <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">ATHLETES</span>
          </h2>
          <p className="text-[#8494A7] max-w-3xl mx-auto text-sm sm:text-base lg:text-lg leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Every competing athlete gets a <span className="text-[#FACC15] font-semibold">Sigma Series NFT card</span> with live power ratings across 5 skill categories.{" "}
            <span className="text-[#6AA3E0] font-semibold">Governors vote</span> to dynamically increase or decrease scores — affecting brackets, matchups, and future challenges.{" "}
            Collect cards, back your athletes, and <span className="text-[#4274B9] font-semibold">WIN tokens</span> when they win.
          </p>
        </motion.div>

        {/* Explainer bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12"
        >
          {[
            { text: "Own the card", icon: "\uD83C\uDCCF", desc: "Collect athlete NFTs" },
            { text: "Vote power levels", icon: "\u26A1", desc: "Governors shape scores" },
            { text: "Athlete wins", icon: "\uD83C\uDFC6", desc: "Your card gets boosted" },
            { text: "WIN tokens", icon: "💰", desc: "Only Gains rewards" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="hidden sm:block w-6 h-[1px] bg-[#4274B9]/30" />}
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-[#111827] border border-[#4274B9]/10">
                <span className="text-sm">{item.icon}</span>
                <div>
                  <p className="text-[10px] text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{item.text}</p>
                  <p className="text-[9px] text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Main 2-column layout: Cards | Skill Panels */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start">
          {/* Left: NFT Cards — Live from KV */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-4 h-4 text-[#FACC15]" />
              <h3 className="text-sm text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                SIGMA SERIES ROSTER
              </h3>
              {loading && <Loader2 className="w-3.5 h-3.5 text-[#4274B9] animate-spin" />}
            </div>

            {loading && displayAthletes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
                <Loader2 className="w-8 h-8 text-[#4274B9] animate-spin mb-3" />
                <p className="text-[#8494A7] text-sm">Loading athletes...</p>
              </div>
            ) : displayAthletes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
                <Crown className="w-10 h-10 text-[#4274B9]/20 mb-3" />
                <p className="text-[#8494A7] text-sm text-center">
                  No athletes registered yet.<br />
                  <span className="text-[#6AA3E0]">Check back once the WCO admin adds competitors.</span>
                </p>
              </div>
            ) : (
              <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
                {displayAthletes.map((athlete, i) => (
                  <AthleteNFTCard key={athlete.id} athlete={athlete} index={i} />
                ))}
              </div>
            )}

            {/* Champion journey callout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#4274B9]/10 to-[#6AA3E0]/10 border border-[#4274B9]/20"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4274B9]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Crown className="w-5 h-5 text-[#FACC15]" />
                </div>
                <div>
                  <p className="text-sm text-[#E8ECF0] font-semibold mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    THE CHAMPION'S JOURNEY
                  </p>
                  <p className="text-xs text-[#8494A7] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Every athlete competes to become the undisputed <span className="text-[#FACC15] font-semibold">BOTB Champion</span>.
                    As they battle through brackets, they release tokens to fans who vote for them along the way.
                    The deeper an athlete goes, the more their NFT card holders <span className="text-[#6AA3E0] font-semibold">WIN</span>.
                    It's a game — pick your competitors, collect their cards, and ride the journey.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Booster mechanic */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-3 p-4 rounded-xl bg-[#111827] border border-[#FACC15]/10"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FACC15]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUpRight className="w-5 h-5 text-[#FACC15]" />
                </div>
                <div>
                  <p className="text-sm text-[#E8ECF0] font-semibold mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    ONLY GAINS BOOSTERS
                  </p>
                  <p className="text-xs text-[#8494A7] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    When your athlete <span className="text-[#10B981] font-semibold">wins a battle</span>, their Sigma Series NFT becomes a{" "}
                    <span className="text-[#FACC15] font-semibold">booster</span> — multiplying your token rewards for future rounds.
                    Collect cards based on athlete strengths and build a winning hand.
                    <span className="text-[#6AA3E0] font-semibold"> Governors</span> &{" "}
                    <span className="text-[#FACC15] font-semibold">Sigma Series</span> NFT holders get the highest multipliers.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Skill Judging Panels */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Vote className="w-4 h-4 text-[#6AA3E0]" />
              <h3 className="text-sm text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                WCO JUDGING SYSTEM
              </h3>
            </div>
            <p className="text-xs text-[#8494A7] mb-5 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Tap each skill category to learn the official WCO judging criteria. Athlete skills are set by WCO administrators based on real competition performance.
              Governors who believe a rating should change can <span className="text-[#6AA3E0] font-semibold">submit a governance proposal</span> — if approved and voted through, the admin updates the athlete's rating accordingly.
            </p>

            <div className="space-y-2">
              {SKILL_CATEGORIES.map((skill) => (
                <SkillPanel
                  key={skill.id}
                  skill={skill}
                  isOpen={openSkill === skill.id}
                  onToggle={() => setOpenSkill(openSkill === skill.id ? null : skill.id)}
                />
              ))}
            </div>

            {/* Governor CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-6 p-5 rounded-xl bg-gradient-to-br from-[#111827] to-[#0B1120] border border-[#4274B9]/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[#4274B9]" />
                <span className="text-xs text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>GOVERNORS SHAPE THE GAME</span>
              </div>
              <p className="text-xs text-[#8494A7] mb-4 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Governors don't just watch — they <span className="text-[#6AA3E0] font-semibold">shape the conversation</span>.
                Think an athlete's rating doesn't reflect their true level? Submit a <span className="text-[#D4A843] font-semibold">governance proposal</span> to
                adjust their skill scores. If the community votes it through, the WCO admin implements the change.
                This keeps ratings grounded in real performance while giving the community a direct voice.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/governance"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4274B9] text-white rounded-lg text-xs hover:bg-[#3563A0] transition-all"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  <Shield className="w-3.5 h-3.5" /> GOVERNORS HUB
                </Link>
                <Link
                  to="/nfts"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#FACC15]/30 text-[#FACC15] rounded-lg text-xs hover:bg-[#FACC15]/10 transition-all"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  <Sparkles className="w-3.5 h-3.5" /> COLLECT NFTs
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}