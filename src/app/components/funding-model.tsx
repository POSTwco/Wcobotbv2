/**
 * BOTB Funding & Revenue Model — "The Funding Letter"
 * =====================================================
 * Bronze envelope + premium interactive modal presenting the BOTB
 * revenue streams and deflationary burn mechanics.
 *
 * Written in professional sports-business language using NLP techniques:
 *   - Problem → Agitate → Solve framing per revenue stream
 *   - Concrete "why this matters" anchoring statements
 *   - Operator-facing ROI language (how YOU make money)
 *   - Digestible card-based layout with progressive disclosure
 *   - Interactive elements: expandable deep-dives, animated counters,
 *     visual flow diagrams, confidence-building callouts
 *
 * Designed for sports franchise owners and executive operators.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ChevronRight, ChevronLeft, Coins, Crown, Flame, TrendingUp,
  DollarSign, Zap, Shield, Users, Star, Award, BarChart3, Layers,
  Target, ArrowRight, ArrowDown, CheckCircle, Lock, Rocket,
  Globe, Wallet, FileText, Heart, Sparkles, MessageSquare,
  Trophy, Cpu, Eye, PieChart, Gem, Megaphone, Ticket, Vote,
  BadgeCheck, ShieldCheck, Repeat, Timer, Gift, Banknote,
  CircleDollarSign, TrendingDown, Scale, HandCoins,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// WCO Official Logo
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
const IMG_REVENUE = "https://images.unsplash.com/photo-1758691736508-a85d1f7d5a77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHJldmVudWUlMjBncm93dGglMjBjaGFydCUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzMwMTY5MTd8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_ARENA = "https://images.unsplash.com/photo-1700831212888-c1e23eeaf129?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBhcmVuYSUyMGZpcmUlMjBweXJvdGVjaG5pY3MlMjBjb21wZXRpdGlvbnxlbnwxfHx8fDE3NzMwMTY5MjB8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_TREASURE = "https://images.unsplash.com/photo-1637597383958-d777c022e241?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkJTIwY29pbnMlMjB0cmVhc3VyZSUyMGludmVzdG1lbnQlMjB3ZWFsdGh8ZW58MXx8fHwxNzczMDE2OTI0fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_PARTNERSHIP = "https://images.unsplash.com/photo-1758518729240-7162d07427b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBoYW5kc2hha2UlMjBwYXJ0bmVyc2hpcCUyMGRlYWwlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzczMDE2OTI5fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_BURN = "https://images.unsplash.com/photo-1635194984188-b6ecd5bb0a90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbGFtZSUyMGJ1cm4lMjBmaXJlJTIwYWJzdHJhY3QlMjBkYXJrfGVufDF8fHx8MTc3MzAxNjkzM3ww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_CARDS = "https://images.unsplash.com/photo-1600196025037-fa07d787bd54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBjb2xsZWN0aWJsZSUyMHRyYWRpbmclMjBjYXJkcyUyMG1lbW9yYWJpbGlhfGVufDF8fHx8MTc3MzAxNjkzN3ww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_CROWD = "https://images.unsplash.com/photo-1760163506380-2be2a2f8bf0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFkaXVtJTIwY3Jvd2QlMjBmYW5zJTIwY2hlZXJpbmclMjBuaWdodCUyMGxpZ2h0c3xlbnwxfHx8fDE3NzMwMTY5NDF8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_LAUNCH = "https://images.unsplash.com/photo-1759808418292-f65b69f3ca48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrZXQlMjBsYXVuY2glMjBuaWdodCUyMHNreSUyMHNwYWNlJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzMwMTY5NDR8MA&ixlib=rb-4.1.0&q=80&w=1080";

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------
const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "DM Sans, sans-serif" };

function GlassCard({ children, className = "", glow = "#CD7F32" }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.06] overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(11,17,32,0.92) 0%, rgba(22,32,51,0.88) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: `0 0 40px ${glow}10, 0 1px 0 rgba(255,255,255,0.04) inset`,
      }}
    >
      {children}
    </div>
  );
}

function SectionBadge({ number, label, color }: { number: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-[0.65rem] font-black"
        style={{ ...orbitron, background: `${color}20`, border: `1px solid ${color}40`, color }}
      >
        {number}
      </div>
      <span className="text-[#8494A7] text-xs tracking-widest uppercase" style={orbitron}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated counter for "why it matters" metrics
// ---------------------------------------------------------------------------
function AnimatedMetric({ value, label, prefix = "", suffix = "", color }: { value: number; label: string; prefix?: string; suffix?: string; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const duration = 1200;
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayed(Math.round(value * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-2xl md:text-3xl font-black" style={{ ...orbitron, color }}>
        {prefix}{displayed.toLocaleString()}{suffix}
      </p>
      <p className="text-[#8494A7] text-[0.6rem] mt-1 tracking-wide" style={dmSans}>{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable Deep-Dive Card
// ---------------------------------------------------------------------------
function RevenueCard({
  title, tagline, icon, color, whyItMatters, howItWorks, operatorBenefit, implementationEase,
  imageSrc, imageAlt,
}: {
  title: string; tagline: string; icon: React.ReactNode; color: string;
  whyItMatters: string; howItWorks: string[]; operatorBenefit: string;
  implementationEase: "Ready Now" | "Low Effort" | "Medium Effort";
  imageSrc?: string; imageAlt?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const easeColor = implementationEase === "Ready Now" ? "#22C55E" : implementationEase === "Low Effort" ? "#6AA3E0" : "#F59E0B";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="overflow-hidden" glow={color}>
        {/* Image header (optional) */}
        {imageSrc && (
          <div className="relative h-28 overflow-hidden">
            <ImageWithFallback src={imageSrc} alt={imageAlt || title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/60 to-transparent" />
            <div className="absolute top-3 right-3">
              <span
                className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold border"
                style={{ ...orbitron, background: `${easeColor}15`, borderColor: `${easeColor}40`, color: easeColor }}
              >
                {implementationEase.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}
            >
              <span style={{ color }}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>{title}</h4>
                {!imageSrc && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold border"
                    style={{ ...orbitron, background: `${easeColor}15`, borderColor: `${easeColor}40`, color: easeColor }}
                  >
                    {implementationEase.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 italic" style={{ ...dmSans, color }}>{tagline}</p>
            </div>
          </div>

          {/* Why It Matters — always visible */}
          <div className="rounded-xl p-3 mb-3" style={{ background: `${color}06`, border: `1px solid ${color}12` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-[0.6rem] font-bold tracking-widest" style={{ ...orbitron, color }}>WHY THIS MATTERS</span>
            </div>
            <p className="text-[#B0BCC9] text-xs leading-relaxed" style={dmSans}>{whyItMatters}</p>
          </div>

          {/* Operator Benefit — always visible */}
          <div className="rounded-xl p-3 mb-3 bg-[#22C55E]/[0.04] border border-[#22C55E]/10">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[0.6rem] font-bold tracking-widest text-[#22C55E]" style={orbitron}>YOUR RETURN</span>
            </div>
            <p className="text-[#B0BCC9] text-xs leading-relaxed" style={dmSans}>{operatorBenefit}</p>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[0.6rem] font-bold transition-all hover:bg-white/[0.02]"
            style={{ ...orbitron, color: "#8494A7" }}
          >
            {expanded ? "COLLAPSE" : "HOW IT WORKS"}
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ArrowDown className="w-3 h-3" />
            </motion.div>
          </button>

          {/* Expanded: How It Works */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-1.5">
                  {howItWorks.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-[0.68rem] text-[#8494A7]" style={dmSans}>
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[0.5rem] font-black mt-0.5"
                        style={{ ...orbitron, background: `${color}12`, color }}
                      >
                        {i + 1}
                      </div>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Burn Mechanism Card
// ---------------------------------------------------------------------------
function BurnCard({
  title, description, burnType, annualImpact, color, icon, details,
}: {
  title: string; description: string; burnType: string; annualImpact: string;
  color: string; icon: React.ReactNode; details: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
    >
      <GlassCard glow={color}>
        <div className="p-4">
          <div className="flex items-start gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}
            >
              <span style={{ color }}>{icon}</span>
            </div>
            <div className="flex-1">
              <h4 className="text-[#E8ECF0] text-xs font-bold" style={orbitron}>{title}</h4>
              <p className="text-[#8494A7] text-[0.65rem] mt-0.5" style={dmSans}>{description}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold border flex items-center gap-1"
              style={{ ...orbitron, background: `${color}10`, borderColor: `${color}25`, color }}
            >
              <Flame className="w-2.5 h-2.5" /> {burnType}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold border flex items-center gap-1"
              style={{ ...orbitron, background: "#22C55E10", borderColor: "#22C55E25", color: "#22C55E" }}
            >
              <TrendingDown className="w-2.5 h-2.5" /> {annualImpact}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[0.55rem] font-bold transition-all hover:bg-white/[0.02]"
            style={{ ...orbitron, color: "#8494A7" }}
          >
            {expanded ? "COLLAPSE" : "IMPLEMENTATION DETAILS"}
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ArrowDown className="w-3 h-3" />
            </motion.div>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-1">
                  {details.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[0.6rem] text-[#8494A7]" style={dmSans}>
                      <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color }} />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ===========================================================================
// SECTION 1 — REVENUE STREAMS
// ===========================================================================
function Section1_RevenueStreams() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <ImageWithFallback src={IMG_REVENUE} alt="Revenue Growth" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#CD7F32]/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SectionBadge number="01" label="Revenue Architecture" color="#CD7F32" />
          <h2 className="text-[#E8ECF0] text-xl md:text-2xl font-black tracking-tight" style={orbitron}>
            7 REVENUE STREAMS
          </h2>
          <p className="text-[#CD7F32] text-xs mt-1 max-w-lg" style={dmSans}>
            Every stream is designed to grow the ecosystem — not extract from it. Revenue follows participation.
          </p>
        </div>
      </div>

      {/* Executive Summary Card */}
      <GlassCard className="p-5" glow="#22C55E">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>EXECUTIVE OVERVIEW</h3>
        </div>
        <p className="text-[#B0BCC9] text-xs leading-relaxed mb-4" style={dmSans}>
          Traditional sports leagues charge fans for access. BOTB does the opposite — <strong className="text-[#E8ECF0]">fans earn by participating</strong>.
          Our revenue model is built on a principle that separates us from every other sports platform on the market:
          <strong className="text-[#22C55E]"> the protocol profits when the community thrives, never when it suffers</strong>.
          Every revenue stream below activates only when people are using, enjoying, and benefiting from the platform.
          When activity rises, revenue rises. When activity falls, costs fall proportionally. Zero extraction. Pure alignment.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <AnimatedMetric value={7} label="REVENUE STREAMS" color="#CD7F32" />
          <AnimatedMetric value={6} label="BURN MECHANISMS" color="#EF4444" />
          <AnimatedMetric value={0} label="COMMUNITY COST" prefix="" suffix="" color="#22C55E" />
        </div>
      </GlassCard>

      {/* Principle Card */}
      <div className="rounded-2xl p-4 border border-[#CD7F32]/15" style={{ background: "linear-gradient(135deg, #CD7F3208, #0B1120)" }}>
        <p className="text-center text-sm font-bold text-[#CD7F32] mb-2" style={orbitron}>THE GOLDEN RULE OF BOTB REVENUE</p>
        <p className="text-center text-[#B0BCC9] text-xs leading-relaxed max-w-lg mx-auto" style={dmSans}>
          "If a revenue mechanism would discourage a new fan from joining, or penalize an existing holder for simply holding — it does not belong in this ecosystem."
        </p>
      </div>

      {/* Revenue Stream 1: Meta Mint */}
      <RevenueCard
        title="META SERIES NFT MINT"
        tagline="Every competition is a revenue event"
        icon={<Gem className="w-5 h-5" />}
        color="#10B981"
        imageSrc={IMG_CARDS}
        imageAlt="Collectible Trading Cards"
        implementationEase="Ready Now"
        whyItMatters="The Meta Series is an unlimited-supply NFT collection minted on demand during live competitions. Unlike Governor and Sigma NFTs which have fixed supplies, Meta cards are created fresh for every event — meaning every single competition you run automatically generates a new revenue opportunity. This is the equivalent of selling event merchandise, except digital, global, and with zero inventory cost."
        operatorBenefit="Direct token revenue on every competition. The mint fee creates immediate BOTB demand (fans buy tokens to mint), and the 50/50 treasury-burn split means half the revenue strengthens your treasury while the other half permanently reduces circulating supply — making every remaining token more scarce."
        howItWorks={[
          "Set a mint price per Meta card (e.g. 500-2,000 BOTB) — adjustable per event tier.",
          "Fans browse the active competition and choose to mint an influencer H2H card featuring their favorite matchup.",
          "BOTB tokens are collected at point of mint via HTS transaction.",
          "50% of collected tokens are routed to the Operations Treasury for reinvestment.",
          "50% of collected tokens are sent to a verified Hedera burn address (0.0.0) — permanently removed from circulation.",
          "Higher-profile events can command premium mint prices. Championship finals could be 5-10x regular mint cost.",
          "Secondary market royalties (5-8%) generate ongoing revenue each time a Meta card is resold on SentX or other Hedera marketplaces.",
        ]}
      />

      {/* Revenue Stream 2: Sponsorship Buyback */}
      <RevenueCard
        title="SPONSORSHIP BUYBACK ENGINE"
        tagline="External capital flowing into your ecosystem"
        icon={<Megaphone className="w-5 h-5" />}
        color="#4274B9"
        imageSrc={IMG_PARTNERSHIP}
        imageAlt="Business Partnership"
        implementationEase="Ready Now"
        whyItMatters="You already have 11+ sponsorship routes built into the server. Sponsors pay in HBAR or USDC for brand placement across the platform — banners, battle sponsorships, event naming rights, and leaderboard placements. This is the most powerful revenue stream because it brings outside money into the BOTB ecosystem. Unlike internal fees that recirculate existing tokens, sponsorship revenue represents net-new capital entering the system."
        operatorBenefit="Every dollar a sponsor spends creates buy pressure on BOTB tokens. A portion of sponsor payments are used to purchase BOTB off SaucerSwap at market price, then either added to treasury or burned. This is the gold standard of tokenomics — your community's token appreciates because real businesses are paying real money to be associated with your brand."
        howItWorks={[
          "Sponsors apply through the existing sponsorship portal with tier selection (Platinum, Gold, Silver, Community).",
          "Payment is collected in HBAR or USDC to a designated WCO operations wallet.",
          "A configurable percentage (recommended: 20-40%) is allocated to the BOTB Buyback Fund.",
          "The Buyback Fund executes periodic market purchases of BOTB on SaucerSwap DEX.",
          "Purchased tokens are split: 60% to treasury for ecosystem development, 40% burned permanently.",
          "Remaining sponsor revenue (60-80%) funds operations, prize pools, event production, and team compensation.",
          "Quarterly transparency reports published to the community showing sponsor revenue and buyback amounts.",
        ]}
      />

      {/* Revenue Stream 3: NFT Royalties */}
      <RevenueCard
        title="NFT SECONDARY ROYALTIES"
        tagline="Every trade funds the ecosystem"
        icon={<Repeat className="w-5 h-5" />}
        color="#7C5CDB"
        implementationEase="Low Effort"
        whyItMatters="Hedera Token Service natively supports royalty fees on NFT transfers. Every time a Governor NFT (100 supply) or Sigma Series card (1,200 supply) changes hands on secondary markets like SentX, the protocol automatically earns a percentage. This is passive, perpetual revenue that compounds with ecosystem growth — the more valuable your NFTs become, the more each trade generates."
        operatorBenefit="Set-and-forget revenue. Once configured at the HTS token level, royalties are enforced by the Hedera network itself — no smart contract maintenance, no manual collection. Governor NFTs trading at premium prices (they're the apex 100-supply governance asset) can generate significant per-trade royalties. As the ecosystem matures and secondary volume increases, this becomes a compounding revenue flywheel."
        howItWorks={[
          "Configure a 5-8% royalty fee on the Governor NFT collection (0.0.9338241) via HTS custom fees.",
          "Configure a 5% royalty fee on the Sigma Series collection at token creation.",
          "Configure a 3-5% royalty fee on Meta Series cards (high volume, lower per-unit fee).",
          "Royalties are automatically collected in HBAR by the Hedera network on every secondary sale.",
          "Collected royalties flow to the WCO treasury wallet.",
          "Governor trades: high value per trade, lower frequency. Sigma trades: moderate value, higher frequency during event seasons.",
          "Royalty rates are transparent and visible to buyers before purchase — industry standard, expected by collectors.",
        ]}
      />

      {/* Revenue Stream 4: Premium Event Passes */}
      <RevenueCard
        title="PREMIUM IRL EVENT PASSES"
        tagline="Bridge digital ownership to real-world experiences"
        icon={<Ticket className="w-5 h-5" />}
        color="#EC4899"
        implementationEase="Medium Effort"
        whyItMatters="The whitepaper already identifies event passes as a core demand driver. BOTB tokens aren't just a digital asset — they're your ticket to the action. VIP access to live calisthenics competitions, exclusive livestreams, athlete meet-and-greets, and ringside virtual seats can all be gated by BOTB token holdings or purchases. This creates a direct link between token utility and real-world experiences that no traditional ticketing platform offers."
        operatorBenefit="Premium experiences command premium pricing. A VIP pass to a championship final paid in BOTB tokens creates immediate demand while simultaneously funding the event production. Token-gated access eliminates scalping and fraud — the blockchain is the ticket. You also build deeper community loyalty when fans associate real memories with their token holdings."
        howItWorks={[
          "Create tiered event passes: General (free with token holding), VIP (500 BOTB), Ringside (2,000 BOTB), All-Access (5,000 BOTB).",
          "Passes are purchased by sending BOTB tokens to the event contract address.",
          "Token-gated livestreams verified via wallet connection — hold the pass NFT, get access.",
          "In-person events use QR code check-in linked to wallet address and pass tier.",
          "Collected tokens: 70% to event production and prize pools, 30% to treasury/burn split.",
          "Season passes (bundle all events) at a discount, creating longer-term token demand.",
        ]}
      />

      {/* Revenue Stream 5: Arena Chat Premium */}
      <RevenueCard
        title="ARENA CHAT PREMIUM FEATURES"
        tagline="Voluntary cosmetics that fuel the spectacle"
        icon={<MessageSquare className="w-5 h-5" />}
        color="#F59E0B"
        implementationEase="Low Effort"
        whyItMatters="Your 5-phase Arena Chat is already built with Governor-exclusive tiers, glassmorphism UI, floating particles, and emotion bars. The gaming industry has proven beyond any doubt that voluntary cosmetic micro-transactions are the most community-friendly monetization model ever invented. Players who want to stand out pay small amounts for visual flair — players who don't want to are completely unaffected. Zero pay-to-win. Pure self-expression."
        operatorBenefit="Micro-transactions at scale. Even 50-100 BOTB per highlighted message across thousands of active chat participants during a live battle generates meaningful volume. The psychological anchoring is powerful: spending a tiny amount of BOTB 'feels like nothing' but aggregates into significant revenue. Every token spent is either burned or recycled into prize pools."
        howItWorks={[
          "Highlighted Messages: Pay 50 BOTB to pin your message at the top of chat for 3 minutes with a glowing border.",
          "Premium Chat Badges: Unlock animated badges (fire, lightning, crown) for 200-500 BOTB — displayed next to username.",
          "Custom Emote Packs: Athlete-themed animated emotes unlocked for 100 BOTB per pack.",
          "Battle Prediction Callouts: Pay 75 BOTB to broadcast your prediction to the entire chat with a special animation.",
          "All collected tokens: 50% burned, 25% to battle prize pool, 25% to treasury.",
          "Cosmetic only — no gameplay advantage. The chat experience is fully functional without any purchases.",
        ]}
      />

      {/* Revenue Stream 6: Athlete Promotion */}
      <RevenueCard
        title="ATHLETE PROMOTION MARKETPLACE"
        tagline="Athletes invest in their own visibility"
        icon={<TrendingUp className="w-5 h-5" />}
        color="#6AA3E0"
        implementationEase="Medium Effort"
        whyItMatters="Athletes already apply through your application system. Once accepted, they have a natural incentive to maximize their visibility on the platform. A promoted placement system lets athletes (or their sponsors) pay BOTB tokens for homepage features, leaderboard sidebar highlights, and Arena pre-battle showcases. This is voluntary self-promotion — athletes who invest in their presence earn more fan votes, which earns them higher composite scores."
        operatorBenefit="Creates a secondary economy where athletes and their management teams become active participants in the token economy. An athlete paying 1,000 BOTB for a featured homepage slot during championship week directly funds your treasury while simultaneously increasing platform engagement — fans click featured athletes, discover new matchups, and place more votes."
        howItWorks={[
          "Featured Homepage Slot: 500-2,000 BOTB per week — athlete card displayed prominently on landing page.",
          "Leaderboard Boost: 300 BOTB — highlighted border and 'FEATURED' badge on the Oracle Score leaderboard for 48 hours.",
          "Pre-Battle Showcase: 200 BOTB — 15-second video spotlight played before their next scheduled battle.",
          "Social Integration: 150 BOTB — athlete profile linked with priority placement in the Arena Chat athlete directory.",
          "All promotion fees: 60% treasury, 40% burned.",
          "Athletes see clear ROI: promoted athletes receive 2-3x more fan votes on average during promotion periods.",
        ]}
      />

      {/* Revenue Stream 7: Governance Proposal Fee */}
      <RevenueCard
        title="GOVERNANCE PROPOSAL SUBMISSION FEE"
        tagline="Serious governance for serious stakeholders"
        icon={<Vote className="w-5 h-5" />}
        color="#8B5CF6"
        implementationEase="Low Effort"
        whyItMatters="Open governance without guardrails leads to spam proposals, joke submissions, and voter fatigue. A modest BOTB submission fee ensures that only serious, well-considered proposals reach the voting stage. This is standard practice across every major DAO — Maker, Aave, Compound all require financial commitment to submit proposals. It protects Governor time and attention, which is your most valuable governance resource."
        operatorBenefit="Dual benefit: revenue generation and governance quality control. The fee is small enough that any genuine Governor can afford it (they already hold the most valuable asset in the ecosystem), but large enough to deter spam. 100% of proposal fees are burned — making this a pure deflationary mechanism that also improves governance signal-to-noise ratio."
        howItWorks={[
          "Set a submission fee of 5,000-10,000 BOTB per governance proposal.",
          "Fee is collected at the time of proposal creation via the existing POST /admin/proposals route.",
          "Fee is transferred to the Hedera burn address (0.0.0) — 100% burned, zero retained by operators.",
          "Proposal creator receives an on-chain receipt confirming submission and burn.",
          "Fee is waived for emergency security proposals (admin override) to ensure critical governance isn't blocked.",
          "Community sees the burn in real-time — builds trust that governance fees aren't enriching operators.",
        ]}
      />

      {/* Revenue Flywheel Diagram */}
      <GlassCard className="p-5" glow="#22C55E">
        <div className="flex items-center gap-2 mb-4">
          <Repeat className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>THE REVENUE FLYWHEEL</h3>
        </div>
        <p className="text-[#8494A7] text-xs mb-4 text-center" style={dmSans}>
          Each revenue stream feeds the next — creating a self-reinforcing growth loop that accelerates with every competition cycle.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[0.55rem]">
          {[
            { label: "More Competitions", icon: <Trophy className="w-3 h-3" />, color: "#CD7F32" },
            { label: "More Votes", icon: <Vote className="w-3 h-3" />, color: "#4274B9" },
            { label: "More Burns", icon: <Flame className="w-3 h-3" />, color: "#EF4444" },
            { label: "Scarcer Supply", icon: <TrendingDown className="w-3 h-3" />, color: "#F59E0B" },
            { label: "Higher Token Value", icon: <TrendingUp className="w-3 h-3" />, color: "#22C55E" },
            { label: "More Sponsors", icon: <Megaphone className="w-3 h-3" />, color: "#6AA3E0" },
            { label: "More Buybacks", icon: <DollarSign className="w-3 h-3" />, color: "#7C5CDB" },
            { label: "More Growth", icon: <Rocket className="w-3 h-3" />, color: "#EC4899" },
          ].map((item, i, arr) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-lg border font-semibold whitespace-nowrap"
                style={{ ...orbitron, background: `${item.color}10`, borderColor: `${item.color}30`, color: item.color }}
              >
                {item.icon} {item.label}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[#8494A7]" />}
            </span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ===========================================================================
// SECTION 2 — BURN MECHANISMS
// ===========================================================================
function Section2_BurnMechanisms() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <ImageWithFallback src={IMG_BURN} alt="Burn Mechanism" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#EF4444]/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SectionBadge number="02" label="Deflationary Architecture" color="#EF4444" />
          <h2 className="text-[#E8ECF0] text-xl md:text-2xl font-black tracking-tight" style={orbitron}>
            6 BURN MECHANISMS
          </h2>
          <p className="text-[#EF4444] text-xs mt-1 max-w-lg" style={dmSans}>
            Systematic, transparent, permanent supply reduction — every burn makes every remaining token more valuable.
          </p>
        </div>
      </div>

      {/* Burn Philosophy */}
      <GlassCard className="p-5" glow="#EF4444">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-[#EF4444]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>THE BURN PHILOSOPHY</h3>
        </div>
        <p className="text-[#B0BCC9] text-xs leading-relaxed mb-3" style={dmSans}>
          <strong className="text-[#E8ECF0]">A burn should be a byproduct of activity — never a tax on holding.</strong> Every mechanism below
          triggers only when someone is actively using the platform: voting, minting, trading, or proposing. If you
          simply hold BOTB tokens in your wallet and never interact, you pay zero fees and your share of the supply
          automatically increases as others participate. This is the fairest possible deflationary design — <strong className="text-[#EF4444]">holders
          are rewarded for patience, participants are rewarded for engagement, and no one is ever penalized for inaction</strong>.
        </p>
        <div className="rounded-xl p-3 bg-[#0B1120] border border-[#EF4444]/10">
          <p className="text-[0.6rem] text-[#EF4444]/80 text-center" style={dmSans}>
            <strong>Hedera Burn Address: 0.0.0</strong> — Tokens sent here are permanently destroyed. This is verifiable on-chain by anyone at any time. No recovery, no override, no exceptions.
          </p>
        </div>
      </GlassCard>

      {/* Burn Mechanism A: Vote Arena Fee */}
      <BurnCard
        title="VOTE ARENA FEE BURN"
        description="A micro-fee on every battle vote stake — the engine that powers continuous deflation during every competition cycle."
        burnType="AUTOMATIC"
        annualImpact="SCALES WITH ACTIVITY"
        color="#4274B9"
        icon={<Vote className="w-4 h-4" />}
        details={[
          "1-2% of every BOTB token staked on a battle vote is deducted and burned before the weighted vote is recorded.",
          "Example: Voter stakes 10,000 BOTB → 100-200 BOTB burned → 9,800-9,900 BOTB applied as voting weight.",
          "Applied equally to all wallets regardless of NFT tier — fair, transparent, and proportional.",
          "Over thousands of votes per competition season, the cumulative burn compounds significantly.",
          "The fee is small enough to be psychologically negligible (less than the Hedera network fee in percentage terms) but large enough to create meaningful deflation.",
          "Implementation: Add a single burn step in POST /vote/battle before the weighted vote calculation.",
          "Governor and Sigma multipliers apply AFTER the arena fee — so NFT holders still receive their full power advantage.",
        ]}
      />

      {/* Burn Mechanism B: Meta Mint Split */}
      <BurnCard
        title="META MINT 50/50 BURN SPLIT"
        description="Half of every Meta Series NFT mint fee is burned permanently. Every competition with Meta minting actively shrinks total supply."
        burnType="AUTOMATIC"
        annualImpact="PROPORTIONAL TO EVENTS"
        color="#10B981"
        icon={<Gem className="w-4 h-4" />}
        details={[
          "When a fan mints a Meta Series NFT at the set price (e.g., 1,000 BOTB), the system automatically splits the payment.",
          "500 BOTB (50%) → Operations Treasury for reinvestment in events, prizes, and development.",
          "500 BOTB (50%) → Hedera burn address (0.0.0) — permanently destroyed.",
          "Self-regulating: more popular competitions generate more mints which generate more burns.",
          "Championship events with premium mint prices (5-10x normal) create proportionally larger burn events.",
          "The community can watch the burn in real-time via the Hedera block explorer — full transparency.",
        ]}
      />

      {/* Burn Mechanism C: Seasonal Championship */}
      <BurnCard
        title="SEASONAL CHAMPIONSHIP BURN"
        description="A scheduled ceremonial burn at the end of each competition season, sourced from the Treasury Reserve allocation."
        burnType="SCHEDULED"
        annualImpact="FIXED AMOUNT PER SEASON"
        color="#D4A843"
        icon={<Trophy className="w-4 h-4" />}
        details={[
          "At the conclusion of each competition season, a pre-announced fixed amount from the Treasury Reserve (100M allocation, locked for 3 years, then ~33M/year) is burned.",
          "The burn amount is announced before the season begins — creating anticipation and price discovery.",
          "Executed as a public, verifiable Hedera transaction broadcast to the community as a 'Season Burn Ceremony.'",
          "Creates a recurring community event that reinforces the deflationary narrative and generates social media engagement.",
          "Burn amount can be voted on by Governors through the existing governance proposal system — community-directed deflation.",
        ]}
      />

      {/* Burn Mechanism D: Sponsor Buyback-and-Burn */}
      <BurnCard
        title="SPONSOR BUYBACK-AND-BURN"
        description="The most powerful burn mechanism: outside money enters the ecosystem, purchases BOTB at market, and a portion is burned forever."
        burnType="MARKET-DRIVEN"
        annualImpact="SCALES WITH SPONSORS"
        color="#7C5CDB"
        icon={<Megaphone className="w-4 h-4" />}
        details={[
          "Sponsors pay HBAR/USDC → WCO allocates 20-40% to the Buyback Fund.",
          "Buyback Fund executes periodic SaucerSwap market buys — creating real buy pressure visible to the entire market.",
          "Of the tokens purchased: 40% are burned permanently, 60% are added to the treasury for ecosystem development.",
          "This is the gold standard of tokenomics because it deflates supply using EXTERNAL capital, not community money.",
          "Every new sponsor partner represents a new source of permanent deflation — sponsor growth = burn growth.",
          "Market buys are executed at intervals to avoid front-running — randomized timing with minimum spread thresholds.",
        ]}
      />

      {/* Burn Mechanism E: Losing-Side Arena Burn (Optional) */}
      <BurnCard
        title="ARENA STAKES BURN (OPT-IN)"
        description="An optional 'High Stakes' battle mode where a small percentage of the losing side's stake is burned. Adds real consequences to battle voting."
        burnType="OPT-IN"
        annualImpact="EVENT-DEPENDENT"
        color="#F59E0B"
        icon={<Flame className="w-4 h-4" />}
        details={[
          "IMPORTANT: This is opt-in only. Standard battles have zero losing-side penalty. This is a premium mode for experienced voters.",
          "In 'High Stakes' designated battles, 0.5-1% of the total losing-side stake is burned after winner declaration.",
          "Voters see a clear 'HIGH STAKES' badge and warning before entering — fully informed consent.",
          "Only activated for championship rounds, seasonal finals, or special exhibition matches — not regular season battles.",
          "Adds genuine excitement: 'I have skin in the game' psychology drives deeper engagement and research into athlete performance.",
          "The burn percentage is small enough that a losing voter loses negligibly more than the standard arena fee, but the psychological impact of 'real stakes' dramatically increases participation and attention.",
          "Can be governed: Governors vote on which battles qualify for High Stakes designation.",
        ]}
      />

      {/* Burn Mechanism F: Governance Proposal Burn */}
      <BurnCard
        title="GOVERNANCE PROPOSAL FEE BURN"
        description="100% of governance proposal submission fees are burned. Zero retained by operators — pure deflationary governance quality control."
        burnType="ON SUBMISSION"
        annualImpact="PER PROPOSAL"
        color="#8B5CF6"
        icon={<FileText className="w-4 h-4" />}
        details={[
          "5,000-10,000 BOTB fee per governance proposal submission — 100% sent to burn address.",
          "Zero revenue to operators from this fee — it is purely a spam prevention and deflationary mechanism.",
          "Emergency security proposals are fee-exempt (admin override) to ensure critical governance remains unblocked.",
          "The community can verify every proposal burn on-chain — complete transparency builds governance trust.",
          "Expected frequency: 2-5 proposals per month = 10,000-50,000 BOTB burned monthly from governance alone.",
          "Combined with the vote arena fee, this means governance activity at every level (proposals + votes) contributes to deflation.",
        ]}
      />

      {/* Total Burn Impact Visual */}
      <GlassCard className="p-5" glow="#EF4444">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#EF4444]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>CUMULATIVE BURN PROJECTION</h3>
        </div>
        <p className="text-[#8494A7] text-xs mb-4 text-center" style={dmSans}>
          Conservative estimates based on moderate platform activity. Actual burn rates scale proportionally with engagement.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Vote Arena Fee", est: "Continuous", icon: <Vote className="w-3 h-3" />, color: "#4274B9" },
            { label: "Meta Mint Burns", est: "Per Event", icon: <Gem className="w-3 h-3" />, color: "#10B981" },
            { label: "Seasonal Ceremony", est: "Quarterly", icon: <Trophy className="w-3 h-3" />, color: "#D4A843" },
            { label: "Sponsor Buybacks", est: "Monthly", icon: <Megaphone className="w-3 h-3" />, color: "#7C5CDB" },
            { label: "Arena Stakes", est: "Championship", icon: <Flame className="w-3 h-3" />, color: "#F59E0B" },
            { label: "Governance Fees", est: "Per Proposal", icon: <FileText className="w-3 h-3" />, color: "#8B5CF6" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3 text-center bg-[#0B1120] border border-white/[0.04]">
              <div className="flex justify-center mb-1" style={{ color: item.color }}>{item.icon}</div>
              <p className="text-[0.55rem] font-bold" style={{ ...orbitron, color: item.color }}>{item.label}</p>
              <p className="text-[#8494A7] text-[0.5rem] mt-0.5">{item.est}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl p-3 border border-[#EF4444]/10 bg-[#EF4444]/[0.03]">
          <p className="text-[#EF4444] text-xs font-bold text-center mb-1" style={orbitron}>NET EFFECT</p>
          <p className="text-[#B0BCC9] text-[0.65rem] text-center leading-relaxed" style={dmSans}>
            Every competition season permanently removes tokens from circulation through multiple independent mechanisms.
            The burn is not dependent on any single source — if one mechanism underperforms, the others compensate.
            This multi-vector approach ensures consistent, reliable deflation regardless of market conditions.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

// ===========================================================================
// SECTION 3 — OPERATOR PLAYBOOK
// ===========================================================================
function Section3_OperatorPlaybook() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <ImageWithFallback src={IMG_LAUNCH} alt="Launch" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SectionBadge number="03" label="Implementation Roadmap" color="#22C55E" />
          <h2 className="text-[#E8ECF0] text-xl md:text-2xl font-black tracking-tight" style={orbitron}>
            OPERATOR PLAYBOOK
          </h2>
          <p className="text-[#22C55E] text-xs mt-1 max-w-lg" style={dmSans}>
            Phase-by-phase implementation — what to deploy first, what to announce, and how to measure success.
          </p>
        </div>
      </div>

      {/* Phase 1 */}
      <GlassCard className="p-5" glow="#22C55E">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]" style={orbitron}>P1</div>
          <div>
            <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>PHASE 1 — LAUNCH DAY</h3>
            <p className="text-[#22C55E] text-[0.6rem]" style={dmSans}>Deploy with your first competition</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { action: "Activate Vote Arena Fee (1-2%)", why: "Immediate deflation from day one. Every vote burns. Sets the tone that this is a deflationary ecosystem.", status: "Deploy" },
            { action: "Configure Meta Series mint pricing", why: "Your first competition is your first revenue event. Even conservative pricing (500 BOTB per mint) validates the model.", status: "Deploy" },
            { action: "Set NFT royalties on HTS", why: "One-time configuration at the token level. Once set, royalties are enforced automatically by the Hedera network forever.", status: "Configure" },
            { action: "Announce the burn dashboard", why: "Transparency builds trust. A public-facing page showing cumulative burns, treasury balance, and revenue allocation creates community confidence.", status: "Announce" },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-3 bg-[#0B1120] border border-[#22C55E]/8">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[#E8ECF0] text-xs font-bold" style={orbitron}>{item.action}</p>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.5rem] font-bold bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E]" style={orbitron}>{item.status}</span>
              </div>
              <p className="text-[#8494A7] text-[0.6rem]" style={dmSans}>{item.why}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Phase 2 */}
      <GlassCard className="p-5" glow="#4274B9">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black bg-[#4274B9]/10 border border-[#4274B9]/30 text-[#4274B9]" style={orbitron}>P2</div>
          <div>
            <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>PHASE 2 — FIRST SEASON</h3>
            <p className="text-[#4274B9] text-[0.6rem]" style={dmSans}>Activate after 30-60 days of live operation</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { action: "Launch Sponsorship Buyback Engine", why: "By now you have engagement data to show sponsors. Real metrics = real sponsor interest. First buyback is a major community event.", status: "Deploy" },
            { action: "Introduce Arena Chat premium features", why: "Chat culture needs time to develop organically. By season start, your community has established norms and power users are ready for cosmetic upgrades.", status: "Deploy" },
            { action: "Implement Governance Proposal Fee", why: "Governance proposals should exist before adding fees. Let the first few proposals flow freely, then introduce the fee with Governor community approval.", status: "Vote First" },
            { action: "Publish first Quarterly Transparency Report", why: "Show the community: total tokens burned, treasury balance, sponsor revenue, and community growth metrics. Numbers build trust.", status: "Publish" },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-3 bg-[#0B1120] border border-[#4274B9]/8">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[#E8ECF0] text-xs font-bold" style={orbitron}>{item.action}</p>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.5rem] font-bold bg-[#4274B9]/10 border border-[#4274B9]/25 text-[#4274B9]" style={orbitron}>{item.status}</span>
              </div>
              <p className="text-[#8494A7] text-[0.6rem]" style={dmSans}>{item.why}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Phase 3 */}
      <GlassCard className="p-5" glow="#D4A843">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843]" style={orbitron}>P3</div>
          <div>
            <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>PHASE 3 — CHAMPIONSHIP SCALE</h3>
            <p className="text-[#D4A843] text-[0.6rem]" style={dmSans}>Full activation — all systems operational</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { action: "Launch Premium IRL Event Passes", why: "By now your competition brand is established. Token-gated experiences become a premium offering that fans actively seek out.", status: "Deploy" },
            { action: "Activate High Stakes Arena Burns", why: "Your community understands the voting system deeply. Opt-in high stakes battles become the most-watched, most-discussed events of the season.", status: "Opt-In" },
            { action: "Open Athlete Promotion Marketplace", why: "Athletes and their management teams have seen the platform's reach. Self-promotion becomes a natural extension of their competitive strategy.", status: "Deploy" },
            { action: "First Seasonal Championship Burn Ceremony", why: "The culmination of your first full season. Announce the total burn amount, broadcast the transaction, celebrate with the community. This becomes your marquee off-season event.", status: "Ceremony" },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-3 bg-[#0B1120] border border-[#D4A843]/8">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[#E8ECF0] text-xs font-bold" style={orbitron}>{item.action}</p>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.5rem] font-bold bg-[#D4A843]/10 border border-[#D4A843]/25 text-[#D4A843]" style={orbitron}>{item.status}</span>
              </div>
              <p className="text-[#8494A7] text-[0.6rem]" style={dmSans}>{item.why}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* KPIs */}
      <GlassCard className="p-5" glow="#6AA3E0">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-[#6AA3E0]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>KEY PERFORMANCE INDICATORS</h3>
        </div>
        <p className="text-[#8494A7] text-xs mb-3" style={dmSans}>
          Track these metrics to measure the health and effectiveness of your revenue and burn systems.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { kpi: "Cumulative Tokens Burned", target: "Track monthly increase", icon: <Flame className="w-3.5 h-3.5" />, color: "#EF4444" },
            { kpi: "Treasury Balance (BOTB)", target: "Sustainable runway", icon: <Wallet className="w-3.5 h-3.5" />, color: "#22C55E" },
            { kpi: "Sponsor Revenue (HBAR/USD)", target: "Quarter-over-quarter growth", icon: <DollarSign className="w-3.5 h-3.5" />, color: "#4274B9" },
            { kpi: "Meta Mints per Event", target: "Engagement proxy", icon: <Gem className="w-3.5 h-3.5" />, color: "#10B981" },
            { kpi: "Average Vote Stake Size", target: "Community conviction", icon: <Vote className="w-3.5 h-3.5" />, color: "#7C5CDB" },
            { kpi: "NFT Secondary Volume", target: "Collector confidence", icon: <Repeat className="w-3.5 h-3.5" />, color: "#D4A843" },
            { kpi: "Arena Chat Premium Adoption", target: "Feature-market fit", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "#F59E0B" },
            { kpi: "Governance Proposal Frequency", target: "Community agency", icon: <FileText className="w-3.5 h-3.5" />, color: "#8B5CF6" },
          ].map((item) => (
            <div key={item.kpi} className="rounded-lg p-2.5 bg-[#0B1120] border border-white/[0.04] flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}10` }}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </div>
              <div>
                <p className="text-[#E8ECF0] text-[0.6rem] font-bold" style={orbitron}>{item.kpi}</p>
                <p className="text-[#8494A7] text-[0.5rem]" style={dmSans}>{item.target}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Closing Banner */}
      <div className="relative rounded-2xl overflow-hidden h-44">
        <ImageWithFallback src={IMG_CROWD} alt="Stadium Crowd" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/90 via-[#0B1120]/70 to-[#0B1120]/50 flex items-center px-6">
          <div className="max-w-md">
            <p className="text-[#CD7F32] text-[0.6rem] tracking-widest mb-1" style={orbitron}>WORLD CALISTHENICS ORGANIZATION</p>
            <p className="text-[#E8ECF0] text-lg font-black leading-tight" style={orbitron}>
              BUILD THE SPORT.<br />FUND THE FUTURE.<br />BURN THE REST.
            </p>
            <p className="text-[#8494A7] text-xs mt-2" style={dmSans}>
              Every mechanism above exists to serve one purpose: making BOTB the most sustainable, community-aligned sports token ever built.
            </p>
          </div>
        </div>
      </div>

      {/* Final Principle */}
      <div className="rounded-2xl p-5 border border-[#22C55E]/15 text-center" style={{ background: "linear-gradient(135deg, #22C55E05, #0B1120)" }}>
        <p className="text-[#22C55E] text-sm font-bold mb-2" style={orbitron}>THE PROMISE</p>
        <p className="text-[#B0BCC9] text-xs leading-relaxed max-w-lg mx-auto" style={dmSans}>
          "No revenue mechanism will ever be introduced that extracts value from passive holders,
          penalizes new participants, or enriches operators at the expense of the community.
          Revenue follows participation. Burns follow activity. Growth follows trust."
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-1 text-[0.55rem] text-[#8494A7]" style={orbitron}>
            <ShieldCheck className="w-3 h-3 text-[#22C55E]" /> Community First
          </div>
          <div className="flex items-center gap-1 text-[0.55rem] text-[#8494A7]" style={orbitron}>
            <Eye className="w-3 h-3 text-[#4274B9]" /> Full Transparency
          </div>
          <div className="flex items-center gap-1 text-[0.55rem] text-[#8494A7]" style={orbitron}>
            <Lock className="w-3 h-3 text-[#D4A843]" /> On-Chain Verifiable
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// BRONZE ENVELOPE BUTTON — exact replica of Gold/Silver but in bronze
// ===========================================================================
export function BronzeEnvelopeButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative group cursor-pointer"
    >
      {/* Outer glow */}
      <motion.div
        className="absolute -inset-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse at center, rgba(205,127,50,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Envelope shape */}
      <div className="relative">
        {/* Main envelope body */}
        <div
          className="relative w-[200px] h-[140px] rounded-xl overflow-hidden border-2 transition-all duration-500"
          style={{
            borderColor: isHovered ? "#CD7F32" : "#CD7F32aa",
            background: "linear-gradient(135deg, #1a1208 0%, #0B1120 40%, #1a1208 100%)",
            boxShadow: isHovered
              ? "0 0 30px rgba(205,127,50,0.3), 0 0 60px rgba(205,127,50,0.1), inset 0 0 20px rgba(205,127,50,0.05)"
              : "0 0 15px rgba(205,127,50,0.1), inset 0 0 10px rgba(205,127,50,0.03)",
          }}
        >
          {/* Envelope flap (triangle) */}
          <div className="absolute top-0 left-0 right-0">
            <svg viewBox="0 0 200 60" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="bronzeFlapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#CD7F32" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#E8A54B" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#CD7F32" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <polygon points="0,0 200,0 100,55" fill="url(#bronzeFlapGrad)" />
              <polygon
                points="0,0 200,0 100,55"
                fill="none"
                stroke="#CD7F32"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            </svg>
          </div>

          {/* Diagonal fold lines */}
          <svg viewBox="0 0 200 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="140" x2="100" y2="55" stroke="#CD7F32" strokeWidth="0.5" strokeOpacity="0.2" />
            <line x1="200" y1="140" x2="100" y2="55" stroke="#CD7F32" strokeWidth="0.5" strokeOpacity="0.2" />
          </svg>

          {/* Wax seal — bronze with WCO-blue accent */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-[38px] w-10 h-10 rounded-full flex items-center justify-center z-10"
            animate={isHovered ? { rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.6 }}
            style={{
              background: "radial-gradient(circle at 40% 35%, #E8A54B, #CD7F32 40%, #8B5A20 90%)",
              boxShadow: "0 2px 8px rgba(205,127,50,0.4), inset 0 -1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <DollarSign className="w-5 h-5 text-[#0B1120]" strokeWidth={2.5} />
          </motion.div>

          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            animate={isHovered ? { x: ["-100%", "200%"] } : { x: "-100%" }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(205,127,50,0.08) 45%, rgba(205,127,50,0.15) 50%, rgba(205,127,50,0.08) 55%, transparent 60%)",
              width: "100%",
            }}
          />

          {/* Text */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
            <p
              className="text-[#CD7F32] text-[0.55rem] font-bold tracking-[0.15em] leading-tight"
              style={orbitron}
            >
              FUNDING
            </p>
            <p
              className="text-[#CD7F32] text-[0.7rem] font-bold tracking-[0.2em] mt-0.5"
              style={orbitron}
            >
              MODEL
            </p>
          </div>
        </div>

        {/* Floating particles */}
        {isHovered && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-[#CD7F32]"
                initial={{
                  opacity: 0,
                  x: 100 + Math.random() * 40 - 20,
                  y: 70 + Math.random() * 30 - 15,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  x: 100 + (Math.random() - 0.5) * 120,
                  y: -10 + Math.random() * 20,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1.5 + Math.random() * 0.8,
                  delay: i * 0.12,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Subtitle */}
      <motion.p
        className="text-[#8494A7] text-[0.5rem] text-center mt-2 tracking-wide transition-colors group-hover:text-[#CD7F32]/70"
        style={dmSans}
      >
        Revenue & burn strategy
      </motion.p>
    </motion.button>
  );
}

// ===========================================================================
// MAIN FUNDING MODEL MODAL
// ===========================================================================
export function FundingModelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentSection, setCurrentSection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sections = [
    { label: "Revenue Streams", color: "#CD7F32", icon: <DollarSign className="w-3.5 h-3.5" /> },
    { label: "Burn Mechanics", color: "#EF4444", icon: <Flame className="w-3.5 h-3.5" /> },
    { label: "Operator Playbook", color: "#22C55E", icon: <Rocket className="w-3.5 h-3.5" /> },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentSection]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden border border-white/[0.06]"
            style={{
              background: "linear-gradient(180deg, #0d1527 0%, #0B1120 100%)",
              boxShadow: "0 0 80px rgba(205,127,50,0.08), 0 0 160px rgba(205,127,50,0.04)",
            }}
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* WCO Official Logo */}
                  <img src={wcoLogoWhite} alt="WCO" className="h-8 w-auto object-contain opacity-80" />
                  <div className="w-px h-7 bg-[#CD7F32]/20" />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #CD7F3215, #E8A54B15)",
                      border: "1px solid #CD7F3220",
                    }}
                  >
                    <DollarSign className="w-5 h-5 text-[#CD7F32]" />
                  </div>
                  <div>
                    <h2 className="text-[#E8ECF0] text-sm font-black tracking-tight" style={orbitron}>
                      FUNDING & REVENUE MODEL
                    </h2>
                    <p className="text-[#8494A7] text-[0.6rem]" style={dmSans}>
                      World Calisthenics Organization — Confidential Business Strategy
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#162033] hover:bg-[#1d2940] border border-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4 text-[#8494A7]" />
                </button>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-1.5">
                {sections.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setCurrentSection(i)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.6rem] font-bold transition-all"
                    style={{
                      ...orbitron,
                      background: currentSection === i ? `${s.color}15` : "transparent",
                      border: `1px solid ${currentSection === i ? `${s.color}40` : "transparent"}`,
                      color: currentSection === i ? s.color : "#8494A7",
                    }}
                  >
                    {s.icon}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{String(i + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {currentSection === 0 && <Section1_RevenueStreams />}
                  {currentSection === 1 && <Section2_BurnMechanisms />}
                  {currentSection === 2 && <Section3_OperatorPlaybook />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="shrink-0 px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.6rem] font-bold disabled:opacity-30 transition-all hover:bg-[#162033]"
                style={{ ...orbitron, color: "#8494A7" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                PREV
              </button>
              <div className="flex items-center gap-1.5">
                {sections.map((s, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-all cursor-pointer"
                    style={{
                      background: currentSection === i ? s.color : "#8494A730",
                      boxShadow: currentSection === i ? `0 0 8px ${s.color}40` : "none",
                    }}
                    onClick={() => setCurrentSection(i)}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrentSection(Math.min(2, currentSection + 1))}
                disabled={currentSection === 2}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.6rem] font-bold disabled:opacity-30 transition-all hover:bg-[#162033]"
                style={{ ...orbitron, color: "#8494A7" }}
              >
                NEXT
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* WCO Watermark */}
            <div className="absolute bottom-14 right-5 opacity-[0.04] pointer-events-none select-none flex items-center gap-3">
              <img src={wcoLogoWhite} alt="" className="h-10 w-auto object-contain" />
              <p className="text-5xl font-black" style={orbitron}>WCO</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
