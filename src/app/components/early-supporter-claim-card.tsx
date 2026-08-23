/**
 * Early Supporter claim / owned card — Manage Assets Collectibles section.
 * Matches WCO void + gold visual language. Works with local mock or Edge API.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import {
  EARLY_SUPPORTER_ANIMATION_URL,
  EARLY_SUPPORTER_LOCAL_MOCK,
  EARLY_SUPPORTER_MAX_SUPPLY,
  EARLY_SUPPORTER_NAME,
  EARLY_SUPPORTER_THUMBNAIL_URL,
  EARLY_SUPPORTER_TREASURY,
  localMockClaim,
  localMockEligibility,
  localMockResetClaim,
  localMockStatus,
  type EarlySupporterClaimRecord,
  type EarlySupporterEligibility,
  type EarlySupporterStatus,
} from "../lib/early-supporter";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  accountId: string;
  walletSessionToken: string | null;
  walletProvider?: string | null;
}

export function EarlySupporterClaimCard({
  accountId,
  walletSessionToken,
  walletProvider,
}: Props) {
  const [status, setStatus] = useState<EarlySupporterStatus | null>(null);
  const [eligibility, setEligibility] = useState<EarlySupporterEligibility | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (EARLY_SUPPORTER_LOCAL_MOCK) {
        setStatus(localMockStatus());
        setEligibility(localMockEligibility(accountId));
        return;
      }

      const [statusRes, eligRes] = await Promise.all([
        api.earlySupporter.status(),
        walletSessionToken
          ? api.earlySupporter.eligibility(walletSessionToken)
          : Promise.resolve(null),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      } else {
        setStatus({
          enabled: false,
          mintEnabled: false,
          mode: "disabled",
          claimedCount: 0,
          maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
          remaining: EARLY_SUPPORTER_MAX_SUPPLY,
          soldOut: false,
          treasuryAccountId: EARLY_SUPPORTER_TREASURY,
          tokenId: null,
        });
      }

      if (eligRes?.success && eligRes.data) {
        setEligibility(eligRes.data);
      } else if (!walletSessionToken) {
        setEligibility({
          eligible: false,
          reason: "Wallet session required. Reconnect your wallet.",
          code: "SESSION_REQUIRED",
          claimed: false,
          claim: null,
          claimedCount: statusRes.data?.claimedCount ?? 0,
          maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
          remaining: statusRes.data?.remaining ?? EARLY_SUPPORTER_MAX_SUPPLY,
        });
      } else {
        setEligibility(null);
      }
    } catch (err) {
      console.warn("[EarlySupporter] load failed", err);
      toast.error("Could not load Early Supporter status");
    } finally {
      setLoading(false);
    }
  }, [accountId, walletSessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      if (EARLY_SUPPORTER_LOCAL_MOCK) {
        const result = localMockClaim(accountId, walletProvider ?? undefined);
        if (!result.ok) {
          toast.error(result.error);
          await load();
          return;
        }
        setJustClaimed(true);
        toast.success("Early Supporter NFT claimed!");
        setStatus(localMockStatus());
        setEligibility(localMockEligibility(accountId));
        return;
      }

      if (!walletSessionToken) {
        toast.error("Reconnect your wallet to claim");
        return;
      }
      const res = await api.earlySupporter.claim(walletSessionToken);
      if (!res.success || !res.data) {
        const code = (res as { code?: string }).code;
        if (code === "ASSOCIATION_REQUIRED") {
          toast.error(
            res.error ||
              "Associate the Early Supporter token in HashPack, then try again.",
          );
        } else {
          toast.error(res.error || "Claim failed");
        }
        await load();
        return;
      }
      setJustClaimed(true);
      toast.success("Early Supporter NFT claimed!");
      await load();
    } catch {
      toast.error("Claim failed. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  const share = async () => {
    const text = `I claimed a free ${EARLY_SUPPORTER_NAME} NFT on World Calisthenics Organization — ${typeof window !== "undefined" ? window.location.origin : "https://www.wcorg.io"}/wallet/assets`;
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      toast.success("Share text copied");
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const resetLocal = () => {
    if (!EARLY_SUPPORTER_LOCAL_MOCK) return;
    localMockResetClaim(accountId);
    setJustClaimed(false);
    void load();
    toast.message("Local claim reset");
  };

  const claimedCount = eligibility?.claimedCount ?? status?.claimedCount ?? 0;
  const maxSupply = eligibility?.maxSupply ?? status?.maxSupply ?? EARLY_SUPPORTER_MAX_SUPPLY;
  const claimRecord: EarlySupporterClaimRecord | null =
    eligibility?.claim ?? null;
  const isClaimed = !!claimRecord || eligibility?.claimed === true;
  const edgeDisabled =
    !EARLY_SUPPORTER_LOCAL_MOCK && status && status.enabled === false;

  return (
    <section className="mb-6" style={dmSans}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <p
            className="text-[0.55rem] tracking-[0.2em] text-[#8494A7] mb-1"
            style={orbitron}
          >
            COLLECTIBLES
          </p>
          <h2 className="text-lg text-[#E8ECF0]" style={orbitron}>
            Early Supporter
          </h2>
          <p className="text-sm text-[#8494A7] mt-0.5">
            Free commemorative NFT — one per wallet · max {maxSupply.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.65rem] text-[#8494A7] border border-[#4274B9]/20 hover:text-[#E8ECF0]"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Supply meter */}
      <div className="rounded-xl border border-[#D4A843]/25 bg-[#D4A843]/8 px-4 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[#F0D078]" style={orbitron}>
          {claimedCount.toLocaleString()} / {maxSupply.toLocaleString()} claimed
        </span>
        <span className="text-[0.65rem] text-[#8494A7]">
          {EARLY_SUPPORTER_LOCAL_MOCK
            ? "Local mock mode"
            : status?.mode === "hts"
              ? "On-chain mint"
              : "Mock claim path"}
        </span>
      </div>

      <div className="rounded-2xl border border-[#4274B9]/20 bg-[#0B1220]/85 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#4274B9]" />
          </div>
        ) : edgeDisabled ? (
          <div className="p-6 text-center">
            <Gift className="w-8 h-8 text-[#8494A7] mx-auto mb-3" />
            <p className="text-sm text-[#8494A7]">
              Early Supporter claims are not enabled on the server yet.
              Enable local mock in{" "}
              <code className="text-[#6AA3E0]">.env.local</code> for testing.
            </p>
          </div>
        ) : isClaimed && claimRecord ? (
          <OwnedView
            claim={claimRecord}
            justClaimed={justClaimed}
            shareCopied={shareCopied}
            onShare={() => void share()}
            showReset={EARLY_SUPPORTER_LOCAL_MOCK}
            onReset={resetLocal}
          />
        ) : (
          <ClaimView
            eligible={eligibility?.eligible === true}
            reason={eligibility?.reason}
            claiming={claiming}
            soldOut={eligibility?.code === "SOLD_OUT" || status?.soldOut === true}
            onClaim={() => void claim()}
          />
        )}
      </div>
    </section>
  );
}

function ClaimView({
  eligible,
  reason,
  claiming,
  soldOut,
  onClaim,
}: {
  eligible: boolean;
  reason: string | null | undefined;
  claiming: boolean;
  soldOut: boolean;
  onClaim: () => void;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="relative w-full sm:w-36 shrink-0 aspect-square rounded-xl overflow-hidden border border-[#D4A843]/30 bg-[#070b14]">
          <img
            src={EARLY_SUPPORTER_THUMBNAIL_URL}
            alt={EARLY_SUPPORTER_NAME}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span
            className="absolute bottom-2 left-2 text-[0.55rem] tracking-wider text-[#F0D078]"
            style={orbitron}
          >
            FREE CLAIM
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#D4A843]" />
            <h3 className="text-base text-[#E8ECF0]" style={orbitron}>
              {EARLY_SUPPORTER_NAME}
            </h3>
          </div>
          <p className="text-sm text-[#8494A7] leading-relaxed mb-4">
            Thank you for being early. Claim one free commemorative NFT for this
            wallet. Animated art included — no HBAR fee on the mock path.
          </p>
          {soldOut ? (
            <p className="text-sm text-[#f59e0b]">Sold out — all 5,000 claimed.</p>
          ) : !eligible && reason ? (
            <p className="text-sm text-[#8494A7] mb-3">{reason}</p>
          ) : null}
          <button
            type="button"
            disabled={!eligible || claiming || soldOut}
            onClick={onClaim}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[#0B1220] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #F0D078, #D4A843, #a07520)",
            }}
          >
            {claiming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Gift className="w-4 h-4" />
            )}
            {claiming ? "Claiming…" : "Claim free NFT"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnedView({
  claim,
  justClaimed,
  shareCopied,
  onShare,
  showReset,
  onReset,
}: {
  claim: EarlySupporterClaimRecord;
  justClaimed: boolean;
  shareCopied: boolean;
  onShare: () => void;
  showReset: boolean;
  onReset: () => void;
}) {
  const image = claim.metadata?.image || EARLY_SUPPORTER_THUMBNAIL_URL;
  const video = claim.metadata?.animation_url || EARLY_SUPPORTER_ANIMATION_URL;

  return (
    <div className="p-5 sm:p-6">
      {justClaimed && (
        <div className="mb-4 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-2 text-sm text-[#6ee7b7] flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          Successfully claimed — this wallet cannot claim again.
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-full sm:w-40 shrink-0 space-y-2">
          <div className="aspect-square rounded-xl overflow-hidden border border-[#D4A843]/40 bg-[#070b14]">
            <img
              src={image}
              alt={claim.metadata?.name || EARLY_SUPPORTER_NAME}
              className="w-full h-full object-cover"
            />
          </div>
          <video
            src={video}
            className="w-full rounded-lg border border-[#4274B9]/20"
            muted
            loop
            playsInline
            autoPlay
            controls
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[0.65rem] px-2 py-0.5 rounded-full border border-[#D4A843]/40 text-[#F0D078] bg-[#D4A843]/10">
              Claimed
            </span>
            <span className="text-[0.65rem] px-2 py-0.5 rounded-full border border-[#4274B9]/30 text-[#6AA3E0]">
              #{claim.serial}
            </span>
            <span className="text-[0.65rem] px-2 py-0.5 rounded-full border border-[#4274B9]/20 text-[#8494A7]">
              {claim.mode === "mock" ? "Mock" : "On-chain"}
            </span>
          </div>
          <h3 className="text-base text-[#E8ECF0] mb-1" style={orbitron}>
            {claim.metadata?.name || EARLY_SUPPORTER_NAME}
          </h3>
          <p className="text-xs text-[#8494A7] mb-4">
            Claimed{" "}
            {new Date(claim.claimedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #4274B9, #2a4f82)",
              }}
            >
              {shareCopied ? (
                <Copy className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {shareCopied ? "Copied" : "Share"}
            </button>
            {showReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#8494A7] border border-[#4274B9]/25 hover:text-[#E8ECF0]"
              >
                Reset local claim
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
