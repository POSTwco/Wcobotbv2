/**
 * Terms of Service — Sections 2-5
 * =================================
 * Step 8: Sections 2 (Platform Description & Eligibility) + 3 (Wallet & Auth)
 * Step 9: Sections 4 (NFT Ownership & IP) + 5 (Token Mechanics & Utility)
 *
 * All facts verified against the actual codebase:
 *   - hedera-config.ts: TOKEN_IDS, GOVERNOR_NFT 0.0.9338241, CAIP-2 chains
 *   - hedera-mirror.ts: 4-tier votingPower (1x/1.5x/2x/3x)
 *   - wallet-connect.ts: SignClient, HIP-820, HashPack
 *   - wallet-context.tsx: balance polling, NFT detection, isAdmin wallets
 *   - admin-auth.tsx: challenge-sign, session TTL
 *   - index.tsx: KV routes, sanitization, rate limits
 */

import React from "react";
import {
  Users, Wallet, Crown, Coins,
} from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// SECTION 2 — PLATFORM DESCRIPTION & ELIGIBILITY
// =============================================================================

export function Section2_PlatformEligibility() {
  return (
    <PolicySection num={2} title="PLATFORM DESCRIPTION & ELIGIBILITY" icon={<Users className="w-4 h-4" />}>
      <SubHead>2.1 Platform Description</SubHead>
      <P>
        Battle of the Bars ("<Strong>BOTB</Strong>") is a decentralized competition, voting, and
        governance platform purpose-built for the professional calisthenics and street-workout
        community. The Platform enables the following core activities:
      </P>
      <BulletList items={[
        <>
          <Strong>Battle Voting</Strong> — Authenticated users stake BOTB tokens to vote on the
          outcomes of sanctioned WCO calisthenics battles between registered athletes. Votes are
          weighted by stake amount and the user's verified NFT-based voting power multiplier
          (1x base, 1.5x Sigma, 2x Governor, 3x both).
        </>,
        <>
          <Strong>Governance</Strong> — Holders of WCO Governor NFTs (Token ID: 0.0.9338241,
          limited to 100 total supply) may propose and vote on platform governance decisions
          including competition format changes, reward allocation priorities (LP pools, DeFi, and
          Only Gains rewards), and community initiatives.
        </>,
        <>
          <Strong>Athlete Skill Rating Proposals</Strong> — Athlete skill ratings are set by WCO administrators
          based on official judging criteria across five categories (Statics, Dynamics, Power Dynamics, Combinations & Flow, Offense & Defense).
          Governor NFT holders may propose skill rating changes via the governance system, which are implemented by admin upon community approval.
        </>,
        <>
          <Strong>Meta Series Competitions</Strong> — Head-to-head influencer challenges (push-up
          or chin-up competitions) where both sides mint and sell Meta Series NFTs. All funds
          raised from both sides are awarded to the winning side's collectors. Meta Series NFTs
          have no supply cap.
        </>,
        <>
          <Strong>Reward Distribution</Strong> — When a battle concludes, administrators generate
          a reward distribution snapshot that calculates each winning voter's proportional share
          of the prize pool, facilitating transparent on-chain BOTB token airdrops.
        </>,
        <>
          <Strong>Leaderboard & Rankings</Strong> — Public athlete leaderboards and voter activity
          rankings derived from on-chain and off-chain vote data, providing transparent competition
          standings.
        </>,
      ]} />
      <P>
        The Platform is built on the Hedera Hashgraph distributed ledger network, utilizing
        Hedera's Token Service (HTS) for fungible token and NFT management, the Consensus Service
        (HCS) for immutable vote recording, and WalletConnect-based authentication via
        HashPack wallet.
      </P>

      <SubHead>2.2 Eligibility Requirements</SubHead>
      <P>
        By accessing or using the Platform, you represent and warrant that:
      </P>
      <NumberedList items={[
        "You are at least 18 years of age, or the age of legal majority in your jurisdiction, whichever is greater.",
        "You have the legal capacity to enter into a binding agreement under the laws of your jurisdiction.",
        "You are not located in, organized in, or a resident of any jurisdiction where participation in blockchain-based voting, token staking, NFT trading, or cryptocurrency transactions is prohibited or restricted by applicable law.",
        "You are not subject to economic sanctions imposed by any governmental authority, including but not limited to the United States Office of Foreign Assets Control (OFAC), the European Union, or the United Nations Security Council.",
        "You are not accessing the Platform for the purpose of circumventing any legal restriction or sanctions regime.",
        "You have read and understand the risk disclosures in Section 10 of these Terms.",
      ]} />

      <SubHead>2.3 Restricted Territories</SubHead>
      <P>
        The Platform is not available to persons or entities located in, organized in, or
        residents of jurisdictions where cryptocurrency, blockchain-based voting, or NFT
        transactions are prohibited. Without limiting the foregoing, the following jurisdictions
        are expressly restricted:
      </P>
      <BulletList items={[
        <><Strong>Countries subject to comprehensive U.S. sanctions:</Strong> Cuba, Iran, North Korea, Syria, and the Crimea, Donetsk, and Luhansk regions of Ukraine.</>,
        <><Strong>Jurisdictions with cryptocurrency bans:</Strong> Any jurisdiction that has enacted a blanket prohibition on cryptocurrency ownership, trading, or use.</>,
      ]} />
      <P>
        The WCO reserves the right to update the list of restricted territories at any time
        without prior notice. It is your sole responsibility to determine whether your use of the
        Platform complies with applicable law in your jurisdiction.
      </P>

      <SubHead>2.4 Wallet as Identity</SubHead>
      <P>
        The Platform does not maintain traditional user accounts with email addresses, usernames,
        or passwords. Your identity on the Platform is defined exclusively by your Hedera Account
        ID (format: <Code>0.0.XXXXXXX</Code>). Connecting a Hedera wallet via WalletConnect
        constitutes your authentication. Accordingly:
      </P>
      <BulletList items={[
        <>
          <Strong>You are solely responsible</Strong> for the security of your wallet's private
          keys, seed phrases, and passwords. The WCO has no ability to access, recover, or reset
          your wallet credentials.
        </>,
        <>
          <Strong>Loss of wallet access</Strong> means permanent loss of access to all
          Platform-associated data, voting history, NFT-gated features, and accumulated rewards
          tied to that Hedera Account ID. The WCO cannot transfer or reassign your Platform
          activity to a different wallet.
        </>,
        <>
          <Strong>Wallet compromise</Strong> — If your wallet is compromised by a third party,
          the WCO has no technical capability to freeze, reverse, or remediate unauthorized
          transactions, votes cast, or tokens transferred from your account. You bear all risk
          of unauthorized access.
        </>,
        <>
          <Strong>One wallet, one identity</Strong> — Each Hedera Account ID is treated as a
          distinct user. The Platform enforces one vote per wallet per battle. Operating multiple
          wallets to circumvent this rule constitutes prohibited conduct (see Section 9).
        </>,
      ]} />

      <SubHead>2.5 Beta Period</SubHead>
      <Callout type="warning">
        <Strong>The Platform is currently in public beta.</Strong> During the beta period: (a) all
        features are provided on an "as-is" basis with no guarantees of uptime, data persistence,
        or feature completeness; (b) the BOTB fungible token has not yet been deployed on Hedera
        mainnet (token launch is planned for Q2-Q3 2026); (c) HCS vote recording and on-chain
        reward distribution may not yet be fully operational; (d) the WCO may modify, suspend, or
        discontinue any feature at any time without prior notice; (e) data stored in the
        Platform's backend database during beta may be reset or migrated prior to production
        launch.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 3 — WALLET CONNECTION & AUTHENTICATION
// =============================================================================

export function Section3_WalletAuth() {
  return (
    <PolicySection num={3} title="WALLET CONNECTION & AUTHENTICATION" icon={<Wallet className="w-4 h-4" />}>
      <P>
        All authenticated interactions with the Platform require a valid wallet connection
        established via the WalletConnect v2 protocol. This section describes the technical
        mechanics of wallet connection, session management, and the administrative authentication
        layer.
      </P>

      <SubHead>3.1 WalletConnect Protocol</SubHead>
      <P>
        The Platform uses <ExtLink href="https://walletconnect.com">WalletConnect v2</ExtLink>{" "}
        (operated by Reown, Inc.) with the following configuration:
      </P>
      <BulletList items={[
        <>
          <Strong>Supported wallet:</Strong> HashPack — the primary Hedera-native wallet that
          implements HIP-820 (WalletConnect Hedera JSON-RPC methods).
        </>,
        <>
          <Strong>Relay server:</Strong> <Code>wss://relay.walletconnect.org</Code> — all
          communication between the Platform and your wallet transits through the WalletConnect
          relay, encrypted end-to-end using X25519-XSalsa20-Poly1305.
        </>,
        <>
          <Strong>Chain identifier:</Strong> CAIP-2 format <Code>hedera:mainnet</Code>.
        </>,
        <>
          <Strong>Requested JSON-RPC methods:</Strong>{" "}
          <Code>hedera_signTransaction</Code>,{" "}
          <Code>hedera_signAndExecuteTransaction</Code>, and{" "}
          <Code>hedera_signMessage</Code>.
        </>,
        <>
          <Strong>Session persistence:</Strong> WalletConnect sessions are stored in browser
          localStorage under the <Code>wc@2:*</Code> key namespace. Sessions are automatically
          restored on page reload and typically expire after 7 days of inactivity.
        </>,
      ]} />

      <SubHead>3.2 Connection Lifecycle</SubHead>
      <NumberedList items={[
        "You initiate connection by clicking \"Connect Wallet\" in the Platform header.",
        "The Platform creates a WalletConnect SignClient and generates a pairing URI.",
        "You approve the session in your HashPack wallet, authorizing the Platform to request signatures for the hedera:mainnet chain.",
        "Upon successful pairing, the Platform extracts your Hedera Account ID from the session namespace and begins polling the Hedera Mirror Node (approximately every 30 seconds) to retrieve your HBAR balance, HTS token balances, and NFT holdings.",
        "Your voting power multiplier is computed from your verified NFT holdings: 1x (base), 1.5x (Sigma Series), 2x (Governor), or 3x (both Governor + Sigma).",
        "Admin status is determined by checking whether your Hedera Account ID matches one of two hardcoded administrator wallets held by WCO executives. The specific admin account IDs are never exposed in client-side code.",
        "You may disconnect at any time, which terminates the WalletConnect session and clears session-related localStorage keys.",
      ]} />

      <SubHead>3.3 Transaction Signing</SubHead>
      <P>
        The Platform may request your wallet to sign transactions (e.g., token staking for votes,
        governance actions, or reward claims). Every signing request:
      </P>
      <BulletList items={[
        <>
          <Strong>Requires explicit approval</Strong> — Each transaction is presented in your
          HashPack wallet for review and must be individually approved. The Platform cannot
          auto-sign or batch-sign transactions without your per-transaction consent.
        </>,
        <>
          <Strong>Is non-custodial</Strong> — Your private key never leaves your wallet
          application. The WalletConnect protocol transmits only the signed transaction (or
          signature) back to the Platform, not the signing key material.
        </>,
        <>
          <Strong>Is irreversible once executed</Strong> — Once a signed transaction is submitted
          to the Hedera network and receives consensus, it cannot be reversed, cancelled, or
          modified by any party, including the WCO. You are responsible for reviewing every
          transaction before approval.
        </>,
      ]} />

      <SubHead>3.4 Administrative Authentication</SubHead>
      <P>
        Administrative access to the Platform's backend management functions is restricted to
        two hardcoded Hedera Account IDs (held by WCO executives, never published in client code) and requires a three-layer authentication process:
      </P>
      <NumberedList items={[
        "Wallet Whitelist Check — The server verifies the connecting wallet's Hedera Account ID against the admin allowlist. Non-whitelisted wallets are rejected immediately.",
        "Mirror Node Verification — The server independently confirms the wallet exists on Hedera mainnet via the Mirror Node API, preventing spoofing of non-existent accounts. Results are cached for 10 minutes.",
        "Cryptographic Challenge-Sign — The server generates a random 64-character hexadecimal nonce embedded in a structured challenge message. The admin signs the challenge via WalletConnect. Upon successful verification, the server issues an opaque UUID v4 session token with a 20-minute TTL. The session token is not a JWT and contains no embedded user data.",
      ]} />
      <P>
        Admin write operations (creating/editing athletes, events, battles, declaring winners)
        require a valid session token in the <Code>X-Admin-Session</Code> header. Admin read
        operations (viewing snapshots, exports) require only the{" "}
        <Code>X-Admin-Wallet</Code> header with whitelist verification.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 4 — NFT OWNERSHIP & INTELLECTUAL PROPERTY
// =============================================================================

export function Section4_NFTOwnershipIP() {
  return (
    <PolicySection num={4} title="NFT OWNERSHIP & INTELLECTUAL PROPERTY" icon={<Crown className="w-4 h-4" />}>
      <P>
        The Platform utilizes non-fungible tokens (NFTs) issued on the Hedera Token Service (HTS)
        to gate features, confer voting power multipliers, and create a collector ecosystem around
        WCO athletic competitions. This section defines your rights and limitations with respect
        to NFT ownership and all intellectual property associated with the Platform.
      </P>

      <SubHead>4.1 NFT Collections</SubHead>
      <P>
        The WCO issues and manages the following NFT collections on Hedera mainnet:
      </P>

      {/* Governor NFTs */}
      <div className="mt-3 rounded-lg border border-[#f59e0b]/20 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#f59e0b]/5 border-b border-[#f59e0b]/15 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-[#f59e0b] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            WCO GOVERNORS
          </span>
          <span className="text-[0.6rem] text-[#8494A7]">Token ID: 0.0.9338241 | Supply: 100 (Fixed)</span>
        </div>
        <div className="px-4 py-3 space-y-2 text-xs text-[#B0BCC9]">
          <div><Strong>License Grant:</Strong> Each Governor NFT grants the holder: (a) access to the Governors Hub; (b) a 2x voting power multiplier on all battle and governance votes; (c) the right to propose athlete skill rating changes via governance; (d) priority eligibility for participation-based token reward distributions; (e) governance voting rights on platform proposals; and (f) access to 300M BOTB tokens (10% of total supply) earned over 3 years through active participation — DeFi boosters from playing, staking NFTs with Ivyfy, and providing liquidity. Not airdrops. Exact rates TBD.</div>
          <div><Strong>Supply:</Strong> Fixed at 100 NFTs. No additional Governor NFTs will be minted. The supply cap is enforced at the Hedera Token Service level.</div>
          <div><Strong>Governor Control Supply:</Strong> 500M BOTB tokens (16.67% of total supply) are allocated to governance-directed rewards, vested monthly over 5 years with 100M unlocked up-front, with allocation decisions (LP pools, DeFi, Only Gains rewards) voted on by Governor NFT holders.</div>
        </div>
      </div>

      {/* Sigma Series */}
      <div className="mt-3 rounded-lg border border-[#7C5CDB]/20 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#7C5CDB]/5 border-b border-[#7C5CDB]/15 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-[#7C5CDB] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            SIGMA SERIES
          </span>
          <span className="text-[0.6rem] text-[#8494A7]">Supply: 1,200 (Limited)</span>
        </div>
        <div className="px-4 py-3 space-y-2 text-xs text-[#B0BCC9]">
          <div><Strong>License Grant:</Strong> Each Sigma Series NFT grants the holder: (a) a 1.5x voting power multiplier on battle votes; (b) athlete-specific rewards when the featured athlete wins a battle; (c) card ownership rights (display, trade on secondary markets); and (d) allocation of 100M BOTB tokens (3.33% of total supply) as event-based rewards tied to voting and battle outcomes.</div>
          <div><Strong>Supply:</Strong> Limited to 1,200 individual athlete cards. Each card features a specific registered BOTB athlete.</div>
          <div><Strong>Stacking:</Strong> Holding both a Governor NFT and a Sigma Series NFT confers a 3x combined voting power multiplier — the maximum achievable on the Platform.</div>
        </div>
      </div>

      {/* Meta Series */}
      <div className="mt-3 rounded-lg border border-[#10b981]/20 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#10b981]/5 border-b border-[#10b981]/15 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-[#10b981] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            META SERIES
          </span>
          <span className="text-[0.6rem] text-[#8494A7]">Supply: Unlimited | Launch: Q2-Q3 2026</span>
        </div>
        <div className="px-4 py-3 space-y-2 text-xs text-[#B0BCC9]">
          <div><Strong>License Grant:</Strong> Each Meta Series NFT represents a stake in a head-to-head influencer competition (push-up or chin-up challenges). Holders of winning-side Meta NFTs receive a proportional share of all funds raised from NFT sales on both sides of the matchup.</div>
          <div><Strong>Supply:</Strong> Unlimited. Meta Series NFTs are minted on demand during active influencer competitions. There is no supply cap.</div>
          <div><Strong>Competition Mechanics:</Strong> Two influencers (or an influencer vs. a WCO athlete) are matched in a physical push-up or chin-up challenge. Each side mints and sells Meta Series NFTs to supporters. Upon competition conclusion, 100% of the combined funds raised from both sides' NFT sales are distributed pro-rata to collectors who backed the winning side.</div>
          <div><Strong>Risk Disclosure:</Strong> If you purchase a Meta Series NFT backing the losing side, you will not receive any portion of the prize pool. The purchase price of a Meta Series NFT is not refundable. See Section 10 for full risk disclosures.</div>
        </div>
      </div>

      <SubHead>4.2 NFT License Terms</SubHead>
      <P>
        When you acquire an NFT issued by the WCO, you receive a limited, non-exclusive,
        non-transferable (except via on-chain transfer of the NFT itself), revocable license to:
      </P>
      <BulletList items={[
        <>Use the NFT to access gated Platform features as described in Section 4.1.</>,
        <>Display the NFT artwork for personal, non-commercial purposes.</>,
        <>Transfer the NFT to another Hedera account via standard HTS token transfer, which also transfers the associated license rights to the recipient.</>,
        <>List the NFT for sale on Hedera-compatible NFT marketplaces (e.g., SentX).</>,
      ]} />
      <Callout type="important">
        <Strong>You do NOT acquire:</Strong> (a) copyright or intellectual property ownership
        of the artwork, design, branding, or metadata associated with the NFT; (b) any ownership
        stake in the WCO, the BOTB platform, or any WCO entity; (c) any right to reproduce,
        modify, create derivative works from, or commercially exploit the NFT artwork without
        express written permission from the WCO; or (d) any guarantee of future value, liquidity,
        or secondary market demand.
      </Callout>

      <SubHead>4.3 WCO Intellectual Property</SubHead>
      <P>
        All intellectual property rights in and to the Platform — including but not limited to the
        "Battle of the Bars" name, "BOTB" brand, "WCO" and "World Calisthenics Organization" marks,
        platform source code, UI/UX design, visual assets, athlete photography, competition formats,
        bracket systems, and all NFT artwork — are and shall remain the exclusive property of the
        World Calisthenics Organization. No right, title, or interest in any WCO intellectual
        property is transferred to you by these Terms, by your use of the Platform, or by your
        acquisition of any NFT, except for the limited license expressly granted in Section 4.2.
      </P>

      <SubHead>4.4 User-Generated Content</SubHead>
      <P>
        To the extent the Platform permits user-submitted content (e.g., governance proposal
        descriptions, community messages, or feedback), you grant the WCO a worldwide, royalty-free,
        non-exclusive, perpetual, irrevocable license to use, reproduce, modify, display, and
        distribute such content in connection with the operation of the Platform. You represent that
        you own or have the necessary rights to submit such content and that it does not infringe
        any third-party rights.
      </P>

      <SubHead>4.5 DMCA Takedown Procedures</SubHead>
      <P>
        The WCO respects intellectual property rights and will respond to valid notices of alleged
        copyright infringement in accordance with the Digital Millennium Copyright Act (17 U.S.C.
        {"\u00A7"} 512). If you believe that material on the Platform infringes your copyright,
        you may submit a takedown notice to the WCO containing:
      </P>
      <NumberedList items={[
        "Identification of the copyrighted work claimed to have been infringed.",
        "Identification of the material that is claimed to be infringing and information sufficient to locate it on the Platform.",
        "Your contact information (name, address, telephone number, email).",
        "A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law.",
        "A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on the copyright owner's behalf.",
        "Your physical or electronic signature.",
      ]} />
      <P>
        Send DMCA notices to the WCO contact address provided in Section 13 of these Terms. The
        WCO will investigate and respond to all valid DMCA notices in accordance with applicable
        law. Note that on-chain data (including NFT metadata recorded on Hedera) cannot be modified
        or removed by the WCO due to blockchain immutability.
      </P>

      <SubHead>4.6 NFTs Are Not Securities</SubHead>
      <Callout type="critical">
        <Strong>No NFT issued by the WCO constitutes a security, investment contract, equity
        instrument, or financial product.</Strong> NFTs issued on the Platform are digital
        collectibles that confer specific utility rights (voting power, feature access) as
        described in this section. They do not represent ownership in any legal entity, do not
        confer dividend or profit-sharing rights, do not carry voting rights in any corporate
        governance structure (Governor governance is limited to Platform feature decisions), and
        are not marketed or sold as investments. The WCO makes no representation or guarantee
        regarding the future monetary value of any NFT. NFTs may lose all value. There is no
        obligation for the WCO to maintain secondary market liquidity for any NFT collection.
      </Callout>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 5 — TOKEN MECHANICS & UTILITY
// =============================================================================

export function Section5_TokenMechanics() {
  return (
    <PolicySection num={5} title="TOKEN MECHANICS & UTILITY" icon={<Coins className="w-4 h-4" />}>
      <P>
        The BOTB token is a fungible utility token to be issued on the Hedera Token Service (HTS).
        This section describes the token's purpose, supply mechanics, allocation, and the specific
        utility functions it serves within the Platform ecosystem. The BOTB token is planned for
        launch in Q2-Q3 2026.
      </P>

      <SubHead>5.1 Token Overview</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            BOTB TOKEN SPECIFICATIONS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          {([
            ["Total Supply", "3,000,000,000 (3 billion) — fixed, capped, no further minting, no admin keys"],
            ["Platform", "Hedera Hashgraph — Hedera Token Service (HTS)"],
            ["Token Type", "Fungible utility token"],
            ["Launch", "Q2-Q3 2026"],
            ["Purpose", "Rewards, staking, liquidity, voting, network engagement"],
            ["Initial Liquidity", "1.5B tokens paired with 50,000 HBAR on SaucerSwap DEX"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex gap-3 px-4 py-2 text-xs">
              <span className="text-[#6AA3E0] font-semibold shrink-0 w-32">{k}</span>
              <span className="text-[#B0BCC9]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <Callout type="critical">
        <Strong>Immutable Supply Cap.</Strong> The BOTB token will be deployed with no admin keys
        and no minting capability beyond the initial 3 billion token supply. Once deployed, no
        entity — including the WCO — can increase the total supply. This is enforced at the
        Hedera Token Service protocol level.
      </Callout>

      <SubHead>5.2 Token Allocation</SubHead>
      <P>
        The 3 billion total supply is allocated as follows:
      </P>

      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            TOKEN ALLOCATION TABLE
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          {([
            ["Liquidity Pool", "1,500,000,000", "50.00%", "Paired with 50,000 HBAR on SaucerSwap DEX. Provides initial trading liquidity."],
            ["Gov Control Supply", "500,000,000", "16.67%", "Vested monthly over 5 years; 100M unlocked up-front. Allocation (LP pools, DeFi, Only Gains rewards) voted on by Governor NFT holders."],
            ["Governors Rewards", "300,000,000", "10.00%", "Earned over 3 years through active participation: DeFi boosters from playing, Ivyfy NFT staking, and LP provision. Not airdrops. Exact rates TBD."],
            ["Staking Rewards", "300,000,000", "10.00%", "Distributed over 3 years (~100M/year). 10-20% APY on Ivy staking platform."],
            ["LP Rewards", "200,000,000", "6.67%", "Distributed over 3 years (~66M/year) to liquidity providers on SaucerSwap."],
            ["Sigma Series Rewards", "100,000,000", "3.33%", "Event-based rewards tied to voting participation and battle outcomes (Up Boosters for wins)."],
            ["Treasury Reserve", "100,000,000", "3.33%", "Locked for 3 years, released ~33M/year for active contributors and ecosystem development."],
          ] as [string, string, string, string][]).map(([name, amount, pct, desc]) => (
            <div key={name} className="px-4 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span className="text-[#E8ECF0] font-semibold">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#6AA3E0] font-mono">{amount}</span>
                  <span className="text-[#8494A7] font-mono text-[0.6rem] bg-[#0A0F1A] px-1.5 py-0.5 rounded">{pct}</span>
                </div>
              </div>
              <div className="text-[#8494A7]">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <SubHead>5.3 Token Utility</SubHead>
      <P>
        The BOTB token serves the following utility functions within the Platform ecosystem:
      </P>
      <BulletList items={[
        <>
          <Strong>Vote Staking</Strong> — Users stake BOTB tokens when casting battle votes. The
          staked amount, multiplied by the user's NFT-based voting power (1x-3x), determines the
          weighted vote value. Staked tokens are committed for the duration of the battle.
        </>,
        <>
          <Strong>Reward Distribution</Strong> — When a battle concludes, BOTB tokens from the
          prize pool are distributed to voters who backed the winning athlete, proportional to
          their weighted vote share (stakeAmount {"\u00D7"} votingPower).
        </>,
        <>
          <Strong>Governance Participation</Strong> — BOTB token holdings may be factored into
          governance proposal weight in future protocol upgrades.
        </>,
        <>
          <Strong>Liquidity Provision</Strong> — Users may provide BOTB/HBAR liquidity on
          SaucerSwap to earn LP Rewards from the 200M token allocation (6.67% of supply,
          ~66M/year over 3 years).
        </>,
        <>
          <Strong>Staking Yield</Strong> — Users may stake BOTB tokens on the Ivy platform to
          earn from the 300M Staking Rewards allocation (10% of supply, ~100M/year over 3 years,
          10-20% APY).
        </>,
        <>
          <Strong>DeFi Boosters</Strong> — Governor NFT holders earn BOTB token rewards through
          active participation over 3 years from the 300M Governors Rewards allocation: playing
          on-platform, staking NFTs with Ivyfy, and providing liquidity. Not airdrops — rewards
          require engagement. Exact rates TBD.
        </>,
      ]} />

      <SubHead>5.4 Demand Drivers</SubHead>
      <P>
        The following mechanisms are designed to create organic demand for the BOTB token:
      </P>
      <BulletList items={[
        <><Strong>NFT voting</Strong> — Staking tokens to vote creates natural buy pressure and reduces circulating supply during active battle periods.</>,
        <><Strong>Competition rewards</Strong> — Winning voters receive token rewards, incentivizing continued participation.</>,
        <><Strong>DeFi Boosters</Strong> — Governor holders earn participation-based DeFi rewards over 3 years, incentivizing Governor NFT acquisition and active engagement.</>,
        <><Strong>Event passes</Strong> — BOTB tokens may be used to access premium IRL competition events.</>,
      ]} />

      <SubHead>5.5 Voting Contracts</SubHead>
      <P>
        Voting on the Platform is supported by the following contract infrastructure:
      </P>
      <BulletList items={[
        <>
          <Strong>Early Voting Contract</Strong> — <ExtLink href="https://hashgraph.vote">hashgraph.vote</ExtLink>{" "}
          — Used for secure, transparent pre-competition voting. Provides early-stage community
          sentiment capture before battles go live.
        </>,
        <>
          <Strong>Secondary Rewards Contract</Strong> — Up Layer 2 (coming soon) — Planned for
          IRL event voting and reward distribution, extending the Platform's reach to in-person
          WCO competitions.
        </>,
      ]} />

      <SubHead>5.6 Token Disclaimer</SubHead>
      <Callout type="critical">
        <Strong>The BOTB token is a utility token, not a security or investment product.</Strong>{" "}
        The BOTB token does not represent equity, ownership, profit-sharing rights, or any claim
        against the WCO or any affiliated entity. The WCO makes no representation or guarantee
        regarding the token's future value, price, or liquidity. Token prices are determined
        solely by market forces on decentralized exchanges. You may lose all value of tokens you
        acquire. The WCO is not obligated to buy back, redeem, or maintain a market for the BOTB
        token. Participation in token staking, liquidity provision, and DeFi activities carries
        significant financial risk, including the risk of total loss. See Section 10 for full
        risk disclosures.
      </Callout>
    </PolicySection>
  );
}