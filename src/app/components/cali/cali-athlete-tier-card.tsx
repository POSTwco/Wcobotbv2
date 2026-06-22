import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronRight, Shield } from "lucide-react";
import {
  ATHLETE_TIER_CONFIG,
  type StatsSummary,
} from "../../lib/cali-analytics-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface CaliAthleteTierCardProps {
  summary: StatsSummary | null;
  loading?: boolean;
}

export function CaliAthleteTierCard({ summary, loading }: CaliAthleteTierCardProps) {
  if (loading || !summary) {
    return (
      <div
        className="rounded-2xl border p-4 sm:p-5 animate-pulse"
        style={{ background: "rgba(11,17,32,0.6)", borderColor: "rgba(66,116,185,0.15)" }}
      >
        <div className="h-4 w-32 bg-white/5 rounded mb-3" />
        <div className="h-8 w-48 bg-white/5 rounded" />
      </div>
    );
  }

  const tier = ATHLETE_TIER_CONFIG[summary.athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED;
  const scorePct = Math.min(100, Math.max(0, summary.athleteScore));

  return (
    <Link
      to="/calisthenics/analytics"
      className="block rounded-2xl border p-4 sm:p-5 transition-colors hover:border-[#D4A843]/35 hover:bg-white/[0.02] outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/50"
      style={{
        background: "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(11,17,32,0.85))",
        borderColor: tier.border,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={tier.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${scorePct} 100`}
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${scorePct} 100` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-5 h-5" style={{ color: tier.color }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7]" style={orbitron}>
              ATHLETE INDEX
            </p>
            <span
              className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full"
              style={{ background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color, ...orbitron }}
            >
              {tier.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <motion.span
              key={summary.athleteScore}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl sm:text-3xl font-bold text-white"
              style={orbitron}
            >
              {summary.athleteScore}
            </motion.span>
            <span className="text-xs text-[#8494A7]" style={dmSans}>/ 100</span>
          </div>
          <p className="text-xs text-[#8494A7] mt-1.5 line-clamp-2" style={dmSans}>
            {summary.tierJudgment}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-[#8494A7] shrink-0 mt-1" />
      </div>
    </Link>
  );
}