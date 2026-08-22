/**
 * Terms of Service — Sections 6-13
 * ==================================
 * Step 10: Section 6 (Voting Rules & Staking) + Section 7 (Competition & Rewards)
 * Step 11: Section 8 (Governance) + Section 9 (Prohibited Conduct)
 * Step 12: Section 10 (Disclaimers & Risk) + Section 11 (Limitation of Liability)
 * Step 13: Section 12 (Dispute Resolution) + Section 13 (Modifications & Termination)
 *
 * All facts verified against the actual codebase:
 *   - index.tsx: vote/battle route (lines 1626-1726), duplicate check, 2h cutoff,
 *     votingClosesAt, winner declaration, snapshot generation, reward share calc
 *   - index.tsx: vote/proposal route (lines 1770-1832), proposal status transitions
 *   - index.tsx: vote/skill route — REMOVED (skills now admin-only, Governor proposal path)
 *   - admin-auth.tsx: rate limits (10/min vote, 3/5min challenge), sanitization
 *   - hedera-mirror.ts: computeVotingPower (1x/1.5x/2x/3x)
 *   - hedera-config.ts: TOKEN_IDS, admin wallets
 */

import React from "react";
import {
  Vote, Trophy, Shield, Ban, AlertTriangle, Scale,
  Gavel, RefreshCw,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// SECTION 6 — VOTING RULES & STAKING
// =============================================================================

export function Section6_VotingRules() {
  return (
    <PolicySection num={6} title="VOTING RULES & STAKING" icon={<Vote className="w-4 h-4" />}>
      <P>
        This section governs all voting activity on the Platform, including battle votes
        and governance proposal votes. By casting any vote, you agree to be bound by these rules.
      </P>

      <SubHead>6.1 One Vote Per Wallet Per Battle</SubHead>
      <P>
        Each Hedera Account ID is permitted exactly one vote per battle. This is enforced at the
        server level by checking for an existing vote record at the KV key{" "}
        <Code>vote:battle:{"{battleId}"}:{"{wallet}"}</Code> before accepting a new vote. Attempts
        to cast a second vote on the same battle return an HTTP 409 error:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10">
        <span className="text-red-400">"You have already voted on this battle. One vote per wallet."</span>
      </div>
      <P>
        The same one-vote-per-wallet rule applies to governance proposals (key:{" "}
        <Code>vote:proposal:{"{proposalId}"}:{"{wallet}"}</Code>).
      </P>

      <SubHead>6.2 Voting Power Calculation</SubHead>
      <P>
        Your vote weight is determined by two factors: (a) the amount of BOTB tokens you stake
        with your vote, and (b) your NFT-based voting power multiplier. The formula is:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 text-center">
        <span className="text-[#6AA3E0]">weightedVote</span>{" "}
        <span className="text-[#8494A7]">=</span>{" "}
        <span className="text-[#6AA3E0]">stakeAmount</span>{" "}
        <span className="text-[#8494A7]">{"\u00D7"}</span>{" "}
        <span className="text-[#6AA3E0]">votingPower</span>
      </div>
      <P>
        Voting power is computed by the <Code>computeVotingPower(hasGovernor, hasSigma)</Code>{" "}
        function based on verified NFT holdings:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5">
          {([
            ["1x", "No NFTs", "Base voting power. All wallets start here.", "#8494A7"],
            ["1.5x", "Sigma Series", "Hold at least one Sigma Series NFT.", "#7C5CDB"],
            ["2x", "WCO Governor", "Hold at least one Governor NFT (0.0.9338241).", "#f59e0b"],
            ["3x", "Governor + Sigma", "Hold both. Maximum achievable multiplier.", "#10b981"],
          ] as [string, string, string, string][]).map(([power, nfts, desc, color]) => (
            <div key={power} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="font-bold font-mono w-8 shrink-0" style={{ fontFamily: "Orbitron, sans-serif", color }}>{power}</span>
              <span className="text-[#E8ECF0] font-semibold shrink-0 w-40">{nfts}</span>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        NFT holdings are verified in real-time via the Hedera Mirror Node API. You cannot
        self-attest NFT ownership; the server independently checks your wallet's NFT balances.
        If you acquire or transfer an NFT between votes, your voting power updates automatically
        on the next vote.
      </P>

      <SubHead>6.3 Voting Window Enforcement</SubHead>
      <P>
        Votes are only accepted when all of the following conditions are met:
      </P>
      <NumberedList items={[
        "The battle status must be \"voting_open\". Battles in any other status (upcoming, voting_closed, winner_declared, rewards_distributed, draft, cancelled) reject votes.",
        "Administrators manually close voting at the appropriate time via the Admin Command Center. There is no automatic time-based cutoff.",
        "If the battle has an explicit votingClosesAt timestamp, votes are rejected after that deadline.",
        "The wallet must pass anti-spoofing verification (exists on Hedera mainnet via Mirror Node lookup).",
        "The wallet must not have already voted on this battle (duplicate check).",
        "The selected athlete must be one of the two athletes assigned to this battle.",
      ]} />

      <SubHead>6.4 Rate Limiting</SubHead>
      <P>
        Vote submission is rate-limited to prevent abuse:
      </P>
      <BulletList items={[
        <>
          <Strong>Battle votes:</Strong> 10 attempts per minute per wallet address. Exceeding this
          limit returns HTTP 429.
        </>,
        <>
          <Strong>Proposal votes:</Strong> 10 attempts per minute per wallet address.
        </>,
        <>
          <Strong>Skill ratings:</Strong> 10 attempts per minute per wallet address.
        </>,
      ]} />
      <P>
        Rate limits use an in-memory sliding-window algorithm. Counters are per-wallet and are
        not persisted — they reset on server cold starts.
      </P>

      <SubHead>6.5 Stake Commitment</SubHead>
      <P>
        When you cast a battle vote, the BOTB tokens you designate as your stake amount are
        recorded in your vote record. By staking tokens:
      </P>
      <BulletList items={[
        <>You acknowledge that staked tokens are committed for the duration of the battle.</>,
        <>You understand that the stake amount affects your weighted vote value and your proportional share of any reward distribution.</>,
        <>You accept that staking carries risk — there is no guarantee that you will receive rewards, even if your chosen athlete wins (see Section 7.4).</>,
        <>You acknowledge that the WCO does not guarantee the value, price stability, or liquidity of BOTB tokens at the time of staking or at the time of reward distribution.</>,
      ]} />

      <SubHead>6.6 Vote Immutability</SubHead>
      <Callout type="important">
        <Strong>Votes cannot be changed, retracted, or cancelled</Strong> once submitted. The vote
        record is stored in the KV database immediately upon successful submission. If HCS
        recording is enabled, the vote is also written to the Hedera Consensus Service topic,
        making it permanently immutable on-chain. You are responsible for reviewing your vote
        selection before confirming.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 7 — COMPETITION & REWARD DISTRIBUTION
// =============================================================================

export function Section7_CompetitionRewards() {
  return (
    <PolicySection num={7} title="COMPETITION & REWARD DISTRIBUTION" icon={<Trophy className="w-4 h-4" />}>
      <P>
        This section governs the rules for battle outcomes, winner declarations, reward snapshot
        generation, and token distribution. The WCO administers all competition outcomes based on
        real-world athletic performance.
      </P>

      <SubHead>7.1 Battle Lifecycle</SubHead>
      <P>
        Every battle on the Platform follows a defined lifecycle managed by WCO administrators:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            BATTLE STATUS TRANSITIONS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["draft", "Battle created but not visible to users."],
            ["upcoming", "Published and visible; voting not yet open."],
            ["voting_open", "Votes accepted. Admin controls when voting closes. Optional votingClosesAt deadline."],
            ["voting_closed", "No further votes accepted. Awaiting IRL competition result."],
            ["winner_declared", "Administrator has declared the winner. Reward snapshot auto-generated."],
            ["rewards_distributed", "Airdrop confirmed. Battle lifecycle complete."],
            ["cancelled", "Battle cancelled. No rewards distributed. Staked tokens not affected."],
          ] as [string, string][]).map(([status, desc]) => (
            <div key={status} className="flex gap-3 px-4 py-2">
              <code className="text-[#6AA3E0] font-mono shrink-0 w-40">{status}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>7.2 Winner Declaration</SubHead>
      <P>
        Battle winners are declared exclusively by WCO administrators via the{" "}
        <Code>POST /admin/battles/:id/winner</Code> endpoint, which requires a valid admin
        session (three-layer authentication). The declaration process:
      </P>
      <NumberedList items={[
        "The WCO observes the real-world competition result (live event, verified video, or sanctioned judge panel).",
        "An authorized administrator submits the winnerId (which must be one of the two athletes assigned to the battle).",
        "The server updates the battle status to \"winner_declared\", increments the winner's win count and streak, resets the loser's streak to zero, and updates the loser's loss count.",
        "A reward distribution snapshot is automatically generated from all votes on the battle.",
      ]} />
      <Callout type="important">
        <Strong>The WCO's winner declaration is final and binding.</Strong> There is no appeal
        process, dispute mechanism, or community override for battle outcomes. Winners are
        determined solely by real-world athletic performance as assessed by WCO judges and
        administrators. The Platform reflects IRL results — it does not determine them.
      </Callout>

      <SubHead>7.3 Reward Snapshot</SubHead>
      <P>
        When a winner is declared, the server automatically generates a reward distribution
        snapshot containing the following for each winning voter:
      </P>
      <BulletList items={[
        <><Strong>wallet</Strong> — The voter's Hedera Account ID.</>,
        <><Strong>stakeAmount</Strong> — The amount of BOTB tokens staked with the vote.</>,
        <><Strong>votingPower</Strong> — The voter's NFT-based multiplier at time of vote.</>,
        <><Strong>weightedVote</Strong> — stakeAmount {"\u00D7"} votingPower.</>,
        <><Strong>sharePercent</Strong> — The voter's weighted share of total winning weighted votes, expressed as a percentage.</>,
        <><Strong>rewardAmount</Strong> — The proportional reward calculated as: (weightedVote / totalWinningWeighted) {"\u00D7"} totalPool.</>,
        <><Strong>NFT flags</Strong> — hasGovernorNFT and hasSigmaNFT booleans recorded for audit purposes.</>,
      ]} />
      <P>
        Snapshots are stored at <Code>snapshot:{"{battleId}"}</Code> and can be exported by
        administrators in CSV or JSON format via{" "}
        <Code>GET /admin/snapshots/:id/export</Code>.
      </P>

      <SubHead>7.4 Airdrop & Distribution</SubHead>
      <P>
        After snapshot generation, administrators execute the on-chain BOTB token airdrop to
        winning voters. The airdrop is a separate administrative action marked by{" "}
        <Code>POST /admin/battles/:id/confirm-airdrop</Code>. You acknowledge:
      </P>
      <BulletList items={[
        <>Airdrop timing is at the sole discretion of the WCO. There is no guaranteed timeline between winner declaration and token distribution.</>,
        <>Airdrop execution may be delayed by network congestion, administrative scheduling, or token availability.</>,
        <>The reward amount calculated in the snapshot is denominated in BOTB tokens. The fiat value of these tokens is determined by market conditions at the time you receive or trade them, and may differ significantly from the value at the time of staking.</>,
        <>Voters who backed the losing athlete receive no reward distribution from that battle. There is no consolation reward, refund, or partial return.</>,
      ]} />

      <SubHead>7.5 Meta Series Prize Distribution</SubHead>
      <P>
        Meta Series competitions follow a distinct winner-takes-all distribution model (see
        Section 4.1). Upon completion of a Meta Series matchup:
      </P>
      <BulletList items={[
        <>100% of combined NFT sales revenue from both sides is pooled.</>,
        <>The WCO declares the competition winner based on verified physical performance.</>,
        <>The prize pool is distributed pro-rata to collectors who purchased NFTs backing the winning side.</>,
        <>Collectors who backed the losing side receive no distribution. The purchase price is not refunded.</>,
        <>Meta Series NFTs remain in the collector's wallet regardless of outcome but carry no further financial claim.</>,
      ]} />

      <SubHead>7.6 No Guaranteed Returns</SubHead>
      <Callout type="critical">
        <Strong>Participation in voting, staking, and Meta Series competitions does not guarantee
        any financial return.</Strong> The value of BOTB token rewards fluctuates based on market
        conditions. The outcome of battles depends on real-world athletic performance, which is
        inherently unpredictable. Past rewards or vote accuracy do not predict future results.
        You should only stake tokens or purchase Meta Series NFTs with funds you can afford to lose
        entirely.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 8 — GOVERNANCE PARTICIPATION
// =============================================================================

export function Section8_Governance() {
  return (
    <PolicySection num={8} title="GOVERNANCE PARTICIPATION" icon={<Shield className="w-4 h-4" />}>
      <P>
        The Platform includes a decentralized governance system that allows community
        participation in certain platform decisions. This section defines the governance
        framework, eligibility requirements, and the scope of governance authority.
      </P>

      <SubHead>8.1 Proposal Creation</SubHead>
      <P>
        Governance proposals are created by WCO administrators via the{" "}
        <Code>POST /admin/proposals</Code> endpoint. Only authorized administrators can create
        proposals. Governor NFT holders and the broader community may suggest proposals through
        the Governors Hub, but final proposal creation and publication is at the discretion of the
        WCO.
      </P>
      <P>
        Each proposal contains: a unique ID, title, description, category, status, creation date,
        optional end date (voting deadline), and vote tallies (votesFor, votesAgainst,
        totalVoters).
      </P>

      <SubHead>8.2 Proposal Lifecycle</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["draft", "Created but not yet visible for voting."],
            ["active", "Published and open for voting. Votes accepted until endsAt deadline or manual closure."],
            ["passed", "Voting concluded; proposal approved based on vote results."],
            ["rejected", "Voting concluded; proposal did not achieve sufficient support."],
            ["cancelled", "Proposal withdrawn by administrators. Can be cancelled from any state."],
          ] as [string, string][]).map(([status, desc]) => (
            <div key={status} className="flex gap-3 px-4 py-2">
              <code className="text-[#6AA3E0] font-mono shrink-0 w-24">{status}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        Valid status transitions: draft {"\u2192"} active {"\u2192"} passed/rejected. A proposal
        may be cancelled from any state. Invalid transitions are rejected by the server.
      </P>

      <SubHead>8.3 Voting on Proposals</SubHead>
      <P>
        All connected wallets may vote on active proposals. Governance votes follow these rules:
      </P>
      <BulletList items={[
        <>
          <Strong>Vote direction:</Strong> Each vote is either "for" or "against" the proposal.
        </>,
        <>
          <Strong>One vote per wallet:</Strong> Each Hedera Account ID can vote once per proposal.
          Duplicate votes are rejected with HTTP 409.
        </>,
        <>
          <Strong>Vote weight:</Strong> Governance votes are weighted by the voter's NFT-based
          voting power multiplier. A Governor NFT holder's vote counts for 2x; a Governor + Sigma
          holder's vote counts for 3x.
        </>,
        <>
          <Strong>Deadline enforcement:</Strong> If the proposal has an <Code>endsAt</Code>{" "}
          timestamp, votes submitted after that deadline are rejected.
        </>,
        <>
          <Strong>Anti-spoofing:</Strong> The voter's wallet must exist on Hedera mainnet
          (verified via Mirror Node). Non-existent wallets are rejected.
        </>,
      ]} />

      <SubHead>8.4 Governor NFT Privileges</SubHead>
      <P>
        Holders of WCO Governor NFTs (Token ID: 0.0.9338241) have elevated governance
        privileges:
      </P>
      <BulletList items={[
        <>Access to the Governors Hub — a dedicated dashboard for governance activity.</>,
        <>The right to propose athlete skill rating changes across 5 official WCO categories (Statics, Dynamics, Power Dynamics, Combinations & Flow, Offense & Defense) via governance proposals. Skill ratings are set by WCO admin, rated 1-10.</>,
        <>2x voting power on all governance proposals (3x if also holding Sigma).</>,
        <>Participation in Governor Control Supply allocation decisions — directing 500M BOTB tokens toward LP pools, DeFi programs, or Only Gains rewards.</>,
      ]} />

      <SubHead>8.5 Scope of Governance</SubHead>
      <Callout type="info">
        <Strong>Governance is advisory, not autonomous.</Strong> The WCO retains ultimate authority
        over all platform operations, including but not limited to: athlete registration, battle
        scheduling, winner declarations, event management, token distribution, platform
        architecture, and terms of service modifications. Governance proposals that pass community
        vote represent a strong community signal and will be given serious consideration by the
        WCO, but the WCO is not contractually obligated to implement any specific governance
        proposal. This is an admin-governed platform with community input, not a fully autonomous
        DAO.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 9 — PROHIBITED CONDUCT
// =============================================================================

export function Section9_ProhibitedConduct() {
  return (
    <PolicySection num={9} title="PROHIBITED CONDUCT" icon={<Ban className="w-4 h-4" />}>
      <P>
        You agree not to engage in any of the following prohibited activities when using the
        Platform. Violation of these rules may result in wallet blacklisting, vote invalidation,
        forfeiture of rewards, and permanent ban from Platform participation.
      </P>

      <SubHead>9.1 Vote Manipulation & Sybil Attacks</SubHead>
      <BulletList items={[
        <>
          <Strong>Sybil attacks</Strong> — Operating multiple Hedera wallets to cast multiple
          votes on the same battle or proposal, thereby circumventing the one-vote-per-wallet
          rule. This includes creating new wallets, using wallets controlled by affiliated parties,
          or coordinating with others to cast votes on your behalf.
        </>,
        <>
          <Strong>Vote buying or selling</Strong> — Offering, soliciting, or accepting payment
          (in any form, including tokens, NFTs, fiat currency, or services) in exchange for
          casting a specific vote.
        </>,
        <>
          <Strong>Coordinated manipulation</Strong> — Organizing groups to vote in a coordinated
          manner with the intent to artificially influence battle outcomes or governance proposals
          beyond the legitimate expression of individual preferences.
        </>,
        <>
          <Strong>Vote spoofing</Strong> — Submitting votes using forged, compromised, or
          unauthorized wallet credentials. The Platform's Mirror Node verification is designed
          to prevent wallet spoofing, but any attempt to circumvent this mechanism is prohibited.
        </>,
      ]} />

      <SubHead>9.2 Technical Exploitation</SubHead>
      <BulletList items={[
        <>
          <Strong>Smart contract exploitation</Strong> — Exploiting any bug, vulnerability,
          or unintended behavior in the Platform's smart contracts, server logic, or frontend code
          to gain an unfair advantage, extract unauthorized funds, or disrupt Platform operations.
        </>,
        <>
          <Strong>Rate limit circumvention</Strong> — Attempting to bypass the Platform's
          rate limiting mechanisms (10/min vote, 3/5min admin challenge, 60/min general API) by
          distributing requests across multiple IPs, wallets, or automated systems.
        </>,
        <>
          <Strong>Unauthorized scraping</Strong> — Systematic automated access to the Platform's
          APIs beyond normal user interaction, including scraping vote data, athlete data, or
          leaderboard data at volumes that degrade Platform performance.
        </>,
        <>
          <Strong>Reverse engineering</Strong> — Decompiling, disassembling, or reverse-engineering
          the Platform's backend server code, admin authentication system, or cryptographic
          challenge-sign mechanism for the purpose of bypassing security controls.
        </>,
        <>
          <Strong>API abuse</Strong> — Using the Platform's API endpoints in any manner not
          intended by their documented purpose, including submitting malformed requests designed
          to trigger error conditions, injecting code through input fields (the Platform sanitizes
          all inputs, but the attempt itself is prohibited), or flooding endpoints with requests.
        </>,
      ]} />

      <SubHead>9.3 Impersonation & Fraud</SubHead>
      <BulletList items={[
        <>
          <Strong>Admin impersonation</Strong> — Claiming to be a WCO administrator, falsely
          representing that you have admin privileges, or attempting to authenticate to admin
          endpoints using a non-whitelisted wallet.
        </>,
        <>
          <Strong>Athlete impersonation</Strong> — Falsely representing yourself as a registered
          BOTB athlete, using an athlete's likeness or identity without authorization, or
          creating misleading content that implies athlete endorsement.
        </>,
        <>
          <Strong>Misleading proposals</Strong> — Submitting governance proposal suggestions
          that contain false information, misleading descriptions, or that are designed to trick
          voters into supporting actions harmful to the Platform or community.
        </>,
      ]} />

      <SubHead>9.4 Meta Series Manipulation</SubHead>
      <BulletList items={[
        <>
          <Strong>Insider trading</Strong> — Purchasing Meta Series NFTs while in possession of
          non-public information about the competition outcome (e.g., knowledge of a competitor's
          injury, withdrawal, or predetermined result).
        </>,
        <>
          <Strong>Competition fixing</Strong> — Colluding with competitors to predetermine the
          outcome of a Meta Series matchup for financial gain from NFT sales.
        </>,
        <>
          <Strong>Wash trading</Strong> — Purchasing Meta Series NFTs from yourself (using
          multiple wallets) to artificially inflate the prize pool size or create the appearance
          of demand.
        </>,
      ]} />

      <SubHead>9.5 Consequences</SubHead>
      <P>
        The WCO reserves the right, in its sole discretion, to take any of the following
        actions in response to prohibited conduct:
      </P>
      <BulletList items={[
        <><Strong>Vote invalidation</Strong> — Void individual votes or all votes from a wallet determined to have engaged in manipulation.</>,
        <><Strong>Reward forfeiture</Strong> — Withhold or reclaim rewards from wallets engaged in prohibited conduct.</>,
        <><Strong>Wallet blacklisting</Strong> — Permanently block a Hedera Account ID from casting votes, participating in governance, or receiving rewards.</>,
        <><Strong>Platform ban</Strong> — Block a wallet from all Platform interactions.</>,
        <><Strong>Legal action</Strong> — Pursue civil or criminal remedies where prohibited conduct causes financial harm to the WCO, its users, or the Platform ecosystem.</>,
      ]} />
      <Callout type="warning">
        <Strong>Determination of prohibited conduct is at the sole discretion of the WCO.</Strong>{" "}
        The WCO is not required to provide evidence, advance notice, or an appeals process before
        taking enforcement action. Enforcement actions are final. On-chain records of prohibited
        votes cannot be removed from the Hedera ledger but will be excluded from reward
        calculations.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 10 — DISCLAIMERS & RISK DISCLOSURES
// =============================================================================

export function Section10_Disclaimers() {
  return (
    <PolicySection num={10} title="DISCLAIMERS & RISK DISCLOSURES" icon={<AlertTriangle className="w-4 h-4" />}>
      <P>
        The following disclaimers and risk disclosures are material to your use of the Platform.
        By using the Platform, you acknowledge that you have read, understood, and accepted each
        of the following risks.
      </P>

      <SubHead>10.1 "As-Is" Disclaimer</SubHead>
      <Callout type="critical">
        THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
        WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. THE WCO EXPRESSLY DISCLAIMS ALL
        WARRANTIES, INCLUDING WITHOUT LIMITATION: (A) IMPLIED WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT; (B) WARRANTIES ARISING
        FROM COURSE OF DEALING, USAGE, OR TRADE PRACTICE; AND (C) WARRANTIES THAT THE PLATFORM
        WILL MEET YOUR REQUIREMENTS, BE UNINTERRUPTED, TIMELY, SECURE, ERROR-FREE, OR THAT
        DEFECTS WILL BE CORRECTED.
      </Callout>

      <SubHead>10.2 Beta Period Risks</SubHead>
      <BulletList items={[
        <>The Platform is in public beta. Features may be incomplete, untested, or contain bugs.</>,
        <>The BOTB token has not yet been deployed. Token launch is planned for Q2-Q3 2026 but is not guaranteed.</>,
        <>HCS on-chain vote recording may not be fully operational during beta.</>,
        <>Backend data stored during beta may be reset, migrated, or lost without prior notice.</>,
        <>Smart contract interactions during beta may behave differently than in production.</>,
        <>The WCO may modify, suspend, or discontinue any feature at any time during beta.</>,
      ]} />

      <SubHead>10.3 Blockchain Risks</SubHead>
      <BulletList items={[
        <>
          <Strong>Transaction irreversibility</Strong> — All Hedera transactions (token transfers,
          NFT purchases, HCS messages) are final and irreversible once they achieve consensus.
          Neither the WCO nor Hedera can reverse, cancel, or modify completed transactions.
        </>,
        <>
          <Strong>Network risks</Strong> — The Hedera network may experience congestion, outages,
          forks, or governance changes that affect the Platform's functionality. The WCO has no
          control over the Hedera network infrastructure.
        </>,
        <>
          <Strong>Smart contract risk</Strong> — Smart contracts may contain undiscovered bugs
          or vulnerabilities. Exploits may result in loss of tokens or NFTs.
        </>,
        <>
          <Strong>Wallet security</Strong> — Loss of your private keys, seed phrase, Magic recovery
          access, or wallet password can result in permanent, irrecoverable loss of all assets and
          Platform access associated with that account. The WCO cannot recover keys for you.
        </>,
        <>
          <Strong>Mirror Node dependency</Strong> — The Platform depends on the Hedera Mirror
          Node for real-time data (balances, NFT holdings, transaction history). Mirror Node
          outages or delays may temporarily prevent voting, balance display, or NFT verification.
        </>,
      ]} />

      <SubHead>10.3A Email Sign-In / Magic Embedded Wallets (Beta)</SubHead>
      <P>
        In addition to connecting an existing wallet (such as HashPack via WalletConnect), the
        Platform may offer <Strong>email sign-in and create-account</Strong> using Magic (one-time
        email passcodes). This path creates or unlocks a non-custodial Hedera key managed through
        Magic’s embedded wallet. The WCO does not store your private keys. By using email auth you
        accept the following additional risks and responsibilities:
      </P>
      <BulletList items={[
        <>
          <Strong>Third-party dependency</Strong> — Login, session continuity, and key reveal/export
          depend on Magic and your email provider. Outages, account lockouts, or beta defects may
          delay or prevent access.
        </>,
        <>
          <Strong>Recovery</Strong> — You should treat Magic’s reveal/export (or equivalent) as the
          way to back up your Hedera private key offline. Loss of email access or Magic recovery
          materials without a backed-up key may mean permanent loss of the account and any assets
          held there.
        </>,
        <>
          <Strong>Self-custody with HashPack</Strong> — For ongoing management of HBAR, tokens, and
          NFTs, you are encouraged to install the official{" "}
          <a
            href="https://www.hashpack.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6AA3E0] hover:underline"
          >
            HashPack browser extension
          </a>{" "}
          (or HashPack mobile) and, if you choose, import your exported private key so you can
          approve transfers and manage assets in a full wallet UI. Email OTP alone is not a
          complete asset-management toolkit.
        </>,
        <>
          <Strong>No starter HBAR</Strong> — Sponsored account creation (if offered) does not fund
          your account with HBAR. Network fees for transfers and other on-chain actions remain your
          responsibility.
        </>,
        <>
          <Strong>Path clarity</Strong> — HashPack connections and Magic email accounts are separate
          auth paths. You are responsible for knowing which Hedera account ID holds your assets.
        </>,
      ]} />

      <SubHead>10.4 Financial Risks</SubHead>
      <BulletList items={[
        <>
          <Strong>Token price volatility</Strong> — The price of the BOTB token will be determined
          by decentralized market forces. Prices may fluctuate dramatically. The BOTB token may
          lose all value. The WCO does not guarantee any minimum price, value stability, or
          liquidity.
        </>,
        <>
          <Strong>No guaranteed returns</Strong> — Voting, staking, liquidity provision, and Meta
          Series participation do not guarantee any financial return. Past performance does not
          predict future results.
        </>,
        <>
          <Strong>Meta Series total loss</Strong> — If you purchase a Meta Series NFT backing
          the losing side, you will lose 100% of your purchase price with no refund or recovery.
        </>,
        <>
          <Strong>DeFi risks</Strong> — Staking on Ivy, providing liquidity on SaucerSwap, and
          participating in DeFi programs carry risks including but not limited to: impermanent
          loss, smart contract exploits, protocol failures, and counterparty risk.
        </>,
        <>
          <Strong>No investment advice</Strong> — Nothing on the Platform constitutes financial,
          investment, legal, or tax advice. You should consult qualified professionals before
          making any financial decision related to the Platform.
        </>,
      ]} />

      <SubHead>10.5 Regulatory Risks</SubHead>
      <BulletList items={[
        <>
          <Strong>Regulatory uncertainty</Strong> — The regulatory treatment of cryptocurrency
          tokens, NFTs, DeFi protocols, and blockchain-based voting is uncertain and evolving
          in many jurisdictions. Changes in law or regulation may adversely affect the Platform,
          the BOTB token, or your ability to participate.
        </>,
        <>
          <Strong>Compliance obligations</Strong> — You are solely responsible for determining
          whether your use of the Platform complies with applicable laws in your jurisdiction,
          including securities law, tax law, anti-money laundering regulations, and
          cryptocurrency-specific regulations.
        </>,
        <>
          <Strong>Tax liability</Strong> — You are solely responsible for reporting and paying
          any taxes arising from your Platform activities, including but not limited to token
          rewards, NFT purchases and sales, staking yields, and liquidity provision returns.
        </>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 11 — LIMITATION OF LIABILITY
// =============================================================================

export function Section11_Liability() {
  return (
    <PolicySection num={11} title="LIMITATION OF LIABILITY" icon={<Scale className="w-4 h-4" />}>
      <SubHead>11.1 Aggregate Liability Cap</SubHead>
      <Callout type="critical">
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE TOTAL AGGREGATE LIABILITY OF THE
        WCO AND ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, AND AFFILIATES, ARISING OUT OF OR
        RELATING TO THESE TERMS OR YOUR USE OF THE PLATFORM, WHETHER IN CONTRACT, TORT (INCLUDING
        NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, SHALL NOT EXCEED THE GREATER OF:
        (A) THE AMOUNT YOU PAID TO THE WCO IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING
        RISE TO THE CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100.00).
      </Callout>

      <SubHead>11.2 Exclusion of Consequential Damages</SubHead>
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE WCO OR ITS
        DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY:
      </P>
      <BulletList items={[
        <>Indirect, incidental, special, consequential, or punitive damages;</>,
        <>Lost profits, revenue, data, business opportunities, or goodwill;</>,
        <>Cost of procurement of substitute goods or services;</>,
        <>Loss of tokens, NFTs, or cryptocurrency of any kind;</>,
        <>Damages arising from unauthorized access to or alteration of your wallet, data, or transmissions;</>,
        <>Damages arising from the conduct of any third party on the Platform;</>,
        <>Damages arising from any bugs, viruses, or other harmful code transmitted through the Platform;</>,
      ]} />
      <P>
        WHETHER OR NOT THE WCO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES, AND
        REGARDLESS OF THE THEORY OF LIABILITY.
      </P>

      <SubHead>11.3 Specific Exclusions</SubHead>
      <P>
        Without limiting the generality of the foregoing, the WCO shall not be liable for:
      </P>
      <BulletList items={[
        <>Loss of BOTB tokens, HBAR, NFTs, or any other digital assets due to wallet compromise, loss of private keys, or user error.</>,
        <>Losses arising from the volatility of BOTB token or HBAR prices.</>,
        <>Losses arising from the outcome of any battle, competition, or Meta Series matchup.</>,
        <>Losses arising from the failure of the Hedera network, Mirror Node, WalletConnect relay, SaucerSwap, Ivy, or any third-party service.</>,
        <>Losses arising from changes in applicable law or regulation.</>,
        <>Losses arising from the WCO's decision to modify, suspend, or discontinue any Platform feature.</>,
        <>Any harm caused by the actions of other Platform users, including vote manipulation or Sybil attacks.</>,
      ]} />

      <SubHead>11.4 Force Majeure</SubHead>
      <P>
        The WCO shall not be liable for any failure or delay in performing its obligations under
        these Terms if such failure or delay results from circumstances beyond the WCO's
        reasonable control, including but not limited to: acts of God, natural disasters, pandemic
        or epidemic, war, terrorism, civil unrest, government actions or regulations, network
        failures, power outages, Hedera network disruptions, cyberattacks, DDoS attacks, or
        failures of third-party infrastructure providers.
      </P>

      <SubHead>11.5 Indemnification</SubHead>
      <P>
        You agree to indemnify, defend, and hold harmless the WCO and its directors, officers,
        employees, agents, and affiliates from and against any and all claims, demands, actions,
        losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees)
        arising out of or relating to:
      </P>
      <BulletList items={[
        <>Your use of or access to the Platform;</>,
        <>Your violation of these Terms;</>,
        <>Your violation of any applicable law, rule, or regulation;</>,
        <>Your violation of any third-party rights, including intellectual property rights;</>,
        <>Any content you submit to the Platform;</>,
        <>Your participation in voting, staking, Meta Series competitions, or governance;</>,
        <>Any tax liability arising from your Platform activities;</>,
      ]} />

      <SubHead>11.6 Essential Basis of the Bargain</SubHead>
      <P>
        You acknowledge and agree that the disclaimers, risk disclosures, and limitations of
        liability set forth in Sections 10 and 11 are an essential element of these Terms and
        reflect a reasonable allocation of risk between you and the WCO. The WCO would not provide
        the Platform or enter into these Terms without these limitations. These limitations apply
        even if any limited remedy fails of its essential purpose.
      </P>

      <SubHead>11.7 Jurisdictional Limitations</SubHead>
      <P>
        Some jurisdictions do not allow the exclusion of certain warranties or the limitation or
        exclusion of liability for incidental or consequential damages. In such jurisdictions, the
        WCO's liability shall be limited to the maximum extent permitted by applicable law. Nothing
        in these Terms limits or excludes liability that cannot legally be limited or excluded.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 12 — DISPUTE RESOLUTION & GOVERNING LAW
// =============================================================================

export function Section12_DisputeResolution() {
  return (
    <PolicySection num={12} title="DISPUTE RESOLUTION & GOVERNING LAW" icon={<Gavel className="w-4 h-4" />}>
      <P>
        This section establishes the exclusive mechanism for resolving disputes between you and
        the WCO. By using the Platform, you agree to the dispute resolution procedures set forth
        below. Please read this section carefully — it affects your legal rights, including your
        right to file a lawsuit in court and to have disputes heard by a jury.
      </P>

      <SubHead>12.1 Informal Dispute Resolution (30-Day Notice Period)</SubHead>
      <P>
        Before initiating any formal dispute resolution proceeding, you and the WCO agree to
        first attempt to resolve the dispute informally for a minimum of thirty (30) calendar
        days. To initiate informal resolution:
      </P>
      <NumberedList items={[
        "You must send a written dispute notice to the WCO via the contact information provided on worldcalisthenics.org. The notice must include: (a) your Hedera Account ID, (b) a description of the dispute, (c) the specific relief sought, and (d) your contact information.",
        "The WCO will acknowledge receipt within 5 business days and designate a representative to engage in good-faith resolution discussions.",
        "Both parties agree to negotiate in good faith for the full 30-day period before pursuing arbitration.",
        "If the dispute is not resolved within 30 days, either party may initiate binding arbitration as described in Section 12.2.",
      ]} />
      <P>
        The 30-day informal resolution period is a mandatory prerequisite to arbitration. Any
        arbitration demand filed without completing this process may be dismissed without
        prejudice.
      </P>

      <SubHead>12.2 Binding Arbitration</SubHead>
      <P>
        If the dispute is not resolved through informal resolution, you and the WCO agree that
        all claims, disputes, and controversies arising out of or relating to these Terms, the
        Platform, your use of any Platform services, or the relationship between you and the WCO
        shall be resolved exclusively through final and binding arbitration, rather than in court.
      </P>
      <BulletList items={[
        <>
          <Strong>Arbitration rules:</Strong> Arbitration shall be administered by the American
          Arbitration Association (&quot;AAA&quot;) under its Consumer Arbitration Rules, or, if
          inapplicable, its Commercial Arbitration Rules. If the AAA is unavailable, the parties
          shall agree on an alternative arbitration forum.
        </>,
        <>
          <Strong>Arbitrator:</Strong> The dispute shall be heard by a single neutral arbitrator
          with demonstrated expertise in blockchain technology, digital assets, or technology
          law. The arbitrator shall be selected in accordance with the AAA&apos;s arbitrator selection
          procedures.
        </>,
        <>
          <Strong>Location:</Strong> Arbitration shall be conducted remotely (via video
          conference) unless the arbitrator determines that an in-person hearing is necessary, in
          which case the hearing shall take place in a mutually agreed location or, absent
          agreement, in the State of California, United States.
        </>,
        <>
          <Strong>Language:</Strong> All arbitration proceedings shall be conducted in English.
        </>,
        <>
          <Strong>Costs:</Strong> Each party shall bear its own attorneys&apos; fees and costs unless
          the arbitrator determines that applicable law entitles the prevailing party to
          reimbursement. Filing fees shall be allocated in accordance with the AAA&apos;s fee
          schedules. If the AAA determines that the filing fees create an undue burden, the WCO
          will pay the arbitration filing and hearing fees.
        </>,
        <>
          <Strong>Decision:</Strong> The arbitrator&apos;s award shall be final, binding, and
          enforceable in any court of competent jurisdiction. The arbitrator may award any relief
          that a court of competent jurisdiction could award, including injunctive or declaratory
          relief, but only to the extent required to satisfy the individual claim.
        </>,
        <>
          <Strong>Confidentiality:</Strong> All arbitration proceedings, including filings,
          evidence, and the arbitrator&apos;s award, shall be confidential unless disclosure is
          required by law or necessary to enforce the award.
        </>,
      ]} />
      <Callout type="important">
        <Strong>You are waiving your right to a jury trial.</Strong> By agreeing to binding
        arbitration, both you and the WCO waive the right to have disputes resolved by a judge or
        jury in a court of law. The arbitrator&apos;s decision is final and subject to very limited
        review by any court.
      </Callout>

      <SubHead>12.3 Class Action Waiver</SubHead>
      <Callout type="critical">
        YOU AND THE WCO AGREE THAT EACH PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR
        ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS,
        CONSOLIDATED, OR REPRESENTATIVE ACTION. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE
        PERSON&apos;S CLAIMS AND MAY NOT OTHERWISE PRESIDE OVER ANY FORM OF A REPRESENTATIVE OR CLASS
        PROCEEDING. IF THIS CLASS ACTION WAIVER IS FOUND TO BE UNENFORCEABLE, THEN THE ENTIRETY
        OF THIS ARBITRATION PROVISION SHALL BE NULL AND VOID, AND THE DISPUTE SHALL PROCEED IN
        COURT.
      </Callout>

      <SubHead>12.4 Exceptions to Arbitration</SubHead>
      <P>
        Notwithstanding Section 12.2, either party retains the right to:
      </P>
      <BulletList items={[
        <>Seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of a party&apos;s copyrights, trademarks, trade secrets, patents, or other intellectual property rights.</>,
        <>Bring an individual action in small claims court for disputes within the jurisdictional limits of such court.</>,
        <>Report violations to or seek assistance from any governmental or regulatory authority, without waiving any arbitration right.</>,
      ]} />

      <SubHead>12.5 Governing Law</SubHead>
      <P>
        These Terms, and any dispute arising out of or in connection with these Terms or the
        Platform, shall be governed by and construed in accordance with the laws of the State of
        California, United States, without regard to its conflict of laws principles. The United
        Nations Convention on Contracts for the International Sale of Goods does not apply to
        these Terms.
      </P>

      <SubHead>12.6 Limitation on Time to Bring Claims</SubHead>
      <P>
        Any cause of action or claim you may have arising out of or relating to these Terms or
        the Platform must be commenced within one (1) year after the cause of action accrues.
        Otherwise, such cause of action or claim is permanently barred. This limitations period
        applies regardless of whether you knew or should have known about the claim.
      </P>

      <SubHead>12.7 Blockchain-Specific Dispute Provisions</SubHead>
      <P>
        You acknowledge and agree to the following provisions specific to the blockchain-based
        nature of the Platform:
      </P>
      <BulletList items={[
        <>
          <Strong>On-chain finality:</Strong> Disputes regarding the validity of a Hedera
          consensus transaction, the order of transactions, or the finality of on-chain state
          changes are outside the scope of arbitration. Hedera&apos;s consensus mechanism is
          deterministic and final. Neither the WCO nor any arbitrator can reverse, modify, or
          invalidate a finalized Hedera transaction.
        </>,
        <>
          <Strong>Battle outcome disputes:</Strong> The WCO&apos;s determination of battle winners
          (Section 7.2) is not subject to arbitration. Battle outcomes are based on real-world
          athletic performance and are declared at the sole discretion of WCO administrators and
          judges. You expressly waive any right to arbitrate or litigate the outcome of any
          battle or Meta Series competition.
        </>,
        <>
          <Strong>Token valuation:</Strong> Disputes regarding the market value of the BOTB
          token, HBAR, NFTs, or any other digital asset are not arbitrable. Token prices are
          determined by decentralized market forces outside the WCO&apos;s control.
        </>,
        <>
          <Strong>Smart contract behavior:</Strong> Where the Platform&apos;s smart contracts execute
          as coded, the results of such execution are not subject to dispute. &quot;Code is law&quot;
          applies to the extent that the smart contract functioned as designed, regardless of
          whether the outcome was favorable to you.
        </>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 13 — MODIFICATIONS, TERMINATION & GENERAL PROVISIONS
// =============================================================================

export function Section13_ModificationsTermination() {
  return (
    <PolicySection num={13} title="MODIFICATIONS, TERMINATION & GENERAL PROVISIONS" icon={<RefreshCw className="w-4 h-4" />}>
      <P>
        This section governs how these Terms may be amended, how access to the Platform may be
        terminated, and general legal provisions applicable to the entire agreement.
      </P>

      <SubHead>13.1 Modification of Terms</SubHead>
      <P>
        The WCO reserves the right to modify, amend, or replace these Terms at any time and at
        its sole discretion. When the WCO makes material changes:
      </P>
      <BulletList items={[
        <>
          <Strong>On-site notification:</Strong> A prominent banner will be displayed on the
          Platform for a minimum of fourteen (14) days following the effective date of any
          material change, indicating that the Terms have been updated and linking to the revised
          document.
        </>,
        <>
          <Strong>Version history:</Strong> The &quot;Last Updated&quot; date at the top of this document
          will be revised to reflect the effective date of the most recent amendment.
        </>,
        <>
          <Strong>Review opportunity:</Strong> You are responsible for reviewing the Terms
          periodically. The WCO recommends checking this page each time you connect your wallet.
        </>,
      ]} />
      <P>
        Your continued use of the Platform after the effective date of any modification
        constitutes your acceptance of the modified Terms. If you do not agree with a
        modification, your sole remedy is to disconnect your wallet and cease using the Platform
        before the modification takes effect.
      </P>

      <SubHead>13.2 Unilateral Modifications Not Subject to Governance</SubHead>
      <Callout type="warning">
        <Strong>These Terms are not subject to governance votes.</Strong> While the Platform
        includes a community governance system (Section 8), modifications to these Terms of
        Service, the Privacy Policy, and the legal framework of the Platform are at the sole
        discretion of the WCO and are not subject to community proposal, vote, or approval.
        Governance proposals that purport to modify these Terms have no legal effect.
      </Callout>

      <SubHead>13.3 Termination by the WCO</SubHead>
      <P>
        The WCO may, in its sole discretion, at any time and without prior notice or liability:
      </P>
      <BulletList items={[
        <>
          <Strong>Terminate or suspend your access</Strong> to all or any part of the Platform
          for any reason, including but not limited to: breach of these Terms, prohibited conduct
          (Section 9), suspected fraud, regulatory requirements, or operational necessity.
        </>,
        <>
          <Strong>Blacklist your wallet</Strong> from voting, staking, governance, reward
          distribution, or any other Platform interaction.
        </>,
        <>
          <Strong>Discontinue the Platform</Strong> entirely, including all associated services,
          APIs, smart contracts, and reward programs.
        </>,
      ]} />
      <P>
        Termination of your access does not affect the validity of transactions already finalized
        on the Hedera network. Tokens and NFTs in your wallet remain your property and under your
        custody on-chain, but you will lose access to Platform-specific features (voting, staking,
        governance, leaderboards, and the Governors Hub).
      </P>

      <SubHead>13.4 Termination by You</SubHead>
      <P>
        You may terminate your relationship with the Platform at any time by disconnecting your
        wallet and ceasing all use of the Platform. There is no account deletion process because
        the Platform does not maintain user accounts — your identity is your Hedera Account ID.
        Historical vote records, leaderboard data, and snapshot records associated with your
        wallet will be retained as described in the Privacy Policy (Section 8).
      </P>

      <SubHead>13.5 Survival</SubHead>
      <P>
        The following sections of these Terms shall survive any termination or expiration:
      </P>
      <BulletList items={[
        <><Strong>Section 4</Strong> — NFT Ownership &amp; Intellectual Property (IP ownership, license limitations, user content license)</>,
        <><Strong>Section 5.6</Strong> — Token Disclaimer</>,
        <><Strong>Section 7.6</Strong> — No Guaranteed Returns</>,
        <><Strong>Section 9</Strong> — Prohibited Conduct (enforcement actions survive)</>,
        <><Strong>Section 10</Strong> — Disclaimers &amp; Risk Disclosures</>,
        <><Strong>Section 11</Strong> — Limitation of Liability (including indemnification)</>,
        <><Strong>Section 12</Strong> — Dispute Resolution &amp; Governing Law</>,
        <><Strong>Section 13</Strong> — Modifications, Termination &amp; General Provisions (survival, severability, entire agreement)</>,
      ]} />

      <SubHead>13.6 Severability</SubHead>
      <P>
        If any provision of these Terms is held to be invalid, illegal, or unenforceable by a
        court of competent jurisdiction or arbitrator, such provision shall be modified to the
        minimum extent necessary to make it valid, legal, and enforceable while preserving its
        original intent. If modification is not possible, the provision shall be severed from
        these Terms. The invalidity or unenforceability of any provision shall not affect the
        validity or enforceability of the remaining provisions, which shall continue in full
        force and effect.
      </P>

      <SubHead>13.7 Entire Agreement</SubHead>
      <P>
        These Terms, together with the{" "}
        <ExtLink href="/privacy">Privacy Policy</ExtLink> and the{" "}
        <ExtLink href="/whitepaper">Whitepaper</ExtLink> (to the extent it describes token
        mechanics, NFT functionality, or platform operations), constitute the entire agreement
        between you and the WCO regarding your use of the Platform. These Terms supersede all
        prior or contemporaneous communications, proposals, representations, and agreements,
        whether oral or written, relating to the Platform. No statement, representation,
        warranty, or agreement not expressly set forth in these Terms shall be binding on
        either party.
      </P>

      <SubHead>13.8 No Waiver</SubHead>
      <P>
        The failure of the WCO to enforce any right or provision of these Terms shall not
        constitute a waiver of such right or provision. Any waiver of any provision of these Terms
        will be effective only if in writing and signed by an authorized representative of the
        WCO. A waiver of any right on one occasion shall not be construed as a waiver of any
        right on any subsequent occasion.
      </P>

      <SubHead>13.9 Assignment</SubHead>
      <P>
        You may not assign or transfer these Terms, or any rights or obligations hereunder,
        without the prior written consent of the WCO. The WCO may freely assign or transfer
        these Terms and its rights and obligations hereunder without restriction and without
        notice to you. Any purported assignment in violation of this section is void.
      </P>

      <SubHead>13.10 Contact Information</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            CONTACT DETAILS
          </span>
        </div>
        <div className="px-4 py-3 space-y-2 text-xs">
          <div><span className="text-[#6AA3E0] font-semibold">Organization:</span>{" "}
            <span className="text-[#B0BCC9]">World Calisthenics Organization (WCO)</span>
          </div>
          <div><span className="text-[#6AA3E0] font-semibold">Website:</span>{" "}
            <ExtLink href="https://worldcalisthenics.org">worldcalisthenics.org</ExtLink>
          </div>
          <div><span className="text-[#6AA3E0] font-semibold">Platform:</span>{" "}
            <span className="text-[#B0BCC9]">Battle of the Bars (BOTB)</span>
          </div>
          <div><span className="text-[#6AA3E0] font-semibold">Subject Line for Disputes:</span>{" "}
            <span className="text-[#B0BCC9]">&quot;BOTB Terms Inquiry — [Your Hedera Account ID]&quot;</span>
          </div>
        </div>
      </div>
      <P>
        For general inquiries, feedback, or DMCA takedown notices, please use the contact
        information listed above. For dispute notices required under Section 12.1, you must
        include all information specified in that section.
      </P>
    </PolicySection>
  );
}