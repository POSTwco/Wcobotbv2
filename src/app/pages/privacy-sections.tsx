/**
 * Privacy Policy — Sections 4 & 5
 * =================================
 * Extracted for maintainability. Imported by privacy.tsx.
 *
 * Section 4: Third-Party Services (7 integrations documented)
 * Section 5: Cookies, Local Storage & Analytics
 */

import { Server, Eye } from "lucide-react";

// =============================================================================
// Shared typography — re-exported from here for use by privacy.tsx
// =============================================================================

export function PolicySection({ num, title, icon, children }: {
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

export function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-[#E8ECF0] mt-6 mb-2 tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#B0BCC9] leading-relaxed">{children}</p>;
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-[#E8ECF0] font-semibold">{children}</strong>;
}

export function Def({ children }: { children: React.ReactNode }) {
  return <strong className="text-[#E8ECF0]">{children}</strong>;
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-[#4274B9]/10 text-[#6AA3E0] text-xs font-mono border border-[#4274B9]/15">
      {children}
    </code>
  );
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#6AA3E0] hover:text-[#4274B9] underline underline-offset-2 transition-colors">
      {children}
    </a>
  );
}

export function BulletList({ items }: { items: React.ReactNode[] }) {
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

export function NumberedList({ items }: { items: string[] }) {
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

export function Callout({ type, children }: { type: "info" | "important" | "warning" | "critical"; children: React.ReactNode }) {
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

export function DefItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-[#6AA3E0] font-semibold whitespace-nowrap shrink-0">"{term}"</span>
      <span className="text-[#8494A7]">—</span>
      <span className="text-[#B0BCC9] leading-relaxed">{children}</span>
    </div>
  );
}

export function VoteTypeTable({ title, keyPattern, fields }: {
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

// =============================================================================
// Third-Party Card Component
// =============================================================================

function ThirdPartyCard({ name, operator, purpose, dataShared, dataNotShared, retention, policyUrl, notes }: {
  name: string; operator: string; purpose: string; dataShared: string[];
  dataNotShared: string[]; retention: string; policyUrl: string; notes: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
      <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
          {name}
        </span>
        <span className="text-[0.6rem] text-[#8494A7]">{operator}</span>
      </div>
      <div className="px-4 py-3 space-y-2.5 text-xs">
        <div><span className="text-[#6AA3E0] font-semibold">Purpose:</span> <span className="text-[#B0BCC9]">{purpose}</span></div>
        <div>
          <span className="text-[#6AA3E0] font-semibold">Data shared:</span>
          <ul className="mt-1 ml-3 space-y-0.5">
            {dataShared.map((d, i) => <li key={i} className="text-[#B0BCC9] list-disc ml-2">{d}</li>)}
          </ul>
        </div>
        <div>
          <span className="text-[#10b981] font-semibold">Data NOT shared:</span>
          <ul className="mt-1 ml-3 space-y-0.5">
            {dataNotShared.map((d, i) => <li key={i} className="text-[#B0BCC9] list-disc ml-2">{d}</li>)}
          </ul>
        </div>
        <div><span className="text-[#6AA3E0] font-semibold">Retention:</span> <span className="text-[#8494A7]">{retention}</span></div>
        <div><span className="text-[#6AA3E0] font-semibold">Privacy Policy:</span>{" "}
          <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="text-[#6AA3E0] hover:text-[#4274B9] underline underline-offset-2 transition-colors">{policyUrl}</a>
        </div>
        <div className="pt-1 border-t border-[#4274B9]/5"><span className="text-[#8494A7] italic">{notes}</span></div>
      </div>
    </div>
  );
}

// =============================================================================
// LocalStorage Row Component
// =============================================================================

function LocalStorageRow({ keyName, purpose, contents, setBy, sensitivity }: {
  keyName: string; purpose: string; contents: string; setBy: string; sensitivity: string;
}) {
  const sensColor = sensitivity === "Non-sensitive" ? "text-[#10b981]" : sensitivity === "Low" ? "text-[#6AA3E0]" : "text-amber-400";
  return (
    <div className="px-4 py-3 space-y-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <code className="text-[#6AA3E0] font-mono text-[0.65rem]">{keyName}</code>
        <span className={`${sensColor} text-[0.6rem] font-medium`}>{sensitivity}</span>
      </div>
      <div className="text-[#B0BCC9]"><span className="text-[#8494A7]">Purpose:</span> {purpose}</div>
      <div className="text-[#B0BCC9]"><span className="text-[#8494A7]">Contents:</span> {contents}</div>
      <div className="text-[#B0BCC9]"><span className="text-[#8494A7]">Set by:</span> {setBy}</div>
    </div>
  );
}

// =============================================================================
// SECTION 4 — THIRD-PARTY SERVICES
// =============================================================================

export function Section4_ThirdPartyServices() {
  return (
    <PolicySection num={4} title="THIRD-PARTY SERVICES" icon={<Server className="w-4 h-4" />}>
      <P>
        The Platform integrates with several third-party services to deliver its functionality.
        This section identifies each service, describes the nature of the integration, specifies
        what data (if any) is shared with each service, and provides links to their respective
        privacy policies. The WCO does not sell, rent, or trade your data to any third party.
      </P>

      <SubHead>4.1 WalletConnect (Reown)</SubHead>
      <ThirdPartyCard
        name="WalletConnect v2"
        operator="Reown (formerly WalletConnect Inc.)"
        purpose="Encrypted session relay between the Platform and your Hedera wallet application"
        dataShared={[
          "Session topic identifier (ephemeral, relay-scoped)",
          "Pairing URI (temporary, used to establish the session)",
          "Encrypted JSON-RPC payloads (unreadable by relay servers)",
        ]}
        dataNotShared={[
          "Your Hedera Account ID (encrypted in transit; relay cannot read it)",
          "Private keys, seed phrases, or wallet passwords",
          "Vote records, balance data, or any Platform-specific information",
        ]}
        retention="Session data expires when the session is closed or after the WalletConnect session TTL (typically 7 days). Expired pairings and sessions are cleaned from localStorage on each Platform initialization."
        policyUrl="https://reown.com/privacy-policy"
        notes="The relay server at wss://relay.walletconnect.org acts as an encrypted message broker. All payloads are encrypted end-to-end using the X25519-XSalsa20-Poly1305 scheme — the relay infrastructure cannot decrypt or inspect message contents. The WalletConnect Project ID (a89d7b107e0310e2e7ffddc91d37415d) is a public identifier registered at cloud.reown.com and is safe to embed in frontend code."
      />

      <SubHead>4.2 HashPack Wallet</SubHead>
      <ThirdPartyCard
        name="HashPack"
        operator="HashPack (Tiers LLC)"
        purpose="Hedera-native wallet application for transaction signing and account management"
        dataShared={[
          "Transaction payloads sent for signing (you approve each one individually)",
          "Message signing requests (e.g., admin authentication challenge nonces)",
        ]}
        dataNotShared={[
          "Vote records, staking data, or governance activity",
          "Any data not explicitly sent via WalletConnect signing requests",
        ]}
        retention="HashPack manages its own data locally on your device. The Platform has no access to HashPack's internal storage."
        policyUrl="https://www.hashpack.app/privacy"
        notes="The Platform detects HashPack via the HIP-820 browser extension discovery protocol (@hashgraph/hedera-wallet-connect). When detected, the Platform uses extensionOpen() to bring the HashPack popup to the foreground for signing requests, rather than redirecting to link.hashpack.app. All signing occurs within HashPack — the Platform never receives your private key."
      />

      <SubHead>4.3 Hedera Mirror Node</SubHead>
      <ThirdPartyCard
        name="Hedera Mirror Node REST API"
        operator="Hedera (Swirlds Labs / Hedera Hashgraph LLC)"
        purpose="Read-only access to public Hedera network data (balances, NFTs, account info, transactions)"
        dataShared={[
          "Your Hedera Account ID (sent as a URL parameter in API requests)",
          "Standard HTTP request metadata (IP address, User-Agent, request timestamp)",
        ]}
        dataNotShared={[
          "Vote records, session tokens, or any Platform-specific data",
          "Private keys or wallet credentials",
        ]}
        retention="Mirror Node queries are stateless. The Mirror Node operator may log API request metadata per their own retention policies."
        policyUrl="https://hedera.com/privacy"
        notes="The Mirror Node (mainnet.mirrornode.hedera.com) is a public API that requires no authentication. All data returned by the Mirror Node is already publicly available on the Hedera ledger. Server-side admin authentication also queries the Mirror Node to verify wallet existence (cached for 10 minutes in volatile memory)."
      />

      <SubHead>4.4 Supabase</SubHead>
      <ThirdPartyCard
        name="Supabase"
        operator="Supabase Inc."
        purpose="Backend hosting (Edge Functions / Hono web server), key-value database storage, and static asset storage (branding images, video, 3D models)"
        dataShared={[
          "All backend data: vote records, athlete profiles, battle events, proposals, reward snapshots, admin sessions",
          "Static assets served from Supabase Storage (public bucket: 'Branding KIT WCO')",
          "Server logs including request metadata",
        ]}
        dataNotShared={[
          "Private keys or wallet credentials (never transmitted to the server)",
        ]}
        retention="Data is retained in the Supabase-hosted key-value store until explicitly deleted by an administrator or via a data subject access request. Supabase infrastructure is hosted on AWS."
        policyUrl="https://supabase.com/privacy"
        notes="The Platform's server runs as a Supabase Edge Function (Deno runtime) using the Hono web framework. The key-value store is backed by a PostgreSQL table. Supabase Storage hosts public branding assets (athlete background images, WCO logo, promotional video, 3D badge model) — these do not contain user data."
      />

      <SubHead>4.5 Google Fonts</SubHead>
      <ThirdPartyCard
        name="Google Fonts CDN"
        operator="Google LLC"
        purpose="Web font delivery for DM Sans (body text) and Orbitron (headings, brand elements)"
        dataShared={[
          "Your IP address (standard HTTP request to fonts.googleapis.com and fonts.gstatic.com)",
          "Browser User-Agent string",
          "Referer header (the page URL requesting the font)",
        ]}
        dataNotShared={[
          "Wallet address, voting data, or any Platform-specific information",
        ]}
        retention="Google's font CDN may log requests per Google's standard data retention policies. Font files are cached by your browser per standard HTTP cache headers."
        policyUrl="https://policies.google.com/privacy"
        notes="Fonts are loaded via a single CSS import from fonts.googleapis.com. Google states that font API requests are not used for tracking or combined with data from other Google services. The specific import loads: DM Sans (weights 300-800) and Orbitron (weights 400-900)."
      />

      <SubHead>4.6 Unsplash</SubHead>
      <ThirdPartyCard
        name="Unsplash"
        operator="Unsplash Inc. (a Getty Images company)"
        purpose="Stock photography used as decorative imagery in the Whitepaper hero section"
        dataShared={[
          "Your IP address and browser metadata (standard HTTP request to images.unsplash.com when images are loaded)",
        ]}
        dataNotShared={[
          "Wallet address, voting data, or any user-specific information",
        ]}
        retention="Unsplash image requests are handled by Unsplash's CDN. Images are cached by your browser per standard HTTP cache headers."
        policyUrl="https://unsplash.com/privacy"
        notes="Unsplash images are used exclusively as decorative background imagery on the Whitepaper page. NFT collection artwork uses WCO-owned assets hosted on Supabase Storage. Unsplash images do not contain user data."
      />

      <SubHead>4.7 WalletConnect Modal</SubHead>
      <P>
        The Platform uses the official <Code>@walletconnect/modal</Code> package to display the
        wallet connection interface. This modal may load assets from WalletConnect's CDN
        (secure.walletconnect.org) and query the WalletConnect Explorer API to display available
        wallet options. These requests transmit standard HTTP metadata (IP address, User-Agent) to
        WalletConnect's infrastructure. No Platform-specific user data is shared via the modal.
      </P>
    </PolicySection>
  );
}

// =============================================================================
// SECTION 5 — COOKIES, LOCAL STORAGE & ANALYTICS
// =============================================================================

export function Section5_CookiesLocalStorage() {
  return (
    <PolicySection num={5} title="COOKIES, LOCAL STORAGE & ANALYTICS" icon={<Eye className="w-4 h-4" />}>
      <P>
        This section provides a complete and transparent account of all browser-side data storage
        mechanisms used by the Platform. We are committed to minimizing client-side data storage
        and use only what is technically necessary for Platform functionality.
      </P>

      <SubHead>5.1 Cookies</SubHead>
      <Callout type="info">
        <Strong>The Platform does not set any cookies.</Strong> We do not use first-party cookies,
        third-party cookies, tracking cookies, advertising cookies, or any other cookie-based
        storage mechanism. There is no cookie consent banner because there are no cookies to
        consent to.
      </Callout>
      <P>
        Third-party services integrated with the Platform (e.g., Google Fonts CDN, Unsplash CDN)
        may set their own cookies in accordance with their respective privacy policies. These are
        outside the Platform's control. You can manage third-party cookies through your browser
        settings.
      </P>

      <SubHead>5.2 Browser localStorage</SubHead>
      <P>
        The Platform uses the browser's <Code>localStorage</Code> API to persist a limited set
        of non-sensitive, user-experience-related data. localStorage data is stored on your device
        only and is never transmitted to our servers. The following keys are used:
      </P>

      <div className="mt-3 rounded-lg border border-[#4274B9]/10 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#4274B9]/5 border-b border-[#4274B9]/10">
          <span className="text-xs font-bold text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
            LOCALSTORAGE KEYS
          </span>
        </div>
        <div className="divide-y divide-[#4274B9]/5">
          <LocalStorageRow
            keyName="botb-beta-agreement-v1"
            purpose="Records that you have read and accepted the beta disclaimer"
            contents='JSON object: { version: "1.0.0", acceptedAt: ISO timestamp, walletConnected: boolean }'
            setBy="Beta Disclaimer modal (on 'Enter Beta Platform' click)"
            sensitivity="Non-sensitive"
          />
          <LocalStorageRow
            keyName="wc@2:client:0.3//session"
            purpose="WalletConnect session persistence for auto-reconnect"
            contents="Encrypted session data managed by @walletconnect/sign-client SDK — includes session topic, relay protocol, peer metadata, and session expiry"
            setBy="WalletConnect SignClient SDK (automatically)"
            sensitivity="Low"
          />
          <LocalStorageRow
            keyName="wc@2:core:0.3//pairing"
            purpose="WalletConnect pairing history for reconnection"
            contents="Pairing topic, expiry timestamp, and peer metadata"
            setBy="WalletConnect Core SDK (automatically)"
            sensitivity="Low"
          />
          <LocalStorageRow
            keyName="wc@2:core:0.3//keychain"
            purpose="Symmetric encryption keys for WalletConnect session encryption"
            contents="Encryption key material for relay communication (X25519-XSalsa20-Poly1305)"
            setBy="WalletConnect Core SDK (automatically)"
            sensitivity="Medium"
          />
          <LocalStorageRow
            keyName="wc@2:core:0.3//messages"
            purpose="WalletConnect message deduplication cache"
            contents="Message hashes to prevent duplicate processing"
            setBy="WalletConnect Core SDK (automatically)"
            sensitivity="Non-sensitive"
          />
        </div>
      </div>

      <Callout type="important">
        <Strong>No VIP state is persisted.</Strong> The Platform's VIP/Governor visual mode
        (gold styling, particle effects, welcome animation) is derived entirely from your
        wallet's real-time NFT holdings queried from the Hedera Mirror Node. VIP status is
        computed in memory on every page load and is not stored in localStorage, sessionStorage,
        or any other persistent client-side mechanism.
      </Callout>

      <SubHead>5.3 sessionStorage</SubHead>
      <P>
        The Platform does not directly write to <Code>sessionStorage</Code>. The WalletConnect SDK
        may use sessionStorage for transient relay connection state. sessionStorage data is
        automatically cleared when the browser tab is closed.
      </P>

      <SubHead>5.4 IndexedDB</SubHead>
      <P>
        The Platform does not directly use IndexedDB. The WalletConnect SDK may use IndexedDB
        for internal key management. Any IndexedDB data created by WalletConnect is managed
        entirely by the SDK and is not read or modified by Platform code.
      </P>

      <SubHead>5.5 Analytics & Tracking</SubHead>
      <Callout type="info">
        <Strong>No analytics services are currently integrated.</Strong> The Platform does not
        use Google Analytics, Mixpanel, Amplitude, Segment, Hotjar, or any other analytics or
        session-recording service. We do not track page views, click paths, session duration,
        or user behavior across the Platform.
      </Callout>
      <P>
        During the beta period, the only usage data available to the WCO is:
      </P>
      <BulletList items={[
        <>
          <Strong>Server request logs</Strong> — The Hono web server logs HTTP method, path,
          status code, and response time to the server console via the <Code>hono/logger</Code>{" "}
          middleware. These logs are transient (in-memory only during the Edge Function execution
          lifecycle) and do not include wallet addresses or user identifiers unless the route
          path itself contains a wallet parameter (e.g., <Code>/votes/mine/:wallet</Code>).
        </>,
        <>
          <Strong>Aggregate backend data</Strong> — The Platform can compute aggregate statistics
          (total votes cast, total active voters, total battles) from stored vote records. These
          are displayed on the public leaderboard. Individual user behavior is not profiled.
        </>,
      ]} />
      <P>
        If analytics services are introduced in the future, this Policy will be updated with a
        detailed description of the service, data collected, and opt-out mechanisms. Material
        changes will be communicated via on-platform notification, and the beta disclaimer
        version will be incremented to require re-acceptance.
      </P>

      <SubHead>5.6 Cross-Origin Resource Sharing (CORS)</SubHead>
      <P>
        The Platform's server is configured with a permissive CORS policy to support frontend-backend
        communication:
      </P>
      <div className="mt-2 font-mono text-xs bg-[#0A0F1A] rounded-lg p-3 border border-[#4274B9]/10 space-y-1">
        <div><span className="text-[#8494A7]">Origin:</span> <span className="text-[#6AA3E0]">*</span> <span className="text-[#8494A7]">(all origins)</span></div>
        <div><span className="text-[#8494A7]">Allowed Headers:</span> <span className="text-[#6AA3E0]">Content-Type, Authorization, X-Admin-Wallet, X-Admin-Session</span></div>
        <div><span className="text-[#8494A7]">Allowed Methods:</span> <span className="text-[#6AA3E0]">GET, POST, PUT, DELETE, OPTIONS</span></div>
        <div><span className="text-[#8494A7]">Exposed Headers:</span> <span className="text-[#6AA3E0]">Content-Length</span></div>
        <div><span className="text-[#8494A7]">Max Age:</span> <span className="text-[#6AA3E0]">600</span> <span className="text-[#8494A7]">(10 minutes preflight cache)</span></div>
      </div>
      <P>
        The wildcard origin (<Code>*</Code>) is used during the beta period to support development
        and testing environments. For production hardening, the CORS origin may be restricted to
        the Platform's specific domain. The <Code>X-Admin-Session</Code> and{" "}
        <Code>X-Admin-Wallet</Code> custom headers are used exclusively for administrator
        authentication and are not set by regular user requests.
      </P>

      <SubHead>5.7 Content Security Policy (CSP)</SubHead>
      <P>
        The Platform is designed to be deployed behind a Content Security Policy that restricts
        resource loading to trusted origins. During the beta period, CSP headers are planned
        for implementation as part of production hardening. When deployed, the CSP will restrict
        script execution, font loading, image sources, and API connections to explicitly
        whitelisted domains.
      </P>

      <SubHead>5.8 How to Clear Platform Data</SubHead>
      <P>
        You can remove all Platform data stored on your device at any time by:
      </P>
      <NumberedList items={[
        "Open your browser's Developer Tools (F12 or Cmd+Shift+I).",
        "Navigate to the Application tab, then Local Storage.",
        "Delete all keys prefixed with 'botb-' and 'wc@2:'.",
        "Alternatively, use your browser's 'Clear browsing data' function to clear all site data for this domain.",
      ]} />
      <P>
        Clearing localStorage will reset your beta disclaimer acceptance (requiring re-agreement
        on next visit) and disconnect any active WalletConnect session (requiring re-connection
        via the wallet modal).
      </P>
    </PolicySection>
  );
}