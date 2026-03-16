/**
 * Whitepaper — Sections 15-20
 * =============================
 * Step 19: Section 15 (Reward Distribution), Section 16 (Security Architecture),
 *          Section 17 (Roadmap), Section 18 (Team & Partnerships)
 * Step 20: Section 19 (Risk Factors), Section 20 (Legal & Regulatory Framework)
 *
 * All facts verified against index.tsx, admin-auth.tsx, hedera-config.ts,
 * hedera-mirror.ts, wallet-connect.ts, wallet-context.tsx.
 */

import React from "react";
import {
  Gift, ShieldCheck, Map, Users, AlertTriangle, Scale,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// SECTION 15 — REWARD DISTRIBUTION & AIRDROPS
// =============================================================================

export function Section15_RewardDistribution() {
  return (
    <PolicySection num={15} title="REWARD DISTRIBUTION & AIRDROPS" icon={<Gift className="w-4 h-4" />}>
      <P>
        BOTB employs a transparent, auditable reward distribution system where every token
        distributed can be traced from its allocation pool through a snapshot to a specific
        wallet. This section details how rewards flow from battles to token holders.
      </P>

      <SubHead>15.1 Battle Reward Flow</SubHead>
      <NumberedList items={[
        "A battle is created with a totalPool (BOTB tokens allocated for this matchup).",
        "Voters stake BOTB tokens by casting votes for their chosen athlete during the voting_open window.",
        "After the IRL event, the admin declares the winner. The server auto-generates a reward snapshot.",
        "The snapshot calculates each winning voter\u2019s share: sharePercent = (weightedVote / totalWinningWeighted) \u00D7 100.",
        "Reward amount per voter = sharePercent \u00D7 totalPool. Voters who backed the losing athlete receive no share.",
        "Admin exports the snapshot as CSV or JSON, executes the airdrop off-platform (HTS token transfer), and confirms with the airdrop transaction ID.",
        "Battle transitions to rewards_distributed (terminal status).",
      ]} />

      <SubHead>15.2 Reward Calculation Example</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-4 border border-[#4274B9]/10 space-y-1 leading-relaxed">
        <div className="text-[#8494A7]">{"// Battle pool: 50,000 BOTB | Winner: Athlete A"}</div>
        <div className="text-[#8494A7]">{""}</div>
        <div><span className="text-[#6AA3E0]">Voter 1 (Governor 2x):</span> <span className="text-[#B0BCC9]">staked 1,000 {"\u00D7"} 2.0 = 2,000 weighted</span></div>
        <div><span className="text-[#6AA3E0]">Voter 2 (Base 1x):</span>     <span className="text-[#B0BCC9]">staked 3,000 {"\u00D7"} 1.0 = 3,000 weighted</span></div>
        <div><span className="text-[#6AA3E0]">Voter 3 (Sigma 1.5x):</span>  <span className="text-[#B0BCC9]">staked 2,000 {"\u00D7"} 1.5 = 3,000 weighted</span></div>
        <div className="text-[#8494A7]">{"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"}</div>
        <div><span className="text-[#10b981]">Total winning weighted:</span> <span className="text-[#B0BCC9]">8,000</span></div>
        <div className="text-[#8494A7]">{""}</div>
        <div><span className="text-[#f59e0b]">Voter 1 share:</span> <span className="text-[#B0BCC9]">2,000/8,000 = 25.0% {"\u2192"} 12,500 BOTB</span></div>
        <div><span className="text-[#f59e0b]">Voter 2 share:</span> <span className="text-[#B0BCC9]">3,000/8,000 = 37.5% {"\u2192"} 18,750 BOTB</span></div>
        <div><span className="text-[#f59e0b]">Voter 3 share:</span> <span className="text-[#B0BCC9]">3,000/8,000 = 37.5% {"\u2192"} 18,750 BOTB</span></div>
      </div>

      <SubHead>15.3 Governor-Specific Rewards</SubHead>
      <BulletList items={[
        <><Strong>Governor Control Supply (500M):</Strong> Allocation decisions are directed by Governor NFT holder votes. Vested monthly over 5 years with 100M unlocked at launch. Funds may be allocated to LP pools, DeFi integrations, or Only Gains rewards based on governance vote outcomes.</>,
        <><Strong>Governors Rewards (300M):</Strong> Earned over 3 years through active participation — DeFi boosters from playing on-platform, staking NFTs with Ivyfy, and providing liquidity. Not airdrops — rewards require engagement. Exact monthly distribution rates TBD.</>,
      ]} />

      <SubHead>15.4 Sigma-Specific Rewards</SubHead>
      <BulletList items={[
        <><Strong>Sigma Rewards Pool (100M):</Strong> Event-based distribution tied to voting participation and battle outcomes. Sigma NFT holders who vote on battles where their featured athlete wins receive Up Boosters.</>,
        <><Strong>Athlete-linked bonuses:</Strong> Because each Sigma NFT represents a specific athlete, bonus distributions are triggered when that athlete wins, creating a direct economic link between athlete performance and collector rewards.</>,
      ]} />

      <SubHead>15.5 Staking & LP Rewards</SubHead>
      <BulletList items={[
        <><Strong>Staking Rewards (300M):</Strong> Distributed over 3 years (~100M/year) on the Ivy staking platform. Target APY: 10-20%. Available to all BOTB token holders.</>,
        <><Strong>LP Rewards (200M):</Strong> Distributed over 3 years (~66M/year) to BOTB/HBAR liquidity providers on SaucerSwap DEX.</>,
        <><Strong>Treasury Reserve (100M):</Strong> Locked for 3 years. After lockup, released at ~33M/year for active ecosystem contributors and development.</>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 16 — SECURITY ARCHITECTURE
// =============================================================================

export function Section16_SecurityArchitecture() {
  return (
    <PolicySection num={16} title="SECURITY ARCHITECTURE" icon={<ShieldCheck className="w-4 h-4" />}>
      <P>
        BOTB implements defense-in-depth security across all layers of the stack. This section
        provides a comprehensive inventory of every security mechanism in the production codebase.
      </P>

      <SubHead>16.1 Admin Authentication (3-Layer)</SubHead>
      <P>
        All administrative write operations require passing three sequential security checks
        implemented in <Code>admin-auth.tsx</Code>:
      </P>
      <NumberedList items={[
        "Wallet Whitelist: The server maintains a hardcoded, immutable Set of two admin wallet IDs (held by WCO executives, never exposed in client-side code). Non-whitelisted wallets receive a generic \"not authorized\" response (HTTP 403) — the error message does not reveal which wallets are admins.",
        "Mirror Node Verification: The wallet\u2019s existence on Hedera mainnet is verified via the Mirror Node account endpoint (mainnet.mirrornode.hedera.com). This prevents spoofed account IDs that don\u2019t exist on the actual network.",
        "Cryptographic Challenge-Sign: Server generates a 32-byte random hex nonce (via crypto.getRandomValues). Admin signs it via WalletConnect hedera_signMessage. Server validates the signature, then issues a 20-minute session token (crypto.randomUUID stored server-side at admin:session:{token} in KV).",
      ]} />

      <SubHead>16.2 Session Management</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Challenge nonce TTL", "5 minutes", "Nonces expire quickly to prevent replay attacks."],
            ["Admin session TTL", "20 minutes", "Sessions auto-expire. All admin write endpoints validate X-Admin-Session header."],
            ["Session storage", "Server-side KV", "Session tokens are UUIDs stored in the KV store — not JWTs. Cannot be forged or extended by the client."],
            ["Session destruction", "POST /admin/logout", "Explicitly removes the session record from KV."],
            ["Session status check", "GET /admin/session", "Returns validity status and remaining minutes."],
          ] as [string, string, string][]).map(([item, value, desc]) => (
            <div key={item} className="px-4 py-2 text-xs">
              <div className="flex gap-3">
                <span className="text-[#E8ECF0] font-semibold shrink-0 w-40">{item}</span>
                <span className="text-[#6AA3E0] font-mono shrink-0 w-32">{value}</span>
                <span className="text-[#8494A7]">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>16.3 Rate Limiting</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            RATE LIMIT CONFIGURATION
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Global API", "120 req/min", "Per IP (x-forwarded-for or x-real-ip)", "All routes under /make-server-f75faf6c/*"],
            ["Battle votes", "10 req/min", "Per wallet address", "POST /vote/battle"],
            ["Proposal votes", "10 req/min", "Per wallet address", "POST /vote/proposal"],
            ["Skill votes", "10 req/min", "Per wallet address", "POST /vote/skill (removed — skills admin-only)"],
            ["Admin challenge", "3 req/5min", "Per wallet address", "POST /admin/challenge"],
          ] as [string, string, string, string][]).map(([endpoint, limit, scope, route]) => (
            <div key={endpoint} className="grid grid-cols-4 gap-2 px-4 py-2">
              <span className="text-[#E8ECF0] font-semibold">{endpoint}</span>
              <span className="text-[#6AA3E0] font-mono">{limit}</span>
              <span className="text-[#8494A7]">{scope}</span>
              <code className="text-[#8494A7] font-mono text-[0.6rem]">{route}</code>
            </div>
          ))}
        </div>
      </div>
      <P>
        Rate limits use in-memory sliding-window counters. Counters are not persisted — they
        reset on server cold starts. Exceeding any rate limit returns HTTP 429 (Too Many
        Requests).
      </P>

      <SubHead>16.4 Input Sanitization</SubHead>
      <BulletList items={[
        <><Strong>sanitizeString(input, maxLength):</Strong> Strips HTML tags, script content, and control characters. Enforces maximum length (default: 5,000 chars). Returns safe plain text.</>,
        <><Strong>sanitizeNumber(value, min, max, default):</Strong> Clamps numeric input to the specified range. Returns the default if input is invalid.</>,
        <><Strong>sanitizeUrl(url):</Strong> Validates URL format. Applied to all user-provided URLs (profile pictures, social links, NFT metadata URIs).</>,
        <><Strong>Account ID validation:</Strong> All wallet addresses are validated against <Code>/^0\.0\.\d{"{1,10}"}$/</Code> before any database or Mirror Node operation.</>,
        <><Strong>Enum validation:</Strong> Status fields, categories, and vote directions are validated against explicit allowed-value arrays. Invalid values are rejected or fall back to defaults.</>,
      ]} />

      <SubHead>16.5 Anti-Spoofing</SubHead>
      <BulletList items={[
        <><Strong>Mirror Node wallet verification:</Strong> Every vote endpoint verifies the submitted wallet exists on Hedera mainnet before accepting the vote. This prevents votes from fabricated account IDs.</>,
        <><Strong>Forward-only status transitions:</Strong> Battle and proposal statuses can only move forward through their lifecycle. This prevents replay attacks or status manipulation.</>,
        <><Strong>One-vote-per-wallet:</Strong> Battle and proposal votes use composite keys (<Code>vote:battle:{"{battleId}"}:{"{wallet}"}</Code>) to ensure exactly one vote per wallet per entity.</>,
        <><Strong>Admin-controlled voting:</Strong> Administrators manually close voting at the appropriate time via the Admin Command Center, ensuring full control over the voting window.</>,
      ]} />

      <SubHead>16.6 Frontend Security</SubHead>
      <BulletList items={[
        <><Strong>No private keys:</Strong> The frontend never handles private keys, seed phrases, or secret keys. All signing operations occur in the user&apos;s wallet (HashPack) via WalletConnect.</>,
        <><Strong>WC_PROJECT_ID:</Strong> The WalletConnect project ID is a public identifier (registered at cloud.reown.com) — safe to embed in frontend code.</>,
        <><Strong>SUPABASE_SERVICE_ROLE_KEY:</Strong> Never exposed to the frontend. Only available server-side via <Code>Deno.env.get()</Code>.</>,
        <><Strong>Admin wallet list:</Strong> Never returned in any API response. The <Code>/config</Code> endpoint returns only a boolean <Code>isAdmin</Code> flag. The actual wallet IDs exist only in server-side code and are never transmitted to the client.</>,
      ]} />

      <SubHead>16.7 CORS Configuration</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-0.5">
        <div><span className="text-[#7C5CDB]">origin</span>: <span className="text-[#10b981]">"*"</span></div>
        <div><span className="text-[#7C5CDB]">allowHeaders</span>: [<span className="text-[#10b981]">"Content-Type"</span>, <span className="text-[#10b981]">"Authorization"</span>, <span className="text-[#10b981]">"X-Admin-Wallet"</span>, <span className="text-[#10b981]">"X-Admin-Session"</span>]</div>
        <div><span className="text-[#7C5CDB]">allowMethods</span>: [<span className="text-[#10b981]">"GET"</span>, <span className="text-[#10b981]">"POST"</span>, <span className="text-[#10b981]">"PUT"</span>, <span className="text-[#10b981]">"DELETE"</span>, <span className="text-[#10b981]">"OPTIONS"</span>]</div>
        <div><span className="text-[#7C5CDB]">maxAge</span>: <span className="text-[#f59e0b]">600</span> <span className="text-[#8494A7]">// 10-minute preflight cache</span></div>
      </div>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 17 — ROADMAP & MILESTONES
// =============================================================================

export function Section17_Roadmap() {
  return (
    <PolicySection num={17} title="ROADMAP & MILESTONES" icon={<Map className="w-4 h-4" />}>
      <P>
        The BOTB development roadmap is organized into four phases, progressing from the
        current beta platform to a fully decentralized, multi-chain ecosystem.
      </P>

      <div className="mt-3 space-y-4">
        {([
          {
            phase: "Phase 1 — Beta Platform",
            timeline: "Q4 2025 – Q1 2026",
            status: "CURRENT",
            color: "#10b981",
            items: [
              "Three-tier architecture deployed (React \u2192 Hono \u2192 KV + Hedera Mirror Node)",
              "6 core pages: Home, Battles, Athletes, Governance, Leaderboard, NFTs",
              "WalletConnect v2 + HIP-820 HashPack integration on Hedera mainnet",
              "Governor NFT detection (token 0.0.9338241) with 4-tier voting power",
              "27+ API routes with 3-layer admin auth, rate limiting, input sanitization",
              "Battle bracket system with snake seeding, real-time vote tracking, reward snapshots",
              "Governance proposal system with power-weighted voting",
              "Skill rating system for Governor NFT holders",
              "Admin panel for athlete CRUD, event generation, winner declaration, airdrop export",
              "Privacy Policy, Terms of Service, and Whitepaper — production-grade legal documents",
            ],
          },
          {
            phase: "Phase 2 — Token & NFT Launch",
            timeline: "Q2 – Q3 2026",
            status: "PLANNED",
            color: "#6AA3E0",
            items: [
              "BOTB fungible token deployment on HTS (3B fixed supply, no admin keys)",
              "SaucerSwap initial liquidity: 1.5B BOTB paired with 50,000 HBAR",
              "Ivy staking integration: 300M BOTB allocation, 10-20% APY target",
              "Meta Series NFT launch — first influencer head-to-head competitions",
              "Sigma Series NFT minting (1,200 athlete cards)",
              "HCS integration — dual-write vote recording for on-chain immutability",
              "Token-gated voting with real BOTB stake requirements",
              "Governor Control Supply activation — first governance allocation votes",
              "Up Layer 2 integration for IRL event voting and rewards",
              "hashgraph.vote integration for pre-competition community voting",
            ],
          },
          {
            phase: "Phase 3 — Growth & Mobile",
            timeline: "Q4 2026 – Q2 2027",
            status: "PLANNED",
            color: "#7C5CDB",
            items: [
              "Mobile application (iOS + Android) for real-time battle voting at IRL events",
              "Push notifications for battle status changes, voting windows, and results",
              "Enhanced leaderboard with historical statistics and athlete comparison tools",
              "Expanded Meta Series with larger influencer partnerships and brand collaborations",
              "Community-created proposals (Governor NFT holders can submit proposals directly)",
              "Advanced analytics dashboard for token holders and liquidity providers",
              "Multi-language support for global calisthenics community",
            ],
          },
          {
            phase: "Phase 4 — Decentralization & Multi-Chain",
            timeline: "2027+",
            status: "VISION",
            color: "#f59e0b",
            items: [
              "Progressive decentralization of admin functions to Governor smart contracts",
              "Automated quorum-based proposal resolution (no admin override needed)",
              "Cross-chain bridge consideration (EVM L2, Solana) for expanded token accessibility",
              "Decentralized oracle integration for automated IRL result verification",
              "DAO treasury management with multi-sig Governor control",
              "Open API for third-party integrations and ecosystem developers",
            ],
          },
        ]).map((p) => (
          <div key={p.phase} className="rounded-lg border border-[#4274B9]/10 overflow-hidden">
            <div className="px-4 py-3 bg-[#4274B9]/5 border-b border-[#4274B9]/10 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                  {p.phase.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[0.6rem] font-mono text-[#8494A7]">{p.timeline}</span>
                <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded" style={{
                  background: p.status === "CURRENT" ? `${p.color}20` : "#4274B910",
                  color: p.status === "CURRENT" ? p.color : "#8494A7",
                }}>
                  {p.status}
                </span>
              </div>
            </div>
            <div className="px-4 py-3">
              <ul className="space-y-1.5">
                {p.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#B0BCC9]">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: p.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 18 — TEAM & PARTNERSHIPS
// =============================================================================

export function Section18_TeamPartnerships() {
  return (
    <PolicySection num={18} title="TEAM & PARTNERSHIPS" icon={<Users className="w-4 h-4" />}>
      <SubHead>18.1 World Calisthenics Organization (WCO)</SubHead>
      <P>
        BOTB is developed and operated by the World Calisthenics Organization, a sports
        organization dedicated to professionalizing competitive calisthenics globally. The WCO
        brings:
      </P>
      <BulletList items={[
        <><Strong>Competition infrastructure:</Strong> Established event organization, judging standards, and athlete rosters across multiple countries.</>,
        <><Strong>Athlete relationships:</Strong> Direct partnerships with competitive calisthenics athletes who form the foundation of the Sigma Series NFT collection and battle roster.</>,
        <><Strong>Community authority:</Strong> Recognition within the competitive calisthenics community as a legitimate organizing body.</>,
        <><Strong>Web3 development:</Strong> Technical team responsible for the BOTB platform architecture, Hedera integration, and ongoing feature development.</>,
      ]} />

      <SubHead>18.2 Technology Partners</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Hedera Hashgraph", "Base layer DLT — HTS tokens, HCS messaging, Mirror Node", "https://hedera.com"],
            ["HashPack", "Primary wallet — WalletConnect v2 + HIP-820 extension support", "https://hashpack.app"],
            ["SaucerSwap", "DEX — Initial BOTB/HBAR liquidity pool and LP rewards", "https://saucerswap.finance"],
            ["Ivy", "Staking platform — 300M BOTB staking allocation over 3 years", ""],
            ["Up", "Voting & rewards — Layer 2 for IRL event voting and Up Boosters", ""],
            ["hashgraph.vote", "Early voting — Pre-competition community voting platform", "https://hashgraph.vote"],
            ["SentX", "NFT marketplace — Secondary market for Governor and Sigma NFTs", "https://sentx.io"],
            ["Supabase", "Backend infrastructure — Edge Functions, Postgres KV, storage", "https://supabase.com"],
            ["WalletConnect / Reown", "Wallet protocol — QR-based and extension wallet connections", "https://walletconnect.com"],
          ] as [string, string, string][]).map(([partner, role, url]) => (
            <div key={partner} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                <span className="text-[#E8ECF0] font-semibold">{partner}</span>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#6AA3E0] text-[0.6rem] hover:underline">{url}</a>
                )}
              </div>
              <div className="text-[#8494A7]">{role}</div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>18.3 Athlete Partners</SubHead>
      <P>
        The initial BOTB athlete roster includes registered competitive calisthenics athletes
        who have partnered with the WCO for the platform launch. Seed athletes in the current
        beta include Tony Gaste (Mexico), Starboy (USA), and Vitalii (Russia) — each with
        detailed profiles, skill ratings, and Sigma Series NFT card designs.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 19 — RISK FACTORS
// =============================================================================

export function Section19_RiskFactors() {
  return (
    <PolicySection num={19} title="RISK FACTORS" icon={<AlertTriangle className="w-4 h-4" />}>
      <P>
        Participation in the BOTB ecosystem involves multiple categories of risk. Prospective
        token holders, NFT purchasers, and platform users should carefully consider the
        following factors before participating.
      </P>

      <SubHead>19.1 Token & Market Risks</SubHead>
      <BulletList items={[
        <><Strong>Price volatility:</Strong> The BOTB token will be freely traded on decentralized exchanges. Its price may fluctuate significantly based on market conditions, liquidity depth, speculative activity, and broader cryptocurrency market cycles. There is no guaranteed floor price or buyback mechanism.</>,
        <><Strong>Liquidity risk:</Strong> Initial liquidity is provided by a single SaucerSwap pool (1.5B BOTB / 50,000 HBAR). If liquidity providers withdraw, token trading may experience high slippage or become impractical.</>,
        <><Strong>No guaranteed returns:</Strong> Staking APY targets (10-20%) are projections, not guarantees. Actual returns depend on participation rates, token price, and pool performance.</>,
        <><Strong>Fixed supply constraint:</Strong> The 3B total supply is immutably capped. If token demand for platform operations exceeds circulating supply, the ecosystem may experience friction. Conversely, if demand is insufficient, the token may trade below expectations.</>,
      ]} />

      <SubHead>19.2 NFT Risks</SubHead>
      <BulletList items={[
        <><Strong>Governor NFT scarcity:</Strong> Only 100 Governor NFTs exist. Secondary market prices may become prohibitively expensive, creating governance concentration risk. The WCO cannot mint additional Governors.</>,
        <><Strong>Sigma NFT athlete dependency:</Strong> Sigma NFT value is partially tied to the featured athlete&apos;s competitive success. If an athlete retires, becomes inactive, or is removed from the roster, the associated Sigma NFT&apos;s utility and value may decrease.</>,
        <><Strong>Meta Series total loss:</Strong> Meta Series NFT purchases are prediction-based. Backing the losing side results in the loss of the full purchase price with no refund. This risk is inherent to the winner-takes-all model.</>,
        <><Strong>Smart contract risk:</Strong> While HTS tokens are natively managed by Hedera (reducing smart contract risk compared to ERC standards), bugs or vulnerabilities in the platform&apos;s server-side logic could affect token distribution or NFT functionality.</>,
      ]} />

      <SubHead>19.3 Platform & Technical Risks</SubHead>
      <BulletList items={[
        <><Strong>Centralization of admin functions:</Strong> In the current beta, all administrative operations (battle creation, winner declaration, reward distribution) are controlled by two admin wallets. This creates a single point of trust. Decentralization of admin functions is planned for Phase 4.</>,
        <><Strong>KV store persistence:</Strong> Application data is stored in a Supabase-hosted Postgres KV table. While resilient, this creates a dependency on Supabase&apos;s infrastructure availability. Data redundancy and migration strategies are in development.</>,
        <><Strong>WalletConnect relay dependency:</Strong> Wallet connections depend on the WalletConnect relay infrastructure. Relay outages (however rare) could temporarily prevent connections or transaction signing.</>,
        <><Strong>Mirror Node latency:</Strong> Balance and NFT data freshness depends on the Hedera Mirror Node&apos;s replication lag (typically sub-second, but may increase during high-throughput periods).</>,
        <><Strong>IRL result dependency:</Strong> Battle outcomes depend on real-world athletic performance judged by WCO officials. There is no decentralized oracle for verifying IRL competition results.</>,
      ]} />

      <SubHead>19.4 Regulatory Risks</SubHead>
      <BulletList items={[
        <><Strong>Token classification uncertainty:</Strong> Regulatory treatment of utility tokens varies by jurisdiction. While BOTB is designed as a utility token (not a security), regulatory authorities may adopt different classifications that could restrict token access or trading in certain regions.</>,
        <><Strong>NFT regulatory evolution:</Strong> The regulatory framework for NFTs — particularly prediction-based models like Meta Series — is evolving rapidly. Future regulations could restrict or require licensing for certain NFT mechanics.</>,
        <><Strong>Gambling classification risk:</Strong> The Meta Series winner-takes-all model and battle vote staking may be classified as gambling or prediction markets in some jurisdictions. The WCO does not represent that these activities are legal in all jurisdictions.</>,
        <><Strong>Sanctions and compliance:</Strong> Hedera wallet connections are permissionless. The WCO does not perform KYC/AML checks on voters or token holders (beyond Hedera account format validation). Regulatory requirements may necessitate compliance measures in the future.</>,
      ]} />

      <Callout type="warning">
        <Strong>No investment advice:</Strong> Nothing in this whitepaper, on the BOTB platform,
        or in any WCO communication constitutes investment advice, financial advice, trading
        advice, or any other form of professional advice. BOTB tokens and NFTs are utility
        instruments for platform participation, not investment products.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 20 — LEGAL & REGULATORY FRAMEWORK
// =============================================================================

export function Section20_LegalFramework() {
  return (
    <PolicySection num={20} title="LEGAL & REGULATORY FRAMEWORK" icon={<Scale className="w-4 h-4" />}>
      <P>
        This section summarizes the legal framework governing the BOTB platform and provides
        cross-references to the complete Privacy Policy and Terms of Service documents.
      </P>

      <SubHead>20.1 Token Classification</SubHead>
      <P>
        The BOTB token is designed and intended as a <Strong>utility token</Strong> — its
        primary function is to enable participation in the BOTB ecosystem:
      </P>
      <BulletList items={[
        <><Strong>Vote staking:</Strong> Users commit BOTB tokens to cast weighted votes on battle outcomes.</>,
        <><Strong>Reward distribution:</Strong> BOTB tokens are distributed as rewards for correct predictions and platform participation.</>,
        <><Strong>Governance participation:</Strong> Token holdings (combined with NFTs) determine voting power in governance proposals.</>,
        <><Strong>Platform access:</Strong> Future features (event passes, premium content) will be gated by BOTB token holdings.</>,
      ]} />
      <P>
        The token is <Strong>not designed or marketed as an investment contract</Strong>. There
        is no expectation of profit derived primarily from the efforts of the WCO or any third
        party. Value is generated by the collective participation of the community, not by
        managerial efforts of a centralized team. The token has no equity, dividend, revenue
        share, or governance rights over the WCO as a legal entity.
      </P>

      <SubHead>20.2 NFT Classification</SubHead>
      <BulletList items={[
        <><Strong>Governor NFTs:</Strong> Access tokens that confer platform governance rights, voting power multipliers, and skill rating authority. They are functional membership credentials, not securities.</>,
        <><Strong>Sigma Series NFTs:</Strong> Digital collectible athlete cards that confer enhanced voting power and athlete-linked reward eligibility. Their value derives from collector demand and athlete performance, not from WCO managerial efforts.</>,
        <><Strong>Meta Series NFTs:</Strong> Prediction instruments in a winner-takes-all competition model. Purchasers should understand the complete loss risk. Meta Series NFTs may be subject to gambling or prediction market regulations in certain jurisdictions.</>,
      ]} />

      <SubHead>20.3 Age Requirement</SubHead>
      <P>
        All BOTB participants must be at least 18 years of age (or the age of majority in their
        jurisdiction, whichever is greater). This requirement is stated in the Terms of Service
        and applies to wallet connection, voting, token acquisition, and NFT purchases.
      </P>

      <SubHead>20.4 Jurisdictional Scope</SubHead>
      <P>
        The BOTB platform is accessible globally but is not directed at or intended for users
        in jurisdictions where cryptocurrency, utility tokens, NFTs, or prediction-based
        activities are prohibited by law. Users are solely responsible for determining whether
        their participation complies with applicable local laws and regulations.
      </P>

      <SubHead>20.5 Privacy & Data Protection</SubHead>
      <P>
        BOTB collects minimal personal data. The primary identifier is the user&apos;s Hedera
        Account ID (public on-chain data). No email addresses, names, or personal information
        are collected through the platform. For complete details, see the{" "}
        <Strong>Privacy Policy</Strong> (available at <Code>/privacy</Code>), which covers:
      </P>
      <BulletList items={[
        <>Data collection scope (wallet addresses, vote records, session data)</>,
        <>Third-party integrations (Hedera Mirror Node, WalletConnect, Supabase)</>,
        <>Cookie and localStorage usage</>,
        <>Data retention and deletion policies</>,
        <>GDPR and international privacy compliance</>,
      ]} />

      <SubHead>20.6 Terms of Service</SubHead>
      <P>
        The <Strong>Terms of Service</Strong> (available at <Code>/terms</Code>) governs all
        platform use and covers:
      </P>
      <BulletList items={[
        <>Eligibility requirements (age, jurisdiction, wallet ownership)</>,
        <>Acceptable use policy and prohibited conduct</>,
        <>Token and NFT-specific terms (staking, voting, Meta Series risk)</>,
        <>Intellectual property rights (WCO branding, athlete content)</>,
        <>Limitation of liability and disclaimers of warranty</>,
        <>Dispute resolution (30-day informal resolution, binding AAA arbitration)</>,
        <>Modification and termination procedures (14-day notice)</>,
      ]} />

      <SubHead>20.7 Disclaimer</SubHead>
      <Callout type="warning">
        <P>
          This whitepaper is provided for informational purposes only and does not constitute
          a prospectus, offering document, or solicitation of investment. The BOTB token and
          NFTs are utility instruments, not securities. No regulatory authority has reviewed
          or approved this document. The WCO makes no representations regarding the legal
          status of BOTB tokens or NFTs in any jurisdiction. Forward-looking statements in
          this document (including roadmap items, partnership plans, and feature descriptions)
          are subject to change without notice.
        </P>
      </Callout>

      <SubHead>20.8 Document References</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="divide-y divide-[#4274B9]/5 text-xs">
          {([
            ["Privacy Policy", "/privacy", "Full data collection, processing, and retention practices"],
            ["Terms of Service", "/terms", "Complete terms governing platform use, token, and NFT participation"],
            ["Whitepaper (this document)", "/whitepaper", "Technical architecture, tokenomics, governance, and roadmap"],
          ] as [string, string, string][]).map(([doc, path, desc]) => (
            <div key={doc} className="flex gap-3 px-4 py-2">
              <span className="text-[#E8ECF0] font-semibold shrink-0 w-52">{doc}</span>
              <code className="text-[#6AA3E0] font-mono shrink-0 w-24">{path}</code>
              <span className="text-[#8494A7]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </PolicySection>
  );
}