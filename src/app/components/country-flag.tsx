/**
 * CountryFlag — Real flag image component
 * =========================================
 * Renders a crisp flag image from flagcdn.com with a circular or
 * rounded-rect container. Supports multiple sizes and optional
 * ISO code overlay label.
 *
 * Usage:
 *   <CountryFlag country="USA" size="sm" />
 *   <CountryFlag country="Mexico" size="md" showCode />
 *   <CountryFlag country="Russia" size="lg" variant="badge" />
 */

import { useState } from "react";
import { getCountryFlagUrl, getCountryISO, getCountryAbbr } from "../lib/country-flags";

// ---------------------------------------------------------------------------
// Size presets
// ---------------------------------------------------------------------------
const SIZES = {
  xs: { container: "w-4 h-4", img: 20, text: "text-[0.3rem]", label: "text-[0.35rem]" },
  sm: { container: "w-5 h-5", img: 40, text: "text-[0.4rem]", label: "text-[0.4rem]" },
  md: { container: "w-6 h-6 sm:w-7 sm:h-7", img: 40, text: "text-[0.45rem]", label: "text-[0.45rem]" },
  lg: { container: "w-8 h-8 sm:w-9 sm:h-9", img: 80, text: "text-[0.5rem]", label: "text-[0.5rem]" },
} as const;

type FlagSize = keyof typeof SIZES;

interface CountryFlagProps {
  country: string | undefined | null;
  size?: FlagSize;
  /** Show the 2-letter ISO code overlaid on the flag */
  showCode?: boolean;
  /** Additional CSS classes on the outer container */
  className?: string;
}

export function CountryFlag({ country, size = "md", showCode = true, className = "" }: CountryFlagProps) {
  const [imgError, setImgError] = useState(false);
  const iso = getCountryISO(country);
  const flagUrl = getCountryFlagUrl(country, SIZES[size].img);
  const abbr = getCountryAbbr(country);
  const preset = SIZES[size];

  if (!iso || !flagUrl) return null;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden border border-[#1e293b]/80 shadow-lg ${preset.container} ${className}`}
      title={country || ""}
      style={{ flexShrink: 0 }}
    >
      {/* Flag image — object-cover fills the circle, creating a nice round flag look */}
      {!imgError ? (
        <img
          src={flagUrl}
          alt={`${country} flag`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Fallback: colored circle with ISO code */
        <div className="w-full h-full flex items-center justify-center bg-[#162033]">
          <span
            className={`font-bold text-[#8494A7] ${preset.text}`}
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {abbr}
          </span>
        </div>
      )}

    </div>
  );
}

/**
 * Inline flag — smaller, no code overlay, for use inside text lines.
 * Renders as a tiny rectangular flag (not circular) for inline contexts.
 */
export function InlineFlag({ country, className = "" }: { country: string | undefined | null; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const flagUrl = getCountryFlagUrl(country, 20);
  const iso = getCountryISO(country);
  const abbr = getCountryAbbr(country);

  if (!iso || !flagUrl) return null;

  if (imgError) {
    return (
      <span
        className={`inline-flex items-center justify-center w-4 h-3 rounded-[2px] bg-[#162033] border border-[#1e293b]/60 text-[0.35rem] font-bold text-[#8494A7] ${className}`}
        style={{ fontFamily: "Orbitron, sans-serif", verticalAlign: "middle" }}
      >
        {abbr}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={`${country} flag`}
      className={`inline-block w-4 h-3 rounded-[2px] object-cover border border-[#1e293b]/40 shadow-sm ${className}`}
      style={{ verticalAlign: "middle" }}
      loading="lazy"
      onError={() => setImgError(true)}
    />
  );
}