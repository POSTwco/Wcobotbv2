/**
 * Hero contest banner — premium Connect-to-Enter strip under CTAs.
 * Glass + gold luxury treatment matching WCO / WORKOUT accents.
 */

import { useEffect, useState, useCallback } from "react";
import { Gift, Info, Sparkles, Trophy, Zap, Crown, Download } from "lucide-react";
import { api } from "../../lib/api";
import type { ContestPublicStats } from "../../lib/contest-types";
import { ContestDetailsModal } from "./contest-details-modal";

const orbitron = { fontFamily: "Orbitron, sans-serif" } as const;
const dmSans = { fontFamily: "'DM Sans', sans-serif" } as const;

/** Official HashPack wallet install page (browser extension + mobile) */
const HASHPACK_DOWNLOAD_URL = "https://www.hashpack.app/download";

const PRIZE_CHIPS = [
  { place: "1ST", amount: "$150", accent: "#F0D78C", glow: "rgba(240,215,140,0.35)" },
  { place: "2ND", amount: "$75", accent: "#E8C468", glow: "rgba(232,196,104,0.28)" },
  { place: "3RD", amount: "$25", accent: "#D4A843", glow: "rgba(212,168,67,0.22)" },
  { place: "SHARE", amount: "+$100", accent: "#6AA3E0", glow: "rgba(106,163,224,0.28)" },
] as const;

export function ContestBanner() {
  const [stats, setStats] = useState<ContestPublicStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.contest.publicStats();
      if (res.success && res.data) setStats(res.data);
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

  if (stats?.status === "completed") return null;

  const entryCount = stats?.entryCount ?? 0;
  const entryCap = stats?.entryCap ?? 5000;
  const pct = Math.min(100, stats?.progressPercent ?? 0);
  const remaining = Math.max(0, entryCap - entryCount);
  const isFull = stats?.isFull || stats?.status === "full";
  const isOpen = !!stats?.isOpen;
  const statusLabel = isFull
    ? "FULL"
    : isOpen
      ? "LIVE"
      : (stats?.status || "SOON").toUpperCase();

  return (
    <>
      <div className="mt-6 sm:mt-8 max-w-xl w-full">
        <div
          className="group relative rounded-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.01]"
          style={{
            boxShadow:
              "0 0 0 1px rgba(212,168,67,0.28), 0 8px 32px rgba(0,0,0,0.45), 0 0 48px rgba(212,168,67,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Layered background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(18,16,10,0.98) 0%, rgba(12,18,32,0.97) 42%, rgba(11,20,40,0.98) 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-80 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 90% at 0% 0%, rgba(212,168,67,0.18), transparent 55%), radial-gradient(ellipse 70% 80% at 100% 100%, rgba(66,116,185,0.16), transparent 50%)",
            }}
          />
          {/* Soft gold rim */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(240,215,140,0.45), transparent 35%, transparent 65%, rgba(106,163,224,0.35))",
              padding: 1,
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          {/* Shimmer sweep */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden opacity-40"
            aria-hidden
          >
            <div
              className="absolute -inset-y-4 w-1/3 -skew-x-12"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,240,200,0.14), transparent)",
                animation: "contestShimmer 4.5s ease-in-out infinite",
              }}
            />
          </div>
          {/* Top hairline */}
          <div
            className="absolute top-0 left-4 right-4 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(240,215,140,0.55), transparent)",
            }}
          />

          <div className="relative px-3.5 py-3.5 sm:px-4 sm:py-4">
            {/* Header row */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(145deg, #F0D78C 0%, #D4A843 45%, #A67C1A 100%)",
                  boxShadow:
                    "0 4px 16px rgba(212,168,67,0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                <Gift className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#1a1208]" strokeWidth={2.25} />
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #4274B9, #6AA3E0)",
                    boxShadow: "0 2px 8px rgba(66,116,185,0.5)",
                  }}
                >
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p
                    className="text-[0.72rem] sm:text-[0.85rem] font-bold tracking-[0.04em] leading-none"
                    style={{
                      ...orbitron,
                      background:
                        "linear-gradient(90deg, #FFF6D6 0%, #F0D78C 40%, #D4A843 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    $250 CONNECT-TO-ENTER
                  </p>
                  <StatusPill label={statusLabel} isOpen={isOpen} isFull={isFull} />
                </div>
                <p
                  className="text-[0.68rem] sm:text-[0.75rem] text-[#C5D0DC] leading-snug"
                  style={dmSans}
                >
                  First{" "}
                  <span className="text-[#F0D78C] font-semibold">5,000</span> wallets ·
                  auto-enter on connect
                </p>
              </div>
            </div>

            {/* Prize chips */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3">
              {PRIZE_CHIPS.map((chip) => (
                <div
                  key={chip.place}
                  className="relative rounded-lg px-1 py-1.5 sm:px-1.5 sm:py-2 text-center overflow-hidden"
                  style={{
                    background: "rgba(8,12,22,0.65)",
                    border: `1px solid ${chip.accent}33`,
                    boxShadow: `inset 0 1px 0 ${chip.accent}18, 0 0 12px ${chip.glow}`,
                  }}
                >
                  <div
                    className="text-[0.48rem] sm:text-[0.52rem] font-bold tracking-[0.12em] mb-0.5"
                    style={{ ...orbitron, color: chip.accent, opacity: 0.9 }}
                  >
                    {chip.place}
                  </div>
                  <div
                    className="text-[0.72rem] sm:text-[0.85rem] font-bold tabular-nums leading-none"
                    style={{
                      ...orbitron,
                      color: chip.place === "SHARE" ? "#E8F0FA" : "#FFF8E7",
                    }}
                  >
                    {chip.amount}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex items-end justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-[#D4A843]" />
                  <span
                    className="text-[0.58rem] sm:text-[0.62rem] tracking-[0.14em] font-bold text-[#8494A7]"
                    style={orbitron}
                  >
                    SPOTS CLAIMED
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className="text-[0.8rem] sm:text-[0.9rem] font-bold tabular-nums text-white"
                    style={orbitron}
                  >
                    {entryCount.toLocaleString()}
                  </span>
                  <span className="text-[0.65rem] text-[#8494A7] tabular-nums">
                    {" "}
                    / {entryCap.toLocaleString()}
                  </span>
                </div>
              </div>
              <div
                className="relative h-2.5 rounded-full overflow-hidden"
                style={{
                  background: "rgba(8,12,22,0.9)",
                  border: "1px solid rgba(212,168,67,0.2)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(pct, entryCount > 0 ? 2 : 0)}%`,
                    background:
                      "linear-gradient(90deg, #B8860B 0%, #D4A843 35%, #F0D78C 70%, #6AA3E0 100%)",
                    boxShadow: "0 0 12px rgba(212,168,67,0.55)",
                  }}
                />
                {/* Progress gloss */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-full opacity-40 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[0.58rem] text-[#6B7A8D]" style={dmSans}>
                  {isFull
                    ? "Entry closed — drawing soon"
                    : isOpen
                      ? `${remaining.toLocaleString()} spots left`
                      : "Opening soon"}
                </span>
                <span
                  className="text-[0.58rem] font-semibold tabular-nums text-[#D4A843]/90"
                  style={orbitron}
                >
                  {pct}%
                </span>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg text-[0.65rem] sm:text-[0.7rem] font-bold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  ...orbitron,
                  color: "#1a1208",
                  background:
                    "linear-gradient(135deg, #F0D78C 0%, #D4A843 50%, #B8860B 100%)",
                  boxShadow: "0 2px 12px rgba(212,168,67,0.35)",
                }}
              >
                <Info className="w-3.5 h-3.5" />
                Contest details
              </button>

              <a
                href={HASHPACK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg text-[0.65rem] sm:text-[0.7rem] font-bold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  ...orbitron,
                  color: "#E8F0FA",
                  background: "rgba(66,116,185,0.22)",
                  border: "1px solid rgba(106,163,224,0.45)",
                  boxShadow: "0 2px 12px rgba(66,116,185,0.2)",
                }}
                title="Get HashPack wallet to connect and enter"
              >
                <Download className="w-3.5 h-3.5 text-[#6AA3E0]" />
                Download HashPack
              </a>

              <div
                className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 rounded-lg text-[0.62rem] sm:text-[0.68rem]"
                style={{
                  ...dmSans,
                  color: "#C8D6E8",
                  background: "rgba(66,116,185,0.12)",
                  border: "1px solid rgba(106,163,224,0.28)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6AA3E0] shrink-0" />
                <span>
                  Share a workout on{" "}
                  <span className="text-white font-semibold">X</span> for{" "}
                  <span className="text-[#F0D78C] font-bold">+$100</span>
                </span>
              </div>

              {isOpen && !isFull && (
                <div
                  className="hidden sm:inline-flex items-center gap-1 ml-auto text-[0.58rem] text-[#10b981]"
                  style={orbitron}
                >
                  <Zap className="w-3 h-3" />
                  AUTO-ENTER
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes contestShimmer {
          0% { transform: translateX(-140%) skewX(-12deg); }
          55%, 100% { transform: translateX(320%) skewX(-12deg); }
        }
      `}</style>

      <ContestDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        entryCount={entryCount}
        entryCap={entryCap}
        status={stats?.status}
      />
    </>
  );
}

function StatusPill({
  label,
  isOpen,
  isFull,
}: {
  label: string;
  isOpen: boolean;
  isFull: boolean;
}) {
  const styles = isFull
    ? {
        bg: "rgba(239,68,68,0.15)",
        border: "rgba(248,113,113,0.4)",
        color: "#FCA5A5",
        dot: "#F87171",
      }
    : isOpen
      ? {
          bg: "rgba(16,185,129,0.14)",
          border: "rgba(52,211,153,0.45)",
          color: "#6EE7B7",
          dot: "#34D399",
        }
      : {
          bg: "rgba(66,116,185,0.15)",
          border: "rgba(106,163,224,0.4)",
          color: "#93C5FD",
          dot: "#6AA3E0",
        };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.52rem] sm:text-[0.55rem] font-bold tracking-[0.12em]"
      style={{
        ...orbitron,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color,
        boxShadow: isOpen ? `0 0 12px ${styles.dot}33` : undefined,
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isOpen && !isFull ? "animate-pulse" : ""}`}
        style={{
          background: styles.dot,
          boxShadow: isOpen ? `0 0 6px ${styles.dot}` : undefined,
        }}
      />
      {label}
    </span>
  );
}
