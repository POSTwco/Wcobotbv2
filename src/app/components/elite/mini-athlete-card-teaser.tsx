/**
 * Miniature athlete roster card — mirrors /athletes page #1 card at teaser scale.
 */

import type { Athlete } from "../../lib/types";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { InlineFlag } from "../country-flag";
import { User } from "lucide-react";

import nftTonyGaste from "figma:asset/bb4c9e2121e2b0c21f1d7d6468c12d5446942a46.png";
import nftStarboy from "figma:asset/27f44f9b528f18c214f9c3973e3bd8fbaae8e742.png";
import nftVitalii from "figma:asset/59d46a6fadc438482fc2483e8e0bce17ea1a59ed.png";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const FALLBACK_IMAGES: Record<string, string> = {
  "tony gaste": nftTonyGaste,
  starboy: nftStarboy,
  vitalii: nftVitalii,
};

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

function resolveImage(athlete: Athlete): string | null {
  if (athlete.pfpUrl && athlete.pfpUrl !== "placeholder") return athlete.pfpUrl;
  if (athlete.nftImageUrl && athlete.nftImageUrl !== "placeholder") return athlete.nftImageUrl;
  return FALLBACK_IMAGES[athlete.name?.toLowerCase().trim()] || null;
}

function statusLabel(athlete: Athlete): string {
  if (athlete.status === "champion") return "CHAMPION";
  if (athlete.rank === 1) return "PRO ATHLETE";
  return athlete.status.toUpperCase();
}

interface MiniAthleteCardTeaserProps {
  athlete: Athlete;
  className?: string;
}

export function MiniAthleteCardTeaser({ athlete, className = "" }: MiniAthleteCardTeaserProps) {
  const borderColor = athlete.nftCardBorderColor || "#4274B9";
  const image = resolveImage(athlete);
  const subtitle = athlete.nickname || athlete.specialMove || "WCO Competitor";
  const skills = athlete.skills || { energy: 0, performance: 0, static: 0, aggression: 0, dynamic: 0 };

  return (
    <div
      className={`shrink-0 w-[108px] sm:w-[124px] rounded-xl overflow-hidden border shadow-lg group-hover:shadow-[0_0_20px_rgba(212,168,67,0.25)] transition-shadow ${className}`}
      style={{
        borderColor: `${borderColor}40`,
        background: "#111827",
        boxShadow: `0 8px 24px rgba(0,0,0,0.45), 0 0 12px ${borderColor}18`,
      }}
      aria-hidden
    >
      {/* Photo */}
      <div className="relative h-[72px] sm:h-[80px] overflow-hidden bg-[#0B1120]">
        {image ? (
          <ImageWithFallback
            src={image}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-6 h-6 text-[#4274B9]/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded"
          style={{ background: `${borderColor}25`, border: `1px solid ${borderColor}45` }}
        >
          <span className="text-[7px] font-bold" style={{ ...orbitron, color: borderColor }}>
            #{athlete.rank || 1}
          </span>
        </div>

        <div
          className="absolute top-1 right-1 px-1 py-0.5 rounded max-w-[52px]"
          style={{
            background: athlete.status === "champion" ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.18)",
            border: "1px solid rgba(212,168,67,0.35)",
          }}
        >
          <span
            className="text-[5px] sm:text-[6px] font-bold text-[#F0D078] leading-tight block truncate"
            style={orbitron}
          >
            {statusLabel(athlete)}
          </span>
        </div>

        <div className="absolute bottom-1 right-1 text-[6px] text-[#8494A7] flex items-center gap-0.5" style={dmSans}>
          <InlineFlag country={athlete.country} className="scale-75" />
        </div>
      </div>

      {/* Info */}
      <div className="p-1.5 sm:p-2">
        <p className="text-[8px] sm:text-[9px] font-bold text-white truncate leading-tight" style={orbitron}>
          {athlete.name}
        </p>
        <p className="text-[5px] sm:text-[6px] text-[#8494A7] truncate mt-0.5 leading-tight" style={dmSans}>
          {subtitle}
        </p>

        <div className="grid grid-cols-3 gap-0.5 mt-1.5 mb-1.5">
          <div className="text-center">
            <p className="text-[9px] text-[#10b981] font-bold leading-none" style={orbitron}>{athlete.wins}</p>
            <p className="text-[5px] text-[#8494A7]" style={dmSans}>Wins</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-red-400 font-bold leading-none" style={orbitron}>{athlete.losses}</p>
            <p className="text-[5px] text-[#8494A7]" style={dmSans}>Loss</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-[#4274B9] font-bold leading-none" style={orbitron}>
              {athlete.totalPowerRating?.toFixed(1) || "—"}
            </p>
            <p className="text-[5px] text-[#8494A7]" style={dmSans}>PWR</p>
          </div>
        </div>

        <div className="space-y-0.5">
          {(["energy", "performance", "static", "aggression", "dynamic"] as const).map((skill) => {
            const val = skills[skill] || 0;
            return (
              <div key={skill} className="flex items-center gap-0.5">
                <span className="text-[4px] sm:text-[5px] text-[#8494A7] w-7 truncate" style={dmSans}>
                  {SKILL_LABELS[skill]}
                </span>
                <div className="flex-1 h-[3px] rounded-full bg-[#162033] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(val / 10) * 100}%`, background: SKILL_COLORS[skill] }}
                  />
                </div>
                <span className="text-[4px] sm:text-[5px] w-3 text-right font-mono" style={{ color: SKILL_COLORS[skill] }}>
                  {val.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}