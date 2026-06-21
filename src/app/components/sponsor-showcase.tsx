/**
 * BOTB Sponsor Showcase — Public-facing sponsor display
 * ======================================================
 * TitleSponsorBanner — Containerless, floating logos and animated text
 *   that blend into the hero's dark navy background. No boxes, no borders.
 *   Large logos, product images, and text float freely in the dead space
 *   between the header nav and the hero 2-col grid. Zero layout push.
 *
 * SponsorShowcase — Premium + standard tier sponsors below hero.
 *
 * Prompt 1 of 5: Nail the title sponsor space.
 */

import { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Star, ChevronRight, Crown } from "lucide-react";
import { useSponsors } from "../lib/hooks";
import type { Sponsor } from "../lib/types";
import { hasTier, trackImpression, openSponsor, useViewportImpression } from "../lib/sponsor-display";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SponsorBannerStrip } from "./sponsor-banner-strip";

// ═══════════════════════════════════════════════════════════════════════════
// TitleSponsorBanner — containerless floating display
// ═══════════════════════════════════════════════════════════════════════════

export function TitleSponsorBanner() {
  const { data: sponsors, loading } = useSponsors();
  const title = useMemo(() => sponsors.filter((s) => hasTier(s, "title")), [sponsors]);

  if (loading || title.length === 0) return null;

  return (
    <SponsorBannerStrip
      sponsors={title}
      variant="hero"
      label="TITLE SPONSOR"
      icon={Crown}
      impressionSpot="title"
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SponsorShowcase — Premium + Standard sponsors (below hero, above stats)
// Max 3 premium spots — containerless floating display
// ═══════════════════════════════════════════════════════════════════════════

export function SponsorShowcase() {
  const { data: sponsors, loading } = useSponsors();

  const { premium, standard } = useMemo(() => {
    const p: Sponsor[] = [];
    const s: Sponsor[] = [];
    sponsors.forEach((sp) => {
      if (hasTier(sp, "premium")) p.push(sp);
      if (hasTier(sp, "standard")) s.push(sp);
    });
    // Cap premium to 3 spots
    return { premium: p.slice(0, 3), standard: s };
  }, [sponsors]);

  if (loading || (premium.length === 0 && standard.length === 0)) return null;

  return (
    <section className="relative hidden sm:block py-10 sm:py-16 overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[250px] sm:w-[500px] h-[150px] sm:h-[300px] bg-[#4274B9]/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[250px] sm:w-[500px] h-[150px] sm:h-[300px] bg-[#6AA3E0]/[0.015] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label — elegant, floating */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-4 mb-10 sm:mb-14"
        >
          <div className="h-[1px] flex-1 max-w-32 bg-gradient-to-r from-transparent to-[#6AA3E0]/25" />
          <div className="flex flex-col items-center gap-1">
            <Star className="w-3.5 h-3.5 text-[#6AA3E0]/30" />
            <span
              className="text-[#6AA3E0]/40 text-[0.45rem] sm:text-[0.5rem] tracking-[0.3em] uppercase"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              Premium Partners
            </span>
          </div>
          <div className="h-[1px] flex-1 max-w-32 bg-gradient-to-l from-transparent to-[#6AA3E0]/25" />
        </motion.div>

        {/* Premium spots — containerless floating layout */}
        {premium.length > 0 && (
          <div className={`grid gap-8 sm:gap-10 lg:gap-14 mb-10 sm:mb-14 ${
            premium.length === 1 ? "grid-cols-1 max-w-md mx-auto" :
            premium.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto" :
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {premium.map((sp, i) => (
              <PremiumSpot key={sp.id} sponsor={sp} index={i} />
            ))}
          </div>
        )}

        {/* Thin divider between premium and standard */}
        {premium.length > 0 && standard.length > 0 && (
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#4274B9]/10 to-transparent mb-8 sm:mb-10" />
        )}

        {/* Standard sponsor marquee — containerless infinite scroll */}
        {standard.length > 0 && (
          <>
            {/* "OFFICIAL PARTNERS" label */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center gap-4 mb-6 sm:mb-8"
            >
              <div className="h-[1px] flex-1 max-w-40 bg-gradient-to-r from-transparent to-[#4274B9]/20" />
              <span
                className="text-[#4274B9]/35 text-[0.4rem] sm:text-[0.45rem] tracking-[0.3em] uppercase whitespace-nowrap"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                Official Partners
              </span>
              <div className="h-[1px] flex-1 max-w-40 bg-gradient-to-l from-transparent to-[#4274B9]/20" />
            </motion.div>
            <StandardMarquee sponsors={standard} />
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PremiumSpot — Containerless floating premium sponsor display
// with ambient particles, shimmer, and per-spot parallax float
// ---------------------------------------------------------------------------

// Parallax float configs — each spot drifts differently for organic feel
const FLOAT_CONFIGS = [
  { duration: 7, yRange: 5, delay: 0 },
  { duration: 9, yRange: 4, delay: 0.5 },
  { duration: 11, yRange: 6, delay: 1.0 },
];

// Particle seed data — stable positions per spot
function generateParticles(index: number, count: number = 8) {
  const seed = index * 137.5;
  return Array.from({ length: count }, (_, i) => {
    const hash = (seed + i * 73.1) % 100;
    return {
      id: i,
      x: 10 + (hash * 0.8), // 10-90% horizontal
      y: 5 + ((hash * 1.3 + i * 17) % 85), // 5-90% vertical
      size: 1.5 + (hash % 3), // 1.5-4.5px
      duration: 4 + (hash % 5), // 4-9s cycle
      delay: (i * 0.7) % 3, // staggered start
      color: i % 3 === 0 ? "#6AA3E0" : i % 3 === 1 ? "#4274B9" : "#8BB8E8",
    };
  });
}

function PremiumSpot({ sponsor, index }: { sponsor: Sponsor; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  useViewportImpression(sponsor, ref, "premium");

  const floatConfig = FLOAT_CONFIGS[index % FLOAT_CONFIGS.length];
  const particles = useMemo(() => generateParticles(index), [index]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.15, duration: 0.7, type: "spring", stiffness: 100 }}
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openSponsor(sponsor)}
    >
      {/* Slow parallax float — each spot drifts at its own rhythm */}
      <motion.div
        animate={{ y: [-floatConfig.yRange, floatConfig.yRange, -floatConfig.yRange] }}
        transition={{
          duration: floatConfig.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatConfig.delay,
        }}
      >
        {/* Product Image — LARGE, floating, no container, no border */}
        <div className="relative mb-5 sm:mb-6">
          {/* ── Ambient Particle Field (hidden on mobile for performance) ── */}
          <div className="absolute inset-0 -inset-x-4 -inset-y-6 pointer-events-none overflow-hidden hidden sm:block">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
                animate={{
                  opacity: hovered
                    ? [0, 0.4, 0.15, 0.35, 0]
                    : [0, 0.15, 0.05, 0.12, 0],
                  y: [0, -12 - p.size * 3, -20 - p.size * 4],
                  scale: [0.5, 1, 0.3],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: p.delay,
                }}
              />
            ))}
          </div>

          {/* ── Pulsing radial glow behind product ── */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[60%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${
                index === 0 ? "rgba(106,163,224,0.04)" :
                index === 1 ? "rgba(66,116,185,0.04)" :
                "rgba(139,184,232,0.04)"
              } 0%, transparent 70%)`,
            }}
            animate={{
              scale: hovered ? [1, 1.15, 1] : [1, 1.08, 1],
              opacity: hovered ? [0.8, 1, 0.8] : [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {sponsor.productImageUrl ? (
            <motion.div
              animate={{ y: hovered ? -8 : 0 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
              className="relative"
            >
              {/* ── Shimmer sweep across product image ── */}
              <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-10">
                <motion.div
                  className="absolute inset-y-0 w-[40%]"
                  style={{
                    background: "linear-gradient(105deg, transparent 0%, rgba(106,163,224,0.06) 40%, rgba(255,255,255,0.03) 50%, rgba(106,163,224,0.06) 60%, transparent 100%)",
                  }}
                  animate={{ x: ["-100%", "350%"] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 2,
                    repeatDelay: 3,
                  }}
                />
              </div>

              <ImageWithFallback
                src={sponsor.productImageUrl}
                alt={sponsor.name}
                className="w-full h-auto max-h-[180px] sm:max-h-[240px] lg:max-h-[280px] object-contain mx-auto drop-shadow-[0_8px_32px_rgba(66,116,185,0.08)] relative z-[1]"
              />

              {/* Ambient glow under image — enhanced on hover */}
              <motion.div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-10 rounded-full blur-xl pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at center, ${
                    index === 0 ? "rgba(106,163,224,0.08)" :
                    index === 1 ? "rgba(66,116,185,0.08)" :
                    "rgba(139,184,232,0.08)"
                  } 0%, transparent 70%)`,
                }}
                animate={{
                  opacity: hovered ? 1 : 0.3,
                  scaleX: hovered ? 1.1 : 0.9,
                }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
          ) : (
            <div className="w-full h-[140px] sm:h-[200px] flex items-center justify-center relative">
              <Star className="w-12 h-12 text-[#6AA3E0]/[0.06]" />
            </div>
          )}

          {/* Floating "PREMIUM" badge — top-left, no container */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 + 0.3, duration: 0.4 }}
            className="absolute top-2 left-0 flex items-center gap-1 z-10"
          >
            <motion.div
              animate={{ rotate: [0, 15, 0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 0.8 }}
            >
              <Star className="w-2.5 h-2.5 text-[#6AA3E0]/40" />
            </motion.div>
            <span
              className="text-[#6AA3E0]/30 text-[0.35rem] tracking-[0.2em]"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              PREMIUM
            </span>
          </motion.div>
        </div>

        {/* Logo — floating, large, no container */}
        {sponsor.logoUrl && (
          <motion.div
            className="mb-3 sm:mb-4"
            animate={{ opacity: hovered ? 1 : 0.7 }}
            transition={{ duration: 0.3 }}
          >
            <ImageWithFallback
              src={sponsor.logoUrl}
              alt={sponsor.name}
              className="h-8 sm:h-10 lg:h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(106,163,224,0.06)]"
            />
          </motion.div>
        )}

        {/* Text — clean floating typography */}
        <div className="space-y-1.5">
          <motion.h4
            className="text-[#E8ECF0] text-sm sm:text-base font-bold leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            animate={{ color: hovered ? "#ffffff" : "#E8ECF0" }}
            transition={{ duration: 0.3 }}
          >
            {sponsor.customText || sponsor.name}
          </motion.h4>

          {sponsor.tagline && (
            <p
              className="text-[#6AA3E0]/50 text-xs sm:text-sm italic leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {sponsor.tagline}
            </p>
          )}

          {sponsor.description && (
            <p
              className="text-[#8494A7]/70 text-xs leading-relaxed line-clamp-2 max-w-full sm:max-w-[280px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {sponsor.description}
            </p>
          )}
        </div>

        {/* CTA — floating text, no button */}
        <motion.div
          className="flex items-center gap-1.5 mt-3 sm:mt-4 group/cta"
          animate={{ x: hovered ? 4 : 0 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
        >
          <span
            className="text-[#6AA3E0]/50 text-[0.55rem] sm:text-[0.65rem] tracking-[0.15em] group-hover:text-[#6AA3E0] transition-colors duration-300"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {sponsor.ctaLabel || "LEARN MORE"}
          </span>
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#6AA3E0]/30 group-hover:text-[#6AA3E0] transition-colors duration-300" />
        </motion.div>

        {/* Bottom accent line  appears on hover */}
        <motion.div
          className="mt-4 sm:mt-5 h-[1px] bg-gradient-to-r from-[#6AA3E0]/30 via-[#4274B9]/15 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: hovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{ transformOrigin: "left" }}
        />
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StandardMarquee — Containerless infinite-scroll with grayscale hover
// ---------------------------------------------------------------------------

const MARQUEE_SPEED = 35; // seconds for one full cycle

function StandardMarquee({ sponsors }: { sponsors: Sponsor[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) sponsors.forEach((sp) => trackImpression(sp, "standard")); },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sponsors]);

  // We need enough items to fill the marquee seamlessly
  // Duplicate the list 4x to ensure no gaps during scroll
  const items = useMemo(() => {
    const repeated = [];
    for (let i = 0; i < 4; i++) {
      repeated.push(...sponsors.map((sp, j) => ({ ...sp, _key: `${i}-${j}` })));
    }
    return repeated;
  }, [sponsors]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fade edges — left and right gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-[#0B1120] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-[#0B1120] to-transparent z-10 pointer-events-none" />

      {/* Marquee track */}
      <div className="overflow-hidden py-4">
        <div
          className="flex items-center gap-6 sm:gap-14 lg:gap-16 w-max"
          style={{
            animation: `marquee-scroll ${MARQUEE_SPEED}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {items.map((sp, i) => (
            <MarqueeItem key={sp._key} sponsor={sp} />
          ))}
        </div>
      </div>

      {/* Inject keyframes */}
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </motion.div>
  );
}

// Individual marquee logo item
function MarqueeItem({ sponsor }: { sponsor: Sponsor }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={sponsor.ctaUrl || sponsor.websiteUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!sponsor.ctaUrl && !sponsor.websiteUrl) e.preventDefault();
        api.trackSponsorClick(sponsor.id).catch(() => {});
      }}
      className="group/item flex flex-col items-center gap-2 shrink-0 relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div className="relative">
        {sponsor.logoUrl ? (
          <div className="relative">
            <ImageWithFallback
              src={sponsor.logoUrl}
              alt={sponsor.name}
              className={`h-7 sm:h-9 lg:h-10 w-auto object-contain transition-all duration-500 ${
                hovered
                  ? "grayscale-0 opacity-100 scale-110"
                  : "grayscale opacity-35"
              }`}
              style={{
                filter: hovered
                  ? "grayscale(0) drop-shadow(0 0 12px rgba(106,163,224,0.25))"
                  : "grayscale(1)",
              }}
            />
            {/* Ambient glow on hover */}
            <div
              className={`absolute -inset-3 bg-[#6AA3E0]/[0.04] rounded-full blur-lg transition-opacity duration-500 pointer-events-none ${
                hovered ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        ) : (
          <span
            className={`text-xs font-semibold tracking-wider transition-all duration-500 ${
              hovered ? "text-[#E8ECF0]" : "text-[#8494A7]/40"
            }`}
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
          >
            {sponsor.name}
          </span>
        )}
      </div>

      {/* Sponsor name — appears on hover */}
      <span
        className={`text-[0.5rem] tracking-[0.1em] transition-all duration-400 whitespace-nowrap ${
          hovered
            ? "text-[#6AA3E0]/60 opacity-100 translate-y-0"
            : "text-[#6AA3E0]/0 opacity-0 translate-y-1"
        }`}
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        {sponsor.name}
      </span>

      {/* Tiny dot indicator under hovered item */}
      <div
        className={`w-1 h-1 rounded-full bg-[#6AA3E0] transition-all duration-400 ${
          hovered ? "opacity-40 scale-100" : "opacity-0 scale-0"
        }`}
      />
    </a>
  );
}

// ---------------------------------------------------------------------------
// SponsorMarqueeStrip — Standalone standard-tier marquee for reuse on any page
// Just the "OFFICIAL PARTNERS" label + scrolling logos, no premium spots.
// ---------------------------------------------------------------------------
export function SponsorMarqueeStrip() {
  const { data: sponsors, loading } = useSponsors();

  const standard = useMemo(() => {
    return sponsors.filter((sp) => hasTier(sp, "standard"));
  }, [sponsors]);

  if (loading || standard.length === 0) return null;

  return (
    <section className="relative py-8 sm:py-12 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* "OFFICIAL PARTNERS" label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-4 mb-6 sm:mb-8"
        >
          <div className="h-[1px] flex-1 max-w-40 bg-gradient-to-r from-transparent to-[#4274B9]/20" />
          <span
            className="text-[#4274B9]/35 text-[0.4rem] sm:text-[0.45rem] tracking-[0.3em] uppercase whitespace-nowrap"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            Official Partners
          </span>
          <div className="h-[1px] flex-1 max-w-40 bg-gradient-to-l from-transparent to-[#4274B9]/20" />
        </motion.div>
        <StandardMarquee sponsors={standard} />
      </div>
    </section>
  );
}