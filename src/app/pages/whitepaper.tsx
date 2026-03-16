/**
 * Whitepaper Page — v1.0 Complete
 * ================================================
 * Production-grade technical whitepaper: 20 sections across 5 files.
 * Full branding hero, sticky left-side TOC with active section tracking.
 */

import { Link } from "react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, BookOpen, Download, Zap, Eye, Globe, BarChart3,
  Cpu, Link2, Coins, MessageSquare, Wallet, PieChart, Image,
  Vote, Crown, Swords, Users, Gift, Shield, Map, UserCheck,
  AlertTriangle, Scale, ChevronUp,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";
import {
  Section1_ExecutiveSummary, Section2_VisionMission, Section3_MarketAnalysis,
} from "./whitepaper-sections";
import {
  Section4_Architecture, Section5_HederaIntegration, Section6_HTSDesign,
  Section7_HCSDesign, Section8_WalletConnectAuth,
} from "./whitepaper-sections-b";
import {
  Section12_GovernanceModel, Section13_CompetitionMechanics,
} from "./whitepaper-sections-c";
import {
  Section15_RewardDistribution, Section16_SecurityArchitecture,
  Section17_Roadmap, Section18_TeamPartnerships,
  Section19_RiskFactors, Section20_LegalFramework,
} from "./whitepaper-sections-d";

import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

const HERO_BG_1 = "https://images.unsplash.com/photo-1758521959675-5874879f3977?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxpc3RoZW5pY3MlMjBhdGhsZXRlJTIwYmFyJTIwbXVzY2xlJTIwdXB8ZW58MXx8fHwxNzcyODY0Mjc1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const HERO_BG_2 = "https://images.unsplash.com/photo-1590074121258-6b53b6adb8f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRpYyUyMHN0cmVldCUyMHdvcmtvdXQlMjBwdWxsdXAlMjBiYXJzfGVufDF8fHx8MTc3Mjg2NDI3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const TOC_ITEMS = [
  { num: 1, label: "Executive Summary", icon: Eye },
  { num: 2, label: "Vision & Mission", icon: Globe },
  { num: 3, label: "Market Analysis", icon: BarChart3 },
  { num: 4, label: "Platform Architecture", icon: Cpu },
  { num: 5, label: "Hedera Integration", icon: Link2 },
  { num: 6, label: "Token Service (HTS)", icon: Coins },
  { num: 7, label: "Consensus Service (HCS)", icon: MessageSquare },
  { num: 8, label: "WalletConnect & Auth", icon: Wallet },
  { num: 9, label: "Tokenomics \u2014 BOTB", icon: PieChart },
  { num: 10, label: "NFT Ecosystem", icon: Image },
  { num: 11, label: "Voting Power", icon: Zap },
  { num: 12, label: "Governor Governance", icon: Crown },
  { num: 13, label: "Competition Mechanics", icon: Swords },
  { num: 14, label: "Meta Series", icon: Users },
  { num: 15, label: "Reward Distribution", icon: Gift },
  { num: 16, label: "Security Architecture", icon: Shield },
  { num: 17, label: "Roadmap & Milestones", icon: Map },
  { num: 18, label: "Team & Partnerships", icon: UserCheck },
  { num: 19, label: "Risk Factors", icon: AlertTriangle },
  { num: 20, label: "Legal Framework", icon: Scale },
];

export function WhitepaperPage() {
  const [activeSection, setActiveSection] = useState(1);
  const [tocOpen, setTocOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sectionEls: { num: number; el: Element }[] = [];

    TOC_ITEMS.forEach(({ num }) => {
      const el = document.getElementById(`section-${num}`);
      if (el) sectionEls.push({ num, el });
    });

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id) {
            const num = parseInt(id.replace("section-", ""), 10);
            if (!isNaN(num)) setActiveSection(num);
          }
        }
      });
    };

    const observer = new IntersectionObserver(callback, {
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    });

    sectionEls.forEach(({ el }) => observer.observe(el));
    observers.push(observer);

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Show back-to-top button
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = useCallback((num: number) => {
    const el = document.getElementById(`section-${num}`);
    if (el) {
      const offset = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
      window.history.replaceState(null, "", `#section-${num}`);
      setTocOpen(false);
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* ================= HERO SECTION ================= */}
      <div className="relative overflow-hidden">
        {/* Dual athlete images with blend */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full relative">
              <img src={HERO_BG_1} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="w-1/2 h-full relative">
              <img src={HERO_BG_2} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
          {/* Dark gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/80 via-[#0B1120]/70 to-[#0B1120]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4274B9]/10 via-transparent to-[#6AA3E0]/10" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(66,116,185,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(66,116,185,.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pb-20">
          {/* Breadcrumb */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#6AA3E0]/80 hover:text-[#6AA3E0] transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex flex-col items-center text-center">
            {/* WCO Logo Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#0B1120]/60 backdrop-blur-md border border-[#4274B9]/30 flex items-center justify-center p-2">
                <img src={wcoLogoWhite} alt="WCO" className="w-full h-full object-contain" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#0B1120]/60 backdrop-blur-md border border-[#4274B9]/30 flex items-center justify-center p-1.5">
                <img src={botbShield} alt="BOTB" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Org tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/25 backdrop-blur-sm mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4274B9] animate-pulse" />
              <span
                className="text-[#6AA3E0] text-[0.65rem] tracking-[0.15em] font-semibold"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                WORLD CALISTHENICS ORGANIZATION
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              <span className="bg-gradient-to-r from-white via-[#6AA3E0] to-[#4274B9] bg-clip-text text-transparent">
                WHITEPAPER
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl text-[#8494A7] max-w-2xl leading-relaxed mb-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Battle of the Bars &mdash; Technical & Economic Framework
            </p>

            {/* Version + stats row */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#6AA3E0] font-mono">
                v1.0
              </span>
              <span className="px-3 py-1 rounded-full bg-[#0D1526]/80 border border-[#4274B9]/10 text-[#8494A7]">
                20 Sections
              </span>
              <span className="px-3 py-1 rounded-full bg-[#0D1526]/80 border border-[#4274B9]/10 text-[#8494A7]">
                Hedera Hashgraph Mainnet
              </span>
              <span className="px-3 py-1 rounded-full bg-[#0D1526]/80 border border-[#4274B9]/10 text-[#8494A7]">
                3B Token Supply
              </span>
            </div>

            {/* Decorative line */}
            <div className="mt-8 w-48 h-px bg-gradient-to-r from-transparent via-[#4274B9]/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* ================= MAIN LAYOUT: Sticky TOC + Content ================= */}
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Mobile TOC Toggle */}
        <div className="lg:hidden sticky top-16 z-40 -mx-4 px-4 py-3 bg-[#0B1120]/95 backdrop-blur-md border-b border-[#4274B9]/10">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#0D1526] border border-[#4274B9]/15 text-sm"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#4274B9]" />
              <span className="text-[#E8ECF0] font-medium" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem", letterSpacing: "0.08em" }}>
                SECTION {activeSection} OF 20
              </span>
            </div>
            <ChevronUp className={`w-4 h-4 text-[#8494A7] transition-transform ${tocOpen ? "" : "rotate-180"}`} />
          </button>

          {/* Mobile dropdown TOC */}
          {tocOpen && (
            <div className="mt-2 p-3 rounded-xl bg-[#0D1526] border border-[#4274B9]/15 max-h-[60vh] overflow-y-auto space-y-0.5">
              {TOC_ITEMS.map(({ num, label, icon: Icon }) => (
                <button
                  key={num}
                  onClick={() => scrollToSection(num)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                    activeSection === num
                      ? "bg-[#4274B9]/15 text-[#6AA3E0]"
                      : "text-[#8494A7] hover:bg-[#4274B9]/5 hover:text-[#E8ECF0]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-[0.6rem] w-5 shrink-0 opacity-60">{num < 10 ? `0${num}` : num}</span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-8 mt-8 lg:mt-10">
          {/* ===== LEFT: Sticky TOC Sidebar (desktop) ===== */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <div className="rounded-xl bg-[#0D1526]/80 border border-[#4274B9]/10 overflow-hidden">
                {/* TOC Header */}
                <div className="px-4 py-3 border-b border-[#4274B9]/10 bg-[#4274B9]/5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#4274B9]" />
                    <span
                      className="text-[0.65rem] font-bold text-[#E8ECF0] tracking-[0.1em]"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      CONTENTS
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-0.5 bg-[#0A0F1A]">
                  <div
                    className="h-full bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] transition-all duration-300"
                    style={{ width: `${(activeSection / 20) * 100}%` }}
                  />
                </div>

                {/* TOC Items */}
                <nav className="p-2 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-thin">
                  {TOC_ITEMS.map(({ num, label, icon: Icon }) => {
                    const isActive = activeSection === num;
                    return (
                      <button
                        key={num}
                        onClick={() => scrollToSection(num)}
                        className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-left transition-all duration-200 group ${
                          isActive
                            ? "bg-[#4274B9]/15 border border-[#4274B9]/25"
                            : "border border-transparent hover:bg-[#4274B9]/5"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? "bg-[#4274B9]/20 text-[#6AA3E0]" : "text-[#8494A7]/50 group-hover:text-[#8494A7]"
                        }`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-mono text-[0.55rem] shrink-0 transition-colors ${
                            isActive ? "text-[#4274B9]" : "text-[#8494A7]/40 group-hover:text-[#8494A7]/70"
                          }`}>
                            {num < 10 ? `0${num}` : num}
                          </span>
                          <span className={`text-[0.68rem] truncate transition-colors ${
                            isActive ? "text-[#E8ECF0] font-semibold" : "text-[#8494A7] group-hover:text-[#B0BCC9]"
                          }`}>
                            {label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                {/* TOC Footer — Download */}
                <div className="p-3 border-t border-[#4274B9]/10">
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#4274B9]/10 text-[#6AA3E0]/50 text-xs font-medium cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF Coming Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* ===== RIGHT: Content ===== */}
          <div ref={contentRef} className="flex-1 min-w-0">
            <div className="prose prose-invert max-w-none space-y-8">
              {/* Section 1 */}
              <Section1_ExecutiveSummary />
              {/* Section 2 */}
              <Section2_VisionMission />
              {/* Section 3 */}
              <Section3_MarketAnalysis />
              {/* Section 4 */}
              <Section4_Architecture />
              {/* Section 5 */}
              <Section5_HederaIntegration />
              {/* Section 6 */}
              <Section6_HTSDesign />
              {/* Section 7 */}
              <Section7_HCSDesign />
              {/* Section 8 */}
              <Section8_WalletConnectAuth />

              {/* Section 9 — Tokenomics (inline) */}
              <PolicySection num={9} title="TOKENOMICS \u2014 BOTB TOKEN" icon={<PieChart className="w-4 h-4" />}>
                <SubHead>9.1 Token Overview</SubHead>
                <P>
                  The BOTB token is a fungible utility token issued on the Hedera Token Service (HTS) with
                  a fixed, immutable total supply. Once deployed, no entity can mint additional tokens &mdash; the
                  token contract will have no admin keys and no supply increase capability.
                </P>
                <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
                    <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                      TOKEN SPECIFICATIONS
                    </span>
                  </div>
                  <div className="divide-y divide-[#4274B9]/5">
                    {([
                      ["Total Supply", "3,000,000,000 (3B)"],
                      ["Supply Type", "Fixed cap \u2014 no further minting, no admin keys"],
                      ["Token Standard", "Hedera Token Service (HTS) fungible token"],
                      ["Network", "Hedera Hashgraph mainnet"],
                      ["Launch Window", "Q2-Q3 2026"],
                      ["Purpose", "Rewards, staking, liquidity, voting, network engagement"],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex gap-3 px-4 py-2 text-xs">
                        <span className="text-[#6AA3E0] font-semibold shrink-0 w-32">{k}</span>
                        <span className="text-[#B0BCC9]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <SubHead>9.2 Supply Allocation</SubHead>
                <P>
                  The 3 billion total supply is divided into two primary categories: 50% initial
                  liquidity and 50% ecosystem allocation, further broken down into six functional pools.
                </P>

                <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
                    <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                      TOKEN ALLOCATION
                    </span>
                  </div>
                  <div className="divide-y divide-[#4274B9]/5">
                    {([
                      { name: "Liquidity Pool", amt: "1,500,000,000", pct: "50.00%", color: "#6AA3E0", desc: "Paired with 50,000 HBAR on SaucerSwap DEX to establish initial trading liquidity." },
                      { name: "Gov Control Supply", amt: "500,000,000", pct: "16.67%", color: "#f59e0b", desc: "Vested monthly over 5 years with 100M unlocked up-front. Allocation to LP pools, DeFi, and Only Gains rewards is directed by Governor NFT holder votes." },
                      { name: "Governors Rewards", amt: "300,000,000", pct: "10.00%", color: "#f59e0b", desc: "Earned over 3 years through active participation: DeFi boosters via playing on-platform, staking NFTs with Ivyfy, and providing liquidity. Not airdrops &mdash; rewards require engagement. Exact monthly distribution rates TBD." },
                      { name: "Staking Rewards", amt: "300,000,000", pct: "10.00%", color: "#10b981", desc: "Released over 3 years (~100M/year) on the Ivy staking platform. 10-20% APY target." },
                      { name: "LP Rewards", amt: "200,000,000", pct: "6.67%", color: "#7C5CDB", desc: "Distributed over 3 years (~66M/year) to BOTB/HBAR liquidity providers on SaucerSwap." },
                      { name: "Sigma Rewards", amt: "100,000,000", pct: "3.33%", color: "#7C5CDB", desc: "Event-based distribution tied to battle outcomes and voting participation. No fixed schedule." },
                      { name: "Treasury Reserve", amt: "100,000,000", pct: "3.33%", color: "#8494A7", desc: "Locked for 3 years. Released at ~33M/year for active contributors and ecosystem development." },
                    ]).map((row) => (
                      <div key={row.name} className="px-4 py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                            <span className="text-[#E8ECF0] font-semibold">{row.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#6AA3E0] font-mono">{row.amt}</span>
                            <span className="text-[#8494A7] font-mono text-[0.6rem] bg-[#0A0F1A] px-1.5 py-0.5 rounded">{row.pct}</span>
                          </div>
                        </div>
                        <div className="text-[#8494A7] pl-4">{row.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Callout type="info">
                  <Strong>Math verification:</Strong> 1,500M (LP) + 500M (Gov Control) + 300M (Gov Rewards) +
                  300M (Staking) + 200M (LP Rewards) + 100M (Sigma) + 100M (Treasury) = 3,000,000,000.
                  The ecosystem allocation (1.5B) sums exactly to the non-liquidity half of total supply.
                </Callout>

                <SubHead>9.3 Vesting Schedule</SubHead>
                <BulletList items={[
                  <><Strong>Gov Control (500M)</Strong> &mdash; 100M unlocked at launch; remaining 400M vested monthly over 5 years (~6.67M/month). Allocation decisions governed by Governor NFT holder votes.</>,
                  <><Strong>Governors Rewards (300M)</Strong> &mdash; Earned over 3 years through active participation: DeFi boosters via playing on-platform, staking NFTs with Ivyfy, and providing liquidity. Not airdrops &mdash; rewards require engagement. Exact monthly distribution rates TBD.</>,
                  <><Strong>Staking Rewards (300M)</Strong> &mdash; Released over 3 years (~100M/year) on the Ivy staking platform. 10-20% APY target.</>,
                  <><Strong>LP Rewards (200M)</Strong> &mdash; Released over 3 years (~66M/year) to SaucerSwap liquidity providers.</>,
                  <><Strong>Sigma Rewards (100M)</Strong> &mdash; Event-based distribution tied to battle outcomes and voting participation. No fixed schedule.</>,
                  <><Strong>Treasury (100M)</Strong> &mdash; Fully locked for 3 years. After lockup, released at ~33M/year for active ecosystem contributors.</>,
                ]} />

                <SubHead>9.4 Demand Drivers</SubHead>
                <BulletList items={[
                  <><Strong>Vote staking</Strong> &mdash; Users must stake BOTB tokens to vote in battles, creating consistent buy pressure and reducing circulating supply during active competition periods.</>,
                  <><Strong>Competition rewards</Strong> &mdash; Winning voters receive token rewards proportional to their weighted stake, incentivizing ongoing participation.</>,
                  <><Strong>DeFi Boosters</Strong> &mdash; Governor holders earn token rewards through active participation (playing, Ivyfy NFT staking, LP provision), incentivizing Governor NFT acquisition and long-term engagement.</>,
                  <><Strong>Event passes</Strong> &mdash; BOTB tokens will be usable for premium IRL competition event access.</>,
                  <><Strong>Liquidity provision</Strong> &mdash; LP incentives on SaucerSwap drive deep liquidity and token accessibility.</>,
                ]} />

                <SubHead>9.5 Infrastructure</SubHead>
                <BulletList items={[
                  <><Strong>Initial DEX:</Strong> SaucerSwap &mdash; 1.5B BOTB paired with 50,000 HBAR.</>,
                  <><Strong>Staking Platform:</Strong> Ivy &mdash; 300M allocation over 3 years, 10-20% APY.</>,
                  <><Strong>Early Voting Contract:</Strong> <ExtLink href="https://hashgraph.vote">hashgraph.vote</ExtLink> &mdash; Pre-competition community voting.</>,
                  <><Strong>Secondary Voting:</Strong> Up Layer 2 (coming soon) &mdash; IRL event voting and rewards.</>,
                ]} />
              </PolicySection>

              {/* Section 10 — NFT Ecosystem (inline) */}
              <PolicySection num={10} title="NFT ECOSYSTEM" icon={<Image className="w-4 h-4" />}>
                <P>
                  The BOTB NFT ecosystem comprises three distinct collections, each serving a unique role
                  in the platform's incentive architecture. All NFTs are issued on the Hedera Token Service (HTS).
                </P>

                <SubHead>10.1 WCO Governors (100 Fixed Supply)</SubHead>
                <div className="mt-2 rounded-lg border border-[#f59e0b]/15 overflow-hidden">
                  <div className="px-4 py-2 bg-[#f59e0b]/5 border-b border-[#f59e0b]/10">
                    <span className="text-[0.65rem] font-bold text-[#f59e0b] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      TOKEN ID: 0.0.9338241 | RARITY: LEGENDARY
                    </span>
                  </div>
                  <div className="px-4 py-3 text-xs text-[#B0BCC9] space-y-2">
                    <P>
                      The Governor NFT is the apex membership tier in the BOTB ecosystem. With only 100
                      ever minted, Governors form the platform's governing body with direct influence over
                      ecosystem fund allocation, competition formats, and platform evolution.
                    </P>
                  </div>
                </div>
                <BulletList items={[
                  <><Strong>2x voting power multiplier</Strong> on all battle votes and governance proposals.</>,
                  <><Strong>Governors Hub access</Strong> &mdash; exclusive dashboard for governance proposals, skill rating, and admin features.</>,
                  <><Strong>Skill rating proposals</Strong> &mdash; propose changes to athlete skill ratings across 5 official WCO categories (Statics, Dynamics, Power Dynamics, Combinations &amp; Flow, Offense &amp; Defense) via the governance system.</>,
                  <><Strong>Governance voting</Strong> &mdash; propose and vote on platform governance decisions.</>,
                  <><Strong>Priority eligibility</Strong> &mdash; first-tier recipients for participation-based token reward distributions.</>,
                  <><Strong>Governor Control Supply allocation</Strong> &mdash; 500M BOTB tokens (16.67%) directed by Governor vote (LP pools, DeFi, Only Gains).</>,
                  <><Strong>Participation-based DeFi Rewards</Strong> &mdash; 300M BOTB tokens (10%) earned over 3 years through playing, staking NFTs with Ivyfy, and providing liquidity. Not airdrops. Exact rates TBD.</>,
                ]} />

                <SubHead>10.2 Sigma Series (1,200 Limited Supply)</SubHead>
                <div className="mt-2 rounded-lg border border-[#7C5CDB]/15 overflow-hidden">
                  <div className="px-4 py-2 bg-[#7C5CDB]/5 border-b border-[#7C5CDB]/10">
                    <span className="text-[0.65rem] font-bold text-[#7C5CDB] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      SUPPLY: 1,200 ATHLETE CARDS | RARITY: EPIC
                    </span>
                  </div>
                  <div className="px-4 py-3 text-xs text-[#B0BCC9] space-y-2">
                    <P>
                      Sigma Series NFTs are individual athlete cards featuring registered BOTB competitors.
                      Each card represents a specific athlete and confers enhanced voting power and
                      athlete-specific reward bonuses.
                    </P>
                  </div>
                </div>
                <BulletList items={[
                  <><Strong>1.5x voting power multiplier</Strong> on all battle votes.</>,
                  <><Strong>Athlete-specific rewards</Strong> &mdash; bonus token distributions when the featured athlete wins battles.</>,
                  <><Strong>Stackable with Governor</Strong> &mdash; Governor (2x) + Sigma (1.5x) = 3x maximum multiplier.</>,
                  <><Strong>Sigma Rewards pool</Strong> &mdash; 100M BOTB tokens (3.33%) for event-based rewards tied to voting and battle outcomes.</>,
                  <><Strong>Tradable on secondary markets</Strong> &mdash; listed on Hedera NFT marketplaces (SentX).</>,
                ]} />

                <SubHead>10.3 Meta Series (Unlimited Supply)</SubHead>
                <div className="mt-2 rounded-lg border border-[#10b981]/15 overflow-hidden">
                  <div className="px-4 py-2 bg-[#10b981]/5 border-b border-[#10b981]/10">
                    <span className="text-[0.65rem] font-bold text-[#10b981] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      SUPPLY: UNLIMITED | LAUNCH: Q2-Q3 2026
                    </span>
                  </div>
                  <div className="px-4 py-3 text-xs text-[#B0BCC9] space-y-2">
                    <P>
                      Meta Series NFTs power a novel head-to-head influencer competition format that
                      bridges social media culture with real athletic performance. Unlike Governor and Sigma
                      NFTs which are pre-minted with fixed supplies, Meta Series NFTs are minted on demand
                      during active competitions with no supply cap.
                    </P>
                  </div>
                </div>

                <SubHead>10.3.1 How Meta Series Competitions Work</SubHead>
                <NumberedList items={[
                  "The WCO announces a Meta Series matchup between two influencers, or an influencer vs. a WCO athlete, in a defined physical challenge (push-ups, chin-ups, or a combined format).",
                  "Two distinct Meta Series NFT collections are created for the matchup \u2014 one for each side. Supporters purchase NFTs backing their chosen competitor.",
                  "NFTs are minted on demand as purchases occur. There is no supply cap per side. The more supporters a side attracts, the larger the combined prize pool grows.",
                  "The physical competition takes place (either live-streamed or verified at a WCO-sanctioned event). The WCO declares the winner based on verified results.",
                  "100% of the combined funds raised from NFT sales on BOTH sides are distributed pro-rata to collectors who backed the winning side. Winning collectors receive their proportional share of the entire prize pool.",
                  "Collectors who backed the losing side do not receive any refund or prize distribution. The Meta Series NFT retains its collectible status but has no claim on funds.",
                ]} />

                <Callout type="warning">
                  <Strong>Meta Series Risk:</Strong> Purchasing a Meta Series NFT is a prediction-based
                  commitment. If the competitor you back loses, you will lose the full purchase price. There
                  is no refund mechanism. Meta Series competitions carry higher financial risk than standard
                  battle voting because the entire purchase amount is at stake, not just a staked token
                  amount. Participants must be 18+ and understand the winner-takes-all mechanics before
                  purchasing.
                </Callout>

                <SubHead>10.3.2 Meta Series Revenue Model</SubHead>
                <BulletList items={[
                  <><Strong>Prize Pool Distribution:</Strong> 100% of combined NFT sales from both sides go to winning-side collectors. The WCO may retain a platform fee (to be announced prior to launch).</>,
                  <><Strong>Influencer Incentive:</Strong> Influencers receive exposure, community engagement, and potential revenue sharing from the matchup, incentivizing participation and promotion.</>,
                  <><Strong>Crossover Events:</Strong> Meta Series competitions can feature influencer vs. influencer, influencer vs. WCO athlete, or special themed challenges (e.g., charity events, brand partnerships).</>,
                ]} />

                <SubHead>10.4 NFT Voting Power Summary</SubHead>
                <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
                    <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                      4-TIER VOTING POWER SYSTEM
                    </span>
                  </div>
                  <div className="divide-y divide-[#4274B9]/5">
                    {([
                      ["1x", "Base", "No NFTs held. Standard voting power.", "#8494A7"],
                      ["1.5x", "Sigma Series", "Hold at least one Sigma Series NFT.", "#7C5CDB"],
                      ["2x", "Governor", "Hold at least one WCO Governor NFT (0.0.9338241).", "#f59e0b"],
                      ["3x", "Governor + Sigma", "Hold both a Governor NFT and a Sigma Series NFT. Maximum achievable.", "#10b981"],
                    ] as [string, string, string, string][]).map(([power, tier, desc, color]) => (
                      <div key={tier} className="flex items-center gap-3 px-4 py-2 text-xs">
                        <span className="font-bold font-mono w-8 shrink-0" style={{ fontFamily: "Orbitron, sans-serif", color }}>{power}</span>
                        <span className="text-[#E8ECF0] font-semibold shrink-0 w-32">{tier}</span>
                        <span className="text-[#8494A7]">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <P>
                  Voting power is computed by <Code>computeVotingPower(hasGovernor, hasSigma)</Code> in
                  the <Code>hedera-mirror.ts</Code> module. NFT holdings are verified in real-time via
                  the Hedera Mirror Node &mdash; no self-attestation or manual staking is required. Meta Series
                  NFTs do not confer voting power multipliers; their value derives from the winner-takes-all
                  competition model.
                </P>
              </PolicySection>

              {/* Section 11 — Voting Power & Multipliers (inline) */}
              <PolicySection num={11} title="VOTING POWER & MULTIPLIERS" icon={<Zap className="w-4 h-4" />}>
                <P>
                  Voting power is the core economic primitive of the BOTB platform. It determines how much
                  influence a participant has in battle outcomes, governance decisions, and reward
                  distributions. This section provides a deep-dive into the voting power computation,
                  its implementation in code, and its economic implications.
                </P>

                <SubHead>11.1 The Voting Power Formula</SubHead>
                <P>
                  Every vote on the platform &mdash; battle votes and governance proposal votes
                  &mdash; is weighted by the voter&apos;s voting power multiplier. The formula for
                  a weighted vote is:
                </P>
                <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 text-center space-y-2">
                  <div>
                    <span className="text-[#6AA3E0]">weightedVote</span>{" "}
                    <span className="text-[#8494A7]">=</span>{" "}
                    <span className="text-[#6AA3E0]">stakeAmount</span>{" "}
                    <span className="text-[#8494A7]">{"\u00D7"}</span>{" "}
                    <span className="text-[#6AA3E0]">votingPower</span>
                  </div>
                  <div className="text-[#8494A7] text-[0.65rem]">
                    where stakeAmount is the BOTB tokens committed and votingPower is the NFT-based multiplier
                  </div>
                </div>

                <SubHead>11.2 Implementation</SubHead>
                <P>
                  The <Code>computeVotingPower()</Code> function in <Code>hedera-mirror.ts</Code> takes
                  two boolean parameters &mdash; <Code>hasGovernor</Code> and <Code>hasSigma</Code> &mdash; and
                  returns the multiplier:
                </P>
                <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-0.5">
                  <div><span className="text-[#7C5CDB]">export function</span> <span className="text-[#6AA3E0]">computeVotingPower</span>(</div>
                  <div>{"  "}<span className="text-[#f59e0b]">hasGovernor</span>: boolean, <span className="text-[#f59e0b]">hasSigma</span>: boolean</div>
                  <div>): number {"{"}</div>
                  <div>{"  "}<span className="text-[#7C5CDB]">if</span> (hasGovernor && hasSigma) <span className="text-[#7C5CDB]">return</span> <span className="text-[#10b981]">3</span>;    <span className="text-[#8494A7]">// Max tier</span></div>
                  <div>{"  "}<span className="text-[#7C5CDB]">if</span> (hasGovernor) <span className="text-[#7C5CDB]">return</span> <span className="text-[#10b981]">2</span>;               <span className="text-[#8494A7]">// Governor only</span></div>
                  <div>{"  "}<span className="text-[#7C5CDB]">if</span> (hasSigma) <span className="text-[#7C5CDB]">return</span> <span className="text-[#10b981]">1.5</span>;               <span className="text-[#8494A7]">// Sigma only</span></div>
                  <div>{"  "}<span className="text-[#7C5CDB]">return</span> <span className="text-[#10b981]">1</span>;                            <span className="text-[#8494A7]">// Base tier</span></div>
                  <div>{"}"}</div>
                </div>

                <SubHead>11.3 Tier Breakdown</SubHead>
                <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
                    <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                      VOTING POWER TIERS &mdash; DETAILED
                    </span>
                  </div>
                  <div className="divide-y divide-[#4274B9]/5">
                    {([
                      ["1x", "Base", "No Governor, no Sigma NFT.", "Any connected Hedera wallet. Standard participation level.", "1,000 BOTB staked = 1,000 weighted vote", "#8494A7"],
                      ["1.5x", "Sigma Series", "Hold at least 1 Sigma Series NFT. Governor not required.", "Collector tier. Rewards fans who invest in athlete-specific NFTs.", "1,000 BOTB staked = 1,500 weighted vote", "#7C5CDB"],
                      ["2x", "Governor", "Hold at least 1 WCO Governor NFT (token 0.0.9338241). Sigma not required.", "Governance tier. Governors have 2x influence plus exclusive Hub access and the ability to propose skill rating changes.", "1,000 BOTB staked = 2,000 weighted vote", "#f59e0b"],
                      ["3x", "Governor + Sigma", "Hold both a Governor NFT and a Sigma Series NFT.", "Maximum tier. Requires investment in both governance and athlete ecosystems.", "1,000 BOTB staked = 3,000 weighted vote", "#10b981"],
                    ] as [string, string, string, string, string, string][]).map(([power, tier, requirement, rationale, example, color]) => (
                      <div key={tier} className="px-4 py-3 text-xs space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold font-mono w-8 shrink-0" style={{ fontFamily: "Orbitron, sans-serif", color }}>{power}</span>
                          <span className="text-[#E8ECF0] font-semibold">{tier}</span>
                        </div>
                        <div className="pl-10 space-y-1">
                          <div><span className="text-[#6AA3E0]">Requirement:</span> <span className="text-[#8494A7]">{requirement}</span></div>
                          <div><span className="text-[#6AA3E0]">Rationale:</span> <span className="text-[#8494A7]">{rationale}</span></div>
                          <div><span className="text-[#6AA3E0]">Example:</span> <span className="text-[#B0BCC9] font-mono">{example}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <SubHead>11.4 NFT Verification Process</SubHead>
                <P>
                  NFT holdings are verified in real-time via the Hedera Mirror Node &mdash; there is no
                  self-attestation, manual staking, or snapshot-based approach. The verification flow:
                </P>
                <NumberedList items={[
                  "When a user casts a vote, the server calls the Mirror Node endpoint /api/v1/accounts/{wallet}/nfts to retrieve all NFTs owned by the wallet.",
                  "The categorizeNFTs() function groups returned NFTs by known BOTB token IDs: Governor (0.0.9338241), Sigma, Meta, and Other.",
                  "Boolean flags hasGovernorNFT and hasSigmaNFT are derived from the categorized counts (> 0).",
                  "computeVotingPower(hasGovernor, hasSigma) returns the multiplier, which is recorded in the vote record alongside the stakeAmount and weightedVote.",
                  "If HCS recording is active, the NFT flags are also written to the HCS topic message for on-chain audit.",
                ]} />
                <Callout type="info">
                  <Strong>Real-time, not snapshot:</Strong> Your voting power updates immediately when
                  you acquire or transfer an NFT. If you purchase a Governor NFT between two battles,
                  your next vote will automatically reflect 2x (or 3x) power. There is no delay,
                  registration step, or staking requirement for NFT-based voting power.
                </Callout>

                <SubHead>11.5 Economic Impact</SubHead>
                <P>
                  The 4-tier system creates layered economic incentives:
                </P>
                <BulletList items={[
                  <><Strong>Demand for Governor NFTs:</Strong> With only 100 in existence and each conferring 2x power (3x with Sigma), Governor NFTs have inherent scarcity value tied directly to platform governance and voting influence.</>,
                  <><Strong>Demand for Sigma NFTs:</Strong> The 1.5x boost (stackable to 3x) makes Sigma NFTs valuable to any active voter. With 1,200 athlete-specific cards, there is a natural collector market tied to individual athlete fandom.</>,
                  <><Strong>Proportional rewards:</Strong> Because reward distribution is calculated on weighted votes, higher-tier voters earn proportionally larger shares of the reward pool. A 3x voter staking 1,000 BOTB receives the same share as a 1x voter staking 3,000 BOTB &mdash; incentivizing NFT acquisition as an alternative to larger token stakes.</>,
                  <><Strong>Floor price support:</Strong> The direct relationship between NFT ownership and voting power creates a utility-based floor price for both Governor and Sigma NFTs that is independent of speculative market dynamics.</>,
                ]} />

                <SubHead>11.6 Meta Series Exception</SubHead>
                <P>
                  Meta Series NFTs do <Strong>not</Strong> confer any voting power multiplier. Their
                  economic value derives entirely from the winner-takes-all competition model (see
                  Sections 10.3 and 14). This is a deliberate design decision &mdash; Meta Series NFTs are
                  prediction instruments, not governance tools. Conflating prediction with governance
                  power would create misaligned incentives.
                </P>
              </PolicySection>

              {/* Section 12 */}
              <Section12_GovernanceModel />
              {/* Section 13 */}
              <Section13_CompetitionMechanics />

              {/* Section 14 — Meta Series (inline) */}
              <PolicySection num={14} title="META SERIES \u2014 INFLUENCER BATTLES" icon={<Users className="w-4 h-4" />}>
                <P>
                  The Meta Series represents BOTB's expansion beyond traditional calisthenics competitions
                  into the broader social media and influencer ecosystem. By leveraging the same Hedera
                  HTS infrastructure that powers Governor and Sigma NFTs, Meta Series creates a new
                  category of decentralized, prediction-based athletic competition.
                </P>

                <SubHead>14.1 Competition Format</SubHead>
                <BulletList items={[
                  <><Strong>Push-Up Challenges</Strong> &mdash; Two competitors face off in maximum-rep push-up
                    sets within a defined time window. Standard, diamond, wide-grip, or decline variations
                    may be specified.</>,
                  <><Strong>Chin-Up Challenges</Strong> &mdash; Maximum-rep chin-up or pull-up competitions.
                    Strict form requirements enforced by WCO judges or verified video review.</>,
                  <><Strong>Combined Format</Strong> &mdash; Multi-exercise challenges combining push-ups,
                    chin-ups, and other bodyweight movements for aggregate scoring.</>,
                ]} />

                <SubHead>14.2 Matchup Types</SubHead>
                <BulletList items={[
                  <><Strong>Influencer vs. Influencer</Strong> &mdash; Two social media personalities compete,
                    each bringing their respective audiences as potential NFT collectors.</>,
                  <><Strong>Influencer vs. WCO Athlete</Strong> &mdash; A social media influencer challenges a
                    registered WCO calisthenics athlete, creating crossover interest between fitness
                    influencer audiences and the competitive calisthenics community.</>,
                  <><Strong>Themed Events</Strong> &mdash; Charity competitions, brand partnership challenges,
                    or seasonal events with special Meta Series artwork and formatting.</>,
                ]} />

                <SubHead>14.3 Fund Flow</SubHead>
                <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 space-y-1 leading-relaxed">
                  <div className="text-[#8494A7]">{"// Meta Series Fund Distribution"}</div>
                  <div className="text-[#6AA3E0]">Side A NFT Sales:  <span className="text-[#B0BCC9]">$X (n collectors)</span></div>
                  <div className="text-[#6AA3E0]">Side B NFT Sales:  <span className="text-[#B0BCC9]">$Y (m collectors)</span></div>
                  <div className="text-[#8494A7]">{"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"}</div>
                  <div className="text-[#10b981]">Total Prize Pool: <span className="text-[#B0BCC9]">$X + $Y</span></div>
                  <div className="text-[#8494A7]">{"// Winner declared by WCO"}</div>
                  <div className="text-[#10b981]">Winning collectors: <span className="text-[#B0BCC9]">receive ($X + $Y) / shares</span></div>
                  <div className="text-red-400">Losing collectors:  <span className="text-[#B0BCC9]">receive $0 (NFT retained)</span></div>
                </div>

                <SubHead>14.4 Timeline</SubHead>
                <P>
                  Meta Series competitions are planned for launch in Q2-Q3 2026, coinciding with the
                  BOTB token launch. Initial matchups will feature established fitness influencers
                  with significant social media followings to maximize prize pool sizes and community
                  engagement. The Meta Series NFT token ID will be published to{" "}
                  <Code>hedera-config.ts</Code> upon deployment.
                </P>
              </PolicySection>

              {/* Section 15 */}
              <Section15_RewardDistribution />
              {/* Section 16 */}
              <Section16_SecurityArchitecture />
              {/* Section 17 */}
              <Section17_Roadmap />
              {/* Section 18 */}
              <Section18_TeamPartnerships />
              {/* Section 19 */}
              <Section19_RiskFactors />
              {/* Section 20 */}
              <Section20_LegalFramework />
            </div>

            {/* Footer links */}
            <div className="mt-12 pt-8 border-t border-[#4274B9]/10 flex flex-wrap gap-6 text-sm text-[#8494A7]">
              <Link to="/privacy" className="hover:text-[#6AA3E0] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#6AA3E0] transition-colors">Terms of Service</Link>
              <a href="https://worldcalisthenics.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#6AA3E0] transition-colors">
                worldcalisthenics.org
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Back to Top FAB ================= */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-[#4274B9] text-white shadow-lg shadow-[#4274B9]/25 flex items-center justify-center transition-all duration-300 hover:bg-[#6AA3E0] ${
          showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Back to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </div>
  );
}

export default WhitepaperPage;