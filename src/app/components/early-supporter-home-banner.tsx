/**
 * Home hero strip — Early Supporter free NFT claim (separate from Connect-to-Enter).
 * Gold/void glass matching ContestBanner; gated by VITE_EARLY_SUPPORTER_ENABLED.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Gift, Info, Sparkles, X, Zap, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import {
  EARLY_SUPPORTER_MAX_SUPPLY,
  EARLY_SUPPORTER_NAME,
  EARLY_SUPPORTER_THUMBNAIL_URL,
  EARLY_SUPPORTER_TOKEN_ID,
  EARLY_SUPPORTER_UI_ENABLED,
  type EarlySupporterStatus,
} from "../lib/early-supporter";

const orbitron = { fontFamily: "Orbitron, sans-serif" } as const;
const dmSans = { fontFamily: "'DM Sans', sans-serif" } as const;

const HOW_TO_STEPS = [
  {
    title: "Connect a wallet",
    body: "Use HashPack or email (Magic) on wcorg.io so we know your Hedera account ID.",
  },
  {
    title: "Open Manage Assets",
    body: "Go to Wallet → Manage Assets (or tap Claim below). You’ll see the Early Supporter card.",
  },
  {
    title: "Associate the token (once)",
    body: `In HashPack, associate token ${EARLY_SUPPORTER_TOKEN_ID ?? "0.0.10821256"} if prompted. Magic wallets often auto-associate.`,
  },
  {
    title: "Claim — one per wallet",
    body: "Tap Claim free NFT. We transfer a serial from the WCO treasury to your account. Max 5,000. Already claimed? You’re done.",
  },
] as const;

export function EarlySupporterHomeBanner() {
  const [status, setStatus] = useState<EarlySupporterStatus | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const load = useCallback(async () => {
    if (!EARLY_SUPPORTER_UI_ENABLED) return;
    try {
      const res = await api.earlySupporter.status();
      if (res.success && res.data) setStatus(res.data);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (!EARLY_SUPPORTER_UI_ENABLED) return null;
  if (status && status.enabled === false) return null;

  const claimed = status?.claimedCount ?? 0;
  const max = status?.maxSupply ?? EARLY_SUPPORTER_MAX_SUPPLY;
  const remaining = status?.remaining ?? Math.max(0, max - claimed);
  const pct = max > 0 ? Math.min(100, Math.round((claimed / max) * 1000) / 10) : 0;
  const soldOut = status?.soldOut || remaining === 0;
  const live = status?.mode === "hts" || status?.mintEnabled === true;

  return (
    <>
      <div className="mt-3 sm:mt-4 max-w-xl w-full">
        <div
          className="group relative rounded-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.01]"
          style={{
            boxShadow:
              "0 0 0 1px rgba(212,168,67,0.35), 0 8px 28px rgba(0,0,0,0.4), 0 0 40px rgba(212,168,67,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,16,8,0.98) 0%, rgba(11,18,32,0.97) 55%, rgba(10,16,28,0.98) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 0% 50%, rgba(212,168,67,0.2), transparent 55%), radial-gradient(ellipse 60% 70% at 100% 0%, rgba(66,116,185,0.12), transparent 50%)",
            }}
          />
          <div
            className="absolute top-0 left-4 right-4 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(240,215,140,0.6), transparent)",
            }}
          />

          <div className="relative px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div className="flex items-start gap-3 mb-2.5">
              <div
                className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden"
                style={{
                  border: "1px solid rgba(240,215,140,0.45)",
                  boxShadow: "0 4px 16px rgba(212,168,67,0.35)",
                }}
              >
                <img
                  src={EARLY_SUPPORTER_THUMBNAIL_URL}
                  alt={EARLY_SUPPORTER_NAME}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p
                    className="text-[0.72rem] sm:text-[0.82rem] font-bold tracking-[0.04em] leading-none"
                    style={{
                      ...orbitron,
                      background:
                        "linear-gradient(90deg, #FFF6D6 0%, #F0D78C 45%, #D4A843 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    FREE EARLY SUPPORTER NFT
                  </p>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.5rem] font-bold tracking-[0.12em]"
                    style={{
                      ...orbitron,
                      background: soldOut
                        ? "rgba(239,68,68,0.15)"
                        : live
                          ? "rgba(16,185,129,0.14)"
                          : "rgba(66,116,185,0.15)",
                      border: soldOut
                        ? "1px solid rgba(248,113,113,0.4)"
                        : live
                          ? "1px solid rgba(52,211,153,0.45)"
                          : "1px solid rgba(106,163,224,0.4)",
                      color: soldOut ? "#FCA5A5" : live ? "#6EE7B7" : "#93C5FD",
                    }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${live && !soldOut ? "animate-pulse" : ""}`}
                      style={{
                        background: soldOut ? "#F87171" : live ? "#34D399" : "#6AA3E0",
                      }}
                    />
                    {soldOut ? "SOLD OUT" : live ? "CLAIM LIVE" : "SOON"}
                  </span>
                </div>
                <p
                  className="text-[0.68rem] sm:text-[0.74rem] text-[#C5D0DC] leading-snug"
                  style={dmSans}
                >
                  One free commemorative NFT per wallet · max{" "}
                  <span className="text-[#F0D78C] font-semibold">
                    {max.toLocaleString()}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#F0D78C] hover:bg-[#D4A843]/15 border border-[#D4A843]/25 transition-colors"
                title="How to claim"
                aria-label="How to claim Early Supporter NFT"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Supply meter */}
            <div className="mb-2.5">
              <div className="flex items-end justify-between gap-2 mb-1">
                <span
                  className="text-[0.55rem] tracking-[0.14em] font-bold text-[#8494A7]"
                  style={orbitron}
                >
                  CLAIMED
                </span>
                <span className="text-right">
                  <span
                    className="text-[0.78rem] font-bold tabular-nums text-white"
                    style={orbitron}
                  >
                    {claimed.toLocaleString()}
                  </span>
                  <span className="text-[0.62rem] text-[#8494A7] tabular-nums">
                    {" "}
                    / {max.toLocaleString()}
                  </span>
                </span>
              </div>
              <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{
                  background: "rgba(8,12,22,0.9)",
                  border: "1px solid rgba(212,168,67,0.22)",
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(pct, claimed > 0 ? 2 : 0)}%`,
                    background:
                      "linear-gradient(90deg, #B8860B, #D4A843 40%, #F0D78C 75%, #E8C468)",
                    boxShadow: "0 0 10px rgba(212,168,67,0.5)",
                  }}
                />
              </div>
              <p className="text-[0.58rem] text-[#6B7A8D] mt-1" style={dmSans}>
                {soldOut
                  ? "All minted serials claimed for now"
                  : `${remaining.toLocaleString()} left in this drop`}
              </p>
            </div>

            <div
              className="mb-2.5 rounded-lg border border-[#4274B9]/30 bg-[#4274B9]/10 px-2.5 py-2 text-[0.62rem] leading-snug text-[#C8D6E8]"
              style={dmSans}
            >
              <span className="text-[#E8ECF0] font-semibold">HashPack tip: </span>
              Associate token{" "}
              <code className="text-[#F0D078] font-mono">0.0.10821256</code> in
              your wallet before claiming.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!soldOut ? (
                <Link
                  to="/wallet/assets"
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3.5 py-1.5 rounded-lg text-[0.65rem] sm:text-[0.7rem] font-bold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    ...orbitron,
                    color: "#1a1208",
                    background:
                      "linear-gradient(135deg, #F0D78C 0%, #D4A843 50%, #B8860B 100%)",
                    boxShadow: "0 2px 12px rgba(212,168,67,0.4)",
                  }}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Claim free NFT
                </Link>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg text-[0.65rem] font-bold"
                  style={{
                    ...orbitron,
                    color: "#FCA5A5",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(248,113,113,0.35)",
                  }}
                >
                  Sold out
                </span>
              )}

              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg text-[0.62rem] sm:text-[0.68rem] font-bold tracking-wide transition-all hover:bg-white/5"
                style={{
                  ...orbitron,
                  color: "#E8F0FA",
                  background: "rgba(66,116,185,0.18)",
                  border: "1px solid rgba(106,163,224,0.4)",
                }}
              >
                <Info className="w-3.5 h-3.5 text-[#6AA3E0]" />
                How to claim
              </button>

              <div
                className="inline-flex items-center gap-1.5 text-[0.58rem] text-[#8494A7]"
                style={dmSans}
              >
                <Sparkles className="w-3 h-3 text-[#D4A843] shrink-0" />
                <span>Separate from the $250 giveaway</span>
              </div>

              {live && !soldOut && (
                <div
                  className="hidden sm:inline-flex items-center gap-1 ml-auto text-[0.55rem] text-[#10b981]"
                  style={orbitron}
                >
                  <Zap className="w-3 h-3" />
                  ON-CHAIN
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {infoOpen && (
        <HowToClaimModal
          onClose={() => setInfoOpen(false)}
          tokenId={EARLY_SUPPORTER_TOKEN_ID ?? "0.0.10821256"}
        />
      )}
    </>
  );
}

function HowToClaimModal({
  onClose,
  tokenId,
}: {
  onClose: () => void;
  tokenId: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="es-how-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#D4A843]/30 bg-[#0B1220] p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        style={dmSans}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p
              className="text-[0.55rem] tracking-[0.18em] text-[#8494A7] mb-1"
              style={orbitron}
            >
              EARLY SUPPORTER
            </p>
            <h2
              id="es-how-title"
              className="text-lg text-[#E8ECF0]"
              style={orbitron}
            >
              How to claim
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8494A7] hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="space-y-3 mb-5">
          {HOW_TO_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-[#1a1208]"
                style={{
                  ...orbitron,
                  background: "linear-gradient(135deg, #F0D78C, #D4A843)",
                }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#E8ECF0] mb-0.5">
                  {step.title}
                </p>
                <p className="text-[0.8rem] text-[#8494A7] leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <a
          href={`https://hashscan.io/mainnet/token/${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#6AA3E0] hover:underline mb-4"
        >
          View collection on HashScan
          <ExternalLink className="w-3 h-3" />
        </a>

        <Link
          to="/wallet/assets"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#1a1208]"
          style={{
            ...orbitron,
            background: "linear-gradient(135deg, #F0D78C, #D4A843, #a07520)",
          }}
        >
          <Gift className="w-4 h-4" />
          Go to Manage Assets
        </Link>
      </div>
    </div>
  );
}
