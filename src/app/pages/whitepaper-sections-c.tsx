/**
 * Whitepaper — Sections 12-13
 * =============================
 * Step 17: Section 12 (Governor Governance Model)
 * Step 18: Section 13 (Competition Mechanics)
 *
 * All facts verified against index.tsx (server routes):
 *   - Proposal lifecycle: draft → active → passed/rejected; cancelled at any point
 *   - allowedTransitions: draft→[active,cancelled], active→[passed,rejected,cancelled],
 *     passed→[cancelled], rejected→[cancelled], cancelled→[]
 *   - Category taxonomy: "Governance", "Treasury", "Technical", "Community", "Partnership"
 *   - Proposal fields: title, description, category, status, proposer, votesFor, votesAgainst,
 *     totalVoters, startsAt (auto-set on activation), endsAt, resolvedAt
 *   - Votes are power-weighted: votesFor += power (not += 1)
 *   - One vote per wallet per proposal (duplicate check)
 *   - Skill voting: 5 WCO categories (Statics, Dynamics, Power Dynamics, Combinations & Flow, Offense & Defense)
 *     adjustments ±0.5, formula: skills[f] += adjustment * power * 0.1, clamped 0-10
 *   - Skill votes allow re-voting (overwrite)
 *   - Bracket: 2-128 athletes, snake seeding (1v12, 2v11, ...)
 *   - Auto round generation: Round 1 → Quarter-Finals → Semi-Finals → Finals
 *   - Prize pool: 40% of total to R1, divided equally across matches
 *   - Battle statuses: draft → upcoming → voting_open → voting_closed → winner_declared →
 *     rewards_distributed (forward-only, cancelled always allowed)
 *   - Admin-controlled voting open/close, explicit votingClosesAt enforcement
 *   - One vote per wallet per battle, mirror-node anti-spoofing
 *   - Winner declaration: updates athlete win/loss/streak, generates snapshot
 *   - Snapshot: filters winning voters, computes sharePercent + rewardAmount per wallet
 *   - Export: CSV (wallet,stakeAmount,votingPower,weightedVote,sharePercent,rewardAmount,
 *     hasGovernorNFT,hasSigmaNFT) or JSON with metadata
 *   - Confirm airdrop: records airdropTxId, transitions to rewards_distributed
 *   - Athlete leaderboard score: (wins*10)+(winRate*20)+(powerRating*2)+(streak*3)+(totalVotes*0.5)
 *   - Voter leaderboard score: weightedPower+(accuracy*totalVotes*0.1)+(rewards*0.01)+(proposals*2)
 */

import React from "react";
import {
  Shield, Swords,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// SECTION 12 — GOVERNOR GOVERNANCE MODEL
// =============================================================================

export function Section12_GovernanceModel() {
  return (
    <PolicySection num={12} title="GOVERNOR GOVERNANCE MODEL" icon={<Shield className="w-4 h-4" />}>
      <P>
        Governance on BOTB is a structured, on-platform process managed through proposals that
        follow a defined lifecycle. Only WCO admin wallets (server-side whitelist, never exposed in client code) can create
        proposals and transition their status, but all connected wallets can vote — with Governor
        NFT holders receiving 2x (or 3x) weighted voting influence.
      </P>

      <SubHead>12.1 Proposal Lifecycle</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 space-y-1 leading-relaxed">
        <div className="text-[#8494A7]">{"// Proposal Status State Machine"}</div>
        <div className="text-[#8494A7]">{""}</div>
        <div className="text-[#6AA3E0]">{"  draft ──────→ active ──────→ passed"}</div>
        <div className="text-[#6AA3E0]">{"    │              │              │"}</div>
        <div className="text-[#6AA3E0]">{"    │              ├─────→ rejected"}</div>
        <div className="text-[#6AA3E0]">{"    │              │              │"}</div>
        <div className="text-red-400">{"    └─→ cancelled ←┘←─────────┘"}</div>
        <div className="text-[#8494A7]">{""}</div>
        <div className="text-[#8494A7]">{"// Transitions are forward-only (cancelled always allowed)"}</div>
      </div>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            ALLOWED STATUS TRANSITIONS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["draft", "active, cancelled", "Proposal is being drafted. Not yet visible for voting."],
            ["active", "passed, rejected, cancelled", "Voting is open. startsAt is auto-set on activation. Votes accepted until endsAt deadline."],
            ["passed", "cancelled", "Votes For exceed Votes Against. Proposal is adopted. resolvedAt is recorded."],
            ["rejected", "cancelled", "Votes Against exceed Votes For. Proposal is not adopted. resolvedAt is recorded."],
            ["cancelled", "(terminal)", "Proposal is permanently cancelled. No further transitions allowed."],
          ] as [string, string, string][]).map(([status, targets, desc]) => (
            <div key={status} className="px-4 py-2.5">
              <div className="flex items-center gap-3 mb-1">
                <code className="text-[#6AA3E0] font-mono font-semibold w-20 shrink-0">{status}</code>
                <span className="text-[#B0BCC9] font-mono text-[0.65rem]">{"\u2192"} {targets}</span>
              </div>
              <div className="text-[#8494A7] pl-[5.5rem]">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>12.2 Proposal Fields</SubHead>
      <P>
        Each proposal is stored at <Code>proposal:{"{id}"}</Code> in the KV store with the
        following structure:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["title", "Proposal title (max 200 chars, sanitized)"],
            ["description", "Full proposal text (max 5,000 chars, sanitized)"],
            ["category", "One of: Governance, Treasury, Technical, Community, Partnership"],
            ["status", "Current lifecycle status (draft/active/passed/rejected/cancelled)"],
            ["proposer", "Display name of the proposing entity (default: \"WCO Admin\")"],
            ["votesFor", "Cumulative power-weighted votes in favor"],
            ["votesAgainst", "Cumulative power-weighted votes against"],
            ["totalVoters", "Count of unique wallets that have voted"],
            ["startsAt", "Voting start timestamp (auto-set when moved to active)"],
            ["endsAt", "Voting deadline (votes rejected after this timestamp)"],
            ["resolvedAt", "Timestamp when proposal was passed or rejected"],
          ] as [string, string][]).map(([field, desc]) => (
            <div key={field} className="flex gap-3 px-4 py-2">
              <code className="text-[#6AA3E0] font-mono shrink-0 w-32">{field}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>12.3 Category Taxonomy</SubHead>
      <P>
        Proposals are categorized into five domains that align with the Governor
        NFT holders&apos; areas of authority:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Governance", "Platform rules, voting mechanics, proposal process changes, Governor authority scope", "#f59e0b"],
            ["Treasury", "Governor Control Supply allocation (500M BOTB), LP pool funding, DeFi integrations, Only Gains rewards, ecosystem fund distribution", "#6AA3E0"],
            ["Technical", "Platform feature requests, architecture changes, Hedera integration decisions, smart contract deployments", "#7C5CDB"],
            ["Community", "Event formats, community programs, partnership approvals, athlete onboarding criteria", "#10b981"],
            ["Partnership", "Brand collaborations, Meta Series matchup approvals, influencer deals, cross-platform integrations", "#f59e0b"],
          ] as [string, string, string][]).map(([cat, scope, color]) => (
            <div key={cat} className="px-4 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[#E8ECF0] font-semibold">{cat}</span>
              </div>
              <div className="text-[#8494A7] pl-4">{scope}</div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>12.4 Voting Mechanics</SubHead>
      <BulletList items={[
        <><Strong>One vote per wallet per proposal.</Strong> Duplicate votes are rejected (HTTP 409). The vote key <Code>vote:proposal:{"{proposalId}"}:{"{wallet}"}</Code> ensures uniqueness.</>,
        <><Strong>Power-weighted tallies.</Strong> When a Governor (2x) votes "for," the proposal&apos;s <Code>votesFor</Code> increases by 2, not by 1. A 3x Governor+Sigma voter adds 3 to the tally. This means Governor votes carry substantially more weight than base votes.</>,
        <><Strong>Direction:</Strong> Each vote is either <Code>"for"</Code> or <Code>"against"</Code>. No abstention option.</>,
        <><Strong>Anti-spoofing:</Strong> Wallet existence is verified against the Hedera Mirror Node before the vote is accepted.</>,
        <><Strong>Deadline enforcement:</Strong> If <Code>endsAt</Code> is set on the proposal, votes submitted after the deadline are rejected.</>,
      ]} />
      <Callout type="info">
        <Strong>No quorum requirement (current version):</Strong> In the current implementation,
        proposals are resolved by admin status transition (admin moves proposal to "passed" or
        "rejected" based on the weighted vote tallies). There is no automatic quorum threshold
        that auto-resolves proposals. This is a deliberate beta-phase design choice — quorum
        mechanics will be introduced in a future governance upgrade once the active voter base
        reaches critical mass.
      </Callout>

      <SubHead>12.5 Admin Oversight Powers</SubHead>
      <P>
        Admin wallets (via <Code>requireAdminSession</Code> middleware) have the following
        governance authorities:
      </P>
      <BulletList items={[
        <><Strong>Create proposals:</Strong> POST /admin/proposals — set title, description, category, status, dates.</>,
        <><Strong>Activate proposals:</Strong> POST /admin/proposals/:id/status — transition from draft to active (starts the voting window).</>,
        <><Strong>Resolve proposals:</Strong> Transition active proposals to passed or rejected based on weighted tallies.</>,
        <><Strong>Cancel proposals:</Strong> Any proposal can be cancelled at any stage (except already-cancelled proposals).</>,
        <><Strong>Update site config:</Strong> Toggle platform-wide settings (votingEnabled, mintingEnabled, stakingEnabled).</>,
      ]} />

      <SubHead>12.6 Skill Rating System</SubHead>
      <P>
        Athlete skill ratings are set exclusively by WCO administrators based on official judging
        criteria and real competition performance. There is no public voting endpoint for skill
        adjustments — this ensures ratings remain grounded in objective athletic assessment rather
        than popularity metrics.
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            SKILL CATEGORIES (1-10 SCALE)
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Power Dynamics", "Strength-based explosive skills — planche push-ups, front lever pull-ups, pelican, Van Gelder"],
            ["Combinations & Flow", "Linking elements, routine cohesion, rhythm, static-to-dynamic transitions, creativity"],
            ["Statics", "Planche, front lever, Maltese, inverted cross — control, clean lines, full lockouts"],
            ["Offense & Defense", "Battle dynamics — initiative, competitive response, real-time adaptation, improvisation"],
            ["Dynamics", "Swing-based elements, super moves (720s, 900s), releases, amplitude, landing control"],
          ] as [string, string][]).map(([cat, desc]) => (
            <div key={cat} className="flex gap-3 px-4 py-2">
              <span className="text-[#6AA3E0] font-semibold shrink-0 w-40">{cat}</span>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>12.6.1 Governor Proposal Path for Skill Changes</SubHead>
      <BulletList items={[
        <><Strong>Admin authority:</Strong> Only WCO administrators can directly modify athlete skill values via the Admin Panel athlete editor. Skills are set based on real competition results and official WCO judging standards.</>,
        <><Strong>Governor proposals:</Strong> Governor NFT holders who believe a skill rating should change can submit a governance proposal through the Governors Hub. The proposal must specify which athlete, which category, and the requested adjustment with justification.</>,
        <><Strong>Community vote:</Strong> Once an admin approves the proposal for voting, all Governor NFT holders vote on whether to accept the change. Votes are power-weighted (2x Governor, 3x Governor+Sigma).</>,
        <><Strong>Admin implementation:</Strong> If the proposal passes, the WCO admin implements the skill change. This ensures every rating change has community consensus and administrative oversight.</>,
        <><Strong>Total Power Rating:</Strong> After any admin skill update, the athlete&apos;s <Code>totalPowerRating</Code> is recomputed as the sum of all five skill values. This feeds into the leaderboard composite score.</>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 13 — COMPETITION MECHANICS
// =============================================================================

export function Section13_CompetitionMechanics() {
  return (
    <PolicySection num={13} title="COMPETITION MECHANICS" icon={<Swords className="w-4 h-4" />}>
      <P>
        Competitions on BOTB follow a structured bracket format managed entirely through the
        admin API. Events contain one or more rounds of battles, with automated bracket
        generation, real-time vote tracking, winner declaration, and reward snapshot creation.
      </P>

      <SubHead>13.1 Event & Bracket Generation</SubHead>
      <P>
        The <Code>POST /admin/events/generate</Code> endpoint creates a complete event structure
        with auto-generated Round 1 matchups:
      </P>
      <NumberedList items={[
        "Admin provides: event name, description, location, dates, prize pool, and a bracket array assigning athletes to numbered seats (2-128 athletes supported).",
        "All athlete IDs are validated against the KV store — non-existent athletes cause a 404 rejection.",
        "Snake seeding algorithm pairs top seeds against bottom seeds: Seat 1 vs. Seat N, Seat 2 vs. Seat N-1, Seat 3 vs. Seat N-2, and so on. This maximizes competitive balance in early rounds.",
        "Round 1 battles are automatically created and persisted, each receiving an equal share of 40% of the total prize pool.",
        "Subsequent rounds (Quarter-Finals, Semi-Finals, Finals) are pre-structured with placeholder battle IDs. Actual battles are created when winners are declared from the previous round.",
      ]} />
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-0.5">
        <div className="text-[#8494A7]">{"// Snake Seeding Example (8 athletes)"}</div>
        <div><span className="text-[#6AA3E0]">Seat 1</span> vs <span className="text-[#f59e0b]">Seat 8</span>  {"\u2192"} Battle 1</div>
        <div><span className="text-[#6AA3E0]">Seat 2</span> vs <span className="text-[#f59e0b]">Seat 7</span>  {"\u2192"} Battle 2</div>
        <div><span className="text-[#6AA3E0]">Seat 3</span> vs <span className="text-[#f59e0b]">Seat 6</span>  {"\u2192"} Battle 3</div>
        <div><span className="text-[#6AA3E0]">Seat 4</span> vs <span className="text-[#f59e0b]">Seat 5</span>  {"\u2192"} Battle 4</div>
        <div className="text-[#8494A7]">{"// Round 1: 4 battles | Semi-Finals: 2 | Finals: 1"}</div>
      </div>

      <SubHead>13.2 Round Naming</SubHead>
      <P>
        The server auto-computes round names based on the number of remaining matches:
      </P>
      <BulletList items={[
        <><Strong>Finals:</Strong> 1 match remaining (2 athletes).</>,
        <><Strong>Semi-Finals:</Strong> 2 matches remaining (4 athletes).</>,
        <><Strong>Quarter-Finals:</Strong> 3-4 matches remaining.</>,
        <><Strong>Round N:</Strong> All earlier rounds use numeric naming.</>,
        <><Strong>Bye support:</Strong> Odd-count rounds carry one athlete forward automatically.</>,
      ]} />

      <SubHead>13.3 Battle Status Lifecycle</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 space-y-1 leading-relaxed">
        <div className="text-[#8494A7]">{"// Battle Status State Machine (forward-only)"}</div>
        <div className="text-[#6AA3E0]">draft {"\u2192"} upcoming {"\u2192"} voting_open {"\u2192"} voting_closed {"\u2192"} winner_declared {"\u2192"} rewards_distributed</div>
        <div className="text-[#8494A7]">{"//                                                                  ↑"}</div>
        <div className="text-red-400">{"// cancelled (allowed from any status)"}</div>
      </div>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["draft", "Battle created but not yet scheduled. Not visible to voters.", "#8494A7"],
            ["upcoming", "Scheduled and visible. Voting not yet open.", "#6AA3E0"],
            ["voting_open", "Votes accepted. Real-time tally updates on each vote.", "#10b981"],
            ["voting_closed", "Voting window has ended. No new votes accepted. Tallies frozen.", "#f59e0b"],
            ["winner_declared", "Admin has declared the IRL winner. Reward snapshot auto-generated.", "#7C5CDB"],
            ["rewards_distributed", "Airdrop confirmed. Battle is complete. Final state.", "#10b981"],
            ["cancelled", "Battle cancelled. Terminal state from any prior status.", "#ef4444"],
          ] as [string, string, string][]).map(([status, desc, color]) => (
            <div key={status} className="flex items-center gap-3 px-4 py-2">
              <code className="font-mono font-semibold shrink-0 w-44" style={{ color }}>{status}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <Callout type="warning">
        <Strong>Forward-only transitions:</Strong> The server enforces that battle status can only
        move forward through the lifecycle. Attempting to move backwards (e.g., from
        voting_closed to voting_open) returns a 400 error with a message detailing the allowed
        flow: <Code>draft {"\u2192"} upcoming {"\u2192"} voting_open {"\u2192"} voting_closed {"\u2192"} winner_declared {"\u2192"} rewards_distributed</Code>.
      </Callout>

      <SubHead>13.4 Voting Window Management</SubHead>
      <P>
        Two independent mechanisms control when voting closes:
      </P>
      <BulletList items={[
        <><Strong>Admin-controlled status transition:</Strong> Administrators manually transition battles from voting_open to voting_closed at the appropriate time via the Admin Command Center. This gives full control over when voting closes for each battle.</>,
        <><Strong>Explicit votingClosesAt:</Strong> If set on the battle record, voting is rejected after this timestamp regardless of admin action.</>,
      ]} />

      <SubHead>13.5 Vote Recording</SubHead>
      <P>
        Each battle vote is stored at <Code>vote:battle:{"{battleId}"}:{"{wallet}"}</Code> and
        contains:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["battleId", "Reference to the parent battle"],
            ["wallet", "Voter's Hedera account ID (validated format + Mirror Node existence)"],
            ["athleteId", "The chosen athlete (validated as one of the two battle participants)"],
            ["stakeAmount", "BOTB tokens committed to this vote"],
            ["votingPower", "NFT-based multiplier (1x, 1.5x, 2x, or 3x)"],
            ["weightedVote", "stakeAmount \u00D7 votingPower — determines reward share"],
            ["hasGovernorNFT", "Boolean flag for audit trail"],
            ["hasSigmaNFT", "Boolean flag for audit trail"],
            ["timestamp", "ISO 8601 timestamp of vote submission"],
          ] as [string, string][]).map(([field, desc]) => (
            <div key={field} className="flex gap-3 px-4 py-2">
              <code className="text-[#6AA3E0] font-mono shrink-0 w-32">{field}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        On each vote, the battle record is immediately updated with incremented
        vote counts (<Code>votes1Count</Code> / <Code>votes2Count</Code>) and
        weighted tallies (<Code>votes1Weighted</Code> / <Code>votes2Weighted</Code>),
        enabling real-time display of vote distributions on the frontend.
      </P>

      <SubHead>13.6 Winner Declaration & Snapshot</SubHead>
      <P>
        Winner declaration (<Code>POST /admin/battles/:id/winner</Code>) triggers a multi-step
        process:
      </P>
      <NumberedList items={[
        "Admin provides the winnerId (must match one of the two battle athletes).",
        "Battle status transitions to winner_declared, and the winnerId is recorded.",
        "Winner's athlete record: wins incremented by 1, streak incremented by 1.",
        "Loser's athlete record: losses incremented by 1, streak reset to 0.",
        "Reward snapshot generated: all votes for the winning athlete are collected.",
        "For each winning voter: sharePercent = (weightedVote / totalWinningWeighted) \u00D7 100; rewardAmount = sharePercent \u00D7 totalPool.",
        "Snapshot sorted by rewardAmount descending and persisted at snapshot:{battleId}.",
      ]} />

      <SubHead>13.7 Reward Snapshot Schema</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-0.5">
        <div>{"{"}</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"battleId"</span>: <span className="text-[#10b981]">"btl-xxxxx"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"eventId"</span>: <span className="text-[#10b981]">"evt-xxxxx"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"winnerId"</span>: <span className="text-[#10b981]">"ath-xxxxx"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"winnerName"</span>: <span className="text-[#10b981]">"Tony Gaste"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"totalPool"</span>: <span className="text-[#f59e0b]">50000</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"totalWinningVotes"</span>: <span className="text-[#f59e0b]">12500</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"recipients"</span>: [</div>
        <div>{"    "}{"{"} <span className="text-[#6AA3E0]">"wallet"</span>: <span className="text-[#10b981]">"0.0.XXXXXXX"</span>, <span className="text-[#6AA3E0]">"sharePercent"</span>: <span className="text-[#f59e0b]">24.0</span>, <span className="text-[#6AA3E0]">"rewardAmount"</span>: <span className="text-[#f59e0b]">12000</span>, ... {"}"}</div>
        <div>{"    "}{"{"} <span className="text-[#6AA3E0]">"wallet"</span>: <span className="text-[#10b981]">"0.0.XXXXXXX"</span>, <span className="text-[#6AA3E0]">"sharePercent"</span>: <span className="text-[#f59e0b]">16.0</span>, <span className="text-[#6AA3E0]">"rewardAmount"</span>: <span className="text-[#f59e0b]">8000</span>, ... {"}"}</div>
        <div>{"    "}...</div>
        <div>{"  "}],</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"generatedAt"</span>: <span className="text-[#10b981]">"2026-03-07T12:00:00.000Z"</span></div>
        <div>{"}"}</div>
      </div>

      <SubHead>13.8 Airdrop Export & Confirmation</SubHead>
      <P>
        Admins export the reward snapshot for off-platform airdrop execution:
      </P>
      <BulletList items={[
        <><Strong>CSV export</Strong> (<Code>GET /admin/snapshots/:id/export?format=csv</Code>): Downloads a CSV file with columns: wallet, stakeAmount, votingPower, weightedVote, sharePercent, rewardAmount, hasGovernorNFT, hasSigmaNFT. Filename: <Code>botb-airdrop-{"{battleId}"}.csv</Code>.</>,
        <><Strong>JSON export</Strong> (<Code>GET /admin/snapshots/:id/export?format=json</Code>): Downloads a structured JSON payload with battle metadata and recipient array. Filename: <Code>botb-airdrop-{"{battleId}"}.json</Code>.</>,
        <><Strong>Airdrop confirmation</Strong> (<Code>POST /admin/battles/:id/confirm-airdrop</Code>): Admin provides an optional <Code>airdropTxId</Code> (Hedera transaction ID). The snapshot is updated with <Code>airdropConfirmedAt</Code> timestamp, and the battle status transitions to <Code>rewards_distributed</Code> (terminal).</>,
      ]} />
      <Callout type="info">
        <Strong>Export timestamps:</Strong> The first export of a snapshot records an{" "}
        <Code>exportedAt</Code> timestamp, providing an audit trail of when reward data was
        extracted for processing.
      </Callout>

      <SubHead>13.9 Leaderboard Scoring</SubHead>
      <P>
        Two independent leaderboards aggregate live data from the KV store:
      </P>

      <SubHead>13.9.1 Athlete Leaderboard</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10">
        <div><span className="text-[#6AA3E0]">compositeScore</span> =</div>
        <div>{"  "}(<span className="text-[#f59e0b]">wins</span> {"\u00D7"} 10) + (<span className="text-[#f59e0b]">winRate</span> {"\u00D7"} 20) + (<span className="text-[#f59e0b]">totalPowerRating</span> {"\u00D7"} 2) + (<span className="text-[#f59e0b]">streak</span> {"\u00D7"} 3) + (<span className="text-[#f59e0b]">totalVotes</span> {"\u00D7"} 0.5)</div>
      </div>
      <P>
        Athletes are ranked by descending composite score. Rankings update dynamically after
        each battle result.
      </P>

      <SubHead>13.9.2 Voter Leaderboard</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10">
        <div><span className="text-[#6AA3E0]">voterScore</span> =</div>
        <div>{"  "}<span className="text-[#f59e0b]">totalWeightedPower</span> + (<span className="text-[#f59e0b]">accuracy</span> {"\u00D7"} <span className="text-[#f59e0b]">totalVotes</span> {"\u00D7"} 0.1) + (<span className="text-[#f59e0b]">rewardsEarned</span> {"\u00D7"} 0.01) + (<span className="text-[#f59e0b]">proposalVotes</span> {"\u00D7"} 2)</div>
      </div>
      <P>
        The voter leaderboard aggregates battle votes, proposal votes, and reward history
        across all battles. Accuracy is computed as the percentage of battle votes where the
        voter correctly predicted the winner. Proposal participation carries a 2x multiplier
        to incentivize governance engagement.
      </P>
    </PolicySection>
  );
}