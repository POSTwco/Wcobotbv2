/**
 * Whitepaper — Sections 4-8 (Technical Architecture Deep-Dive)
 * ==============================================================
 * Step 15: Section 4 (Platform Architecture), Section 5 (Hedera Hashgraph),
 *          Section 6 (HTS Design), Section 7 (HCS Design),
 *          Section 8 (WalletConnect & Authentication)
 *
 * All facts verified against the actual codebase:
 *   - hedera-config.ts: HEDERA_NETWORKS (mainnet chainRef 295, mirrorNodeUrl),
 *     TOKEN_IDS (BOTB null, Governor 0.0.9338241, Sigma/Meta placeholder),
 *     TOPIC_IDS (VOTES, GOVERNANCE), WC_PROJECT_ID, WC_APP_METADATA,
 *     HEDERA_WC_METHODS (3 methods), HEDERA_WC_EVENTS (2 events),
 *     MIRROR_PATHS (balances, account, nfts, token, transaction, topic_messages)
 *   - hedera-mirror.ts: TINYBAR_DIVISOR (100M), mirrorFetch, getAccountBalance,
 *     getAccountNFTs (100/page, maxPages=10), fetchWalletBalances (parallel),
 *     categorizeNFTs, computeVotingPower, isValidAccountId regex
 *   - wallet-connect.ts: SignClient, WalletConnectModal, findExtensions,
 *     extensionOpen/Connect (HIP-820), createSessionProposal, completeSessionApproval,
 *     openWCModal/closeWCModal, signMessage, relay health (idle→initializing→ready/error),
 *     exponential backoff retry (3 attempts: 1s/2s/4s), init timeout (15s),
 *     session ping validation, stale pairing cleanup
 *   - wallet-context.tsx: balance polling (30s interval), auto-reconnect on mount,
 *     isAdmin via api.checkAdmin, ZERO_BALANCES defaults
 *   - admin-auth.tsx: ADMIN_WALLETS Set (two WCO executive wallets, server-only),
 *     CHALLENGE_TTL_MS (5min), SESSION_TTL_MS (20min),
 *     rate limits (10/min vote, 3/5min challenge, 60/min general),
 *     sanitizeString (HTML/script strip, 5000 char limit),
 *     isValidHederaAccountId regex, generateNonce (32-byte random hex),
 *     generateSessionToken (crypto.randomUUID)
 *   - index.tsx: Hono server, ~27+ routes, KV-backed persistence
 */

import React from "react";
import {
  Layers, Cpu, Coins, MessageSquare, Wallet,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// SECTION 4 — PLATFORM ARCHITECTURE
// =============================================================================

export function Section4_Architecture() {
  return (
    <PolicySection num={4} title="PLATFORM ARCHITECTURE" icon={<Layers className="w-4 h-4" />}>
      <P>
        BOTB follows a three-tier architecture separating the presentation layer, application
        logic, and data persistence. This design enables independent scaling, security isolation
        between frontend and backend, and clear separation of concerns.
      </P>

      <SubHead>4.1 Architecture Overview</SubHead>
      <div className="mt-3 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 space-y-1 leading-relaxed overflow-x-auto">
        <div className="text-[#8494A7]">{"// BOTB Three-Tier Architecture"}</div>
        <div className="text-[#8494A7]">{""}</div>
        <div className="text-[#6AA3E0]">{"┌─────────────────────────────────────────────────────┐"}</div>
        <div className="text-[#6AA3E0]">{"│  TIER 1: FRONTEND (React + Tailwind CSS)            │"}</div>
        <div className="text-[#6AA3E0]">{"│  ─────────────────────────────────────────           │"}</div>
        <div className="text-[#B0BCC9]">{"│  React 19 SPA with React Router (Data mode)         │"}</div>
        <div className="text-[#B0BCC9]">{"│  WalletConnect v2 SignClient + Official Modal        │"}</div>
        <div className="text-[#B0BCC9]">{"│  HIP-820 HashPack extension detection                │"}</div>
        <div className="text-[#B0BCC9]">{"│  Hedera Mirror Node (direct balance/NFT queries)     │"}</div>
        <div className="text-[#B0BCC9]">{"│  30-second balance polling interval                  │"}</div>
        <div className="text-[#6AA3E0]">{"└──────────────────────┬──────────────────────────────┘"}</div>
        <div className="text-[#8494A7]">{"                       │ HTTPS (Authorization: Bearer)"}</div>
        <div className="text-[#f59e0b]">{"┌──────────────────────┴──────────────────────────────┐"}</div>
        <div className="text-[#f59e0b]">{"│  TIER 2: APPLICATION SERVER (Hono on Deno)          │"}</div>
        <div className="text-[#f59e0b]">{"│  ─────────────────────────────────────────           │"}</div>
        <div className="text-[#B0BCC9]">{"│  Supabase Edge Function (Deno runtime)               │"}</div>
        <div className="text-[#B0BCC9]">{"│  Hono web framework with CORS + logging              │"}</div>
        <div className="text-[#B0BCC9]">{"│  27+ REST API routes                                 │"}</div>
        <div className="text-[#B0BCC9]">{"│  3-layer admin auth (whitelist + mirror + challenge)  │"}</div>
        <div className="text-[#B0BCC9]">{"│  Rate limiting (10/min vote, 3/5min admin, 60/min)   │"}</div>
        <div className="text-[#B0BCC9]">{"│  Input sanitization (HTML/script strip)              │"}</div>
        <div className="text-[#f59e0b]">{"└──────────┬───────────────────────┬──────────────────┘"}</div>
        <div className="text-[#8494A7]">{"           │                       │"}</div>
        <div className="text-[#10b981]">{"┌──────────┴──────────┐ ┌─────────┴──────────────────┐"}</div>
        <div className="text-[#10b981]">{"│ TIER 3a: KV STORE   │ │ TIER 3b: HEDERA NETWORK   │"}</div>
        <div className="text-[#10b981]">{"│ ─────────────────── │ │ ───────────────────────── │"}</div>
        <div className="text-[#B0BCC9]">{"│ Supabase Postgres   │ │ Mirror Node (read)        │"}</div>
        <div className="text-[#B0BCC9]">{"│ KV table (get/set/  │ │ HCS topics (write)        │"}</div>
        <div className="text-[#B0BCC9]">{"│ del/mget/mset/mdel/ │ │ HTS tokens (read)         │"}</div>
        <div className="text-[#B0BCC9]">{"│ getByPrefix)        │ │ Account verification      │"}</div>
        <div className="text-[#10b981]">{"└─────────────────────┘ └──────────────────────────┘"}</div>
      </div>

      <SubHead>4.2 Frontend Layer</SubHead>
      <P>
        The frontend is a React 19 single-page application built with Tailwind CSS v4 and
        React Router in Data mode. Key architectural decisions:
      </P>
      <BulletList items={[
        <><Strong>Component architecture:</Strong> Modular page components (<Code>home.tsx</Code>, <Code>battles.tsx</Code>, <Code>athletes.tsx</Code>, <Code>governance.tsx</Code>, <Code>leaderboard.tsx</Code>, <Code>nfts.tsx</Code>) with shared layout components and a global wallet context provider.</>,
        <><Strong>Wallet state management:</Strong> A React Context (<Code>wallet-context.tsx</Code>) wraps the entire application, providing wallet connection state, balance data, NFT holdings, voting power, and admin status to all child components.</>,
        <><Strong>Direct Mirror Node queries:</Strong> The frontend queries the Hedera Mirror Node directly for balance and NFT data (no server round-trip required for read operations). This reduces server load and provides real-time data freshness.</>,
        <><Strong>WalletConnect integration:</Strong> The <Code>wallet-connect.ts</Code> module manages the SignClient lifecycle, session proposals, approval handling, and the official WalletConnect modal. HIP-820 extension detection enables direct HashPack browser extension connections.</>,
        <><Strong>Design system:</Strong> WCO brand styling with primary <Code>#4274B9</Code>, accent <Code>#6AA3E0</Code>, dark navy backgrounds, DM Sans body typography, and Orbitron headings — consistent across all 6 core pages plus legal documents.</>,
      ]} />

      <SubHead>4.3 Application Server</SubHead>
      <P>
        The backend is a Hono web server running as a Supabase Edge Function on the Deno
        runtime. It serves as the sole write interface for all platform data:
      </P>
      <BulletList items={[
        <><Strong>Framework:</Strong> Hono — a lightweight, performant web framework with built-in middleware support for CORS, logging, and route composition.</>,
        <><Strong>Runtime:</Strong> Deno — a secure JavaScript/TypeScript runtime with built-in TypeScript support, no <Code>node_modules</Code>, and granular permission controls.</>,
        <><Strong>Route count:</Strong> 27+ REST API endpoints covering athletes, battles, events, votes (battle/proposal), governance proposals, leaderboard, NFTs, admin operations (CRUD, winner declaration, snapshot export, airdrop confirmation), and authentication. Skill voting was removed — skills are now admin-only with Governor proposal oversight.</>,
        <><Strong>Security:</Strong> Three-layer admin authentication, per-wallet rate limiting with sliding-window algorithm, HTML/script tag stripping on all string inputs, Hedera account ID format validation, and CORS headers on all responses.</>,
        <><Strong>Data persistence:</Strong> All application state is stored in a Supabase Postgres key-value table with structured key prefixes (<Code>athlete:</Code>, <Code>battle:</Code>, <Code>vote:</Code>, <Code>proposal:</Code>, <Code>snapshot:</Code>, <Code>event:</Code>, etc.).</>,
      ]} />

      <SubHead>4.4 Data Layer</SubHead>
      <P>
        The KV store provides flexible, schema-free persistence with structured key conventions:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            KEY PREFIX CONVENTIONS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["athlete:{id}", "Athlete profile (name, nationality, weight class, record, streak)"],
            ["battle:{id}", "Battle record (athletes, status, votes, winner, timestamps)"],
            ["vote:battle:{battleId}:{wallet}", "Individual battle vote (athleteId, stakeAmount, votingPower, weightedVote)"],
            ["vote:proposal:{proposalId}:{wallet}", "Governance vote (direction, votingPower, weightedVote)"],
            ["vote:skill:{athleteId}:{wallet}", "Legacy skill rating vote (deprecated — skills now admin-only)"],
            ["proposal:{id}", "Governance proposal (title, description, status, tallies)"],
            ["snapshot:{battleId}", "Reward distribution snapshot (voter list, shares, amounts)"],
            ["event:{id}", "Competition event (name, date, location, battles)"],
            ["admin:challenge:{wallet}", "Admin auth challenge nonce (5-min TTL)"],
            ["admin:session:{token}", "Admin session record (20-min TTL)"],
          ] as [string, string][]).map(([key, desc]) => (
            <div key={key} className="flex gap-3 px-4 py-2">
              <code className="text-[#6AA3E0] font-mono shrink-0 w-64">{key}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        The KV interface exposes seven operations: <Code>get</Code>, <Code>set</Code>,{" "}
        <Code>del</Code>, <Code>mget</Code> (multi-get), <Code>mset</Code> (multi-set),{" "}
        <Code>mdel</Code> (multi-delete), and <Code>getByPrefix</Code> (pattern scan). This
        provides the flexibility of a document store with the simplicity of key-value semantics.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 5 — HEDERA HASHGRAPH INTEGRATION
// =============================================================================

export function Section5_HederaIntegration() {
  return (
    <PolicySection num={5} title="HEDERA HASHGRAPH INTEGRATION" icon={<Cpu className="w-4 h-4" />}>
      <P>
        Hedera Hashgraph is the distributed ledger technology underlying all BOTB on-chain
        operations. This section details the specific Hedera services utilized by the platform
        and the rationale for each integration.
      </P>

      <SubHead>5.1 Hedera Overview</SubHead>
      <P>
        Hedera is a public, proof-of-stake distributed ledger that uses the hashgraph consensus
        algorithm — an asynchronous Byzantine Fault Tolerant (aBFT) protocol that achieves
        consensus without traditional blockchain mining or block formation.
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            HEDERA NETWORK SPECIFICATIONS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          {([
            ["Consensus Algorithm", "Hashgraph (aBFT) — gossip about gossip + virtual voting"],
            ["Finality", "3-5 seconds, deterministic (no rollbacks, no reorgs)"],
            ["Throughput", "10,000+ TPS (base layer, no L2 required)"],
            ["Transaction Fees", "~$0.0001 USD (fixed, USD-denominated fee schedule)"],
            ["Governance", "Hedera Governing Council (39 term-limited organizations)"],
            ["Environmental", "Carbon-negative operation through carbon credit purchases"],
            ["CAIP-2 Chain ID", "hedera:mainnet (chain reference: 295)"],
            ["EVM Compatibility", "Hedera Smart Contract Service (EVM-equivalent via Besu)"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex gap-3 px-4 py-2 text-xs">
              <span className="text-[#6AA3E0] font-semibold shrink-0 w-40">{k}</span>
              <span className="text-[#B0BCC9]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>5.2 Network Configuration</SubHead>
      <P>
        BOTB's network configuration is centralized in <Code>hedera-config.ts</Code>, which
        defines both testnet and mainnet parameters. The active network is controlled by a single
        constant:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10">
        <div><span className="text-[#7C5CDB]">export const</span> <span className="text-[#6AA3E0]">DEFAULT_NETWORK</span>: <span className="text-[#f59e0b]">HederaNetwork</span> = <span className="text-[#10b981]">"mainnet"</span>;</div>
      </div>
      <P>
        Switching the entire platform between testnet and mainnet requires changing only this
        single value. All downstream code — Mirror Node URLs, CAIP-2 chain identifiers,
        explorer links, and JSON-RPC relay endpoints — derives from the active network config
        via <Code>getNetworkConfig()</Code>.
      </P>

      <SubHead>5.3 Mirror Node Integration</SubHead>
      <P>
        The Hedera Mirror Node provides read-only REST API access to the full state of the
        Hedera network. BOTB queries the Mirror Node for all on-chain data:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            MIRROR NODE API ENDPOINTS USED
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["/api/v1/balances?account.id={id}", "HBAR balance (tinybars \u00F7 100M) + HTS token balances"],
            ["/api/v1/accounts/{id}", "Full account info (staking, key, memo, EVM address)"],
            ["/api/v1/accounts/{id}/nfts", "Paginated NFT list (100/page, max 10 pages = 1000 NFTs)"],
            ["/api/v1/tokens/{id}", "Token metadata (name, symbol, supply, treasury)"],
            ["/api/v1/transactions/{id}", "Transaction details and receipt status"],
            ["/api/v1/topics/{id}/messages", "HCS topic messages (vote records)"],
          ] as [string, string][]).map(([endpoint, desc]) => (
            <div key={endpoint} className="flex gap-3 px-4 py-2">
              <code className="text-[#6AA3E0] font-mono shrink-0 min-w-[16rem]">{endpoint}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        All Mirror Node queries are routed through the <Code>mirrorFetch&lt;T&gt;()</Code> helper
        in <Code>hedera-mirror.ts</Code>, which provides typed responses, error handling,
        and diagnostic logging. Account IDs are validated against the regex{" "}
        <Code>/^0\.0\.\d{"{1,10}"}$/</Code> before any query to prevent injection.
      </P>

      <SubHead>5.4 Aggregated Wallet Query</SubHead>
      <P>
        The <Code>fetchWalletBalances()</Code> function executes balance and NFT queries in
        parallel using <Code>Promise.allSettled()</Code>, providing graceful degradation when
        individual queries fail. The returned <Code>WalletBalances</Code> object includes:
      </P>
      <BulletList items={[
        <>HBAR balance in display units (tinybars / 100,000,000)</>,
        <>BOTB fungible token balance (0 until token launches)</>,
        <>Total NFT count and per-collection breakdown (Governor, Sigma, Meta, Other)</>,
        <>Boolean flags for Governor and Sigma NFT ownership (used by <Code>computeVotingPower</Code>)</>,
        <>Raw token balance array and full NFT detail array</>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 6 — TOKEN SERVICE (HTS) DESIGN
// =============================================================================

export function Section6_HTSDesign() {
  return (
    <PolicySection num={6} title="TOKEN SERVICE (HTS) DESIGN" icon={<Coins className="w-4 h-4" />}>
      <P>
        The Hedera Token Service (HTS) provides native support for both fungible tokens and
        non-fungible tokens (NFTs) at the network protocol level. Unlike Ethereum's smart
        contract-based token standards (ERC-20, ERC-721), HTS tokens are first-class network
        entities managed directly by the Hedera consensus nodes.
      </P>

      <SubHead>6.1 HTS vs. Smart Contract Tokens</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Security model", "Native protocol-level validation", "Smart contract code (subject to bugs, reentrancy, overflow)"],
            ["Transaction cost", "~$0.0001 per transfer", "$0.50-$50+ (gas-dependent)"],
            ["Finality", "3-5 seconds, deterministic", "12-60 seconds, probabilistic (reorg risk)"],
            ["Token association", "Explicit opt-in required (anti-spam)", "Automatic (any contract can send tokens)"],
            ["Compliance", "Built-in KYC/freeze/wipe key support", "Custom smart contract logic required"],
            ["Royalties", "Native royalty enforcement on NFT transfers", "Marketplace-dependent (easily bypassed)"],
          ] as [string, string, string][]).map(([feature, hts, erc]) => (
            <div key={feature} className="grid grid-cols-3 gap-3 px-4 py-2">
              <span className="text-[#E8ECF0] font-semibold">{feature}</span>
              <span className="text-[#10b981]">{hts}</span>
              <span className="text-[#8494A7]">{erc}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>6.2 BOTB Token Configuration</SubHead>
      <P>
        The BOTB fungible token will be deployed on HTS with the following key decisions
        (verified against <Code>hedera-config.ts</Code>):
      </P>
      <BulletList items={[
        <><Strong>Token ID:</Strong> Not yet deployed (<Code>TOKEN_IDS.BOTB = null</Code>). Will be set to a real <Code>0.0.XXXXXXX</Code> ID upon deployment in Q2-Q3 2026.</>,
        <><Strong>Total supply:</Strong> 3,000,000,000 (3 billion) — fixed at creation, no further minting.</>,
        <><Strong>Admin keys:</Strong> No admin key, no supply key, no freeze key, no wipe key. Once deployed, no entity can modify the token configuration, mint additional supply, freeze accounts, or wipe balances. This is an irrevocable commitment to supply integrity.</>,
        <><Strong>Token association:</Strong> Users must explicitly associate with the BOTB token before receiving transfers. This is a Hedera-native anti-spam mechanism — wallets cannot be flooded with unwanted tokens.</>,
      ]} />

      <SubHead>6.3 NFT Token Configurations</SubHead>
      <P>
        Each NFT collection is a separate HTS token with its own supply and configuration:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            HTS NFT TOKEN REGISTRY
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Governor NFT", "0.0.9338241", "100", "Fixed", "Live — Sold Out", "#f59e0b"],
            ["Sigma Series", "TBD", "1,200", "Fixed", "Pre-launch", "#7C5CDB"],
            ["Meta Series", "TBD", "Unlimited", "Dynamic mint", "Q2-Q3 2026", "#10b981"],
          ] as [string, string, string, string, string, string][]).map(([name, tokenId, supply, model, status, color]) => (
            <div key={name} className="flex items-center gap-3 px-4 py-2">
              <span className="font-semibold w-32 shrink-0" style={{ color }}>{name}</span>
              <code className="text-[#6AA3E0] font-mono w-24 shrink-0">{tokenId}</code>
              <span className="text-[#B0BCC9] w-20 shrink-0">{supply}</span>
              <span className="text-[#8494A7] w-24 shrink-0">{model}</span>
              <span className="text-[#8494A7]">{status}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>6.4 NFT Detection Logic</SubHead>
      <P>
        The <Code>categorizeNFTs()</Code> function in <Code>hedera-mirror.ts</Code> groups
        a wallet's NFTs by known BOTB token IDs:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-0.5">
        <div><span className="text-[#7C5CDB]">for</span> (<span className="text-[#7C5CDB]">const</span> nft <span className="text-[#7C5CDB]">of</span> nfts) {"{"}</div>
        <div>{"  "}<span className="text-[#7C5CDB]">if</span> (nft.token_id === TOKEN_IDS.<span className="text-[#f59e0b]">GOVERNOR_NFT</span>) {"→"} governor[]</div>
        <div>{"  "}<span className="text-[#7C5CDB]">else if</span> (nft.token_id === TOKEN_IDS.<span className="text-[#7C5CDB]">SIGMA_NFT</span>) {"→"} sigma[]</div>
        <div>{"  "}<span className="text-[#7C5CDB]">else if</span> (nft.token_id === TOKEN_IDS.<span className="text-[#6AA3E0]">META_NFT</span>) {"→"} meta[]</div>
        <div>{"  "}<span className="text-[#7C5CDB]">else</span> {"→"} other[]</div>
        <div>{"}"}</div>
      </div>
      <P>
        Placeholder token IDs (<Code>null</Code>) are excluded from matching — NFTs with
        unset token IDs fall into the "other" category until real token IDs are deployed. This
        ensures the system gracefully handles the pre-launch period without false categorization.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 7 — CONSENSUS SERVICE (HCS) DESIGN
// =============================================================================

export function Section7_HCSDesign() {
  return (
    <PolicySection num={7} title="CONSENSUS SERVICE (HCS) DESIGN" icon={<MessageSquare className="w-4 h-4" />}>
      <P>
        The Hedera Consensus Service (HCS) provides an immutable, timestamped, ordered message
        log. BOTB uses HCS to create permanent, tamper-proof records of votes and governance
        actions that can be independently verified by any third party.
      </P>

      <SubHead>7.1 HCS Architecture</SubHead>
      <P>
        HCS operates on a topic-based model. Messages are submitted to a topic and receive a
        consensus timestamp and sequence number from the Hedera network. Once a message achieves
        consensus, it is permanently immutable — no entity (including the topic creator) can
        modify, delete, or reorder messages.
      </P>
      <BulletList items={[
        <><Strong>Message cost:</Strong> ~$0.0001 per message (fixed, USD-denominated).</>,
        <><Strong>Message size:</Strong> Up to 1024 bytes per message (6KB with chunking).</>,
        <><Strong>Ordering:</Strong> Total ordering guaranteed by Hedera consensus — messages are globally sequenced with nanosecond-precision timestamps.</>,
        <><Strong>Retrieval:</Strong> Messages are queryable via the Mirror Node at <Code>/api/v1/topics/{"{topicId}"}/messages</Code>.</>,
      ]} />

      <SubHead>7.2 BOTB Topic Configuration</SubHead>
      <P>
        Two HCS topics are defined in <Code>hedera-config.ts</Code> for BOTB's on-chain
        recording:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["TOPIC_IDS.VOTES", "Battle vote submissions — records voter wallet, battle ID, athlete ID, stake amount, voting power, weighted vote, and timestamp."],
            ["TOPIC_IDS.GOVERNANCE", "Governance proposal votes — records voter wallet, proposal ID, vote direction (for/against), voting power, and timestamp."],
          ] as [string, string][]).map(([topic, desc]) => (
            <div key={topic} className="flex gap-3 px-4 py-2.5">
              <code className="text-[#6AA3E0] font-mono shrink-0 w-48">{topic}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <Callout type="info">
        <Strong>Topic IDs are currently null</Strong> and will
        be set to real topic IDs upon HCS deployment. During the beta period, votes are
        recorded in the KV datastore only. Once HCS is activated, votes will be dual-written to
        both the KV store (for fast application queries) and HCS (for permanent immutability).
      </Callout>

      <SubHead>7.3 Vote Message Format</SubHead>
      <P>
        When HCS recording is active, each battle vote is serialized as a JSON message:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-0.5">
        <div>{"{"}</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"type"</span>: <span className="text-[#10b981]">"battle_vote"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"battleId"</span>: <span className="text-[#10b981]">"battle-uuid"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"wallet"</span>: <span className="text-[#10b981]">"0.0.XXXXXXX"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"athleteId"</span>: <span className="text-[#10b981]">"athlete-uuid"</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"stakeAmount"</span>: <span className="text-[#f59e0b]">1000</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"votingPower"</span>: <span className="text-[#f59e0b]">2.0</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"weightedVote"</span>: <span className="text-[#f59e0b]">2000</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"hasGovernorNFT"</span>: <span className="text-[#f59e0b]">true</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"hasSigmaNFT"</span>: <span className="text-[#f59e0b]">false</span>,</div>
        <div>{"  "}<span className="text-[#6AA3E0]">"timestamp"</span>: <span className="text-[#10b981]">"2026-03-07T12:00:00Z"</span></div>
        <div>{"}"}</div>
      </div>

      <SubHead>7.4 Immutability Guarantees</SubHead>
      <P>
        Once a vote message achieves Hedera consensus and is written to an HCS topic:
      </P>
      <BulletList items={[
        <>The message cannot be modified, deleted, or reordered by any party — including the WCO, Hedera council members, or the topic administrator.</>,
        <>The message receives a consensus timestamp with nanosecond precision, establishing an irrefutable temporal record.</>,
        <>Any third party can independently verify the message by querying the Mirror Node topic messages endpoint.</>,
        <>The sequence of messages within a topic provides a complete, ordered history of all votes, enabling independent audit of every battle outcome.</>,
      ]} />

      <SubHead>7.5 Dual-Write Strategy</SubHead>
      <P>
        BOTB employs a dual-write strategy for vote persistence:
      </P>
      <NumberedList items={[
        "Primary write: KV datastore — fast, queryable, supports the application's real-time features (vote tallying, duplicate detection, snapshot generation).",
        "Secondary write: HCS topic — slow (3-5s finality), immutable, provides permanent on-chain proof that can be verified independently of the WCO's infrastructure.",
        "If the HCS write fails (network issue, topic not yet deployed), the KV write still succeeds. The vote is recorded in the application database and will be visible in all platform features. The HCS record is a supplementary immutability layer, not a prerequisite for vote acceptance.",
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 8 — WALLETCONNECT & AUTHENTICATION
// =============================================================================

export function Section8_WalletConnectAuth() {
  return (
    <PolicySection num={8} title="WALLETCONNECT & AUTHENTICATION" icon={<Wallet className="w-4 h-4" />}>
      <P>
        BOTB uses WalletConnect v2 as the sole authentication mechanism. There are no usernames,
        passwords, or email-based accounts. Your identity on the platform is your Hedera Account
        ID, authenticated by cryptographic proof of wallet ownership.
      </P>

      <SubHead>8.1 WalletConnect v2 Integration</SubHead>
      <P>
        The WalletConnect integration is implemented in <Code>wallet-connect.ts</Code> using
        the official <Code>@walletconnect/sign-client</Code> and{" "}
        <Code>@walletconnect/modal</Code> packages:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            WALLETCONNECT CONFIGURATION
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Project ID", "Registered at cloud.reown.com (public identifier)"],
            ["Required Methods", "hedera_signTransaction, hedera_signAndExecuteTransaction, hedera_signMessage"],
            ["Required Events", "chainChanged, accountsChanged"],
            ["CAIP-2 Namespace", "hedera:mainnet (chain reference 295)"],
            ["Relay", "wss://relay.walletconnect.com"],
            ["App Metadata", "\"Battle of the Bars\" — WCO branding + icon"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex gap-3 px-4 py-2">
              <span className="text-[#6AA3E0] font-semibold shrink-0 w-36">{k}</span>
              <span className="text-[#B0BCC9]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <SubHead>8.2 Connection Flow</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 space-y-1 leading-relaxed">
        <div className="text-[#8494A7]">{"// User Connection Flow"}</div>
        <div><span className="text-[#f59e0b]">1.</span> User clicks <span className="text-[#10b981]">"Connect Wallet"</span></div>
        <div><span className="text-[#f59e0b]">2.</span> <span className="text-[#6AA3E0]">createSessionProposal()</span> {"\u2192"} SignClient.connect() {"\u2192"} pairing URI</div>
        <div><span className="text-[#f59e0b]">3.</span> <span className="text-[#6AA3E0]">openWCModal(uri)</span> {"\u2192"} Official WalletConnect modal opens</div>
        <div><span className="text-[#f59e0b]">4.</span> User scans QR or selects wallet in WC modal</div>
        <div><span className="text-[#f59e0b]">5.</span> <span className="text-[#6AA3E0]">completeSessionApproval()</span> {"\u2192"} extracts Hedera Account ID</div>
        <div><span className="text-[#f59e0b]">6.</span> <span className="text-[#6AA3E0]">wallet-context.tsx</span> updates React state</div>
        <div><span className="text-[#f59e0b]">7.</span> <span className="text-[#6AA3E0]">fetchWalletBalances()</span> {"\u2192"} HBAR + tokens + NFTs (parallel)</div>
        <div><span className="text-[#f59e0b]">8.</span> Balance polling starts (30-second interval)</div>
      </div>

      <SubHead>8.3 HIP-820 Extension Support</SubHead>
      <P>
        BOTB implements HIP-820 (Hedera Improvement Proposal 820) via the{" "}
        <Code>@hashgraph/hedera-wallet-connect</Code> package for direct browser extension
        detection:
      </P>
      <BulletList items={[
        <><Strong>Extension detection:</Strong> <Code>findExtensions()</Code> scans for installed Hedera wallet extensions (primarily HashPack).</>,
        <><Strong>Direct connection:</Strong> <Code>extensionOpen()</Code> and <Code>extensionConnect()</Code> enable connection without the QR code modal, providing a faster flow for users with HashPack installed.</>,
        <><Strong>Fallback:</Strong> If no extension is detected, the standard WalletConnect QR modal is displayed, supporting any WC-compatible wallet (HashPack mobile, Blade, Kabila).</>,
      ]} />

      <SubHead>8.4 Relay Reliability</SubHead>
      <P>
        WalletConnect relay connections are inherently unreliable (WebSocket-based, cloud-hosted).
        BOTB implements multiple resilience mechanisms:
      </P>
      <BulletList items={[
        <><Strong>Init timeout:</Strong> SignClient initialization times out after 15 seconds to prevent indefinite hanging.</>,
        <><Strong>Exponential backoff:</Strong> Failed relay connections retry up to 3 times with delays of 1s, 2s, and 4s.</>,
        <><Strong>Relay health state machine:</Strong> Tracks relay state through <Code>idle {"\u2192"} initializing {"\u2192"} ready / error</Code> transitions, preventing operations on unhealthy connections.</>,
        <><Strong>Session ping validation:</Strong> Restored sessions are validated with a ping before being trusted — stale or expired sessions are discarded.</>,
        <><Strong>Stale cleanup:</Strong> On every successful init, expired pairings and dead sessions are pruned from local storage.</>,
      ]} />

      <SubHead>8.5 Auto-Reconnect</SubHead>
      <P>
        On application mount, <Code>wallet-context.tsx</Code> checks for an existing
        WalletConnect session in localStorage. If a valid, non-expired session is found, the
        context silently reconnects without displaying the modal, restoring the user's wallet
        state, balance data, and admin status. This provides session persistence across page
        refreshes and browser restarts.
      </P>

      <SubHead>8.6 Admin Authentication</SubHead>
      <P>
        Administrative operations require a three-layer authentication system defined in{" "}
        <Code>admin-auth.tsx</Code>:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            3-LAYER ADMIN AUTHENTICATION
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Layer 1", "Wallet Whitelist", "Wallet must be in the server-side ADMIN_WALLETS set (two WCO executive accounts, never exposed in client code). This is an immutable, hardcoded server-side check.", "#6AA3E0"],
            ["Layer 2", "Mirror Node Verification", "Wallet must exist on Hedera mainnet (verified via Mirror Node account lookup). Prevents spoofed or non-existent account IDs.", "#f59e0b"],
            ["Layer 3", "Cryptographic Challenge-Sign", "Server generates a 32-byte random hex nonce. Admin signs it via WalletConnect hedera_signMessage. Server validates the signature and issues a 20-minute session token (UUID).", "#10b981"],
          ] as [string, string, string, string][]).map(([layer, name, desc, color]) => (
            <div key={layer} className="px-4 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold font-mono w-14 shrink-0" style={{ color }}>{layer}</span>
                <span className="text-[#E8ECF0] font-semibold">{name}</span>
              </div>
              <div className="text-[#8494A7] pl-16">{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <P>
        Admin session tokens are stored server-side in the KV store at{" "}
        <Code>admin:session:{"{token}"}</Code> and expire after 20 minutes. Challenge nonces
        are stored at <Code>admin:challenge:{"{wallet}"}</Code> and expire after 5 minutes.
        All admin write endpoints validate the <Code>X-Admin-Session</Code> header against
        active sessions.
      </P>

      <SubHead>8.7 Rate Limiting</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Vote endpoints", "10 requests / minute", "Per wallet address"],
            ["Admin challenge", "3 requests / 5 minutes", "Per wallet address"],
            ["General API", "60 requests / minute", "Per IP address"],
          ] as [string, string, string][]).map(([endpoint, limit, scope]) => (
            <div key={endpoint} className="flex gap-3 px-4 py-2">
              <span className="text-[#E8ECF0] font-semibold shrink-0 w-36">{endpoint}</span>
              <span className="text-[#6AA3E0] font-mono shrink-0 w-40">{limit}</span>
              <span className="text-[#8494A7]">{scope}</span>
            </div>
          ))}
        </div>
      </div>
      <P>
        Rate limits use an in-memory sliding-window algorithm. Counters are not persisted to
        the KV store — they reset on server cold starts. Exceeding any rate limit returns
        HTTP 429 (Too Many Requests).
      </P>
    </PolicySection>
  );
}