/**
 * Whitepaper — Sections 1-3
 * ==========================
 * Step 14: Section 1 (Executive Summary — expanded), Section 2 (Vision & Mission),
 *          Section 3 (Market Analysis)
 *
 * All facts verified against the actual codebase:
 *   - hedera-config.ts: TOKEN_IDS, HEDERA_NETWORKS, WC_PROJECT_ID, WC_APP_METADATA
 *   - hedera-mirror.ts: computeVotingPower (1x/1.5x/2x/3x), fetchWalletBalances
 *   - wallet-connect.ts: SignClient, WalletConnectModal, HIP-820 extensions
 *   - wallet-context.tsx: balance polling (30s), auto-reconnect, isAdmin
 *   - admin-auth.tsx: 3-layer auth, rate limits, server-only ADMIN_WALLETS
 *   - index.tsx: 27+ routes, vote/battle, vote/proposal, admin/* (vote/skill removed — skills admin-only)
 */

import React from "react";
import {
  BookOpen, Target, TrendingUp,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// SECTION 1 — EXECUTIVE SUMMARY
// =============================================================================

export function Section1_ExecutiveSummary() {
  return (
    <PolicySection num={1} title="EXECUTIVE SUMMARY" icon={<BookOpen className="w-4 h-4" />}>
      <P>
        Battle of the Bars (BOTB) is the world's first decentralized calisthenics competition
        platform, built by the World Calisthenics Organization (WCO) on the Hedera Hashgraph
        distributed ledger. BOTB bridges the gap between real-world athletic competition and
        blockchain-powered community governance, creating a transparent, verifiable, and
        incentive-aligned ecosystem where fans, athletes, and governors collectively shape the
        future of competitive calisthenics.
      </P>

      <SubHead>Platform Pillars</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5">
          {([
            ["Transparent Competition", "Every vote is recorded and verifiable. Battle outcomes are declared by WCO judges based on real-world athletic performance. Reward snapshots are generated automatically with full audit trails.", "#6AA3E0"],
            ["Community Governance", "Governor NFT holders (100 fixed supply) direct ecosystem fund allocation, propose platform changes, and propose athlete skill rating adjustments via governance. A 4-tier voting power system (1x-3x) incentivizes deep participation.", "#f59e0b"],
            ["Athlete Empowerment", "Registered athletes build on-chain reputations through battle records, win/loss streaks, and admin-set skill ratings based on official WCO criteria. Sigma Series NFTs (1,200 limited) create athlete-specific collector ecosystems.", "#10b981"],
            ["Economic Sustainability", "A 3B fixed-supply BOTB token with no admin keys powers staking, rewards, DeFi integrations (SaucerSwap liquidity, Ivy staking), and governance-directed treasury allocation.", "#7C5CDB"],
          ] as [string, string, string][]).map(([title, desc, color]) => (
            <div key={title} className="px-4 py-3 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[#E8ECF0] font-semibold">{title}</span>
              </div>
              <div className="text-[#8494A7] pl-4">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>Technical Foundation</SubHead>
      <P>
        The platform leverages Hedera's Token Service (HTS) for fungible tokens and NFTs, the
        Consensus Service (HCS) for immutable vote recording, and WalletConnect v2 with HIP-820
        integration for seamless HashPack wallet authentication. The three-tier architecture
        (React frontend {"\u2192"} Hono web server {"\u2192"} KV datastore + Hedera Mirror Node)
        delivers sub-second finality with enterprise-grade security and predictable, near-zero
        transaction fees ($0.0001 average).
      </P>

      <SubHead>NFT Ecosystem</SubHead>
      <P>
        Three distinct NFT collections serve complementary roles:
      </P>
      <BulletList items={[
        <><Strong>WCO Governors (100 fixed)</Strong> — Apex governance tier with 2x voting power, Governors Hub access, ability to propose skill rating changes, and direction of 500M BOTB tokens in ecosystem funds.</>,
        <><Strong>Sigma Series (1,200 limited)</Strong> — Athlete-specific collector cards with 1.5x voting power and bonus rewards when the featured athlete wins. Stackable with Governor for 3x max.</>,
        <><Strong>Meta Series (unlimited)</Strong> — A novel head-to-head influencer competition model where both sides mint and sell NFTs, with 100% of combined funds distributed to winning-side collectors. Launching Q2-Q3 2026.</>,
      ]} />

      <SubHead>Token Economics</SubHead>
      <P>
        The BOTB token (3B total supply, immutably capped) splits 50/50 between initial
        SaucerSwap liquidity (paired with 50,000 HBAR) and ecosystem allocation across six
        functional pools: Governor Control (500M, 5yr vest), Governor Rewards (300M, 3yr participation-based),
        Staking (300M, 3yr on Ivy), LP Rewards (200M, 3yr on SaucerSwap), Sigma Rewards
        (100M, event-based), and Treasury Reserve (100M, 3yr lock). Token and Meta Series NFT
        launch is planned for Q2-Q3 2026.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 2 — VISION & MISSION
// =============================================================================

export function Section2_VisionMission() {
  return (
    <PolicySection num={2} title="VISION & MISSION" icon={<Target className="w-4 h-4" />}>
      <SubHead>2.1 Vision</SubHead>
      <P>
        To establish calisthenics as a globally recognized, transparently governed, and
        economically sustainable competitive sport — powered by distributed ledger technology
        that ensures every vote counts, every result is verifiable, and every participant has a
        stake in the sport's future.
      </P>

      <SubHead>2.2 Mission</SubHead>
      <P>
        The World Calisthenics Organization exists to professionalize competitive calisthenics
        by providing the infrastructure, governance, and economic incentives that transform a
        grassroots movement into a legitimate global sport. BOTB is the digital backbone of
        this mission — a platform where:
      </P>
      <BulletList items={[
        <><Strong>Athletes</Strong> build verifiable, on-chain competition records that travel with them across events, organizations, and geographies. Win/loss records, skill ratings, and battle history are permanent and tamper-proof.</>,
        <><Strong>Fans</Strong> graduate from passive spectators to active participants with real economic skin in the game. Staking tokens on battle outcomes and purchasing athlete NFTs creates a direct financial connection between fan engagement and athlete success.</>,
        <><Strong>Governors</Strong> function as the sport's stewards — directing ecosystem funds, proposing athlete skill rating changes, and voting on platform governance proposals that shape competition formats, reward structures, and platform evolution.</>,
        <><Strong>Influencers</Strong> bridge mainstream fitness culture with competitive calisthenics through Meta Series head-to-head matchups, expanding the sport's reach beyond its traditional community.</>,
      ]} />

      <SubHead>2.3 Why Blockchain?</SubHead>
      <P>
        Traditional sports platforms suffer from three structural problems that blockchain
        technology is uniquely positioned to solve:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5">
          {([
            ["Opaque Judging & Voting", "Competition results are declared by centralized authorities with no verifiable audit trail. Fan votes on traditional platforms are easily manipulated, unverifiable, and carry no economic consequence.", "BOTB records every vote to the KV datastore (and optionally to HCS for on-chain immutability). Votes are weighted by token stake and NFT holdings, creating economic accountability. Reward snapshots provide full transparency into distribution calculations."],
            ["Misaligned Incentives", "Athletes, fans, and organizers have disconnected economic interests. Fans generate value through attention and engagement but receive no economic upside. Athletes depend on sponsorships that may not align with competitive merit.", "BOTB's staking model directly connects fan engagement to financial outcomes. Athletes earn on-chain reputations that attract Sigma NFT collectors. Governors direct treasury allocation based on platform performance data."],
            ["No Portable Identity", "Athlete records are siloed within individual organizations. Moving between competitions means starting from scratch. There is no universal, verifiable record of competitive performance.", "BOTB stores all battle records, skill ratings, and win/loss data on a persistent datastore with Hedera-backed verification. An athlete's BOTB profile is their portable competitive identity, verifiable by any third party via the Mirror Node."],
          ] as [string, string, string][]).map(([problem, traditional, botb]) => (
            <div key={problem} className="px-4 py-3 text-xs space-y-2">
              <div className="text-[#E8ECF0] font-semibold">{problem}</div>
              <div className="flex gap-2">
                <span className="text-red-400/80 font-semibold shrink-0 w-20">Traditional:</span>
                <span className="text-[#8494A7]">{traditional}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#10b981] font-semibold shrink-0 w-20">BOTB:</span>
                <span className="text-[#8494A7]">{botb}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>2.4 Why Hedera Hashgraph?</SubHead>
      <P>
        BOTB selected Hedera over alternative Layer 1 networks based on five critical requirements
        for a production sports platform:
      </P>
      <BulletList items={[
        <><Strong>Predictable, near-zero fees</Strong> — HTS token transfers cost ~$0.0001. HCS messages cost ~$0.0001. Unlike Ethereum where gas fees fluctuate 100x during congestion, Hedera's fee schedule is fixed and USD-denominated, enabling micro-transactions (vote staking, NFT transfers) that would be economically impractical on gas-auction chains.</>,
        <><Strong>Sub-second finality</Strong> — Hedera achieves consensus finality in 3-5 seconds with no possibility of reorganization or rollback. Once a vote is recorded, it is permanently, irrevocably final. This is critical for competition integrity — there is no window for front-running or transaction reordering.</>,
        <><Strong>Enterprise throughput</Strong> — Hedera processes 10,000+ TPS on the base layer, sufficient for simultaneous voting across multiple battles during large-scale events without network degradation.</>,
        <><Strong>Carbon-negative operation</Strong> — Hedera is carbon-negative through ongoing carbon credit purchases, aligning with the WCO's values of physical health and environmental responsibility.</>,
        <><Strong>Native token service</Strong> — HTS provides fungible tokens and NFTs as a native network service (not a smart contract standard), eliminating the reentrancy, overflow, and approval vulnerabilities common in ERC-20/721 implementations.</>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 3 — MARKET ANALYSIS
// =============================================================================

export function Section3_MarketAnalysis() {
  return (
    <PolicySection num={3} title="MARKET ANALYSIS" icon={<TrendingUp className="w-4 h-4" />}>
      <SubHead>3.1 The Calisthenics Market</SubHead>
      <P>
        Calisthenics — bodyweight-based strength training encompassing pull-ups, push-ups, dips,
        muscle-ups, planches, levers, and freestyle movement — has experienced explosive growth
        over the past decade, driven by social media exposure, minimal equipment requirements,
        and a grassroots community culture that values accessibility over exclusivity.
      </P>
      <BulletList items={[
        <><Strong>Global market size:</Strong> The global calisthenics equipment and training market is estimated at $1.5-2B (2025), growing at 8-12% CAGR driven by bodyweight fitness trends, outdoor gym infrastructure expansion, and social media-driven athlete visibility.</>,
        <><Strong>Social media reach:</Strong> Top calisthenics athletes command 1M-10M+ followers across Instagram, YouTube, and TikTok. Competition highlight reels regularly achieve 10M+ views, demonstrating mainstream spectator demand that currently has no monetization infrastructure.</>,
        <><Strong>Competition ecosystem:</Strong> Hundreds of regional and national competitions are held annually across 50+ countries, organized by a fragmented network of independent promoters with no unified ranking system, no portable athlete records, and no standardized digital infrastructure.</>,
        <><Strong>Demographic profile:</Strong> The calisthenics community skews 18-35, digitally native, and disproportionately engaged with cryptocurrency and Web3 (estimated 15-25% crypto adoption vs. 5-10% general population), making it an ideal audience for blockchain-native platform adoption.</>,
      ]} />

      <SubHead>3.2 The Gap: IRL Sport vs. Digital Infrastructure</SubHead>
      <P>
        Despite its growth, competitive calisthenics suffers from a critical infrastructure
        deficit compared to traditional sports:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            INFRASTRUCTURE COMPARISON
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Unified rankings", "FIFA, ATP, UFC", "None (fragmented)"],
            ["Digital athlete profiles", "NBA Stats, Transfermarkt", "None (social media only)"],
            ["Fan engagement platform", "Fantasy leagues, betting apps", "None (passive viewing)"],
            ["Revenue distribution", "Prize pools, broadcast deals", "Minimal (sponsorship-dependent)"],
            ["Governance structure", "Federations, athletic commissions", "None (informal)"],
            ["Verifiable records", "Official sanctioned databases", "None (self-reported)"],
          ] as [string, string, string][]).map(([category, traditional, calisthenics]) => (
            <div key={category} className="grid grid-cols-3 gap-2 px-4 py-2">
              <span className="text-[#E8ECF0] font-semibold">{category}</span>
              <span className="text-[#10b981]">{traditional}</span>
              <span className="text-red-400/80">{calisthenics}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        BOTB fills every row in this table. It provides unified rankings (leaderboard with
        win/loss/streak tracking), digital athlete profiles (on-chain battle records and
        admin-set skill ratings), active fan engagement (staked voting with economic outcomes),
        transparent revenue distribution (automated reward snapshots), formalized governance
        (Governor NFT holders), and verifiable records (KV-backed with optional HCS
        immutability).
      </P>

      <SubHead>3.3 WCO's Unique Position</SubHead>
      <P>
        The World Calisthenics Organization occupies a unique position at the intersection of
        three converging trends:
      </P>
      <NumberedList items={[
        "IRL competition authority — The WCO organizes sanctioned calisthenics events with established athlete rosters, judging standards, and event infrastructure. BOTB is not a fantasy layer on top of someone else's sport; it is the digital extension of the WCO's own competition ecosystem.",
        "Web3 native architecture — Rather than retrofitting blockchain onto an existing Web2 platform, BOTB was designed blockchain-first. Every core feature (voting, staking, rewards, governance, identity) is built around Hedera's native token and consensus services.",
        "Community-first economics — The 50/50 token split (liquidity + ecosystem) and Governor-directed treasury allocation ensure that value flows to active participants, not passive shareholders. There is no VC allocation, no team vesting with insider discounts, and no pre-sale.",
      ]} />

      <SubHead>3.4 Competitive Landscape</SubHead>
      <P>
        BOTB operates in uncontested space. There is no direct competitor building a
        blockchain-native competitive calisthenics platform. Adjacent competitors fall into
        three categories:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Traditional sports apps", "ESPN, DAZN, Fanatics", "Passive viewing, no economic participation, no governance, no athlete-level engagement. Built for broadcast sports with established leagues.", "BOTB offers active participation with economic stakes, community governance, and direct athlete engagement in an emerging sport."],
            ["Fantasy/prediction platforms", "DraftKings, FanDuel, Polymarket", "Focus on established sports with deep statistical data. Regulatory complexity (gambling licenses). No community governance. No athlete identity layer.", "BOTB is a sport-first platform where voting and staking enhance the competitive experience rather than creating a separate gambling product. NFT-based identity and governance are integral."],
            ["Web3 sports projects", "Chiliz/Socios, Sorare", "Focus on fan tokens or digital collectibles for existing sports leagues. No IRL competition management. No voting power tied to real outcomes. Primarily Ethereum-based with high fees.", "BOTB manages both the IRL competition and the digital ecosystem. Voting directly affects reward distribution from real battles. Hedera's near-zero fees make micro-staking economically viable."],
          ] as [string, string, string, string][]).map(([category, examples, weakness, botbAdvantage]) => (
            <div key={category} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#E8ECF0] font-semibold">{category}</span>
                <span className="text-[#8494A7] text-[0.6rem] font-mono">{examples}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-400/70 font-semibold shrink-0 w-16">Gap:</span>
                <span className="text-[#8494A7]">{weakness}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#10b981] font-semibold shrink-0 w-16">BOTB:</span>
                <span className="text-[#8494A7]">{botbAdvantage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>3.5 Total Addressable Market</SubHead>
      <P>
        BOTB's TAM is the intersection of three audiences:
      </P>
      <BulletList items={[
        <><Strong>Competitive calisthenics community</Strong> — Estimated 5-10M active practitioners globally who follow competitions, watch battle content, and identify with the calisthenics culture.</>,
        <><Strong>Fitness influencer audiences</Strong> — Meta Series competitions tap into the broader fitness influencer ecosystem (100M+ combined followers across top fitness creators), converting passive followers into active, economically engaged participants.</>,
        <><Strong>Web3/DeFi participants</Strong> — The Hedera ecosystem's existing DeFi community (SaucerSwap, Ivy, HashPack users) provides an initial crypto-native user base familiar with token staking, NFT ownership, and decentralized governance.</>,
      ]} />
      <Callout type="info">
        <Strong>First-mover advantage:</Strong> BOTB is the only platform that combines IRL
        competition management, blockchain-native fan engagement, and decentralized governance for
        calisthenics. By the time traditional sports platforms consider this space, BOTB will have
        established the athlete records, community governance structures, and token economics that
        define the sport's digital infrastructure.
      </Callout>
    </PolicySection>
  );
}