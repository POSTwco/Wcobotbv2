/**
 * Privacy Policy — Sections 6-11
 * ================================
 * Step 6: Data Retention & Your Rights (GDPR/CCPA)
 * Step 7: International Transfers, Security, Children's Privacy,
 *         Policy Changes, Contact Information
 *
 * All facts verified against the actual codebase:
 *   - admin-auth.tsx: TTLs, rate limits, sanitization functions
 *   - index.tsx: KV key patterns, CORS config, route structure
 *   - wallet-connect.ts: session management, relay details
 *   - hedera-config.ts: token IDs, admin wallets
 */

import React from "react";
import { Database, Globe, Lock, Shield, FileText, Wallet } from "lucide-react";
import {
  PolicySection, SubHead, P, Strong, Code, ExtLink,
  BulletList, NumberedList, Callout,
} from "./privacy-sections";

// =============================================================================
// Retention Table Component (local to this file)
// =============================================================================

function RetentionRow({ category, keyPattern, period, deletion }: {
  category: string; keyPattern: string; period: string; deletion: string;
}) {
  return (
    <div className="px-4 py-3 space-y-1 text-xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[#E8ECF0] font-semibold">{category}</span>
        <code className="text-[#6AA3E0] font-mono text-[0.6rem] bg-[#0A0F1A] px-1.5 py-0.5 rounded">{keyPattern}</code>
      </div>
      <div className="text-[#B0BCC9]"><span className="text-[#8494A7]">Retention:</span> {period}</div>
      <div className="text-[#B0BCC9]"><span className="text-[#8494A7]">Deletion:</span> {deletion}</div>
    </div>
  );
}

// =============================================================================
// Security Row Component (local to this file)
// =============================================================================

function SecurityRow({ layer, mechanism, detail }: {
  layer: string; mechanism: string; detail: string;
}) {
  return (
    <div className="px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#6AA3E0] font-semibold shrink-0">{layer}</span>
        <span className="text-[#8494A7]">&mdash;</span>
        <span className="text-[#E8ECF0] font-medium">{mechanism}</span>
      </div>
      <div className="text-[#8494A7] pl-4">{detail}</div>
    </div>
  );
}

// =============================================================================
// SECTION 6 — DATA RETENTION & YOUR RIGHTS
// =============================================================================

export function Section6_DataRetention() {
  return (
    <PolicySection num={6} title="DATA RETENTION & YOUR RIGHTS" icon={<Database className="w-4 h-4" />}>
      <P>
        This section describes how long we retain each category of data, under what circumstances
        data is deleted, and the rights available to you under applicable data protection law.
        We retain data only for as long as necessary to fulfill the purposes described in this
        Policy or as required by applicable law.
      </P>

      <SubHead>6.1 Retention Periods by Data Category</SubHead>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            DATA RETENTION SCHEDULE
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          <RetentionRow
            category="Battle Vote Records"
            keyPattern="vote:battle:{id}:{wallet}"
            period="Retained indefinitely while the Platform is operational. Vote records are necessary for historical leaderboard accuracy, reward audit trails, and competition integrity verification."
            deletion="Deletable upon verified data subject request. Deletion removes the KV entry; aggregate tallies are recalculated."
          />
          <RetentionRow
            category="Governance Proposal Votes"
            keyPattern="vote:proposal:{id}:{wallet}"
            period="Retained indefinitely while the Platform is operational. Governance vote records form part of the DAO decision audit trail."
            deletion="Deletable upon verified data subject request."
          />
          {/* Athlete Skill Rating Votes — REMOVED. Skills are now admin-only. */}
          <RetentionRow
            category="Reward Distribution Snapshots"
            keyPattern="snapshot:battle:{id}"
            period="Retained indefinitely for airdrop auditability. Snapshots may be exported as CSV/JSON by administrators."
            deletion="Individual voter entries within a snapshot can be redacted upon verified request. The snapshot structure is preserved for audit integrity."
          />
          <RetentionRow
            category="Admin Challenge Nonces"
            keyPattern="admin-challenge:{wallet}"
            period="5 minutes (CHALLENGE_TTL_MS). Nonces are wallet-specific and auto-expire."
            deletion="Automatic expiration. Expired challenges are overwritten on the next authentication attempt."
          />
          <RetentionRow
            category="Admin Session Tokens"
            keyPattern="admin-session:{wallet}"
            period="20 minutes (SESSION_TTL_MS). Sessions are UUID v4 tokens stored server-side with a fixed TTL."
            deletion="Automatic expiration. Sessions cannot be renewed — a new challenge-sign cycle is required."
          />
          <RetentionRow
            category="Athlete Profiles"
            keyPattern="athlete:{id}"
            period="Retained indefinitely while the Platform is operational. Athlete profiles are public competition data."
            deletion="Deletable by administrators via DELETE /admin/athletes/:id."
          />
          <RetentionRow
            category="Battle & Event Records"
            keyPattern="battle:{id} / event:{id}"
            period="Retained indefinitely. Battles and events are public competition records."
            deletion="Modifiable by administrators. No automated deletion."
          />
          <RetentionRow
            category="Governance Proposals"
            keyPattern="proposal:{id}"
            period="Retained indefinitely as part of the governance audit trail."
            deletion="Proposals can be closed or archived by administrators but are not deleted."
          />
          <RetentionRow
            category="Rate Limit Counters"
            keyPattern="In-memory (volatile)"
            period="1-5 minutes (sliding window). Counters are held in volatile server memory only and are lost on Edge Function cold starts."
            deletion="Automatic. No persistence to database."
          />
          <RetentionRow
            category="Mirror Node Verification Cache"
            keyPattern="In-memory (volatile)"
            period="10 minutes (WALLET_VERIFY_CACHE_TTL_MS). Cached wallet existence checks are held in volatile memory."
            deletion="Automatic. No persistence to database."
          />
          <RetentionRow
            category="Browser localStorage"
            keyPattern="botb-* / wc@2:*"
            period="Until manually cleared by the user or browser data purge. WalletConnect sessions typically expire after 7 days."
            deletion="User-controlled. See Section 5.8 for clearing instructions."
          />
        </div>
      </div>

      <Callout type="critical">
        <Strong>On-chain data has no retention period.</Strong> Data written to the Hedera public
        ledger — including HCS vote messages, token transfer records, NFT mint/transfer/burn events,
        and airdrop transactions — is retained permanently by the Hedera network infrastructure.
        The WCO has no technical capability to delete, modify, or set an expiration date on on-chain
        data. See Section 3.5 for detailed erasure limitations.
      </Callout>

      <SubHead>6.2 Your Rights Under GDPR (EU/EEA Users)</SubHead>
      <P>
        If you are located in the European Union or European Economic Area, you have the following
        rights under the General Data Protection Regulation (Regulation (EU) 2016/679):
      </P>
      <BulletList items={[
        <>
          <Strong>Right of Access (Article 15)</Strong> — You have the right to obtain confirmation
          as to whether your personal data is being processed and, if so, to receive a copy of that
          data. You can retrieve your voting history via the public API endpoint{" "}
          <Code>GET /votes/mine/:wallet</Code> at any time while connected.
        </>,
        <>
          <Strong>Right to Rectification (Article 16)</Strong> — You have the right to request
          correction of inaccurate personal data. Because the Platform identifies you solely by your
          Hedera Account ID (which is assigned by the Hedera network and cannot be changed), and
          because vote records reflect a point-in-time snapshot that is factually accurate at the
          time of recording, rectification requests are limited to cases where a technical error
          caused incorrect data to be stored.
        </>,
        <>
          <Strong>Right to Erasure (Article 17)</Strong> — You have the right to request deletion
          of your personal data. We will delete all off-chain data associated with your Hedera
          Account ID from our KV store within 30 days of a verified request. This includes vote
          records, skill ratings, and any appearance in reward snapshots. <Strong>Limitation:</Strong>{" "}
          On-chain data (HCS messages, token transfers, NFT ownership history) cannot be erased.
          See Section 3.5.
        </>,
        <>
          <Strong>Right to Restriction of Processing (Article 18)</Strong> — You may request that
          we restrict the processing of your data. In practice, this means we will retain but not
          actively process your vote records (e.g., exclude them from leaderboard calculations)
          while the restriction is in effect.
        </>,
        <>
          <Strong>Right to Data Portability (Article 20)</Strong> — You have the right to receive
          your personal data in a structured, commonly used, and machine-readable format. Your
          complete voting history is available via <Code>GET /votes/mine/:wallet</Code> in JSON
          format. Administrators can also export reward snapshots in CSV or JSON format via{" "}
          <Code>GET /admin/snapshots/:id/export</Code>.
        </>,
        <>
          <Strong>Right to Object (Article 21)</Strong> — You have the right to object to processing
          based on legitimate interests. If you object, we will cease processing your data unless
          we can demonstrate compelling legitimate grounds (e.g., competition integrity requirements).
        </>,
        <>
          <Strong>Right to Lodge a Complaint</Strong> — You have the right to lodge a complaint
          with a supervisory authority in the EU Member State of your habitual residence, place
          of work, or place of the alleged infringement.
        </>,
      ]} />

      <SubHead>6.3 Your Rights Under CCPA/CPRA (California Users)</SubHead>
      <P>
        If you are a California resident, you have the following rights under the California
        Consumer Privacy Act (Cal. Civ. Code {"\u00A7\u00A7"} 1798.100-1798.199) as amended by the
        California Privacy Rights Act:
      </P>
      <BulletList items={[
        <>
          <Strong>Right to Know (Section 1798.100)</Strong> — You have the right to request
          disclosure of the categories and specific pieces of personal information we have collected
          about you, the categories of sources, the business purpose for collection, and the
          categories of third parties with whom we share it. This Policy serves as our comprehensive
          disclosure.
        </>,
        <>
          <Strong>Right to Delete (Section 1798.105)</Strong> — You have the right to request
          deletion of your personal information. The same on-chain limitations described in
          Section 6.2 (Right to Erasure) apply.
        </>,
        <>
          <Strong>Right to Opt-Out of Sale (Section 1798.120)</Strong> — The WCO does not sell
          your personal information. We do not share personal information with third parties for
          cross-context behavioral advertising. No opt-out mechanism is necessary because no
          sale occurs.
        </>,
        <>
          <Strong>Right to Non-Discrimination (Section 1798.125)</Strong> — We will not discriminate
          against you for exercising any of your CCPA rights. Exercising your rights will not
          affect your access to the Platform, your voting power, or your NFT-gated features.
        </>,
        <>
          <Strong>Right to Correct (Section 1798.106)</Strong> — You have the right to request
          correction of inaccurate personal information. The same limitations described in
          Section 6.2 (Right to Rectification) apply.
        </>,
      ]} />

      <SubHead>6.4 How to Exercise Your Rights</SubHead>
      <P>
        To exercise any of the rights described in this section, you must submit a verifiable
        request. Because the Platform identifies you solely by your Hedera Account ID (a
        pseudonymous identifier), we must verify that you control the wallet in question before
        processing any data subject request. Verification is performed as follows:
      </P>
      <NumberedList items={[
        "Contact the WCO Data Protection Officer using the information in Section 11.",
        "Provide your Hedera Account ID (e.g., 0.0.12345).",
        "We will generate a unique challenge message and ask you to sign it with the private key corresponding to your Hedera account. This is the same cryptographic challenge mechanism used for admin authentication (see Section 2.4), adapted for data subject verification.",
        "Upon successful signature verification, we will process your request within 30 days (GDPR) or 45 days (CCPA), with the possibility of a one-time 30-day extension for complex requests.",
        "You will receive a confirmation of the actions taken, including a list of all KV keys deleted or modified.",
      ]} />

      <SubHead>6.5 Data Portability Export</SubHead>
      <P>
        The Platform provides self-service data export for voting records. While connected with
        your wallet, the following API endpoint returns all battle votes associated with your
        Hedera Account ID in JSON format:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10">
        <span className="text-[#6AA3E0]">GET</span>{" "}
        <span className="text-[#B0BCC9]">/votes/mine/</span>
        <span className="text-[#8494A7]">{"{your-wallet-id}"}</span>
      </div>
      <P>
        The response includes all fields described in Section 2.3 (battle ID, athlete voted for,
        stake amount, voting power, weighted vote, NFT holdings at time of vote, and timestamp).
        This data is provided in a structured, machine-readable JSON format suitable for portability
        under GDPR Article 20 and CCPA Section 1798.100.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 7 — INTERNATIONAL DATA TRANSFERS
// =============================================================================

export function Section7_InternationalTransfers() {
  return (
    <PolicySection num={7} title="INTERNATIONAL DATA TRANSFERS" icon={<Globe className="w-4 h-4" />}>
      <P>
        The Platform operates on globally distributed infrastructure. This section describes how
        your data may be transferred across international borders and the safeguards in place to
        protect your data during such transfers.
      </P>

      <SubHead>7.1 Hedera Network Distribution</SubHead>
      <P>
        The Hedera Hashgraph network operates a global consensus node infrastructure governed by
        the Hedera Governing Council — a body of up to 39 multinational organizations. Consensus
        nodes are distributed across multiple countries and continents. When data is written to
        the Hedera ledger (e.g., HCS vote messages, token transfers), it is replicated across all
        active consensus nodes globally. By using the Platform, you acknowledge that on-chain data
        is inherently stored in multiple jurisdictions simultaneously.
      </P>

      <SubHead>7.2 Supabase Infrastructure</SubHead>
      <P>
        The Platform's backend is hosted on Supabase, which utilizes Amazon Web Services (AWS)
        infrastructure. Supabase Edge Functions (which host the Platform's Hono web server) are
        deployed to edge locations globally for low-latency response. The PostgreSQL database
        (which backs the KV store) is hosted in a single AWS region. Data at rest is encrypted by
        Supabase using AES-256 encryption.
      </P>

      <SubHead>7.3 WalletConnect Relay Infrastructure</SubHead>
      <P>
        The WalletConnect relay server (<Code>wss://relay.walletconnect.org</Code>) is operated by
        Reown and may be hosted in multiple geographic regions. Because all WalletConnect payloads
        are encrypted end-to-end (X25519-XSalsa20-Poly1305), the relay infrastructure cannot read
        or process the content of messages transiting through it. The relay handles only encrypted
        blobs and routing metadata.
      </P>

      <SubHead>7.4 Transfer Safeguards</SubHead>
      <P>
        For transfers of personal data from the EU/EEA to third countries that have not received
        an adequacy decision from the European Commission, we rely on the following safeguards:
      </P>
      <BulletList items={[
        <>
          <Strong>Standard Contractual Clauses (SCCs)</Strong> — Our infrastructure providers
          (Supabase, AWS) maintain Standard Contractual Clauses approved by the European Commission
          for transfers of personal data to processors in third countries.
        </>,
        <>
          <Strong>Encryption in transit</Strong> — All communications between the Platform frontend,
          the Hono backend server, and external APIs (Mirror Node, WalletConnect relay) are
          encrypted using TLS 1.2 or higher.
        </>,
        <>
          <Strong>Encryption at rest</Strong> — Data stored in the Supabase database is encrypted
          at rest using AES-256 encryption managed by AWS.
        </>,
        <>
          <Strong>End-to-end encryption</Strong> — WalletConnect sessions use end-to-end encryption
          that prevents intermediary relay servers from accessing message content, regardless of
          the relay server's geographic location.
        </>,
        <>
          <Strong>On-chain data exception</Strong> — Data written to the Hedera public ledger is
          inherently global and cannot be restricted to specific jurisdictions. This is a
          fundamental architectural property of public distributed ledger technology. By
          participating in on-chain activities (voting, token transfers), you consent to the global
          distribution of that data.
        </>,
      ]} />

      <SubHead>7.5 UK Users</SubHead>
      <P>
        If you are located in the United Kingdom, your personal data is protected under the UK
        General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. The rights
        described in Section 6.2 apply equivalently under UK GDPR. International transfers from the
        UK are governed by the UK International Data Transfer Agreement (IDTA) or the UK Addendum
        to the EU Standard Contractual Clauses, as applicable. You may lodge complaints with the
        Information Commissioner's Office (ICO) at{" "}
        <ExtLink href="https://ico.org.uk">ico.org.uk</ExtLink>.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 8 — SECURITY MEASURES
// =============================================================================

export function Section8_Security() {
  return (
    <PolicySection num={8} title="SECURITY MEASURES" icon={<Lock className="w-4 h-4" />}>
      <P>
        The WCO implements technical and organizational measures to protect the integrity,
        confidentiality, and availability of data processed through the Platform. This section
        provides a transparent description of these measures. No system can guarantee absolute
        security, but we are committed to industry-appropriate protections for a Web3 application.
      </P>

      <SubHead>8.1 Three-Layer Admin Authentication</SubHead>
      <P>
        Administrative access to the Platform is protected by a three-layer authentication system
        implemented in <Code>admin-auth.tsx</Code>:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            ADMIN AUTH LAYERS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          <SecurityRow
            layer="Layer 1"
            mechanism="Wallet Whitelist"
            detail="Only two hardcoded Hedera Account IDs (held by WCO executives) can initiate admin authentication. The specific account IDs are never exposed in client-side code. All other wallets are rejected immediately with no further processing."
          />
          <SecurityRow
            layer="Layer 2"
            mechanism="Mirror Node Verification"
            detail="The server independently verifies that the claimed wallet exists on the Hedera mainnet by querying the Mirror Node REST API. This prevents spoofing of non-existent account IDs. Verification results are cached in volatile memory for 10 minutes (WALLET_VERIFY_CACHE_TTL_MS)."
          />
          <SecurityRow
            layer="Layer 3"
            mechanism="Cryptographic Challenge-Sign"
            detail="The server generates a random 64-character hexadecimal nonce embedded in a structured challenge message. The admin must sign this message via WalletConnect (hedera_signMessage). The server verifies the signature against the wallet's public key. Upon success, a UUID v4 session token is issued with a 20-minute TTL (SESSION_TTL_MS). The session token is an opaque server-side identifier — not a JWT — containing no embedded user data."
          />
        </div>
      </div>

      <SubHead>8.2 Rate Limiting</SubHead>
      <P>
        The Platform enforces in-memory sliding-window rate limits to prevent abuse:
      </P>
      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            RATE LIMITS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          <div className="flex gap-3 px-4 py-2 text-xs">
            <span className="text-[#6AA3E0] font-mono shrink-0 w-40">Vote endpoints</span>
            <span className="text-[#8494A7]">10 requests per minute per wallet address</span>
          </div>
          <div className="flex gap-3 px-4 py-2 text-xs">
            <span className="text-[#6AA3E0] font-mono shrink-0 w-40">Admin challenge</span>
            <span className="text-[#8494A7]">3 requests per 5 minutes per wallet address</span>
          </div>
          <div className="flex gap-3 px-4 py-2 text-xs">
            <span className="text-[#6AA3E0] font-mono shrink-0 w-40">General API</span>
            <span className="text-[#8494A7]">60 requests per minute per IP address</span>
          </div>
        </div>
      </div>
      <P>
        Rate limit counters are held in volatile server memory using a sliding-window algorithm.
        Counters are not persisted to the database and are lost on Edge Function cold starts. Stale
        entries are cleaned every 5 minutes (CLEANUP_INTERVAL). Requests exceeding the rate limit
        receive an HTTP 429 response.
      </P>

      <SubHead>8.3 Input Sanitization</SubHead>
      <P>
        All user-supplied input processed by the server is sanitized before storage:
      </P>
      <BulletList items={[
        <>
          <Strong>sanitizeString(input, maxLength)</Strong> — Removes{" "}
          <Code>{"<script>"}</Code> tags and their content, strips all HTML tags, removes control
          characters (except newlines and tabs), trims whitespace, and enforces a maximum character
          length. Default max: 5,000 characters. Field-specific limits: name (100), bio (2,000),
          country (80), nickname (100), social handles (200).
        </>,
        <>
          <Strong>sanitizeNumber(input, min, max, default)</Strong> — Validates that input is a
          finite number within specified bounds. Returns the default value if input is NaN, Infinity,
          or out of range. Examples: wins (0-9,999), rank (1-9,999), bracketSeat (0-128), prizePool
          (0-100,000,000).
        </>,
        <>
          <Strong>sanitizeUrl(input, maxLength)</Strong> — Validates that input is a well-formed URL
          with an <Code>http:</Code> or <Code>https:</Code> protocol. Rejects all other protocols
          (javascript:, data:, ftp:, etc.). Max length: 2,000 characters.
        </>,
        <>
          <Strong>Enum validation</Strong> — Status fields are validated against hardcoded allowlists.
          Athlete status must be one of: active, inactive, champion, injured, retired. Battle status
          must be one of: upcoming, live, voting, completed, cancelled. Event status must be one of:
          draft, upcoming, live, completed, cancelled. Invalid values are rejected silently and fall
          back to the existing or default value.
        </>,
      ]} />

      <SubHead>8.4 Transport Security</SubHead>
      <BulletList items={[
        <>
          <Strong>HTTPS enforcement</Strong> — All communication between the frontend and the
          Supabase-hosted backend is encrypted via TLS. Supabase enforces HTTPS for all Edge
          Function endpoints. Unencrypted HTTP requests are rejected.
        </>,
        <>
          <Strong>WalletConnect encryption</Strong> — All WalletConnect relay communication is
          encrypted end-to-end using the X25519-XSalsa20-Poly1305 cryptographic scheme, in addition
          to the WSS (WebSocket Secure) transport layer.
        </>,
        <>
          <Strong>Mirror Node queries</Strong> — All Mirror Node API requests use HTTPS. The Mirror
          Node does not support unencrypted connections.
        </>,
      ]} />

      <SubHead>8.5 Key Management</SubHead>
      <BulletList items={[
        <>
          <Strong>No private keys on the server</Strong> — The Platform's server never receives,
          stores, or processes Hedera private keys. All transaction signing occurs exclusively within
          the user's wallet application (e.g., HashPack) via the WalletConnect protocol.
        </>,
        <>
          <Strong>Service role key isolation</Strong> — The Supabase service role key
          (SUPABASE_SERVICE_ROLE_KEY) is stored as a Deno environment variable accessible only to
          Edge Functions. It is never exposed to the frontend, included in API responses, or logged
          to the console.
        </>,
        <>
          <Strong>Public keys only</Strong> — The frontend embeds only public identifiers: the
          Supabase project URL, the Supabase anonymous key (which has row-level security
          restrictions), and the WalletConnect project ID.
        </>,
      ]} />
    </PolicySection>
  );
}

// =============================================================================
// SECTION 9 — CHILDREN'S PRIVACY
// =============================================================================

export function Section9_ChildrensPrivacy() {
  return (
    <PolicySection num={9} title="CHILDREN'S PRIVACY" icon={<Shield className="w-4 h-4" />}>
      <P>
        The Platform is not intended for use by individuals under the age of 18 years or the age
        of legal majority in your jurisdiction, whichever is greater. The Platform involves
        cryptocurrency token staking, NFT ownership, and decentralized governance — activities that
        carry financial risk and require informed adult consent.
      </P>

      <SubHead>9.1 Age Requirement</SubHead>
      <Callout type="important">
        <Strong>You must be at least 18 years old</Strong> (or the age of legal majority in your
        jurisdiction, if higher) to use the Platform, connect a wallet, cast a vote, hold NFTs,
        or participate in governance. By accepting the Beta Disclaimer and connecting a wallet, you
        represent and warrant that you meet this age requirement.
      </Callout>

      <SubHead>9.2 No Intentional Collection from Minors</SubHead>
      <P>
        We do not knowingly collect, solicit, or process personal data from anyone under the age
        of 18. The Platform does not include age verification gates beyond the Beta Disclaimer
        self-certification, because the primary user identifier (Hedera Account ID) is pseudonymous
        and does not inherently reveal age.
      </P>

      <SubHead>9.3 COPPA Compliance (United States)</SubHead>
      <P>
        The Platform complies with the Children's Online Privacy Protection Act (COPPA, 15 U.S.C.
        {"\u00A7\u00A7"} 6501-6506). We do not knowingly collect personal information from children
        under the age of 13. If we become aware that a child under 13 has provided us with personal
        information, we will delete the associated off-chain data promptly.
      </P>

      <SubHead>9.4 Parental Notification</SubHead>
      <P>
        If a parent or guardian becomes aware that their child has connected a Hedera wallet to the
        Platform or cast votes without their consent, they should contact the WCO Data Protection
        Officer (see Section 11). We will take reasonable steps to delete the child's off-chain data
        upon verified parental request. On-chain data cannot be deleted due to the immutability
        constraints described in Section 3.5.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 10 — CHANGES TO THIS POLICY
// =============================================================================

export function Section10_PolicyChanges() {
  return (
    <PolicySection num={10} title="CHANGES TO THIS POLICY" icon={<FileText className="w-4 h-4" />}>
      <P>
        We may update this Privacy Policy from time to time to reflect changes in the Platform's
        functionality, data processing practices, applicable law, or regulatory guidance. This
        section describes how changes are classified, communicated, and versioned.
      </P>

      <SubHead>10.1 Version Numbering</SubHead>
      <P>
        This Policy uses semantic versioning in the format <Code>MAJOR.MINOR</Code>:
      </P>
      <BulletList items={[
        <>
          <Strong>MAJOR version increments</Strong> (e.g., 1.0 to 2.0) indicate material changes
          that significantly alter data collection practices, user rights, or third-party sharing.
          Major version changes require re-acceptance of the Beta Disclaimer modal.
        </>,
        <>
          <Strong>MINOR version increments</Strong> (e.g., 1.0 to 1.1) indicate non-material
          changes such as clarifications, formatting improvements, additional detail on existing
          practices, or correction of typographical errors.
        </>,
      ]} />
      <P>
        The current version is <Strong>1.0 (Beta)</Strong>, effective March 7, 2026. The version
        number and effective date are displayed at the top of this document and in the footer
        metadata section.
      </P>

      <SubHead>10.2 Notification of Material Changes</SubHead>
      <P>
        For material changes (MAJOR version increments), we will provide notice through the
        following mechanisms:
      </P>
      <NumberedList items={[
        "The Beta Disclaimer modal version will be incremented, requiring all users to re-read and re-accept the updated terms on their next visit. The localStorage key (botb-beta-agreement-v1) version field will no longer match, triggering the modal.",
        "A prominent banner notification will be displayed on the Platform for at least 30 days following the change.",
        "The updated Policy will be published to the /privacy route with a new effective date.",
        "Where feasible and where we have a communication channel, direct notification may be sent to governance participants.",
      ]} />

      <SubHead>10.3 Non-Material Changes</SubHead>
      <P>
        Non-material changes (MINOR version increments) will be reflected in the updated document
        without prior notification. You are encouraged to review this Policy periodically by
        visiting the <Code>/privacy</Code> route. The "Last Updated" date in the document header
        will always reflect the most recent modification.
      </P>

      <SubHead>10.4 Continued Use</SubHead>
      <P>
        Your continued use of the Platform after any update to this Policy constitutes acceptance of
        the revised terms. If you do not agree with any changes, you should disconnect your wallet
        and discontinue use of the Platform. You may exercise your data rights under Section 6 at
        any time.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 11 — CONTACT INFORMATION
// =============================================================================

export function Section11_Contact() {
  return (
    <PolicySection num={11} title="CONTACT INFORMATION" icon={<Wallet className="w-4 h-4" />}>
      <P>
        For questions, concerns, or requests regarding this Privacy Policy or the processing of
        your personal data, please contact the World Calisthenics Organization through the
        following channels:
      </P>

      <SubHead>11.1 Data Protection Officer</SubHead>
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
          <div><span className="text-[#6AA3E0] font-semibold">Subject Line:</span>{" "}
            <span className="text-[#B0BCC9]">"BOTB Privacy Inquiry — [Your Hedera Account ID]"</span>
          </div>
        </div>
      </div>

      <SubHead>11.2 Response Timeframes</SubHead>
      <BulletList items={[
        <>
          <Strong>General inquiries</Strong> — We aim to respond within 14 business days.
        </>,
        <>
          <Strong>Data subject access requests (GDPR Article 15)</Strong> — Within 30 days of
          verified request receipt, with a possible 60-day extension for complex requests (with
          prior notification of the extension and reason).
        </>,
        <>
          <Strong>CCPA requests</Strong> — Within 45 days of verified request receipt, with a
          possible 45-day extension (with prior notification).
        </>,
        <>
          <Strong>Erasure requests</Strong> — Off-chain data will be deleted within 30 days of
          verified request completion. A confirmation listing all deleted KV keys will be provided.
        </>,
      ]} />

      <SubHead>11.3 Verification Requirement</SubHead>
      <P>
        Because the Platform uses pseudonymous Hedera Account IDs rather than email addresses or
        usernames, we must verify wallet ownership before processing any data request. You will be
        asked to sign a cryptographic challenge message (similar to the admin authentication flow
        described in Section 2.4) to prove that you control the Hedera account in question.
      </P>

      <SubHead>11.4 Supervisory Authorities</SubHead>
      <P>
        If you are not satisfied with our response to your inquiry or believe that our processing of
        your personal data violates applicable data protection law, you have the right to lodge a
        complaint with the relevant supervisory authority:
      </P>
      <BulletList items={[
        <>
          <Strong>EU/EEA</Strong> — Contact the supervisory authority in the EU Member State of
          your habitual residence, place of work, or place of the alleged infringement. A list of
          EU data protection authorities is available at{" "}
          <ExtLink href="https://edpb.europa.eu/about-edpb/about-edpb/members_en">edpb.europa.eu</ExtLink>.
        </>,
        <>
          <Strong>United Kingdom</Strong> — Information Commissioner's Office (ICO):{" "}
          <ExtLink href="https://ico.org.uk">ico.org.uk</ExtLink>.
        </>,
        <>
          <Strong>California</Strong> — Office of the Attorney General:{" "}
          <ExtLink href="https://oag.ca.gov/privacy">oag.ca.gov/privacy</ExtLink>.
        </>,
      ]} />

      <SubHead>11.5 Document Metadata</SubHead>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-1">
        <div><span className="text-[#8494A7]">Document ID:</span> <span className="text-[#6AA3E0]">BOTB-PP-2026-001</span></div>
        <div><span className="text-[#8494A7]">Version:</span> <span className="text-[#6AA3E0]">1.0 (Beta)</span></div>
        <div><span className="text-[#8494A7]">Effective Date:</span> <span className="text-[#6AA3E0]">March 7, 2026</span></div>
        <div><span className="text-[#8494A7]">Last Reviewed:</span> <span className="text-[#6AA3E0]">March 7, 2026</span></div>
        <div><span className="text-[#8494A7]">Sections:</span> <span className="text-[#6AA3E0]">11 of 11 (complete)</span></div>
        <div><span className="text-[#8494A7]">Applicable Law:</span> <span className="text-[#6AA3E0]">GDPR, UK GDPR, CCPA/CPRA, COPPA</span></div>
        <div><span className="text-[#8494A7]">Platform:</span> <span className="text-[#6AA3E0]">Battle of the Bars (BOTB) on Hedera Hashgraph Mainnet</span></div>
        <div><span className="text-[#8494A7]">Controller:</span> <span className="text-[#6AA3E0]">World Calisthenics Organization (WCO)</span></div>
      </div>
    </PolicySection>
  );
}