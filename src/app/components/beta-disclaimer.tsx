/**
 * BOTB Beta Disclaimer Modal
 * ===========================
 * Production-grade beta test warning displayed on first visit.
 * Requires explicit user agreement before accessing the platform.
 * Agreement state persisted in localStorage.
 *
 * Legal-grade language — treats the user as an informed Web3 participant.
 */

import { useState, useEffect, useCallback } from "react";
import { Shield, AlertTriangle, ExternalLink, ChevronDown } from "lucide-react";

const STORAGE_KEY = "botb-beta-agreement-v1";
const AGREEMENT_VERSION = "1.0.0";

interface BetaAgreement {
  version: string;
  acceptedAt: string;
  walletConnected: boolean;
}

export function BetaDisclaimer() {
  const [visible, setVisible] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const agreement: BetaAgreement = JSON.parse(stored);
        if (agreement.version === AGREEMENT_VERSION) return;
      }
    } catch {}
    setVisible(true);
  }, []);

  const handleAccept = useCallback(() => {
    const agreement: BetaAgreement = {
      version: AGREEMENT_VERSION,
      acceptedAt: new Date().toISOString(),
      walletConnected: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agreement));
    setVisible(false);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolledToBottom(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-2xl bg-[#0D1526] border border-[#4274B9]/30 rounded-2xl shadow-2xl shadow-[#4274B9]/10 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-[#4274B9]/15 bg-gradient-to-r from-[#0D1526] via-[#162033] to-[#0D1526] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                BETA PLATFORM NOTICE
              </h2>
              <p className="text-[0.6rem] sm:text-xs text-amber-400/80 tracking-wider font-medium">
                PLEASE READ BEFORE PROCEEDING
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[0.65rem] sm:text-xs text-amber-300/90 leading-relaxed">
              Battle of the Bars by the World Calisthenics Organization is currently in <strong className="text-amber-300">Public Beta</strong>. 
              By accessing this platform you acknowledge and accept the following terms.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 overflow-y-auto text-sm text-[#B0BCC9] leading-relaxed space-y-3 sm:space-y-4 scrollbar-thin flex-1 min-h-0"
          onScroll={handleScroll}
        >
          <Section title="1. Beta Software Disclaimer">
            This platform is provided on an <strong className="text-[#E8ECF0]">"as-is"</strong> and{" "}
            <strong className="text-[#E8ECF0]">"as-available"</strong> basis. Battle of the Bars (BOTB) is a beta 
            release by the World Calisthenics Organization (WCO). Features may be incomplete, contain bugs, or 
            undergo significant changes without prior notice. The WCO makes no warranties, express or implied, 
            regarding the reliability, accuracy, or availability of this platform during the beta period.
          </Section>

          <Section title="2. Blockchain & Digital Asset Risks">
            This platform operates on the <strong className="text-[#E8ECF0]">Hedera Hashgraph</strong> mainnet 
            and interfaces with digital assets including fungible tokens and non-fungible tokens (NFTs) issued 
            via the Hedera Token Service (HTS). By connecting your wallet and participating in voting, staking, 
            or governance activities, you acknowledge that:
            <ul className="mt-2 ml-4 space-y-1 list-disc marker:text-[#4274B9]/50">
              <li>Digital asset values are inherently volatile and may decrease to zero.</li>
              <li>Blockchain transactions are irreversible once confirmed on the Hedera network.</li>
              <li>You are solely responsible for the security of your private keys and wallet credentials.</li>
              <li>Smart contract interactions carry inherent technical risks including potential loss of funds.</li>
              <li>Regulatory frameworks for digital assets vary by jurisdiction and are subject to change.</li>
            </ul>
          </Section>

          <Section title="3. No Financial Advice">
            Nothing on this platform constitutes financial, investment, legal, or tax advice. BOTB tokens, 
            Governor NFTs, Sigma Series NFTs, and any other digital assets associated with this platform are 
            <strong className="text-[#E8ECF0]"> utility tokens and collectibles</strong> — they are not securities, 
            investment contracts, or financial instruments. Participation in voting, staking, and governance 
            does not guarantee any financial return. You should consult qualified professionals before making 
            any decisions involving digital assets.
          </Section>

          <Section title="4. Wallet Connection & Data">
            When you connect your Hedera wallet (e.g., HashPack) via WalletConnect, this platform accesses 
            your <strong className="text-[#E8ECF0]">public account ID</strong> and{" "}
            <strong className="text-[#E8ECF0]">publicly available on-chain data</strong> (token balances, NFT 
            holdings) through the Hedera Mirror Node. We do not access, store, or have the ability to access 
            your private keys. All transaction signing occurs within your wallet application and requires your 
            explicit approval.
          </Section>

          <Section title="5. Voting & Governance">
            Votes cast through this platform are recorded both in our backend systems and, where applicable, 
            on the Hedera Consensus Service (HCS). Voting power multipliers are determined by your verified 
            NFT holdings at the time of voting. The WCO reserves the right to moderate governance proposals, 
            adjust voting parameters, and declare competition outcomes based on real-world event results. 
            Governor NFT holders participate in governance as a privilege, not a guaranteed right.
          </Section>

          <Section title="6. Limitation of Liability">
            To the fullest extent permitted by applicable law, the World Calisthenics Organization, its 
            officers, directors, employees, affiliates, and partners shall not be liable for any direct, 
            indirect, incidental, special, consequential, or punitive damages arising out of or related to 
            your use of this beta platform, including but not limited to loss of digital assets, loss of 
            data, loss of profits, or interruption of service.
          </Section>

          <Section title="7. Jurisdictional Compliance">
            You represent that your use of this platform complies with all applicable laws and regulations 
            in your jurisdiction. Access to this platform may be restricted in certain jurisdictions. It is 
            your responsibility to ensure compliance with local laws regarding digital assets, online voting, 
            and blockchain-based services. If you are uncertain about legality in your jurisdiction, do not 
            proceed.
          </Section>

          <Section title="8. Beta Feedback & Changes">
            During the beta period, features including but not limited to token staking, reward distributions, 
            NFT minting, and governance mechanics may be modified, suspended, or discontinued at any time. 
            Your feedback is valued and may be used to improve the platform. By participating in the beta, 
            you consent to the collection of anonymized usage data for platform improvement purposes.
          </Section>

          <div className="pt-2 pb-1 border-t border-[#4274B9]/10">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8494A7]">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span>Full legal documents:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <a href="/privacy" className="text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Privacy Policy</a>
                <span className="text-[#4274B9]/30 hidden sm:inline">|</span>
                <a href="/terms" className="text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Terms of Service</a>
                <span className="text-[#4274B9]/30 hidden sm:inline">|</span>
                <a href="/whitepaper" className="text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Whitepaper</a>
              </div>
            </div>
          </div>

          {!scrolledToBottom && (
            <div className="sticky bottom-0 left-0 right-0 flex justify-center py-2">
              <div className="flex items-center gap-1.5 text-xs text-[#6AA3E0] animate-bounce">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Scroll to continue</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Agreement */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#4274B9]/15 bg-[#0A0F1A] space-y-3 shrink-0">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={!scrolledToBottom}
              className="mt-0.5 w-4 h-4 rounded border-[#4274B9]/40 bg-[#162033] text-[#4274B9] focus:ring-[#4274B9]/50 accent-[#4274B9] disabled:opacity-30"
            />
            <span className={`text-xs leading-relaxed transition-colors ${scrolledToBottom ? "text-[#E8ECF0]" : "text-[#8494A7]/50"}`}>
              I have read and understand the above disclaimers. I acknowledge that this is a beta platform, 
              that digital asset interactions carry inherent risks, and that I am solely responsible for my 
              participation. I agree to the{" "}
              <a href="/terms" className="text-[#6AA3E0] hover:underline">Terms of Service</a> and{" "}
              <a href="/privacy" className="text-[#6AA3E0] hover:underline">Privacy Policy</a>.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAccept}
              disabled={!acknowledged || !scrolledToBottom}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] text-white hover:shadow-lg hover:shadow-[#4274B9]/25 active:scale-[0.98]"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              ENTER BETA PLATFORM
            </button>
          </div>

          <p className="text-center text-[0.65rem] text-[#8494A7]/60 leading-tight">
            Version {AGREEMENT_VERSION} &middot; Last updated March 2026 &middot; World Calisthenics Organization
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section sub-component
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-[#E8ECF0] tracking-wider mb-1.5" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
        {title}
      </h3>
      <div className="text-[0.8rem] text-[#B0BCC9] leading-relaxed">{children}</div>
    </div>
  );
}