/**
 * Shared sponsor banner strip — hero (homepage) and routine (workout) variants.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Crown, Dumbbell, type LucideIcon } from "lucide-react";
import type { Sponsor } from "../lib/types";
import { openSponsor, useViewportImpression } from "../lib/sponsor-display";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export type SponsorBannerVariant = "hero" | "routine";

interface Props {
  sponsors: Sponsor[];
  variant: SponsorBannerVariant;
  label: string;
  icon?: LucideIcon;
  impressionSpot: string;
}

export function SponsorBannerStrip({
  sponsors,
  variant,
  label,
  icon: Icon = Crown,
  impressionSpot,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sponsor = sponsors[idx % sponsors.length];
  const isHero = variant === "hero";

  useViewportImpression(sponsor, ref, impressionSpot);

  useEffect(() => {
    if (sponsors.length <= 1 || hovered) return;
    const iv = setInterval(() => setIdx((i) => (i + 1) % sponsors.length), 7000);
    return () => clearInterval(iv);
  }, [sponsors.length, hovered]);

  const content = (
    <>
      <div className={`relative ${isHero ? "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "px-3 sm:px-4 py-3 sm:py-3.5"}`}>
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[50px] bg-[#D4A843]/[0.02] ${
              isHero ? "w-[300px] sm:w-[700px] h-[60px] sm:h-[100px]" : "w-[200px] sm:w-[400px] h-[40px] sm:h-[60px]"
            }`}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={sponsor.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative flex items-center justify-between max-w-full overflow-hidden ${
              isHero ? "gap-2 sm:gap-6 lg:gap-8" : "gap-2 sm:gap-4 min-h-[44px]"
            }`}
          >
            {/* Left: label + logo + text */}
            <div className={`flex items-center min-w-0 flex-1 overflow-hidden ${isHero ? "gap-2 sm:gap-5" : "gap-2 sm:gap-3"}`}>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className={`shrink-0 flex flex-col items-center ${isHero ? "hidden sm:flex" : "flex"}`}
              >
                <Icon className={`text-[#D4A843]/50 mb-0.5 ${isHero ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
                <span
                  className={`text-[#D4A843]/40 tracking-[0.2em] leading-none whitespace-nowrap ${
                    isHero ? "text-[0.4rem]" : "text-[0.32rem] sm:text-[0.38rem]"
                  }`}
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {label}
                </span>
              </motion.div>

              <div className={`hidden sm:block w-[1px] bg-gradient-to-b from-transparent via-[#D4A843]/20 to-transparent shrink-0 ${isHero ? "h-10" : "h-8"}`} />

              {sponsor.logoUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
                  className="shrink-0"
                >
                  <motion.div animate={{ y: hovered ? -2 : 0 }} transition={{ duration: 0.3 }}>
                    <ImageWithFallback
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className={
                        isHero
                          ? "h-[40px] sm:h-[100px] lg:h-[120px] w-auto object-contain max-w-[120px] sm:max-w-[380px] lg:max-w-[480px] drop-shadow-[0_0_20px_rgba(212,168,67,0.12)] sponsor-logo-primary"
                          : "h-8 sm:h-12 w-auto object-contain max-w-[72px] sm:max-w-[140px] drop-shadow-[0_0_12px_rgba(212,168,67,0.1)] sponsor-routine-logo"
                      }
                    />
                  </motion.div>
                </motion.div>
              )}

              {isHero && sponsor.secondaryLogoUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
                  className="shrink-0 hidden sm:block"
                >
                  <motion.div animate={{ y: hovered ? -3 : 0 }} transition={{ duration: 0.3 }}>
                    <ImageWithFallback
                      src={sponsor.secondaryLogoUrl}
                      alt={`${sponsor.name} product`}
                      className="h-[50px] sm:h-[75px] lg:h-[90px] w-auto object-contain max-w-[180px] sm:max-w-[280px] lg:max-w-[360px] drop-shadow-[0_0_20px_rgba(212,168,67,0.10)] sponsor-logo-secondary"
                    />
                  </motion.div>
                </motion.div>
              )}

              {isHero && <div className="hidden md:block w-[1px] h-12 bg-gradient-to-b from-transparent via-[#D4A843]/15 to-transparent shrink-0 sponsor-separator" />}

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className={`min-w-0 flex-1 ${isHero ? "hidden md:block" : "block"}`}
              >
                <motion.p
                  className={`text-[#E8ECF0] font-bold leading-tight truncate ${
                    isHero ? "text-lg lg:text-xl sponsor-text-name" : "text-xs sm:text-sm"
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  animate={isHero ? { opacity: [0.85, 1, 0.85] } : undefined}
                  transition={isHero ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
                >
                  {sponsor.customText || sponsor.name}
                </motion.p>
                {sponsor.tagline && (
                  <motion.p
                    className={`text-[#D4A843]/50 leading-tight truncate ${
                      isHero ? "text-sm lg:text-base mt-0.5 sponsor-text-tagline" : "text-[0.65rem] sm:text-xs mt-0.5"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    {sponsor.tagline}
                  </motion.p>
                )}
              </motion.div>
            </div>

            {/* Right: product + CTA */}
            <div className={`flex items-center shrink-0 ${isHero ? "gap-2 sm:gap-5" : "gap-1.5 sm:gap-3"}`}>
              {sponsor.productImageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 12 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
                  className={isHero ? "hidden sm:block" : "block"}
                >
                  <motion.div
                    animate={isHero ? { rotate: [0, 10, 0, -10, 0] } : { y: hovered ? -2 : 0 }}
                    transition={
                      isHero
                        ? { duration: 8, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.3 }
                    }
                    className="relative"
                    style={isHero ? { transformOrigin: "center bottom" } : undefined}
                  >
                    <ImageWithFallback
                      src={sponsor.productImageUrl}
                      alt=""
                      className={
                        isHero
                          ? "h-[70px] sm:h-[100px] lg:h-[120px] w-auto object-contain max-w-[150px] sm:max-w-[220px] lg:max-w-[280px] drop-shadow-[0_4px_24px_rgba(212,168,67,0.12)] sponsor-product-img"
                          : "h-10 sm:h-14 w-auto object-contain max-w-[48px] sm:max-w-[80px] drop-shadow-[0_2px_12px_rgba(212,168,67,0.1)] sponsor-routine-product"
                      }
                    />
                    {isHero && (
                      <div className={`absolute -inset-2 sm:-inset-3 bg-[#D4A843]/[0.04] rounded-2xl blur-lg transition-opacity duration-500 pointer-events-none ${hovered ? "opacity-100" : "opacity-40"}`} />
                    )}
                  </motion.div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="flex items-center gap-1 group/cta"
              >
                <span
                  className={`text-[#D4A843]/60 tracking-[0.1em] group-hover/cta:text-[#D4A843] transition-colors duration-300 whitespace-nowrap ${
                    isHero ? "text-[0.5rem] sm:text-[0.7rem] sm:tracking-[0.15em]" : "text-[0.45rem] sm:text-[0.6rem]"
                  }`}
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {sponsor.ctaLabel || "VISIT"}
                </span>
                <motion.div animate={{ x: hovered ? 3 : 0 }} transition={{ duration: 0.25, type: "spring", stiffness: 300 }}>
                  <ExternalLink className={`text-[#D4A843]/40 group-hover/cta:text-[#D4A843] transition-colors duration-300 ${isHero ? "w-3 h-3 sm:w-4 sm:h-4" : "w-3 h-3"}`} />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {sponsors.length > 1 && (
          <div className={`flex items-center justify-center gap-1.5 ${isHero ? "mt-1" : "mt-2"}`}>
            {sponsors.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all duration-400 ${
                  i === idx % sponsors.length
                    ? "w-4 h-[2px] bg-[#D4A843]/50"
                    : "w-[3px] h-[2px] bg-[#D4A843]/15 hover:bg-[#D4A843]/30"
                }`}
                aria-label={`Show sponsor ${i + 1}`}
              />
            ))}
          </div>
        )}

        {isHero ? (
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4A843]/10 to-transparent" />
        ) : (
          <div className="absolute bottom-0 left-3 right-3 sm:left-4 sm:right-4 h-[1px] bg-gradient-to-r from-transparent via-[#D4A843]/15 to-transparent" />
        )}
      </div>
    </>
  );

  if (isHero) {
    return (
      <div
        ref={ref}
        className="absolute top-0 left-0 right-0 z-20 flex items-start sm:items-center cursor-pointer sponsor-banner-compact"
        style={{ height: "calc((100% - 500px) / 2 + 20px)", minHeight: "56px", paddingTop: "4px" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => openSponsor(sponsor)}
      >
        {content}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative rounded-2xl border border-[#D4A843]/20 overflow-hidden cursor-pointer sponsor-routine-tab"
      style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(11,17,32,0.92))" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openSponsor(sponsor)}
    >
      {content}
    </motion.div>
  );
}