/**
 * Miniature athlete photo teaser for the sponsored-athlete CTA.
 */

import type { Athlete } from "../../lib/types";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { User } from "lucide-react";

import nftTonyGaste from "figma:asset/bb4c9e2121e2b0c21f1d7d6468c12d5446942a46.png";
import nftStarboy from "figma:asset/27f44f9b528f18c214f9c3973e3bd8fbaae8e742.png";
import nftVitalii from "figma:asset/59d46a6fadc438482fc2483e8e0bce17ea1a59ed.png";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };

const FALLBACK_IMAGES: Record<string, string> = {
  "tony gaste": nftTonyGaste,
  starboy: nftStarboy,
  vitalii: nftVitalii,
};

function resolveImage(athlete: Athlete): string | null {
  if (athlete.pfpUrl && athlete.pfpUrl !== "placeholder") return athlete.pfpUrl;
  if (athlete.nftImageUrl && athlete.nftImageUrl !== "placeholder") return athlete.nftImageUrl;
  return FALLBACK_IMAGES[athlete.name?.toLowerCase().trim()] || null;
}

interface MiniAthleteCardTeaserProps {
  athlete: Athlete;
  className?: string;
}

export function MiniAthleteCardTeaser({ athlete, className = "" }: MiniAthleteCardTeaserProps) {
  const borderColor = athlete.nftCardBorderColor || "#D4A843";
  const image = resolveImage(athlete);

  return (
    <div
      className={`shrink-0 w-16 h-20 sm:w-[72px] sm:h-[88px] rounded-xl overflow-hidden border-2 shadow-lg group-hover:shadow-[0_0_24px_rgba(212,168,67,0.35)] transition-shadow ${className}`}
      style={{
        borderColor: `${borderColor}70`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.4), 0 0 14px ${borderColor}25`,
      }}
      aria-hidden
    >
      <div className="relative w-full h-full bg-[#0B1120]">
        {image ? (
          <ImageWithFallback
            src={image}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-8 h-8 text-[#4274B9]/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded"
          style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${borderColor}60` }}
        >
          <span className="text-[8px] font-bold text-[#F0D078]" style={orbitron}>
            #{athlete.rank || 1}
          </span>
        </div>
      </div>
    </div>
  );
}