/**
 * BOTB Voting Architecture Blueprint
 * ====================================
 * Premium 3-section technical architecture diagram for CEO / admin sharing.
 * Accessible via a silver envelope in the Admin Manual tab.
 *
 * ALL DATA IS SOURCED DIRECTLY FROM:
 *   - /supabase/functions/server/index.tsx  (voting routes, multipliers, leaderboard formula)
 *   - /src/app/pages/whitepaper.tsx          (tokenomics, NFT ecosystem, vesting, infrastructure)
 *   - /src/app/components/governance.tsx      (proposal voting flow)
 *   - /src/app/components/battles.tsx         (battle vote flow, nonce generation)
 *
 * Sections:
 *   1. Battle Voting — 10-step end-to-end user vote flow
 *   2. DAO Governance — Proposal lifecycle & Governor voting
 *   3. Tokenomics    — 3B supply, 7 pools (50/50 split), vesting, demand drivers
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ChevronRight, ChevronLeft, Shield, Zap, Vote, Trophy, Coins,
  Lock, Fingerprint, Users, Swords, Crown, Star, ArrowRight, ArrowDown,
  CheckCircle, Globe, Wallet, FileText, BarChart3, Layers, Target,
  Award, TrendingUp, AlertTriangle, Eye, Database, Server, Hash,
  Cpu, Network, Timer, RefreshCw, Scale, Flame,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// WCO Official Logo
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
const IMG_CALISTHENICS = "https://images.unsplash.com/photo-1758521959675-5874879f3977?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxpc3RoZW5pY3MlMjBhdGhsZXRlJTIwbXVzY2xlJTIwdXAlMjBiYXJ8ZW58MXx8fHwxNzczMDEyMDA2fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_BLOCKCHAIN = "https://images.unsplash.com/photo-1653179675238-cc722693b666?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibG9ja2NoYWluJTIwdGVjaG5vbG9neSUyMGZ1dHVyaXN0aWMlMjBuZXR3b3JrfGVufDF8fHx8MTc3MzAxMjAxMHww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_WORKOUT = "https://images.unsplash.com/photo-1762169794874-aedbe2be0771?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjB3b3Jrb3V0JTIwY29tcGV0aXRpb24lMjBvdXRkb29yfGVufDF8fHx8MTc3MzAxMjAxM3ww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_SECURITY = "https://images.unsplash.com/photo-1639503547276-90230c4a4198?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwc2VjdXJpdHklMjBjcnlwdG9ncmFwaHklMjBzaGllbGR8ZW58MXx8fHwxNzczMDEyMDE3fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_ARENA = "https://images.unsplash.com/photo-1762445964939-123200d655ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBhcmVuYSUyMGxpZ2h0cyUyMHN0YWRpdW0lMjBuaWdodHxlbnwxfHx8fDE3NzMwMTIwMjJ8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_TROPHY = "https://images.unsplash.com/photo-1770482228588-270b08d2d376?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkJTIwdHJvcGh5JTIwYXdhcmQlMjBjaGFtcGlvbnNoaXB8ZW58MXx8fHwxNzczMDEyMDI1fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_RINGS = "https://images.unsplash.com/photo-1758875570005-52f6fff50854?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneW1uYXN0aWNzJTIwcmluZ3MlMjBhdGhsZXRlJTIwdHJhaW5pbmd8ZW58MXx8fHwxNzczMDEyMDI5fDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_GOVERNANCE = "https://images.unsplash.com/photo-1603032813605-2c91e257e2ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b3RpbmclMjBkaWdpdGFsJTIwZ292ZXJuYW5jZSUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzczMDEyMDMyfDA&ixlib=rb-4.1.0&q=80&w=1080";

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------
const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "DM Sans, sans-serif" };

function GlassCard({ children, className = "", glow = "#4274B9" }: { children: React.ReactNode; className?: string; glow?: string }) {
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

function FlowConnector({ direction = "down", color = "#4274B9" }: { direction?: "down" | "right"; color?: string }) {
  if (direction === "right") {
    return (
      <div className="flex items-center justify-center px-1 shrink-0">
        <div className="w-6 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${color}60, ${color})` }} />
        <ChevronRight className="w-3 h-3 -ml-1" style={{ color }} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center py-1 shrink-0">
      <div className="w-[2px] h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${color}60, ${color})` }} />
      <ArrowDown className="w-3 h-3 -mt-0.5" style={{ color }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Card
// ---------------------------------------------------------------------------
function StepCard({
  step, title, description, icon, color, details, techNote,
}: {
  step: number; title: string; description: string; icon: React.ReactNode;
  color: string; details: string[]; techNote?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: step * 0.04, duration: 0.4 }}
    >
      <GlassCard className="p-4" glow={color}>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
            style={{ ...orbitron, background: `${color}15`, border: `1px solid ${color}30`, color }}
          >
            {String(step).padStart(2, "0")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color }}>{icon}</span>
              <h4 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>{title}</h4>
            </div>
            <p className="text-[#8494A7] text-xs leading-relaxed mb-2" style={dmSans}>{description}</p>
            <ul className="space-y-1">
              {details.map((d, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[0.68rem] text-[#6AA3E0]/80" style={dmSans}>
                  <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color }} />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            {techNote && (
              <div className="mt-2 px-2 py-1.5 rounded-lg bg-[#4274B9]/5 border border-[#4274B9]/10">
                <p className="text-[0.6rem] text-[#6AA3E0]/60 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span className="font-semibold" style={orbitron}>TECH:</span>{" "}
                  <span style={dmSans}>{techNote}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function MultiplierCard({ nft, multiplier, color, desc }: { nft: string; multiplier: string; color: string; desc: string }) {
  return (
    <div
      className="rounded-xl p-3 text-center border"
      style={{ background: `${color}08`, borderColor: `${color}25` }}
    >
      <p className="text-2xl font-black" style={{ ...orbitron, color }}>{multiplier}</p>
      <p className="text-[#E8ECF0] text-xs font-bold mt-1" style={orbitron}>{nft}</p>
      <p className="text-[#8494A7] text-[0.6rem] mt-1" style={dmSans}>{desc}</p>
    </div>
  );
}

// Inline Camera icon (not exported by lucide-react in this env)
function CameraIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

// ===========================================================================
// SECTION 1 — BATTLE VOTING FLOW (10 Steps)
// All data sourced from POST /vote/battle in index.tsx
// ===========================================================================
function Section1_BattleVoting() {
  const steps = [
    {
      title: "WALLET CONNECTION",
      description: "The voter connects their Hedera wallet via WalletConnect v2 relay protocol. HashPack wallet signs the pairing, establishing an encrypted session.",
      icon: <Wallet className="w-4 h-4" />,
      color: "#6AA3E0",
      details: [
        "WalletConnect v2 pairing with 5-minute proposal TTL",
        "Session persists across page reloads via localStorage",
        "Account ID validated as Hedera mainnet format (0.0.XXXXX)",
        "Wallet balance & NFT holdings pre-fetched on connect",
      ],
      techNote: "hedera:mainnet chain ID — relay.walletconnect.com",
    },
    {
      title: "BATTLE SELECTION",
      description: "The voter browses active events and their bracket matchups. Only battles with status 'voting_open' display the voting interface.",
      icon: <Swords className="w-4 h-4" />,
      color: "#4274B9",
      details: [
        "Events contain brackets of 2-12 seeded athletes",
        "Brackets auto-generate matchups based on seed order",
        "Battle status flow: DRAFT > UPCOMING > VOTING OPEN > VOTING CLOSED > WINNER DECLARED > REWARDS DISTRIBUTED",
        "Forward-only status transitions enforced server-side — no rollbacks",
      ],
      techNote: "Status validated in POST /vote/battle: battle.status must === 'voting_open'",
    },
    {
      title: "ATHLETE SELECTION",
      description: "The voter selects which athlete they believe will win. Each battle is a 1v1 matchup between two seeded calisthenics athletes.",
      icon: <Users className="w-4 h-4" />,
      color: "#D4A843",
      details: [
        "Athletes displayed with skill radar (5 categories), composite score, and social links",
        "Server validates athleteId matches battle.athlete1Id or battle.athlete2Id",
        "Vote updates reverse old tallies before applying new ones (switch-athlete flow)",
        "Athlete totalVotes & tokensStaked counters updated atomically on each vote",
      ],
    },
    {
      title: "TOKEN STAKE ALLOCATION",
      description: "The voter sets their BOTB token stake amount. Tokens are allocated per-event scope — you can split your balance across multiple battles within the same event.",
      icon: <Coins className="w-4 h-4" />,
      color: "#22C55E",
      details: [
        "Event-scoped allocation: server iterates all battles in the same eventId to compute tokens already allocated",
        "Balance verified against Hedera Mirror Node via /api/v1/accounts/{wallet}/tokens",
        "Pre-launch hard cap: stakeAmount forced to 0 when BOTB_TOKEN_ID is null (token not yet deployed)",
        "Available = Mirror Node Balance - Tokens Already Allocated in This Event",
      ],
      techNote: "Math.max(0, Math.floor(stakeAmount)) — integer-only, non-negative stakes",
    },
    {
      title: "VOTE MESSAGE CONSTRUCTION",
      description: "The frontend constructs a deterministic vote message containing battleId, athleteId, wallet, stakeAmount, and a cryptographically random nonce.",
      icon: <FileText className="w-4 h-4" />,
      color: "#8B5CF6",
      details: [
        "Nonce generated via crypto.getRandomValues(new Uint8Array(32)) — not Math.random()",
        "Message string includes all vote parameters for server-side tamper detection",
        "Server validates: signedMessage.includes(battleId) && includes(athleteId) && includes(nonce)",
        "Any mismatch = rejected with 400 'Possible tampering'",
      ],
      techNote: "crypto.getRandomValues() → hex-encoded 32-byte nonce",
    },
    {
      title: "ED25519 WALLET SIGNATURE",
      description: "HashPack prompts the voter to sign the vote message with their wallet's ED25519 private key. This produces a digital signature proving ownership and intent.",
      icon: <Fingerprint className="w-4 h-4" />,
      color: "#EC4899",
      details: [
        "hedera_signMessage sent via WalletConnect relay to HashPack",
        "User approves in HashPack — no redirect or deep-link needed",
        "Signature returned as hex-encoded byte array via relay callback",
        "Proves wallet ownership + vote intent in a single cryptographic operation",
      ],
      techNote: "ED25519 curve — same algorithm as Hedera's native account key pairs",
    },
    {
      title: "SERVER VALIDATION CHAIN",
      description: "The server executes an 8-gate security chain. Every gate must pass or the vote is rejected. Fail-closed architecture — no partial processing.",
      icon: <Shield className="w-4 h-4" />,
      color: "#EF4444",
      details: [
        "Gate 1: Input format validation (battleId, wallet, athleteId, signature, signedMessage, nonce all required)",
        "Gate 2: Rate limiting — 10 votes/min/wallet via dual-layer checkRateLimit() (in-memory + KV-backed), 120 req/min global",
        "Gate 3: Hedera Mirror Node wallet existence check via /api/v1/accounts/{wallet}",
        "Gate 4: Signed message content must include battleId, athleteId, and nonce",
        "Gate 5: ED25519 cryptographic signature verification — fetches public key from Mirror Node, verifies via Web Crypto API",
        "Gate 6: Nonce replay protection — KV lookup at vote-nonce:{nonce}, reject if already used",
        "Gate 7: Battle status must be 'voting_open' (admin controls voting open/close manually)",
        "Gate 8: athleteId must match battle.athlete1Id or battle.athlete2Id",
      ],
      techNote: "Web Crypto: importKey('raw', pubKey, 'Ed25519') then crypto.subtle.verify()",
    },
    {
      title: "NFT POWER MULTIPLIER",
      description: "Server-side NFT holdings check against Hedera Mirror Node. Governor NFT (0.0.9338241) and Sigma Series NFTs grant voting power multipliers that stack.",
      icon: <Crown className="w-4 h-4" />,
      color: "#D4A843",
      details: [
        "Governor NFT (100 fixed supply): 2.0x voting power multiplier",
        "Sigma Series NFT (1,200 limited supply): 1.5x voting power multiplier",
        "Both NFTs held: 3.0x stacked multiplier (computeServerVotingPower returns 3)",
        "No NFTs: 1.0x base power — every wallet's vote counts",
        "Mirror Node pagination handles wallets with 100+ tokens (MAX_PAGES safeguard)",
        "10-second AbortSignal.timeout on all Mirror Node NFT calls",
      ],
      techNote: "fetchNFTHoldings() → /api/v1/accounts/{id}/nfts with pagination + timeout",
    },
    {
      title: "WEIGHTED VOTE CALCULATION",
      description: "The final vote weight is computed: stakeAmount x votingPower = weightedVote. This value determines the voter's proportional share of the reward pool.",
      icon: <Scale className="w-4 h-4" />,
      color: "#F59E0B",
      details: [
        "weightedVote = requestedStake x NFT power multiplier (1x, 1.5x, 2x, or 3x)",
        "Both headcount tallies (votes1Count/votes2Count) and weighted tallies (votes1Weighted/votes2Weighted) maintained",
        "Vote updates: old weighted amount subtracted from battle tallies before new amount added",
        "Pre-launch (BOTB_TOKEN_ID null): stake forced to 0, but headcount votes still recorded",
      ],
      techNote: "Dual tally system: headcount for social proof, weighted for proportional rewards",
    },
    {
      title: "PERSIST, TALLY & NONCE BURN",
      description: "The vote record is persisted to KV store, battle tallies are atomically updated, athlete counters incremented, and the nonce is permanently burned to prevent replay.",
      icon: <Database className="w-4 h-4" />,
      color: "#10B981",
      details: [
        "Vote record stored at key: vote:battle:{battleId}:{wallet}",
        "Battle object updated in-place: votes1Count, votes1Weighted, votes2Count, votes2Weighted",
        "Athlete totalVotes & tokensStaked counters incremented (or adjusted for vote-switch)",
        "Nonce burned at key: vote-nonce:{nonce} with { used: true, wallet, battleId, timestamp }",
        "Server console logs: wallet, athlete, battle, stake, multiplier, ED25519 verified status",
      ],
      techNote: "4 KV writes per vote: vote record + battle tally + athlete stats + nonce burn",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <ImageWithFallback src={IMG_CALISTHENICS} alt="Calisthenics Athlete" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#4274B9]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SectionBadge number="01" label="Section One" color="#4274B9" />
          <h2 className="text-[#E8ECF0] text-xl md:text-2xl font-black tracking-tight" style={orbitron}>
            BATTLE VOTING ARCHITECTURE
          </h2>
          <p className="text-[#6AA3E0] text-xs mt-1 max-w-lg" style={dmSans}>
            End-to-end 10-step cryptographically verified vote flow — from wallet connect to nonce burn
          </p>
        </div>
      </div>

      {/* Security Summary Bar */}
      <GlassCard className="p-3" glow="#EF4444">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-[#EF4444]" />
          <span className="text-[#EF4444] text-[0.6rem] font-bold tracking-widest" style={orbitron}>8-GATE SECURITY CHAIN</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["ED25519 Sig Verify", "Mirror Node Wallet Check", "Nonce Replay Guard", "Rate Limiting (10/min)", "Input Sanitization", "Forward-Only Status", "Admin Vote Control", "Athlete ID Validation"].map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full text-[0.55rem] font-medium border"
              style={{ ...dmSans, background: "#EF444408", borderColor: "#EF444420", color: "#EF4444" }}
            >
              {s}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* 10 Steps */}
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i}>
            <StepCard step={i + 1} {...s} />
            {i < steps.length - 1 && <FlowConnector color={steps[i + 1].color} />}
          </div>
        ))}
      </div>

      {/* NFT Multiplier Showcase */}
      <GlassCard className="p-5" glow="#D4A843">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-[#D4A843]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>NFT POWER MULTIPLIER MATRIX</h3>
        </div>
        <div className="relative h-32 md:h-40 rounded-xl overflow-hidden mb-4">
          <ImageWithFallback src={IMG_RINGS} alt="Athletic Training" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/90 via-[#0B1120]/60 to-[#0B1120]/90" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#D4A843] text-lg md:text-xl font-black tracking-wider" style={orbitron}>
              STAKE x POWER = INFLUENCE
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MultiplierCard nft="BASE VOTER" multiplier="1.0x" color="#8494A7" desc="No NFT required" />
          <MultiplierCard nft="SIGMA SERIES" multiplier="1.5x" color="#7C5CDB" desc="1,200 limited supply" />
          <MultiplierCard nft="GOVERNOR NFT" multiplier="2.0x" color="#D4A843" desc="100 fixed supply" />
          <MultiplierCard nft="GOV + SIGMA" multiplier="3.0x" color="#22C55E" desc="Stacked maximum power" />
        </div>
        <div className="mt-3 px-3 py-2 rounded-lg bg-[#0B1120] border border-[#4274B9]/10">
          <p className="text-[#8494A7] text-[0.6rem] text-center" style={dmSans}>
            Governor NFT: <span className="text-[#D4A843] font-mono">0.0.9338241</span> on Hedera Mainnet | Server function: <span className="text-[#6AA3E0] font-mono">computeServerVotingPower(hasGov, hasSig)</span>
          </p>
        </div>
      </GlassCard>

      {/* Reward Cycle */}
      <GlassCard className="p-5" glow="#22C55E">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>REWARD DISTRIBUTION CYCLE</h3>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[0.6rem]">
          {[
            { label: "Winner Declared", color: "#D4A843", icon: <Trophy className="w-3 h-3" /> },
            { label: "Snapshot Auto-Generated", color: "#4274B9", icon: <CameraIcon className="w-3 h-3" /> },
            { label: "CSV Export", color: "#6AA3E0", icon: <FileText className="w-3 h-3" /> },
            { label: "Airdrop Script", color: "#22C55E", icon: <Coins className="w-3 h-3" /> },
            { label: "Tokens Distributed", color: "#10B981", icon: <CheckCircle className="w-3 h-3" /> },
          ].map((item, i, arr) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold"
                style={{ ...orbitron, background: `${item.color}10`, borderColor: `${item.color}30`, color: item.color }}
              >
                {item.icon} {item.label}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[#8494A7]" />}
            </span>
          ))}
        </div>
        <p className="text-[#8494A7] text-[0.6rem] mt-3 text-center" style={dmSans}>
          Reward share = (voter's weightedVote / total winning-side weighted votes) x battle reward pool
        </p>
      </GlassCard>

      {/* Composite Score Formula */}
      <GlassCard className="p-5" glow="#4274B9">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-[#4274B9]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>ATHLETE COMPOSITE SCORE FORMULA</h3>
        </div>
        <div className="bg-[#0B1120] rounded-xl p-4 border border-[#4274B9]/10 font-mono text-xs text-[#6AA3E0]">
          <p className="mb-1"><span className="text-[#8494A7]">compositeScore =</span></p>
          <p className="pl-4">(wins x <span className="text-[#D4A843]">10</span>) +</p>
          <p className="pl-4">(winRate x <span className="text-[#D4A843]">20</span>) +</p>
          <p className="pl-4">(totalPowerRating x <span className="text-[#D4A843]">2</span>) +</p>
          <p className="pl-4">(streak x <span className="text-[#D4A843]">3</span>) +</p>
          <p className="pl-4">(totalVotes x <span className="text-[#D4A843]">0.5</span>)</p>
        </div>
        <p className="text-[#8494A7] text-[0.6rem] mt-2 text-center" style={dmSans}>
          Source: GET /leaderboard/athletes — totalVotes is incremented by battle votes, creating a direct link between community participation and athlete ranking.
        </p>
      </GlassCard>
    </div>
  );
}

// ===========================================================================
// SECTION 2 — DAO GOVERNANCE
// Data sourced from POST /vote/proposal, whitepaper sections 11-12 (skill votes removed — admin-only)
// ===========================================================================
function Section2_DAOGovernance() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <ImageWithFallback src={IMG_GOVERNANCE} alt="Governance" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SectionBadge number="02" label="Section Two" color="#8B5CF6" />
          <h2 className="text-[#E8ECF0] text-xl md:text-2xl font-black tracking-tight" style={orbitron}>
            DAO GOVERNANCE & PROPOSALS
          </h2>
          <p className="text-[#8B5CF6] text-xs mt-1 max-w-lg" style={dmSans}>
            Community-driven decision-making with token-weighted Governor voting
          </p>
        </div>
      </div>

      {/* Proposal Lifecycle */}
      <GlassCard className="p-5" glow="#8B5CF6">
        <div className="flex items-center gap-2 mb-4">
          <Vote className="w-5 h-5 text-[#8B5CF6]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>PROPOSAL LIFECYCLE</h3>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[0.6rem] mb-4">
          {[
            { label: "DRAFT", color: "#8494A7" },
            { label: "ACTIVE", color: "#22C55E" },
            { label: "VOTING OPEN", color: "#4274B9" },
            { label: "VOTING CLOSED", color: "#F59E0B" },
            { label: "PASSED", color: "#22C55E" },
            { label: "REJECTED", color: "#EF4444" },
          ].map((s, i, arr) => (
            <span key={s.label} className="flex items-center gap-1">
              <span
                className="px-2.5 py-1 rounded-lg border font-semibold"
                style={{ ...orbitron, background: `${s.color}10`, borderColor: `${s.color}30`, color: s.color }}
              >
                {s.label}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[#8494A7]" />}
            </span>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-[#0B1120] border border-[#8B5CF6]/10">
            <h4 className="text-[#8B5CF6] text-[0.65rem] font-bold mb-2" style={orbitron}>ADMIN CREATES PROPOSAL</h4>
            <ul className="space-y-1.5 text-[0.65rem] text-[#8494A7]" style={dmSans}>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#8B5CF6] mt-0.5 shrink-0" /> Title, description, and proposal type defined by admin</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#8B5CF6] mt-0.5 shrink-0" /> Voting window set with start and end dates</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#8B5CF6] mt-0.5 shrink-0" /> Requires admin session with ED25519 challenge-sign + 20-min token</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#8B5CF6] mt-0.5 shrink-0" /> Forward-only status transitions enforced server-side</li>
            </ul>
          </div>
          <div className="rounded-xl p-3 bg-[#0B1120] border border-[#D4A843]/10">
            <h4 className="text-[#D4A843] text-[0.65rem] font-bold mb-2" style={orbitron}>COMMUNITY VOTES (POST /vote/proposal)</h4>
            <ul className="space-y-1.5 text-[0.65rem] text-[#8494A7]" style={dmSans}>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4A843] mt-0.5 shrink-0" /> Same ED25519 signature verification chain as battle votes</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4A843] mt-0.5 shrink-0" /> Token-weighted: BOTB stake x NFT multiplier</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4A843] mt-0.5 shrink-0" /> Rate limited: 10 proposal votes per minute per wallet</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-[#D4A843] mt-0.5 shrink-0" /> Nonce replay protection — each vote unique, nonce burned after use</li>
            </ul>
          </div>
        </div>
      </GlassCard>

      {/* Skill Rating System — Admin-Only with Governor Proposal Path */}
      <GlassCard className="p-5" glow="#D4A843">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-[#D4A843]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>SKILL RATING SYSTEM (ADMIN-SET)</h3>
        </div>
        <p className="text-[#8494A7] text-xs mb-3" style={dmSans}>
          Athlete skill ratings are set exclusively by WCO administrators based on official judging criteria and real competition performance. These ratings feed the totalPowerRating used in the composite score formula that powers the leaderboard.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {["Power Dynamics", "Combinations & Flow", "Statics", "Offense & Defense", "Dynamics"].map((skill) => (
            <div key={skill} className="rounded-lg p-2 text-center bg-[#D4A843]/5 border border-[#D4A843]/15">
              <p className="text-[#D4A843] text-[0.6rem] font-bold" style={orbitron}>{skill.toUpperCase()}</p>
              <p className="text-[#8494A7] text-[0.55rem] mt-0.5">0-10 scale</p>
            </div>
          ))}
        </div>
        <div className="mt-3 px-3 py-2 rounded-lg bg-[#D4A843]/5 border border-[#D4A843]/10">
          <p className="text-[0.6rem] text-[#D4A843]/80 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span style={dmSans}>Governor proposal path: Governors who believe a skill rating should change submit a governance proposal. If approved by the community vote, the WCO admin implements the adjustment.</span>
          </p>
        </div>
      </GlassCard>

      {/* Governor Powers Summary */}
      <GlassCard className="p-5" glow="#f59e0b">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-[#f59e0b]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>WCO GOVERNOR POWERS (100 Fixed Supply)</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            "2x voting power multiplier on all battle votes and governance proposals",
            "Governors Hub access — exclusive dashboard for governance and admin features",
            "Skill rating authority — rate athletes across 5 categories",
            "Governance voting — propose and vote on platform governance decisions",
            "Governor Control Supply allocation — 500M BOTB (16.67%) directed by Governor vote",
            "Participation-based DeFi Rewards — 300M BOTB (10%) earned through active engagement over 3 years",
          ].map((power, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[0.65rem] text-[#8494A7] bg-[#0B1120] rounded-lg p-2 border border-[#f59e0b]/10" style={dmSans}>
              <CheckCircle className="w-3 h-3 text-[#f59e0b] mt-0.5 shrink-0" />
              <span>{power}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Hedera Banner */}
      <div className="relative rounded-2xl overflow-hidden h-36">
        <ImageWithFallback src={IMG_ARENA} alt="Arena" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/80 to-[#0B1120]/40 flex items-center px-6">
          <div>
            <p className="text-[#6AA3E0] text-[0.6rem] tracking-widest mb-1" style={orbitron}>POWERED BY</p>
            <p className="text-[#E8ECF0] text-lg font-black" style={orbitron}>HEDERA HASHGRAPH</p>
            <p className="text-[#8494A7] text-xs mt-1" style={dmSans}>Enterprise-grade DLT — 10,000+ TPS, $0.0001 fees, carbon negative</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// SECTION 3 — TOKENOMICS (100% from whitepaper section 9)
// ===========================================================================
function Section3_Tokenomics() {
  // Real allocation data from whitepaper section 9.2
  // 50% Liquidity Pool + 50% Ecosystem (6 pools)
  // Math: 1500M + 500M + 300M + 300M + 200M + 100M + 100M = 3,000,000,000
  const pools = [
    { name: "Liquidity Pool", pct: "50%", amount: "1,500,000,000", color: "#6AA3E0", desc: "Paired with 50,000 HBAR on SaucerSwap DEX to establish initial trading liquidity." },
    { name: "Gov Control Supply", pct: "16.67%", amount: "500,000,000", color: "#f59e0b", desc: "100M unlocked at launch; 400M vested monthly over 5 years (~6.67M/month). Allocation to LP pools, DeFi, and Only Gains directed by Governor NFT holder votes." },
    { name: "Governors Rewards", pct: "10%", amount: "300,000,000", color: "#D4A843", desc: "Earned over 3 years through active participation: DeFi boosters via playing on-platform, staking NFTs with Ivyfy, and providing liquidity. Not airdrops — rewards require engagement." },
    { name: "Staking Rewards", pct: "10%", amount: "300,000,000", color: "#10b981", desc: "Released over 3 years (~100M/year) on the Ivy staking platform. 10-20% APY target." },
    { name: "LP Rewards", pct: "6.67%", amount: "200,000,000", color: "#7C5CDB", desc: "Distributed over 3 years (~66M/year) to BOTB/HBAR liquidity providers on SaucerSwap." },
    { name: "Sigma Rewards", pct: "3.33%", amount: "100,000,000", color: "#EC4899", desc: "Event-based distribution tied to battle outcomes and voting participation. No fixed schedule." },
    { name: "Treasury Reserve", pct: "3.33%", amount: "100,000,000", color: "#8494A7", desc: "Fully locked for 3 years. After lockup, released at ~33M/year for active ecosystem contributors." },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
        <ImageWithFallback src={IMG_BLOCKCHAIN} alt="Blockchain" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <SectionBadge number="03" label="Section Three" color="#22C55E" />
          <h2 className="text-[#E8ECF0] text-xl md:text-2xl font-black tracking-tight" style={orbitron}>
            TOKENOMICS — BOTB TOKEN
          </h2>
          <p className="text-[#22C55E] text-xs mt-1 max-w-lg" style={dmSans}>
            3 billion fixed supply on Hedera Token Service (HTS) — 50% liquidity, 50% ecosystem across 6 pools
          </p>
        </div>
      </div>

      {/* Token Overview */}
      <GlassCard className="p-5" glow="#D4A843">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-[#8494A7] text-[0.6rem] tracking-widest mb-1" style={orbitron}>TOTAL FIXED SUPPLY</p>
            <p className="text-3xl md:text-4xl font-black text-[#D4A843]" style={orbitron}>3,000,000,000</p>
            <p className="text-[#6AA3E0] text-sm mt-1 font-semibold" style={orbitron}>BOTB TOKENS</p>
          </div>
          <div className="space-y-2">
            {[
              { label: "Network", value: "Hedera Token Service (HTS)" },
              { label: "Supply Type", value: "Immutable — no admin keys, no mint capability" },
              { label: "Initial DEX", value: "SaucerSwap (1.5B BOTB + 50,000 HBAR)" },
              { label: "Staking Platform", value: "Ivy — 300M over 3 years, 10-20% APY" },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-2 text-[0.6rem]">
                <span className="text-[#8494A7] shrink-0 w-24" style={orbitron}>{row.label}:</span>
                <span className="text-[#E8ECF0]" style={dmSans}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* 50/50 Split Visual */}
      <GlassCard className="p-5" glow="#4274B9">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-[#4274B9]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>SUPPLY ALLOCATION: 50/50 SPLIT</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center bg-[#6AA3E0]/5 border border-[#6AA3E0]/20">
            <p className="text-2xl font-black text-[#6AA3E0]" style={orbitron}>50%</p>
            <p className="text-[#E8ECF0] text-xs font-bold mt-1" style={orbitron}>LIQUIDITY POOL</p>
            <p className="text-[#8494A7] text-[0.55rem] mt-1" style={dmSans}>1.5B BOTB paired with 50,000 HBAR on SaucerSwap</p>
          </div>
          <div className="rounded-xl p-3 text-center bg-[#f59e0b]/5 border border-[#f59e0b]/20">
            <p className="text-2xl font-black text-[#f59e0b]" style={orbitron}>50%</p>
            <p className="text-[#E8ECF0] text-xs font-bold mt-1" style={orbitron}>ECOSYSTEM</p>
            <p className="text-[#8494A7] text-[0.55rem] mt-1" style={dmSans}>6 functional pools: Gov Control, Gov Rewards, Staking, LP, Sigma, Treasury</p>
          </div>
        </div>
      </GlassCard>

      {/* 7 Pools */}
      <GlassCard className="p-5" glow="#4274B9">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#4274B9]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>7 ALLOCATION POOLS</h3>
        </div>
        <div className="space-y-2">
          {pools.map((pool) => (
            <div key={pool.name} className="rounded-xl p-3 bg-[#0B1120] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: pool.color }} />
                  <span className="text-[#E8ECF0] text-xs font-bold" style={orbitron}>{pool.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8494A7] text-[0.6rem] font-mono">{pool.amount}</span>
                  <span className="text-xs font-black" style={{ ...orbitron, color: pool.color }}>{pool.pct}</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-[#162033] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${pool.color}80, ${pool.color})` }}
                  initial={{ width: 0 }}
                  whileInView={{ width: pool.pct }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[#8494A7] text-[0.55rem] mt-1" style={dmSans}>{pool.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 px-3 py-2 rounded-lg bg-[#4274B9]/5 border border-[#4274B9]/10">
          <p className="text-[0.6rem] text-[#6AA3E0]/70 text-center" style={dmSans}>
            <span className="font-bold">Math verification:</span> 1,500M (LP) + 500M (Gov Control) + 300M (Gov Rewards) + 300M (Staking) + 200M (LP Rewards) + 100M (Sigma) + 100M (Treasury) = 3,000,000,000
          </p>
        </div>
      </GlassCard>

      {/* Vesting Schedule */}
      <GlassCard className="p-5" glow="#f59e0b">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-5 h-5 text-[#f59e0b]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>VESTING SCHEDULE</h3>
        </div>
        <div className="space-y-2">
          {[
            { pool: "Gov Control (500M)", schedule: "100M unlocked at launch; 400M vested monthly over 5 years (~6.67M/month). Governed by Governor NFT holder votes.", color: "#f59e0b" },
            { pool: "Governors Rewards (300M)", schedule: "Earned over 3 years through active participation: playing on-platform, staking NFTs with Ivyfy, providing liquidity. Rewards require engagement — not airdrops.", color: "#D4A843" },
            { pool: "Staking Rewards (300M)", schedule: "Released over 3 years (~100M/year) on the Ivy staking platform. 10-20% APY target.", color: "#10b981" },
            { pool: "LP Rewards (200M)", schedule: "Released over 3 years (~66M/year) to SaucerSwap BOTB/HBAR liquidity providers.", color: "#7C5CDB" },
            { pool: "Sigma Rewards (100M)", schedule: "Event-based distribution tied to battle outcomes and voting participation. No fixed schedule.", color: "#EC4899" },
            { pool: "Treasury (100M)", schedule: "Fully locked for 3 years. After lockup, released at ~33M/year for active ecosystem contributors.", color: "#8494A7" },
          ].map((v) => (
            <div key={v.pool} className="rounded-lg p-2.5 bg-[#0B1120] border border-white/[0.04]">
              <p className="text-[0.65rem] font-bold mb-0.5" style={{ ...orbitron, color: v.color }}>{v.pool}</p>
              <p className="text-[#8494A7] text-[0.6rem]" style={dmSans}>{v.schedule}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Demand Drivers — Only Gains Mechanics */}
      <GlassCard className="p-5" glow="#22C55E">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-[#22C55E]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>DEMAND DRIVERS — ONLY GAINS</h3>
        </div>
        <div className="relative h-32 rounded-xl overflow-hidden mb-4">
          <ImageWithFallback src={IMG_WORKOUT} alt="Calisthenics Competition" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/90 to-[#0B1120]/50 flex items-center px-5">
            <div>
              <p className="text-[#22C55E] text-xs font-bold" style={orbitron}>VALUE ACCRUES THROUGH PARTICIPATION</p>
              <p className="text-[#8494A7] text-[0.65rem] mt-1 max-w-sm" style={dmSans}>
                Every vote, every stake, every battle strengthens the protocol.
              </p>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            {
              title: "VOTE STAKING",
              color: "#4274B9",
              icon: <Vote className="w-4 h-4" />,
              desc: "Users must stake BOTB tokens to vote in battles, creating consistent buy pressure and reducing circulating supply during active competition periods.",
            },
            {
              title: "COMPETITION REWARDS",
              color: "#22C55E",
              icon: <Trophy className="w-4 h-4" />,
              desc: "Winning voters receive token rewards proportional to their weighted stake, incentivizing ongoing participation and correct picks.",
            },
            {
              title: "DeFi BOOSTERS",
              color: "#D4A843",
              icon: <Crown className="w-4 h-4" />,
              desc: "Governor holders earn token rewards through active participation: playing on-platform, staking NFTs with Ivyfy, and providing liquidity. Incentivizes Governor NFT acquisition.",
            },
            {
              title: "EVENT PASSES",
              color: "#EC4899",
              icon: <Star className="w-4 h-4" />,
              desc: "BOTB tokens will be usable for premium IRL competition event access, bridging on-chain and real-world utility.",
            },
            {
              title: "LIQUIDITY PROVISION",
              color: "#7C5CDB",
              icon: <Layers className="w-4 h-4" />,
              desc: "200M LP Rewards distributed over 3 years to SaucerSwap BOTB/HBAR providers, driving deep liquidity and token accessibility.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl p-3 bg-[#0B1120] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span style={{ color: card.color }}>{card.icon}</span>
                <h4 className="text-[0.6rem] font-bold" style={{ ...orbitron, color: card.color }}>{card.title}</h4>
              </div>
              <p className="text-[0.6rem] text-[#8494A7]" style={dmSans}>{card.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* NFT Ecosystem Overview */}
      <GlassCard className="p-5" glow="#D4A843">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-[#D4A843]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>NFT ECOSYSTEM — 3 COLLECTIONS</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-xl p-3 bg-[#0B1120] border border-[#f59e0b]/15">
            <p className="text-[#f59e0b] text-[0.6rem] font-bold" style={orbitron}>WCO GOVERNORS</p>
            <p className="text-[#E8ECF0] text-lg font-black mt-1" style={orbitron}>100</p>
            <p className="text-[#8494A7] text-[0.55rem]">Fixed Supply | Legendary</p>
            <p className="text-[#f59e0b] text-[0.55rem] font-mono mt-1">0.0.9338241</p>
            <p className="text-[#8494A7] text-[0.5rem] mt-1" style={dmSans}>2x voting power, governance authority, skill rating, DeFi rewards</p>
          </div>
          <div className="rounded-xl p-3 bg-[#0B1120] border border-[#7C5CDB]/15">
            <p className="text-[#7C5CDB] text-[0.6rem] font-bold" style={orbitron}>SIGMA SERIES</p>
            <p className="text-[#E8ECF0] text-lg font-black mt-1" style={orbitron}>1,200</p>
            <p className="text-[#8494A7] text-[0.55rem]">Limited Supply | Epic</p>
            <p className="text-[#7C5CDB] text-[0.55rem] mt-1">Athlete Cards</p>
            <p className="text-[#8494A7] text-[0.5rem] mt-1" style={dmSans}>1.5x voting power, athlete-specific rewards, stackable with Governor (3x)</p>
          </div>
          <div className="rounded-xl p-3 bg-[#0B1120] border border-[#10b981]/15">
            <p className="text-[#10b981] text-[0.6rem] font-bold" style={orbitron}>META SERIES</p>
            <p className="text-[#E8ECF0] text-lg font-black mt-1" style={orbitron}>Unlimited</p>
            <p className="text-[#8494A7] text-[0.55rem]">Mint on Demand | Q2-Q3 2026</p>
            <p className="text-[#10b981] text-[0.55rem] mt-1">Influencer H2H</p>
            <p className="text-[#8494A7] text-[0.5rem] mt-1" style={dmSans}>Social media x athletic competition bridge, minted during active events</p>
          </div>
        </div>
      </GlassCard>

      {/* Infrastructure */}
      <GlassCard className="p-5" glow="#6AA3E0">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-5 h-5 text-[#6AA3E0]" />
          <h3 className="text-[#E8ECF0] text-sm font-bold" style={orbitron}>INFRASTRUCTURE</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { label: "Initial DEX", value: "SaucerSwap — 1.5B BOTB paired with 50,000 HBAR", color: "#6AA3E0" },
            { label: "Staking Platform", value: "Ivy — 300M allocation over 3 years, 10-20% APY", color: "#10b981" },
            { label: "Early Voting", value: "hashgraph.vote — Pre-competition community voting", color: "#4274B9" },
            { label: "Secondary Voting", value: "Up Layer 2 (coming soon) — IRL event voting and rewards", color: "#8B5CF6" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg p-2.5 bg-[#0B1120] border border-white/[0.04] flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
              <div>
                <p className="text-[0.6rem] font-bold" style={{ ...orbitron, color: item.color }}>{item.label}</p>
                <p className="text-[#8494A7] text-[0.55rem]" style={dmSans}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Trophy Banner */}
      <div className="relative rounded-2xl overflow-hidden h-36">
        <ImageWithFallback src={IMG_TROPHY} alt="Championship" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120]/90 to-[#0B1120]/50 flex items-center px-6">
          <div>
            <p className="text-[#D4A843] text-sm font-black" style={orbitron}>WORLD CALISTHENICS ORGANIZATION</p>
            <p className="text-[#8494A7] text-xs mt-1" style={dmSans}>
              The future of competitive calisthenics — decentralized, transparent, community-owned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// SILVER ENVELOPE BUTTON — exact replica of GoldenEnvelopeButton but silver
// ===========================================================================
export function SilverEnvelopeButton({ onClick }: { onClick: () => void }) {
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
          background: "radial-gradient(ellipse at center, rgba(192,192,192,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Envelope shape */}
      <div className="relative">
        {/* Main envelope body */}
        <div
          className="relative w-[200px] h-[140px] rounded-xl overflow-hidden border-2 transition-all duration-500"
          style={{
            borderColor: isHovered ? "#C0C0C0" : "#C0C0C0aa",
            background: "linear-gradient(135deg, #1a1a22 0%, #0B1120 40%, #1a1a22 100%)",
            boxShadow: isHovered
              ? "0 0 30px rgba(192,192,192,0.3), 0 0 60px rgba(192,192,192,0.1), inset 0 0 20px rgba(192,192,192,0.05)"
              : "0 0 15px rgba(192,192,192,0.1), inset 0 0 10px rgba(192,192,192,0.03)",
          }}
        >
          {/* Envelope flap (triangle) */}
          <div className="absolute top-0 left-0 right-0">
            <svg viewBox="0 0 200 60" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="silverFlapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C0C0C0" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#E8E8E8" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#C0C0C0" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <polygon points="0,0 200,0 100,55" fill="url(#silverFlapGrad)" />
              <polygon
                points="0,0 200,0 100,55"
                fill="none"
                stroke="#C0C0C0"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            </svg>
          </div>

          {/* Diagonal fold lines */}
          <svg viewBox="0 0 200 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="140" x2="100" y2="55" stroke="#C0C0C0" strokeWidth="0.5" strokeOpacity="0.2" />
            <line x1="200" y1="140" x2="100" y2="55" stroke="#C0C0C0" strokeWidth="0.5" strokeOpacity="0.2" />
          </svg>

          {/* Wax seal — silver */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-[38px] w-10 h-10 rounded-full flex items-center justify-center z-10"
            animate={isHovered ? { rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.6 }}
            style={{
              background: "radial-gradient(circle at 40% 35%, #E8E8E8, #C0C0C0 40%, #808080 90%)",
              boxShadow: "0 2px 8px rgba(192,192,192,0.4), inset 0 -1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <Cpu className="w-5 h-5 text-[#0B1120]" strokeWidth={2.5} />
          </motion.div>

          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            animate={isHovered ? { x: ["-100%", "200%"] } : { x: "-100%" }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(192,192,192,0.08) 45%, rgba(192,192,192,0.15) 50%, rgba(192,192,192,0.08) 55%, transparent 60%)",
              width: "100%",
            }}
          />

          {/* Text */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
            <p
              className="text-[#C0C0C0] text-[0.55rem] font-bold tracking-[0.15em] leading-tight"
              style={orbitron}
            >
              ARCHITECTURE
            </p>
            <p
              className="text-[#C0C0C0] text-[0.7rem] font-bold tracking-[0.2em] mt-0.5"
              style={orbitron}
            >
              BLUEPRINT
            </p>
          </div>
        </div>

        {/* Floating particles */}
        {isHovered && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-[#C0C0C0]"
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
        className="text-[#8494A7] text-[0.5rem] text-center mt-2 tracking-wide transition-colors group-hover:text-[#C0C0C0]/70"
        style={dmSans}
      >
        Voting system deep-dive
      </motion.p>
    </motion.button>
  );
}

// ===========================================================================
// MAIN BLUEPRINT MODAL
// ===========================================================================
export function VotingArchitectureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentSection, setCurrentSection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sections = [
    { label: "Battle Voting", color: "#4274B9", icon: <Swords className="w-3.5 h-3.5" /> },
    { label: "DAO Governance", color: "#8B5CF6", icon: <Vote className="w-3.5 h-3.5" /> },
    { label: "Tokenomics", color: "#22C55E", icon: <Coins className="w-3.5 h-3.5" /> },
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
              boxShadow: "0 0 80px rgba(66,116,185,0.1), 0 0 160px rgba(66,116,185,0.05)",
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
                  <div className="w-px h-7 bg-[#4274B9]/20" />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #4274B915, #6AA3E015)",
                      border: "1px solid #4274B920",
                    }}
                  >
                    <Cpu className="w-5 h-5 text-[#4274B9]" />
                  </div>
                  <div>
                    <h2 className="text-[#E8ECF0] text-sm font-black tracking-tight" style={orbitron}>
                      VOTING ARCHITECTURE BLUEPRINT
                    </h2>
                    <p className="text-[#8494A7] text-[0.6rem]" style={dmSans}>
                      World Calisthenics Organization — Confidential Admin Document
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
                  {currentSection === 0 && <Section1_BattleVoting />}
                  {currentSection === 1 && <Section2_DAOGovernance />}
                  {currentSection === 2 && <Section3_Tokenomics />}
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
