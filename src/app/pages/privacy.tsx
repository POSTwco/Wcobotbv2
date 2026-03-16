/**
 * Privacy Policy Page
 * ====================
 * Production-grade, jurisdiction-aware privacy policy for BOTB.
 * Sections 1-3 are complete (Prompts 2-3 of the Legal master plan).
 * Sections 4-11 will be populated in subsequent prompts.
 */

import { Link } from "react-router";
import { ArrowLeft, Shield, FileText, Database, Globe, Eye, Lock, Server, Wallet, AlertTriangle } from "lucide-react";
import { Section4_ThirdPartyServices, Section5_CookiesLocalStorage } from "./privacy-sections";
import {
  Section6_DataRetention, Section7_InternationalTransfers,
  Section8_Security, Section9_ChildrensPrivacy,
  Section10_PolicyChanges, Section11_Contact,
} from "./privacy-sections-b";

export function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#6AA3E0] hover:text-[#4274B9] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#4274B9]/10 border border-[#4274B9]/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#4274B9]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
              PRIVACY POLICY
            </h1>
            <p className="text-sm text-[#8494A7] mt-1">
              Effective Date: March 7, 2026 &middot; Version 1.0 (Beta) &middot; Document ID: BOTB-PP-2026-001
            </p>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-300/90 leading-relaxed">
              <strong>Beta Period Notice</strong>
              <p className="mt-1 text-amber-300/70">
                This Privacy Policy governs your use of the Battle of the Bars platform during the public beta
                period. Certain features described herein, including Hedera Consensus Service (HCS) message
                recording and BOTB fungible token operations, are under active development and may not yet be
                fully operational. This policy will be updated as features reach production status. Material
                changes will be communicated via on-platform notification.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Content */}
        <div className="space-y-6">

          {/* ================================================================ */}
          {/* SECTION 1 — INTRODUCTION                                        */}
          {/* ================================================================ */}
          <PolicySection num={1} title="INTRODUCTION" icon={<Shield className="w-4 h-4" />}>
            <P>
              The World Calisthenics Organization ("<Def>WCO</Def>", "<Def>we</Def>", "<Def>us</Def>",
              "<Def>our</Def>") operates the Battle of the Bars platform ("<Def>BOTB</Def>", "<Def>the
              Platform</Def>"), a decentralized competition, voting, and governance platform built on the
              Hedera Hashgraph distributed ledger network ("<Def>Hedera</Def>"). The WCO is the world's
              premier competitive calisthenics organization, sanctioning professional street-workout and
              calisthenics competitions globally.
            </P>
            <P>
              This Privacy Policy ("<Def>Policy</Def>") describes how we collect, use, process, store,
              disclose, and protect information in connection with your access to and use of the Platform,
              including all associated smart contracts, tokens, non-fungible tokens ("<Def>NFTs</Def>"),
              application programming interfaces ("<Def>APIs</Def>"), and web applications deployed on the
              Hedera mainnet.
            </P>
            <P>
              By connecting a Hedera-compatible wallet (such as HashPack), casting a vote, participating in
              governance, or otherwise interacting with the Platform, you acknowledge that you have read,
              understood, and agree to be bound by this Policy. If you do not agree with any part of this
              Policy, you must immediately disconnect your wallet and discontinue all use of the Platform.
            </P>

            <SubHead>1.1 Scope</SubHead>
            <P>
              This Policy applies to all users of the Platform, regardless of geographic location, including
              but not limited to: (a) casual visitors who browse the Platform without connecting a wallet;
              (b) authenticated users who connect a Hedera wallet via WalletConnect; (c) voters who
              participate in battle voting, governance proposals, or athlete skill ratings; (d) NFT holders
              who access gated features such as the Governors Hub; and (e) administrators who manage Platform
              content through the admin panel.
            </P>

            <SubHead>1.2 Definitions</SubHead>
            <div className="mt-2 space-y-2">
              <DefItem term="Hedera Account ID">
                A publicly visible account identifier on the Hedera network in the format{" "}
                <Code>0.0.XXXXXXX</Code> (shard.realm.account number).
              </DefItem>
              <DefItem term="Hedera Token Service (HTS)">
                Hedera's native token management layer used to create, manage, and transfer fungible tokens
                and NFTs without requiring smart contract deployment.
              </DefItem>
              <DefItem term="Hedera Consensus Service (HCS)">
                Hedera's decentralized message ordering and timestamping service, used by the Platform to
                create immutable, publicly auditable records of votes and governance actions.
              </DefItem>
              <DefItem term="Mirror Node">
                A publicly accessible REST API (mainnet.mirrornode.hedera.com) that provides read-only
                access to historical and current Hedera network data, including account balances, token
                holdings, NFT ownership, and transaction history.
              </DefItem>
              <DefItem term="WalletConnect">
                An open-source protocol (v2) that enables secure communication between decentralized
                applications and wallet applications via an encrypted relay. The Platform uses WalletConnect
                to establish authenticated sessions with Hedera-compatible wallets.
              </DefItem>
              <DefItem term="Governor NFT">
                A non-fungible token issued on Hedera HTS (Token ID: 0.0.9338241) that grants the holder
                access to the Governors Hub, governance voting rights, the ability to propose athlete skill rating changes, and
                a 2x voting power multiplier.
              </DefItem>
              <DefItem term="Voting Power">
                A multiplier applied to a user's vote weight based on their verified NFT holdings: 1x
                (base), 1.5x (Sigma Series NFT holder), 2x (Governor NFT holder), or 3x (both).
              </DefItem>
            </div>

            <SubHead>1.3 Controller</SubHead>
            <P>
              For the purposes of applicable data protection legislation, the WCO is the data controller
              responsible for the processing of your personal data as described in this Policy. Contact
              information for data protection inquiries is provided in Section 11.
            </P>
          </PolicySection>

          {/* ================================================================ */}
          {/* SECTION 2 — INFORMATION WE COLLECT                              */}
          {/* ================================================================ */}
          <PolicySection num={2} title="INFORMATION WE COLLECT" icon={<Database className="w-4 h-4" />}>
            <P>
              We collect and process several categories of information when you access and use the Platform.
              We distinguish between information you actively provide, information collected automatically
              through your use of the Platform, and information obtained from public blockchain sources.
            </P>

            <SubHead>2.1 Wallet Connection Data</SubHead>
            <P>
              When you connect a Hedera wallet to the Platform via the WalletConnect protocol, the following
              information is transmitted to and processed by the Platform:
            </P>
            <BulletList items={[
              <>
                <Strong>Hedera Account ID</Strong> — Your public account identifier (e.g.,{" "}
                <Code>0.0.12345</Code>). This is the primary identifier used to associate your on-platform
                actions with your wallet. It is a public, pseudonymous identifier that is visible to anyone
                on the Hedera network.
              </>,
              <>
                <Strong>WalletConnect Session Metadata</Strong> — Session topic identifier, relay protocol
                version, wallet application name (e.g., "HashPack"), supported Hedera JSON-RPC methods
                (hedera_signTransaction, hedera_signAndExecuteTransaction, hedera_signMessage), and CAIP-2
                chain identifier (hedera:mainnet). This metadata is necessary to establish and maintain the
                encrypted session between the Platform and your wallet.
              </>,
              <>
                <Strong>Network Selection</Strong> — The Hedera network you are connected to (mainnet or
                testnet). The Platform operates on Hedera mainnet by default.
              </>,
            ]} />
            <Callout type="info">
              <Strong>What we do NOT collect:</Strong> We never access, request, store, or have the
              technical ability to obtain your private keys, seed phrases, mnemonic words, or wallet
              passwords. All transaction signing occurs exclusively within your wallet application
              (e.g., HashPack) and requires your explicit, per-transaction approval. The WalletConnect
              protocol uses end-to-end encryption between the Platform and your wallet — session relay
              servers cannot read the content of messages.
            </Callout>

            <SubHead>2.2 On-Chain Data Retrieved via Mirror Node</SubHead>
            <P>
              Upon wallet connection and at regular polling intervals (approximately every 30 seconds while
              your session is active), the Platform queries the Hedera Mirror Node — a public, read-only
              API — to retrieve the following information associated with your Hedera Account ID:
            </P>
            <BulletList items={[
              <>
                <Strong>HBAR Balance</Strong> — Your native HBAR token balance, converted from tinybars
                (1 HBAR = 100,000,000 tinybars) to display units.
              </>,
              <>
                <Strong>HTS Token Balances</Strong> — Balances of all Hedera Token Service tokens
                associated with your account, including the BOTB fungible token (when launched).
              </>,
              <>
                <Strong>NFT Holdings</Strong> — A complete enumeration of NFTs held by your account,
                including token ID, serial number, creation timestamp, and base64-encoded metadata for each
                NFT. The Platform categorizes these NFTs into known collections: Governor NFTs (Token ID:
                0.0.9338241), Sigma Series NFTs, Meta Series NFTs, and uncategorized third-party NFTs.
              </>,
              <>
                <Strong>Account Metadata</Strong> — Account creation timestamp, auto-renew period, account
                memo, staking information (staked node ID, stake period start), EVM address, and public key
                type. This is standard Hedera account information that is publicly visible to any party
                querying the Mirror Node.
              </>,
            ]} />
            <P>
              This data is used to: (a) display your wallet balances in the Platform interface; (b) determine
              your NFT holdings for feature gating (e.g., Governors Hub access requires at least one Governor
              NFT); (c) calculate your voting power multiplier based on verified NFT ownership; and
              (d) detect whether your account is in the administrator whitelist.
            </P>
            <Callout type="important">
              All data retrieved from the Hedera Mirror Node is <Strong>already publicly available</Strong>{" "}
              to anyone with internet access. The Platform does not create new data about your on-chain
              holdings — it reads existing public ledger data. You can independently verify all Mirror Node
              data at{" "}
              <ExtLink href="https://hashscan.io/mainnet">hashscan.io</ExtLink>.
            </Callout>

            <SubHead>2.3 Voting Records</SubHead>
            <P>
              When you cast a vote on the Platform, the following information is collected and stored in our
              backend database (a Supabase-hosted key-value store):
            </P>

            <div className="mt-3 space-y-4">
              <VoteTypeTable
                title="Battle Votes"
                keyPattern="vote:battle:{battleId}:{wallet}"
                fields={[
                  ["battleId", "Identifier of the battle voted on"],
                  ["wallet", "Your Hedera Account ID"],
                  ["athleteId", "The athlete you voted for"],
                  ["stakeAmount", "Number of tokens staked with this vote"],
                  ["votingPower", "Your multiplier at time of vote (1x, 1.5x, 2x, or 3x)"],
                  ["weightedVote", "stakeAmount × votingPower (used for reward calculation)"],
                  ["hasGovernorNFT", "Whether you held a Governor NFT at time of vote"],
                  ["hasSigmaNFT", "Whether you held a Sigma Series NFT at time of vote"],
                  ["timestamp", "ISO 8601 timestamp of when the vote was recorded"],
                ]}
              />
              <VoteTypeTable
                title="Governance Proposal Votes"
                keyPattern="vote:proposal:{proposalId}:{wallet}"
                fields={[
                  ["proposalId", "Identifier of the governance proposal"],
                  ["wallet", "Your Hedera Account ID"],
                  ["direction", "Your vote direction: 'for' or 'against'"],
                  ["votingPower", "Your multiplier at time of vote"],
                  ["timestamp", "ISO 8601 timestamp"],
                ]}
              />
              {/* Athlete Skill Rating Votes — REMOVED. Skills are now admin-only.
                  Governors may propose skill changes via governance proposals. */}
            </div>

            <P>
              Vote records serve as the authoritative source for: (a) enforcing the one-vote-per-wallet-per-battle
              rule; (b) calculating weighted vote tallies; (c) generating reward distribution snapshots when
              a battle winner is declared; and (d) populating public leaderboards.
            </P>

            <SubHead>2.4 Administrative Session Data</SubHead>
            <P>
              If your Hedera Account ID is in the Platform's administrator whitelist (currently limited to
              two specific accounts), the following additional data is processed during admin authentication:
            </P>
            <BulletList items={[
              <>
                <Strong>Cryptographic Challenge Nonce</Strong> — A server-generated random 64-character
                hexadecimal string, unique to your wallet, that expires after 5 minutes. You must sign this
                nonce via WalletConnect to prove wallet ownership.
              </>,
              <>
                <Strong>Session Token</Strong> — Upon successful challenge verification, the server
                generates a UUID v4 session token stored server-side with a 20-minute time-to-live (TTL).
                This token is transmitted in the <Code>X-Admin-Session</Code> HTTP header on subsequent
                requests. Session tokens are not JSON Web Tokens (JWTs) — they are opaque identifiers with
                no embedded user data.
              </>,
              <>
                <Strong>Mirror Node Verification</Strong> — The server independently verifies that your
                Hedera Account ID exists on the Hedera mainnet by querying the Mirror Node. This verification
                is cached for 10 minutes to reduce API calls.
              </>,
            ]} />

            <SubHead>2.5 Network & Device Information</SubHead>
            <P>
              The Platform's server infrastructure automatically collects limited technical information for
              security and rate-limiting purposes:
            </P>
            <BulletList items={[
              <>
                <Strong>IP Address</Strong> — Derived from the <Code>X-Forwarded-For</Code> or{" "}
                <Code>X-Real-IP</Code> HTTP headers. Used exclusively for rate limiting (120 requests per
                minute per IP globally; 3 admin challenge requests per 5 minutes; 10 vote attempts per
                minute per wallet). IP addresses are held in volatile server memory only and are not
                persisted to any database. They are discarded when the rate-limiting window expires
                (typically within 1-5 minutes).
              </>,
              <>
                <Strong>HTTP Headers</Strong> — Standard request headers including User-Agent, Accept,
                Content-Type, and Origin. These are logged transiently for debugging purposes and are not
                associated with your wallet identity.
              </>,
            ]} />
            <Callout type="info">
              The Platform does <Strong>not</Strong> use browser fingerprinting, advertising identifiers,
              cross-site tracking pixels, or third-party analytics cookies. We do not build behavioral
              profiles, sell user data, or share personal information with advertisers.
            </Callout>

            <SubHead>2.6 Reward Distribution Data</SubHead>
            <P>
              When an administrator declares a battle winner, the Platform generates a reward distribution
              snapshot. This snapshot aggregates voting data for the winning side and calculates each
              voter's proportional share of the battle's prize pool. The snapshot contains:
            </P>
            <BulletList items={[
              <>Your Hedera Account ID</>,
              <>Your stake amount and voting power multiplier</>,
              <>Your weighted vote and percentage share of the prize pool</>,
              <>The calculated reward amount in tokens</>,
              <>Your NFT holding status at the time of the vote</>,
            ]} />
            <P>
              Snapshots are stored in the backend database and can be exported by administrators in CSV
              or JSON format to facilitate on-chain token airdrops. The airdrop transaction ID (if
              executed) is recorded in the snapshot for auditability.
            </P>
          </PolicySection>

          {/* ================================================================ */}
          {/* SECTION 3 — BLOCKCHAIN DATA & ON-CHAIN TRANSPARENCY             */}
          {/* ================================================================ */}
          <PolicySection num={3} title="BLOCKCHAIN DATA & ON-CHAIN TRANSPARENCY" icon={<Globe className="w-4 h-4" />}>
            <P>
              The Platform operates on the Hedera Hashgraph public distributed ledger. This section
              explains the nature of blockchain data, its permanence, and the transparency implications
              for your privacy. Understanding these characteristics is essential to making an informed
              decision about your participation.
            </P>

            <SubHead>3.1 Public Nature of Hedera Ledger Data</SubHead>
            <P>
              Hedera Hashgraph is a public distributed ledger. By design, the following categories of
              data are permanently visible to any party with access to a Hedera Mirror Node or block
              explorer (such as{" "}
              <ExtLink href="https://hashscan.io/mainnet">HashScan</ExtLink>):
            </P>
            <BulletList items={[
              <>
                <Strong>Account information</Strong> — Your Hedera Account ID, account creation date,
                public key, HBAR balance, token balances, NFT holdings, staking configuration, and
                transaction history are all publicly queryable.
              </>,
              <>
                <Strong>Token transfers</Strong> — All HBAR and HTS token transfers to, from, and
                between accounts are recorded on the public ledger with sender, receiver, amount,
                and timestamp.
              </>,
              <>
                <Strong>NFT ownership changes</Strong> — Every mint, transfer, and burn of an HTS NFT
                is a public, auditable on-chain event. Your ownership of Governor NFTs, Sigma Series
                NFTs, and Meta Series NFTs is visible to anyone.
              </>,
              <>
                <Strong>Airdrop transactions</Strong> — When prize tokens are distributed to winning
                voters, the airdrop transaction (including all recipient accounts and amounts) is a
                public on-chain record.
              </>,
            ]} />
            <Callout type="warning">
              <Strong>Pseudonymity, Not Anonymity:</Strong> Your Hedera Account ID is pseudonymous —
              it does not inherently contain your real-world identity. However, if you have linked your
              Hedera account to your identity through other means (e.g., a KYC-verified exchange
              withdrawal, public social media disclosure, or an on-chain identity attestation), your
              Platform activity may be attributable to you by third parties. The WCO has no control
              over and no responsibility for third-party analysis of public blockchain data.
            </Callout>

            <SubHead>3.2 Hedera Consensus Service (HCS) Messages</SubHead>
            <P>
              The Platform is designed to submit vote records to the Hedera Consensus Service (HCS),
              creating timestamped, immutable, and publicly auditable messages on designated HCS topics.
              When fully operational, HCS messages will contain:
            </P>
            <BulletList items={[
              <>
                <Strong>Vote submissions</Strong> — Submitted to the Votes topic, each message contains
                the voter's Hedera Account ID, battle identifier, chosen athlete, stake amount, voting
                power, and timestamp. These messages receive a consensus timestamp from the Hedera
                network and are sequenced by the network's hashgraph consensus algorithm.
              </>,
              <>
                <Strong>Governance actions</Strong> — Submitted to the Governance topic, each message
                contains the voter's Hedera Account ID, proposal identifier, vote direction (for/against),
                and voting power.
              </>,
            ]} />
            <Callout type="critical">
              <Strong>Immutability Disclosure:</Strong> Once a message is submitted to an HCS topic and
              receives a consensus timestamp, it <Strong>cannot be modified, redacted, or deleted</Strong>{" "}
              by any party — including the WCO, Hedera LLC, or the Hedera Governing Council. HCS messages
              are permanently recorded on the Hedera network and are publicly readable via the Mirror
              Node API endpoint{" "}
              <Code>/api/v1/topics/&#123;topicId&#125;/messages</Code>. This immutability is a fundamental
              property of distributed ledger technology and is essential to the Platform's transparency
              guarantees. By casting a vote on the Platform, you irrevocably consent to the permanent
              public recording of that vote on the Hedera network.
            </Callout>

            <SubHead>3.3 Mirror Node Queries — Read-Only Access</SubHead>
            <P>
              The Platform queries the Hedera Mirror Node (mainnet.mirrornode.hedera.com) exclusively in
              a <Strong>read-only</Strong> capacity. Specifically:
            </P>
            <BulletList items={[
              <>
                <Strong>No authentication required</Strong> — The Hedera Mirror Node REST API is a public
                service that requires no API key, authentication token, or account credentials to access.
                Any person or application can query the same endpoints the Platform uses.
              </>,
              <>
                <Strong>No data creation</Strong> — Mirror Node queries do not write data to the Hedera
                network. They return existing public ledger data. The Platform's Mirror Node interactions
                cannot modify your account, balances, or token holdings.
              </>,
              <>
                <Strong>Endpoints used</Strong> — The Platform queries the following Mirror Node API paths:
                <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-1">
                  <div className="text-[#6AA3E0]">/api/v1/balances<span className="text-[#8494A7]">?account.id=&#123;id&#125;</span></div>
                  <div className="text-[#6AA3E0]">/api/v1/accounts/<span className="text-[#8494A7]">&#123;id&#125;</span></div>
                  <div className="text-[#6AA3E0]">/api/v1/accounts/<span className="text-[#8494A7]">&#123;id&#125;</span>/nfts</div>
                  <div className="text-[#6AA3E0]">/api/v1/tokens/<span className="text-[#8494A7]">&#123;id&#125;</span></div>
                  <div className="text-[#6AA3E0]">/api/v1/transactions/<span className="text-[#8494A7]">&#123;id&#125;</span></div>
                  <div className="text-[#6AA3E0]">/api/v1/topics/<span className="text-[#8494A7]">&#123;topicId&#125;</span>/messages</div>
                </div>
              </>,
            ]} />

            <SubHead>3.4 Wallet-to-Vote Association</SubHead>
            <P>
              Every vote cast on the Platform is associated with the voter's Hedera Account ID. This
              association is necessary for:
            </P>
            <NumberedList items={[
              "Enforcing the one-vote-per-wallet rule to prevent duplicate voting.",
              "Calculating voting power based on the voter's verified NFT holdings at the time of the vote.",
              "Generating accurate reward distribution snapshots for token airdrops to winning voters.",
              "Populating the public voter leaderboard, which ranks participants by voting activity and accuracy.",
              "Creating an auditable trail that ensures competition integrity and prevents manipulation.",
            ]} />
            <P>
              Your wallet-to-vote associations are stored in the Platform's backend database and, when HCS
              integration is fully operational, will also be recorded on the Hedera public ledger. On the
              Platform's public-facing pages (e.g., leaderboards), vote counts are displayed in aggregate;
              individual wallet addresses are not displayed to other users unless you are an administrator
              viewing the admin panel.
            </P>

            <SubHead>3.5 On-Chain Data and Your Right to Erasure</SubHead>
            <P>
              Certain data protection regulations, including the European Union's General Data Protection
              Regulation (GDPR, Article 17) and the California Consumer Privacy Act (CCPA), grant
              individuals a right to request the deletion of their personal data. We acknowledge this right
              and will honor it to the fullest extent technically feasible. However, you should be aware
              of the following limitation:
            </P>
            <Callout type="critical">
              <Strong>Blockchain data cannot be deleted.</Strong> Data that has been written to the Hedera
              public ledger — including HCS vote messages, token transfer records, and NFT ownership history
              — is cryptographically secured, replicated across the network's node infrastructure, and
              immutable by design. Neither the WCO nor any other entity has the technical capability to
              modify or erase data from the Hedera distributed ledger. This is an inherent property of
              distributed ledger technology, not a policy choice.
            </Callout>
            <P>
              If you exercise your right to erasure, we will delete all off-chain data associated with your
              Hedera Account ID from our backend database (including vote records, session tokens, and
              cached balance data) within the timeframes specified in Section 6. On-chain data will remain
              on the Hedera public ledger indefinitely, as described above.
            </P>
            <P>
              We strongly recommend that you consider the permanent nature of on-chain data <Strong>before</Strong>{" "}
              casting votes or engaging in transactions on the Platform. Once a transaction is confirmed on the
              Hedera network, it is final and irreversible.
            </P>

            <SubHead>3.6 HashScan Explorer Visibility</SubHead>
            <P>
              All Hedera network activity, including activity generated through the Platform, is independently
              verifiable via the{" "}
              <ExtLink href="https://hashscan.io/mainnet">HashScan block explorer</ExtLink>. By entering a
              Hedera Account ID, token ID, or transaction ID into HashScan, any person can view the complete
              on-chain history associated with that identifier. The Platform has no ability to restrict or
              control third-party access to public Hedera ledger data.
            </P>
          </PolicySection>

          {/* ================================================================ */}
          {/* SECTION 4 — THIRD-PARTY SERVICES (imported)                     */}
          {/* ================================================================ */}
          <Section4_ThirdPartyServices />

          {/* ================================================================ */}
          {/* SECTION 5 — COOKIES, LOCAL STORAGE & ANALYTICS (imported)        */}
          {/* ================================================================ */}
          <Section5_CookiesLocalStorage />

          {/* ================================================================ */}
          {/* SECTION 6 — DATA RETENTION & YOUR RIGHTS (imported)             */}
          {/* ================================================================ */}
          <Section6_DataRetention />

          {/* ================================================================ */}
          {/* SECTION 7 — INTERNATIONAL DATA TRANSFERS (imported)              */}
          {/* ================================================================ */}
          <Section7_InternationalTransfers />

          {/* ================================================================ */}
          {/* SECTION 8 — SECURITY MEASURES (imported)                         */}
          {/* ================================================================ */}
          <Section8_Security />

          {/* ================================================================ */}
          {/* SECTION 9 — CHILDREN'S PRIVACY (imported)                        */}
          {/* ================================================================ */}
          <Section9_ChildrensPrivacy />

          {/* ================================================================ */}
          {/* SECTION 10 — CHANGES TO THIS POLICY (imported)                   */}
          {/* ================================================================ */}
          <Section10_PolicyChanges />

          {/* ================================================================ */}
          {/* SECTION 11 — CONTACT INFORMATION (imported)                      */}
          {/* ================================================================ */}
          <Section11_Contact />
        </div>

        {/* Version & Print */}
        <div className="mt-10 p-4 rounded-xl bg-[#0D1526]/50 border border-[#4274B9]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-[#8494A7] space-y-0.5">
            <p><Strong>Document:</Strong> BOTB Privacy Policy v1.0 (Beta)</p>
            <p><Strong>Effective:</Strong> March 7, 2026</p>
            <p><Strong>Jurisdiction:</Strong> GDPR, UK GDPR, CCPA/CPRA, COPPA</p>
            <p><Strong>Sections Complete:</Strong> 11 of 11</p>
          </div>
          <div className="flex gap-3">
            <Link to="/terms" className="text-xs text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Terms of Service &rarr;</Link>
            <Link to="/whitepaper" className="text-xs text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Whitepaper &rarr;</Link>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-8 pt-8 border-t border-[#4274B9]/10 flex flex-wrap gap-6 text-sm text-[#8494A7]">
          <Link to="/terms" className="hover:text-[#6AA3E0] transition-colors">Terms of Service</Link>
          <Link to="/whitepaper" className="hover:text-[#6AA3E0] transition-colors">Whitepaper</Link>
          <a href="https://worldcalisthenics.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#6AA3E0] transition-colors">
            worldcalisthenics.org
          </a>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Reusable Typography Components — Consistent legal document styling
// =============================================================================

function PolicySection({ num, title, icon, children }: {
  num: number; title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="p-6 sm:p-8 rounded-xl bg-[#0D1526]/80 border border-[#4274B9]/10" id={`section-${num}`}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/20 flex items-center justify-center text-[#6AA3E0]">
          {icon}
        </div>
        <h2 className="font-bold text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem", letterSpacing: "0.08em" }}>
          {num}. {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-[#E8ECF0] mt-6 mb-2 tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#B0BCC9] leading-relaxed">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-[#E8ECF0] font-semibold">{children}</strong>;
}

function Def({ children }: { children: React.ReactNode }) {
  return <strong className="text-[#E8ECF0]">{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-[#4274B9]/10 text-[#6AA3E0] text-xs font-mono border border-[#4274B9]/15">
      {children}
    </code>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#6AA3E0] hover:text-[#4274B9] underline underline-offset-2 transition-colors">
      {children}
    </a>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-2 ml-1 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-[#B0BCC9] leading-relaxed">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#4274B9]/40 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="mt-2 ml-1 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-[#B0BCC9] leading-relaxed">
          <span className="text-[#6AA3E0] font-mono text-xs mt-0.5 shrink-0 w-5 text-right">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Callout({ type, children }: { type: "info" | "important" | "warning" | "critical"; children: React.ReactNode }) {
  const styles = {
    info: { bg: "bg-[#4274B9]/5", border: "border-[#4274B9]/20", icon: "text-[#6AA3E0]", label: "NOTE" },
    important: { bg: "bg-[#4274B9]/8", border: "border-[#4274B9]/25", icon: "text-[#4274B9]", label: "IMPORTANT" },
    warning: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "text-amber-400", label: "WARNING" },
    critical: { bg: "bg-red-500/5", border: "border-red-500/20", icon: "text-red-400", label: "CRITICAL NOTICE" },
  };
  const s = styles[type];
  return (
    <div className={`mt-4 mb-2 p-4 rounded-lg ${s.bg} border ${s.border}`}>
      <div className={`text-[0.65rem] font-bold tracking-widest mb-1.5 ${s.icon}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
        {s.label}
      </div>
      <div className="text-sm text-[#B0BCC9] leading-relaxed">{children}</div>
    </div>
  );
}

function DefItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-[#6AA3E0] font-semibold whitespace-nowrap shrink-0">"{term}"</span>
      <span className="text-[#8494A7]">—</span>
      <span className="text-[#B0BCC9] leading-relaxed">{children}</span>
    </div>
  );
}

function VoteTypeTable({ title, keyPattern, fields }: {
  title: string; keyPattern: string; fields: [string, string][];
}) {
  return (
    <div className="rounded-lg border border-[#4274B9]/10 overflow-hidden">
      <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10 flex items-center justify-between">
        <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
          {title}
        </span>
        <code className="text-[0.6rem] text-[#6AA3E0] bg-[#0A0F1A] px-2 py-0.5 rounded font-mono">
          {keyPattern}
        </code>
      </div>
      <div className="divide-y divide-[#4274B9]/5">
        {fields.map(([field, desc]) => (
          <div key={field} className="flex gap-3 px-4 py-2 text-xs">
            <code className="text-[#6AA3E0] font-mono shrink-0 w-28">{field}</code>
            <span className="text-[#8494A7]">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}