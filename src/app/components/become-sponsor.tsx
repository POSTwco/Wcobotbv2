/**
 * BOTB "Become a Sponsor" Section
 * ================================
 * Professional contact section for potential sponsors.
 * Two live Title Sponsor badges (Hedera, Gorilla Energy, etc.) flank the hero
 * title with 3D flip every 30s, animated gold border, floating particles,
 * pulsing glow, and interactive hover effects. Data comes from GET /sponsors.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import {
  Megaphone, Send, CheckCircle, Users, Globe, TrendingUp,
  Tv, BarChart3, Crown, Loader2, ExternalLink, Shield, Zap,
  Award, Star, ArrowRight, Dumbbell,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Sponsor } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ─── Perks ───────────────────────────────────────────────────────────────────
const PERKS = [
  { icon: Crown,      label: "Title Naming Rights",   description: "Your brand front and center on events and hero banners" },
  { icon: Tv,         label: "Product Showcase",       description: "Full-width product displays seen by every visitor" },
  { icon: Users,      label: "Engaged Community",      description: "Direct reach to passionate calisthenics athletes and fans" },
  { icon: Globe,      label: "Global Audience",        description: "Worldwide platform on Hedera's decentralized network" },
  { icon: BarChart3,  label: "Real-Time Analytics",    description: "Impression and click tracking on every placement" },
  { icon: TrendingUp, label: "Web3 Innovation",        description: "Position your brand at the forefront of blockchain sports" },
];

const BUDGET_OPTIONS = [
  "Under $1,000",
  "$1,000 - $5,000",
  "$5,000 - $15,000",
  "$15,000 - $50,000",
  "$50,000+",
  "Let's discuss",
];

const STATS = [
  { label: "Athletes", value: "500+", icon: Users },
  { label: "Countries", value: "40+", icon: Globe },
  { label: "On-chain Votes", value: "10K+", icon: Shield },
  { label: "NFT Holders", value: "1.2K+", icon: Award },
];

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const BADGE_STYLES_ID = "botb-badge-keyframes";
function ensureBadgeStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(BADGE_STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = BADGE_STYLES_ID;
  style.textContent = `
    @keyframes botb-border-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes botb-float {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-4px); }
    }
    @keyframes botb-shimmer {
      0%   { transform: translateX(-100%) rotate(25deg); }
      100% { transform: translateX(100%) rotate(25deg); }
    }
    @keyframes botb-particle {
      0%   { opacity: 0; transform: translate(0, 0) scale(0); }
      20%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
    }
    @keyframes botb-pulse-ring {
      0%   { transform: scale(1); opacity: 0.4; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Floating gold particles around badge ────────────────────────────────────
function BadgeParticles({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    const tx = Math.cos(angle) * 60;
    const ty = Math.sin(angle) * 60;
    return (
      <div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-[#D4A843]"
        style={{
          top: "50%",
          left: "50%",
          "--tx": `${tx}px`,
          "--ty": `${ty}px`,
          animation: `botb-particle 2s ease-out ${i * 0.3}s infinite`,
        } as React.CSSProperties}
      />
    );
  });
  return <div className="absolute inset-0 pointer-events-none z-20">{particles}</div>;
}

// ─── Title Sponsor Flip Badge ────────────────────────────────────────────────
function TitleSponsorBadge({
  sponsors,
  side,
}: {
  sponsors: Sponsor[];
  side: "left" | "right";
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const impressionTracked = useRef<Set<string>>(new Set());
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureBadgeStyles(); }, []);

  // Cycle sponsors every 30s with flip
  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setFlipped(true);
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % sponsors.length);
        setFlipped(false);
      }, 600);
    }, 30000);
    return () => clearInterval(interval);
  }, [sponsors.length]);

  const sponsor = sponsors[currentIdx];
  if (!sponsor) return null;

  // Track impression
  useEffect(() => {
    if (sponsor && !impressionTracked.current.has(sponsor.id)) {
      impressionTracked.current.add(sponsor.id);
      api.trackSponsorImpression(sponsor.id).catch(() => {});
    }
  }, [sponsor?.id]);

  const handleClick = () => {
    if (!sponsor) return;
    api.trackSponsorClick(sponsor.id).catch(() => {});
    window.open(sponsor.websiteUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="hidden sm:flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      ref={badgeRef}
    >
      {/* Outer wrapper with perspective */}
      <div style={{ perspective: "1200px" }} className="relative">
        {/* Animated spinning gold border */}
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            inset: -3,
            overflow: "hidden",
            borderRadius: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "-50%",
              background: hovered
                ? "conic-gradient(from 0deg, #D4A843, #E5B94E, transparent, #B8932B, #D4A843, transparent, #E5B94E, #D4A843)"
                : "conic-gradient(from 0deg, #D4A843, transparent 40%, #D4A843 50%, transparent 90%, #D4A843)",
              animation: `botb-border-spin ${hovered ? "2s" : "6s"} linear infinite`,
              opacity: hovered ? 0.9 : 0.4,
              transition: "opacity 0.4s",
            }}
          />
          {/* Inner mask */}
          <div
            className="absolute bg-[#0B1120]"
            style={{ inset: 3, borderRadius: 17 }}
          />
        </div>

        {/* Pulse rings on hover */}
        {hovered && (
          <>
            <div
              className="absolute inset-0 rounded-2xl border border-[#D4A843]/30 pointer-events-none"
              style={{ animation: "botb-pulse-ring 1.5s ease-out infinite" }}
            />
            <div
              className="absolute inset-0 rounded-2xl border border-[#D4A843]/20 pointer-events-none"
              style={{ animation: "botb-pulse-ring 1.5s ease-out 0.5s infinite" }}
            />
          </>
        )}

        {/* Floating particles */}
        <BadgeParticles active={hovered} />

        {/* The actual flip card */}
        <motion.div
          onClick={handleClick}
          className="relative cursor-pointer"
          style={{
            width: 192,
            height: 192,
            transformStyle: "preserve-3d",
            animation: hovered ? "none" : "botb-float 4s ease-in-out infinite",
          }}
          animate={{
            rotateY: flipped ? 180 : 0,
            scale: hovered ? 1.12 : 1,
          }}
          whileHover={{ rotateZ: side === "left" ? -2 : 2 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ─── FRONT ─── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#111c2b] via-[#0f1923] to-[#0B1120] flex flex-col items-center justify-center gap-2.5 p-4"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div
                className="absolute inset-0 w-[200%]"
                style={{
                  background: "linear-gradient(25deg, transparent 40%, rgba(212,168,67,0.08) 50%, transparent 60%)",
                  animation: "botb-shimmer 4s ease-in-out infinite",
                }}
              />
            </div>

            {/* Crown */}
            <motion.div
              className="relative z-10"
              animate={hovered ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.6 }}
            >
              <Crown className="w-6 h-6 text-[#D4A843]" style={{ filter: "drop-shadow(0 0 6px rgba(212,168,67,0.5))" }} />
            </motion.div>

            {/* Sponsor logo */}
            <div className="relative z-10 w-[120px] h-[72px] flex items-center justify-center">
              {sponsor.logoUrl ? (
                <ImageWithFallback
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="max-w-full max-h-full object-contain"
                  style={{ filter: hovered ? "drop-shadow(0 0 12px rgba(212,168,67,0.4)) brightness(1.1)" : "drop-shadow(0 0 6px rgba(212,168,67,0.2))" }}
                />
              ) : (
                <span
                  className="text-[#E8ECF0] text-sm font-bold text-center leading-tight"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {sponsor.name}
                </span>
              )}
            </div>

            {/* Sponsor name */}
            <span
              className="relative z-10 text-[#E8ECF0]/90 leading-none text-center font-semibold"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", letterSpacing: "0.05em" }}
            >
              {sponsor.name.toUpperCase()}
            </span>

            {/* Label */}
            <span
              className="relative z-10 text-[#D4A843]/60 leading-none"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.5rem", letterSpacing: "0.1em" }}
            >
              TITLE SPONSOR
            </span>
          </div>

          {/* ─── BACK ─── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2538] via-[#111c2b] to-[#0B1120] flex flex-col items-center justify-center p-5 gap-3"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div
                className="absolute inset-0 w-[200%]"
                style={{
                  background: "linear-gradient(25deg, transparent 40%, rgba(106,163,224,0.06) 50%, transparent 60%)",
                  animation: "botb-shimmer 3s ease-in-out infinite",
                }}
              />
            </div>

            <Crown className="w-6 h-6 text-[#D4A843]/80 relative z-10" />

            <span
              className="text-[#D4A843] font-bold text-center leading-tight relative z-10"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
            >
              {sponsor.name.toUpperCase()}
            </span>

            {sponsor.tagline && (
              <span
                className="text-[#8494A7] text-center leading-tight line-clamp-3 relative z-10 px-1"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem" }}
              >
                {sponsor.tagline}
              </span>
            )}

            <div className="flex items-center gap-1.5 mt-1 text-[#6AA3E0] relative z-10 group">
              <ExternalLink className="w-4 h-4" />
              <span style={{ fontSize: "0.6rem", fontFamily: "Orbitron, sans-serif" }}>
                VISIT SITE
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Glow pool under badge */}
      <div
        className="mt-2 rounded-full transition-all duration-500"
        style={{
          width: hovered ? 160 : 112,
          height: hovered ? 14 : 10,
          background: `radial-gradient(ellipse, rgba(212,168,67,${hovered ? 0.4 : 0.15}) 0%, transparent 70%)`,
          filter: `blur(${hovered ? 8 : 5}px)`,
        }}
      />

      {/* Sponsor name label underneath */}
      <motion.span
        className="mt-1 text-[#D4A843]/50 text-center"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", letterSpacing: "0.08em" }}
        animate={{ opacity: hovered ? 1 : 0.5 }}
      >
        {sponsor.name.toUpperCase()}
      </motion.span>
    </div>
  );
}

// ─── Empty sponsor placeholder ───────────────────────────────────────────────
function TitleSponsorPlaceholder({ side }: { side: "left" | "right" }) {
  useEffect(() => { ensureBadgeStyles(); }, []);
  return (
    <div className="hidden sm:flex flex-col items-center gap-1">
      <div
        className="relative"
        style={{
          width: 192,
          height: 192,
          animation: "botb-float 5s ease-in-out infinite",
        }}
      >
        <div className="absolute inset-0 rounded-2xl border border-dashed border-[#D4A843]/15 bg-[#0f1923]/50 flex flex-col items-center justify-center gap-3 p-4 group hover:border-[#D4A843]/30 transition-all duration-500 cursor-default">
          <Crown className="w-8 h-8 text-[#D4A843]/20 group-hover:text-[#D4A843]/40 transition-colors" />
          <span
            className="text-[#D4A843]/25 group-hover:text-[#D4A843]/40 text-center leading-tight transition-colors"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", letterSpacing: "0.05em" }}
          >
            TITLE SPONSOR
            <br />
            AVAILABLE
          </span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SECTION
// ═════════════════════════════════════════════════════════════════════════════

export function BecomeSponsorSection() {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    message: "",
    budget: "",
    logoUrl: "",
    productImageUrl: "",
    websiteUrl: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [titleSponsors, setTitleSponsors] = useState<Sponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  // Fetch title sponsors on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getSponsors();
        const all = res.data || [];
        // Server already filters active, but double-check + filter title tier
        const titles = all
          .filter((s) => s.active && (s.tier === "title" || s.tiers?.includes("title")))
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setTitleSponsors(titles);
      } catch (err) {
        console.log("[BecomeSponsor] Failed to load title sponsors:", err);
      } finally {
        setLoadingSponsors(false);
      }
    })();
  }, []);

  // Assign left/right: first title sponsor goes left, second goes right
  // If there's only one, it goes left; if more than 2, they cycle within each badge
  const leftSponsors = titleSponsors.filter((_, i) => i % 2 === 0);
  const rightSponsors = titleSponsors.length > 1
    ? titleSponsors.filter((_, i) => i % 2 === 1)
    : [];

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.contactEmail) {
      toast.error("Company name and email are required");
      return;
    }
    setSending(true);
    try {
      const res = await api.submitSponsorInquiry(form);
      if (res.success) {
        setSent(true);
        toast.success("Inquiry submitted! Our team will be in touch shortly.");
      } else {
        toast.error(res.error || "Failed to submit inquiry");
      }
    } catch (err: any) {
      console.error("[Sponsor Inquiry] Submission error:", err);
      toast.error(sanitizeErrorMessage(err?.message || err));
    } finally {
      setSending(false);
    }
  }, [form]);

  return (
    <section className="py-12 sm:py-20 relative overflow-hidden" id="sponsor">
      {/* ── Enhanced background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120] via-[#080d18] to-[#0B1120] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-[#D4A843]/[0.015] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#4274B9]/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(212,168,67,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ══ Header with Title Sponsor Badges ══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4A843]/5 border border-[#D4A843]/20 mb-6">
            <Megaphone className="w-4 h-4 text-[#D4A843]" />
            <span className="text-[#D4A843] text-xs tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
              PARTNERSHIP OPPORTUNITIES
            </span>
          </div>

          {/* ── Title row:  [Badge]  BECOME A SPONSOR  [Badge] ── */}
          <div className="flex items-center justify-center gap-5 sm:gap-8 lg:gap-12 mb-5">
            {/* Left badge */}
            {!loadingSponsors && leftSponsors.length > 0 ? (
              <TitleSponsorBadge sponsors={leftSponsors} side="left" />
            ) : !loadingSponsors ? (
              <TitleSponsorPlaceholder side="left" />
            ) : (
              <div className="hidden sm:block w-[192px]" />
            )}

            {/* Center title */}
            <div className="flex-shrink-0">
              <h2
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                style={{ fontFamily: "Orbitron, sans-serif", lineHeight: 1.15 }}
              >
                <span className="text-white">BECOME A </span>
                <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-[#D4A843] via-[#E5B94E] to-[#D4A843] bg-clip-text text-transparent">
                  SPONSOR
                </span>
              </h2>
              <div className="mt-3 mx-auto flex items-center justify-center gap-2">
                <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-[#D4A843]/40" />
                <Star className="w-3 h-3 text-[#D4A843]/50" />
                <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-[#D4A843]/40" />
              </div>
            </div>

            {/* Right badge */}
            {!loadingSponsors && rightSponsors.length > 0 ? (
              <TitleSponsorBadge sponsors={rightSponsors} side="right" />
            ) : !loadingSponsors ? (
              <TitleSponsorPlaceholder side="right" />
            ) : (
              <div className="hidden sm:block w-[192px]" />
            )}
          </div>

          <p className="text-[#8494A7] max-w-2xl mx-auto text-sm sm:text-base leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Align your brand with the world's first decentralized calisthenics competition platform.
            Reach a <span className="text-[#6AA3E0] font-semibold">passionate global audience</span> of athletes, fans, and Web3 pioneers on Hedera Hashgraph.
          </p>
        </motion.div>

        {/* ══ Social Proof Stats Bar ══ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="mb-10 sm:mb-14"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center py-3 px-4 rounded-xl bg-[#0f1923]/60 border border-[#4274B9]/10 backdrop-blur-sm hover:border-[#D4A843]/20 transition-all duration-300"
              >
                <stat.icon className="w-4 h-4 text-[#D4A843]/60 mb-1.5" />
                <span
                  className="text-[#E8ECF0] text-lg sm:text-xl font-bold"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {stat.value}
                </span>
                <span
                  className="text-[#8494A7] mt-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.6rem" }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ══ Perks Grid ══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-10 sm:mb-14"
        >
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * i }}
              className="bg-[#0f1923] border border-[#D4A843]/10 rounded-xl p-4 sm:p-5 group hover:border-[#D4A843]/25 hover:bg-[#111d2a] transition-all duration-300 hover:shadow-lg hover:shadow-[#D4A843]/[0.03]"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-[#D4A843]/5 flex items-center justify-center mb-3 group-hover:bg-[#D4A843]/10 transition-colors">
                <perk.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4A843]" />
              </div>
              <h4 className="text-[#E8ECF0] text-xs sm:text-sm font-bold mb-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                {perk.label.toUpperCase()}
              </h4>
              <p className="text-[#8494A7] text-[0.6rem] sm:text-xs leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {perk.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ══ "Why Partner" banner ══ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 sm:mb-14 rounded-2xl overflow-hidden border border-[#D4A843]/10 bg-gradient-to-r from-[#D4A843]/[0.04] via-[#0f1923] to-[#4274B9]/[0.04]"
        >
          <div className="p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center">
              <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-[#D4A843]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3
                className="text-[#E8ECF0] text-sm sm:text-base font-bold mb-1.5"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                WHY PARTNER WITH BOTB?
              </h3>
              <p
                className="text-[#8494A7] text-xs sm:text-sm leading-relaxed max-w-xl"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Every impression is tracked on-chain. Every click is verifiable. Our sponsors don't just get exposure — they get
                <span className="text-[#6AA3E0] font-semibold"> transparent, immutable proof of ROI </span>
                powered by Hedera Hashgraph. No black-box analytics, no inflated numbers.
              </p>
            </div>
            <div className="flex-shrink-0 hidden lg:flex flex-col gap-2">
              {["Verified analytics", "On-chain impressions", "Real-time dashboards"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                  <span className="text-[#8494A7] text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ══ Tier overview + Contact form ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Tier Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 space-y-3"
          >
            <h3 className="text-[#E8ECF0] text-sm font-bold mb-4" style={{ fontFamily: "Orbitron, sans-serif" }}>
              SPONSORSHIP TIERS
            </h3>

            {/* Title tier */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#D4A843]/5 to-[#0f1923] border border-[#D4A843]/20 hover:border-[#D4A843]/35 transition-all duration-300 group">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-[#D4A843]" />
                <span className="text-[#D4A843] text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>TITLE SPONSOR</span>
                <span className="ml-auto text-[0.45rem] px-1.5 py-0.5 rounded-full bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/20" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  PREMIUM
                </span>
              </div>
              <ul className="space-y-1 text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Full-width hero banner with product showcase</li>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Event naming rights (e.g. "Acme BOTB Invitational")</li>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Custom display text and CTA button</li>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Impression and click analytics dashboard</li>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Featured in title sponsor badges across the platform</li>
              </ul>
            </div>

            {/* Premium tier */}
            <div className="p-4 rounded-xl bg-[#0f1923] border border-[#6AA3E0]/15 hover:border-[#6AA3E0]/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-[#6AA3E0]" />
                <span className="text-[#6AA3E0] text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>PREMIUM PARTNER</span>
              </div>
              <ul className="space-y-1 text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <li className="flex items-start gap-1.5"><span className="text-[#6AA3E0] mt-0.5">-</span> Featured card with product imagery</li>
                <li className="flex items-start gap-1.5"><span className="text-[#6AA3E0] mt-0.5">-</span> Logo, tagline, and description display</li>
                <li className="flex items-start gap-1.5"><span className="text-[#6AA3E0] mt-0.5">-</span> Click-through to your website or landing page</li>
              </ul>
            </div>

            {/* Standard tier */}
            <div className="p-4 rounded-xl bg-[#0f1923] border border-[#4274B9]/10 hover:border-[#4274B9]/20 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#8494A7]" />
                <span className="text-[#8494A7] text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>STANDARD</span>
              </div>
              <ul className="space-y-1 text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <li className="flex items-start gap-1.5"><span className="text-[#8494A7] mt-0.5">-</span> Logo placement in partner row</li>
                <li className="flex items-start gap-1.5"><span className="text-[#8494A7] mt-0.5">-</span> Click-through link to your website</li>
              </ul>
            </div>

            {/* Routine tier */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#D4A843]/5 to-[#0f1923] border border-[#D4A843]/20 hover:border-[#D4A843]/35 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-4 h-4 text-[#D4A843]" />
                <span className="text-[#D4A843] text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>ROUTINE SPONSOR</span>
              </div>
              <ul className="space-y-1 text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Compact gold banner under generated workout routines</li>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Logo, tagline, and product image placement</li>
                <li className="flex items-start gap-1.5"><span className="text-[#D4A843] mt-0.5">-</span> Reaches athletes during active calisthenics sessions</li>
              </ul>
            </div>

            <div className="mt-4 pt-4 border-t border-[#4274B9]/10">
              <p className="text-[#8494A7]/60 text-[0.5rem] text-center" style={{ fontFamily: "Orbitron, sans-serif", letterSpacing: "0.1em" }}>
                POWERED BY HEDERA HASHGRAPH
              </p>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3"
          >
            <div className="bg-[#0f1923] border border-[#D4A843]/15 rounded-2xl overflow-hidden shadow-xl shadow-[#000]/20">
              <div className="px-5 sm:px-6 py-4 border-b border-[#D4A843]/10 bg-gradient-to-r from-[#D4A843]/5 via-[#D4A843]/[0.02] to-transparent">
                <h3 className="text-[#E8ECF0] text-sm font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <Send className="w-4 h-4 text-[#D4A843]" />
                  GET IN TOUCH
                </h3>
                <p className="text-[#8494A7] text-[0.6rem] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Submit your interest and our partnerships team will reach out within 48 hours.
                </p>
              </div>

              {sent ? (
                <div className="p-8 sm:p-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "backOut" }}
                  >
                    <div className="inline-flex p-4 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 mb-4">
                      <CheckCircle className="w-10 h-10 text-[#10b981]" />
                    </div>
                  </motion.div>
                  <h4 className="text-[#E8ECF0] text-lg font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}>
                    INQUIRY RECEIVED
                  </h4>
                  <p className="text-[#8494A7] text-sm max-w-sm mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Thank you for your interest in partnering with Battle of the Bars.
                    Our team will review your inquiry and follow up shortly.
                  </p>
                  <button
                    onClick={() => { setSent(false); setForm({ companyName: "", contactName: "", contactEmail: "", message: "", budget: "", logoUrl: "", productImageUrl: "", websiteUrl: "" }); }}
                    className="mt-4 text-xs text-[#6AA3E0] hover:text-[#E8ECF0] transition-colors cursor-pointer"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    SUBMIT ANOTHER INQUIRY
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>COMPANY NAME *</label>
                      <input
                        type="text"
                        value={form.companyName}
                        onChange={(e) => set("companyName", e.target.value)}
                        className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all placeholder:text-[#8494A7]/30"
                        placeholder="Your company"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>CONTACT NAME</label>
                      <input
                        type="text"
                        value={form.contactName}
                        onChange={(e) => set("contactName", e.target.value)}
                        className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all placeholder:text-[#8494A7]/30"
                        placeholder="Your name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => set("contactEmail", e.target.value)}
                      className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all placeholder:text-[#8494A7]/30"
                      placeholder="partnerships@yourcompany.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>SPONSORSHIP BUDGET</label>
                    <div className="flex flex-wrap gap-1.5">
                      {BUDGET_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set("budget", form.budget === opt ? "" : opt)}
                          className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[0.55rem] sm:text-[0.6rem] border transition-all min-h-[36px] sm:min-h-0 cursor-pointer ${
                            form.budget === opt
                              ? "bg-[#D4A843]/10 border-[#D4A843]/40 text-[#D4A843] shadow-[0_0_8px_rgba(212,168,67,0.1)]"
                              : "border-[#4274B9]/15 text-[#8494A7] hover:text-[#E8ECF0] hover:border-[#4274B9]/25"
                          }`}
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brand Assets & Website */}
                  <div>
                    <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>COMPANY WEBSITE</label>
                    <input
                      type="url"
                      value={form.websiteUrl}
                      onChange={(e) => set("websiteUrl", e.target.value)}
                      className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all placeholder:text-[#8494A7]/30"
                      placeholder="https://yourcompany.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>COMPANY LOGO URL</label>
                      <input
                        type="url"
                        value={form.logoUrl}
                        onChange={(e) => set("logoUrl", e.target.value)}
                        className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all placeholder:text-[#8494A7]/30"
                        placeholder="https://yourcompany.com/logo.png"
                      />
                      {form.logoUrl && (
                        <div className="mt-1.5 w-16 h-16 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden">
                          <ImageWithFallback src={form.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>PRODUCT IMAGE URL</label>
                      <input
                        type="url"
                        value={form.productImageUrl}
                        onChange={(e) => set("productImageUrl", e.target.value)}
                        className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all placeholder:text-[#8494A7]/30"
                        placeholder="https://yourcompany.com/product.png"
                      />
                      {form.productImageUrl && (
                        <div className="mt-1.5 w-24 h-16 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden">
                          <ImageWithFallback src={form.productImageUrl} alt="Product preview" className="w-full h-full object-contain p-1" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[#8494A7]/50 text-[0.45rem]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Images are optional — you can provide them later. Our team will follow up for assets if needed.
                  </p>

                  <div>
                    <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>MESSAGE</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      rows={3}
                      className="w-full bg-[#0B1120] border border-[#4274B9]/20 rounded-lg px-3 py-2.5 text-[#E8ECF0] text-sm outline-none focus:border-[#D4A843]/50 focus:shadow-[0_0_0_1px_rgba(212,168,67,0.15)] transition-all resize-none placeholder:text-[#8494A7]/30"
                      placeholder="Tell us about your brand and what you're looking for in a partnership..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !form.companyName || !form.contactEmail}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#D4A843] to-[#B8932B] text-[#0B1120] font-bold hover:from-[#E5B94E] hover:to-[#D4A843] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#D4A843]/20 group cursor-pointer"
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        SUBMITTING...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        SUBMIT PARTNERSHIP INQUIRY
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                      </>
                    )}
                  </button>

                  <p className="text-[#8494A7] text-[0.5rem] text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    By submitting, you agree to be contacted by the WCO partnerships team. No spam, ever.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}