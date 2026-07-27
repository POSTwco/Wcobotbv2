import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Zap, ArrowRight, Trophy, Users, Coins, Swords, Shield, TrendingUp, Download, Vote, Flame, Sparkles, ChevronRight, ExternalLink, Dumbbell } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { useVIP } from "../components/vip/vip-context";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { RateAthletesSection } from "../components/rate-athletes";
import { SponsorShowcase, TitleSponsorBanner } from "../components/sponsor-showcase";
import { ContestBanner } from "../components/contest/contest-banner";
import { useConfig, useBattles, useAthletes } from "../lib/hooks";
import { api } from "../lib/api";
import type { ContestPublicStats } from "../lib/contest-types";
import { AnimatedCounter, StaggerText, FadeInWhenVisible, TiltCard } from "../components/ui-enhancements";
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

const ATHLETE_BG = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/athlete1.jpg";
const WCO_VIDEO = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCOVID.M4V";

function StatCard({ label, value, icon: Icon, color, animatedValue, prefix, suffix, decimals }: { label: string; value: string; icon: any; color: string; animatedValue?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const { vipActive } = useVIP();
  return (
    <TiltCard
      maxTilt={8}
      glowColor={vipActive ? "#D4A843" : color}
      className="relative"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`rounded-xl p-3 sm:p-5 transition-all group ${
          vipActive
            ? "vip-glass-card vip-shimmer-overlay hover:border-[#D4A843]/40"
            : "bg-[#111827] border border-[#4274B9]/10 hover:border-[#4274B9]/30"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ background: vipActive ? "rgba(212,168,67,0.1)" : `${color}15` }}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: vipActive ? "#D4A843" : color }} />
          </div>
          <span className="text-[#8494A7] text-xs sm:text-sm">{label}</span>
        </div>
        <p className={`text-xl sm:text-2xl ${vipActive ? "vip-gold-text" : "text-[#E8ECF0]"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
          {animatedValue !== undefined ? (
            <AnimatedCounter value={animatedValue} prefix={prefix} suffix={suffix} decimals={decimals ?? 0} duration={2.5} />
          ) : value}
        </p>
      </motion.div>
    </TiltCard>
  );
}

export function HomePage() {
  const { connect, connected, isConnecting } = useWallet();
  const { vipActive, sound } = useVIP();
  const { data: config } = useConfig();
  const { data: battles } = useBattles();
  const { data: athletes } = useAthletes();
  const [contestStats, setContestStats] = useState<ContestPublicStats | null>(null);

  // Hide Hedera badge while Connect-to-Enter is running (open / full / drawing)
  const contestActive =
    !!contestStats &&
    (contestStats.status === "open" ||
      contestStats.status === "full" ||
      contestStats.status === "drawing");

  const loadContest = useCallback(async () => {
    try {
      const res = await api.contest.publicStats();
      if (res.success && res.data) setContestStats(res.data);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadContest();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadContest();
    }, 60_000);
    return () => clearInterval(id);
  }, [loadContest]);

  // Compute live stats from config + actual counts
  const tokenStats = config.tokenStats;
  const totalBattles = battles.length || tokenStats.totalBattles;
  const totalAthletes = athletes.length;

  return (
    <div className="min-h-screen">
      {/* Hero Section — items-start so tall contest column doesn't collide with absolute title sponsor */}
      <section className="relative min-h-[70vh] sm:min-h-[90vh] flex items-start sm:items-center overflow-hidden">
        {/* Background - athlete image, very subtle */}
        <div className="absolute inset-0">
          <img
            src={ATHLETE_BG}
            alt="Calisthenics athlete training background"
            className="w-full h-full object-cover opacity-[0.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120] via-[#0B1120]/60 to-[#0B1120]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120] via-transparent to-[#0B1120]" />
        </div>

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(#4274B9 1px, transparent 1px), linear-gradient(90deg, #4274B9 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Title Sponsor Banner — absolutely positioned in the gap between header and hero content */}
        <TitleSponsorBanner />

        {/* Extra top padding clears absolute NiBrew/title-sponsor strip (logos up to ~120px) */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36 pb-10 sm:pb-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* WCO Badge — hidden during Connect-to-Enter competition to free space for title sponsor */}
              {!contestActive && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/20 mb-6">
                  <img src={wcoLogoWhite} alt="WCO" className="h-4 w-auto" />
                  <span className="text-[#4274B9] text-xs tracking-wider font-semibold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    LIVE ON HEDERA HASHGRAPH
                  </span>
                </div>
              )}

              <h1
                className={`text-2xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 ${contestActive ? "mt-1 sm:mt-0" : ""}`}
                style={{ fontFamily: "Orbitron, sans-serif", lineHeight: 1.1 }}
              >
                <span className="text-white">BATTLE</span>
                <br />
                <span className="text-white">OF THE</span>
                <br />
                <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">BARS</span>
              </h1>

              <p className="text-[#8494A7] text-sm sm:text-lg mb-5 sm:mb-6 max-w-xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                The world's first decentralized calisthenics competition platform. 
                Vote on IRL battles, stake tokens, earn rewards. 
                <span className="text-[#4274B9] font-semibold"> No loss. Only Gains.</span>
              </p>

              <div className="flex flex-row gap-2 sm:gap-3 max-w-xl">
                {!connected ? (
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 rounded-xl transition-all ${
                      isConnecting
                        ? "bg-[#4274B9]/50 text-white/70 cursor-wait"
                        : "bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25"
                    }`}
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)" }}
                  >
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">{isConnecting ? "CONNECTING..." : "CONNECT TO ENTER"}</span>
                  </button>
                ) : (
                  <Link
                    to="/battles"
                    className="relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all"
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)" }}
                  >
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">ENTER BATTLES</span>
                  </Link>
                )}
                <Link
                  to="/athletes"
                  className="relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)" }}
                >
                  <span className="truncate">EXPLORE</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                </Link>
                <Link
                  to="/calisthenics"
                  className="relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 rounded-xl transition-all hover:brightness-110 hover:shadow-lg hover:shadow-[#D4A843]/30"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)",
                    background: "linear-gradient(135deg, #E8C468, #D4A843 45%, #B8860B)",
                    color: "#1a1208",
                    boxShadow: "0 4px 20px rgba(212,168,67,0.35)",
                  }}
                >
                  <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">WORKOUT</span>
                  <span
                    className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full text-[0.45rem] sm:text-[0.5rem] font-bold tracking-wider text-white shadow-md leading-none"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      background: "linear-gradient(135deg, #4274B9, #3563A0)",
                      boxShadow: "0 2px 8px rgba(66,116,185,0.45)",
                    }}
                  >
                    NEW
                  </span>
                </Link>
              </div>

              {/* Connect-to-Enter contest banner */}
              <ContestBanner />
            </motion.div>

            {/* Video Player with Glowing Frame */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative group"
            >
              {/* Outer glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#4274B9] via-[#6AA3E0] to-[#4274B9] rounded-2xl opacity-40 blur-md group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
              
              {/* Inner glow border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#4274B9] via-[#6AA3E0] to-[#4274B9] rounded-2xl opacity-70" />
              
              {/* Video container — links to WCO YouTube */}
              <a
                href="https://www.youtube.com/@WorldCalisthenicsOrg"
                target="_blank"
                rel="noopener noreferrer"
                className="block relative bg-[#0B1120] rounded-2xl overflow-hidden cursor-pointer"
              >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6AA3E0] to-transparent z-10" />
                
                <video
                  src={WCO_VIDEO}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-video object-cover"
                />

                {/* YouTube CTA overlay — visible on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center z-20">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                      <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                    <span className="text-white text-xs font-bold tracking-wider px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      WATCH ON YOUTUBE
                    </span>
                  </div>
                </div>

                {/* Bottom overlay with badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/80 to-transparent p-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-400 text-xs tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>LIVE</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1120]/60 backdrop-blur-sm border border-[#4274B9]/30">
                      <img src={wcoLogoWhite} alt="WCO" className="h-3 w-auto" />
                      <span className="text-[#8494A7] text-[0.6rem] tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                        BATTLE OF THE BARS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#6AA3E0]/60 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#6AA3E0]/60 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#4274B9]/60 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#4274B9]/60 rounded-br-2xl" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sponsor Showcase — between hero and stats */}
      <SponsorShowcase />

      {/* Stats */}
      <section className="py-8 sm:py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatCard label="Token Price" value={`$${tokenStats.price}`} icon={TrendingUp} color="#4274B9" animatedValue={parseFloat(tokenStats.price) || 0} prefix="$" decimals={2} />
            <StatCard label="Total Staked" value="" icon={Shield} color="#6AA3E0" animatedValue={tokenStats.totalStaked / 1e6} suffix="M" decimals={1} />
            <StatCard label="Total Voters" value="" icon={Users} color="#f59e0b" animatedValue={tokenStats.totalVoters / 1e3} suffix="K" decimals={0} />
            <StatCard label="Total Battles" value={totalBattles.toString()} icon={Trophy} color="#10b981" animatedValue={totalBattles} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20 relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#4274B9]/[0.03] rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl mb-4" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">HOW TO PLAY</span>
            </h2>
            <p className="text-[#8494A7] max-w-2xl mx-auto text-sm sm:text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Jump in, pick your athletes, and <span className="text-[#6AA3E0] font-semibold">WIN tokens</span> — it's that simple. 
              No one loses their stake. <span className="text-[#4274B9] font-semibold">ONLY GAINS</span>.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {/* Step 1: Download HashPack */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl p-4 sm:p-6 relative group hover:border-[#4274B9]/30 transition-all hover:shadow-lg hover:shadow-[#4274B9]/5"
            >
              <span
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-2xl sm:text-4xl opacity-10"
                style={{ fontFamily: "Orbitron, sans-serif", color: "#8B5CF6" }}
              >
                01
              </span>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-5" style={{ background: "#8B5CF615" }}>
                {/* HashPack Logo */}
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="sm:w-7 sm:h-7">
                  <rect width="32" height="32" rx="6" fill="#8B5CF6"/>
                  <path d="M9 8v16M23 8v16M9 14h14M9 20h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-[#E8ECF0] mb-1 sm:mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                GET HASHPACK
              </h3>
              <p className="text-[#8494A7] text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-4 sm:line-clamp-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Download the <span className="text-[#8B5CF6] font-semibold">HashPack wallet</span> — the #1 Hedera wallet. Available as a browser extension or mobile app. Your gateway to the BOTB arena.
              </p>
              <a
                href="https://www.hashpack.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                DOWNLOAD <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>

            {/* Step 2: Own WCO Token */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl p-4 sm:p-6 relative group hover:border-[#4274B9]/30 transition-all hover:shadow-lg hover:shadow-[#4274B9]/5"
            >
              <span
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-2xl sm:text-4xl opacity-10"
                style={{ fontFamily: "Orbitron, sans-serif", color: "#4274B9" }}
              >
                02
              </span>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-5" style={{ background: "#4274B915" }}>
                <Coins className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: "#4274B9" }} />
              </div>
              <h3 className="text-[#E8ECF0] mb-1 sm:mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                OWN WCO TOKEN
              </h3>
              <p className="text-[#8494A7] text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-4 sm:line-clamp-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Grab <span className="text-[#4274B9] font-semibold">$WCO tokens</span> on SaucerSwap or any Hedera DEX. WCO is your ticket to vote, compete, and <span className="text-[#6AA3E0] font-semibold">WIN</span> in every battle.
              </p>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded bg-[#4274B9]/10 text-[10px] text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  HEDERA NATIVE
                </div>
                <div className="px-2 py-1 rounded bg-[#6AA3E0]/10 text-[10px] text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  ONLY GAINS
                </div>
              </div>
            </motion.div>

            {/* Step 3: Stake & Vote */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl p-4 sm:p-6 relative group hover:border-[#6AA3E0]/30 transition-all hover:shadow-lg hover:shadow-[#6AA3E0]/5"
            >
              <span
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-2xl sm:text-4xl opacity-10"
                style={{ fontFamily: "Orbitron, sans-serif", color: "#6AA3E0" }}
              >
                03
              </span>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-5" style={{ background: "#6AA3E015" }}>
                <Swords className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: "#6AA3E0" }} />
              </div>
              <h3 className="text-[#E8ECF0] mb-1 sm:mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                VOTE & WIN
              </h3>
              <p className="text-[#8494A7] text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-4 sm:line-clamp-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Stake your WCO on <span className="text-[#6AA3E0] font-semibold">upcoming battles</span> by voting for your favorite athletes. Pick the winner and <span className="text-[#6AA3E0] font-semibold">WIN bonus tokens</span> from the community pool. Your stake is always safe.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                <Flame className="w-3.5 h-3.5" /> NO RISK STAKING
              </div>
            </motion.div>

            {/* Step 4: NFT Boosters */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl p-4 sm:p-6 relative group hover:border-[#f59e0b]/30 transition-all hover:shadow-lg hover:shadow-[#f59e0b]/5"
            >
              <span
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-2xl sm:text-4xl opacity-10"
                style={{ fontFamily: "Orbitron, sans-serif", color: "#f59e0b" }}
              >
                04
              </span>
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-5" style={{ background: "#f59e0b15" }}>
                <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: "#f59e0b" }} />
              </div>
              <h3 className="text-[#E8ECF0] mb-1 sm:mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                BOOST WITH NFTs
              </h3>
              <p className="text-[#8494A7] text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-4 sm:line-clamp-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Supercharge your voting power with <span className="text-[#f59e0b] font-semibold">Governors NFTs</span> and the <span className="text-[#f59e0b] font-semibold">Sigma Series</span>. Holders get multiplied rewards, exclusive access, and VIP status in the arena.
              </p>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded bg-[#f59e0b]/10 text-[10px] text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  GOVERNORS
                </div>
                <div className="px-2 py-1 rounded bg-[#f59e0b]/10 text-[10px] text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  SIGMA SERIES
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom connector line */}
          <div className="hidden lg:flex items-center justify-center mt-10 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] opacity-60" />
                {i < 3 && <div className="w-20 h-[1px] bg-gradient-to-r from-[#4274B9]/40 to-[#6AA3E0]/40" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rate Our Athletes - Centerpiece */}
      <RateAthletesSection />

      {/* CTA */}
      <section className="py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4274B9]/5 to-[#6AA3E0]/5" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* BOTB Shield — real image from Supabase bucket */}
            <div className="h-20 sm:h-28 w-auto mx-auto mb-6 flex items-center justify-center drop-shadow-2xl">
              <img src={botbShield} alt="BOTB Shield" className="h-full w-auto object-contain" />
            </div>
            <h2 className="text-2xl sm:text-4xl mb-4 sm:mb-6" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="text-white">READY TO </span>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">COMPETE?</span>
            </h2>
            <p className="text-[#8494A7] text-sm sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
              Join {tokenStats.totalVoters > 0 ? `${(tokenStats.totalVoters / 1000).toFixed(0)}K+` : ""} fans and athletes in the world's first decentralized calisthenics ecosystem on Hedera.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                to="/apply"
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
              >
                <Swords className="w-5 h-5" /> ENTER THE ARENA
              </Link>
              <Link
                to="/battles"
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
              >
                PLAY BATTLES <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/calisthenics"
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
              >
                <Dumbbell className="w-5 h-5" /> Workout routine
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}