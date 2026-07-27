/**
 * Hero contest banner — under CONNECT / EXPLORE / WORKOUT buttons.
 */

import { useEffect, useState, useCallback } from "react";
import { Gift, Info, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import type { ContestPublicStats } from "../../lib/contest-types";
import {
  CONTEST_BANNER_HEADLINE,
  CONTEST_BANNER_SUB,
  contestSpotsLabel,
} from "./contest-copy";
import { ContestDetailsModal } from "./contest-details-modal";

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

  // Hide only when completed (still show draft/open/full for awareness)
  if (stats?.status === "completed") return null;

  const entryCount = stats?.entryCount ?? 0;
  const entryCap = stats?.entryCap ?? 5000;
  const pct = stats?.progressPercent ?? 0;
  const isFull = stats?.isFull || stats?.status === "full";

  return (
    <>
      <div className="mt-3 sm:mt-4 max-w-xl w-full">
        <div className="relative rounded-xl border border-[#D4A843]/30 bg-gradient-to-r from-[#D4A843]/10 via-[#111827]/90 to-[#4274B9]/10 overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(212,168,67,0.12), transparent)",
          }} />
          <div className="relative px-3 py-2.5 sm:px-3.5 sm:py-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D4A843]/15 border border-[#D4A843]/35 flex items-center justify-center shrink-0 mt-0.5">
                <Gift className="w-4 h-4 text-[#D4A843]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
                  <p
                    className="text-[0.7rem] sm:text-xs font-bold text-[#E8ECF0] tracking-wide"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    {CONTEST_BANNER_HEADLINE}
                  </p>
                  {isFull ? (
                    <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                      FULL
                    </span>
                  ) : stats?.isOpen ? (
                    <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[#4274B9]/15 text-[#6AA3E0] border border-[#4274B9]/30 font-semibold">
                      {(stats?.status || "soon").toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-[0.65rem] sm:text-[0.7rem] text-[#B0BCC9] leading-snug mb-1.5">
                  {CONTEST_BANNER_SUB}
                </p>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-[#0B1120] border border-[#4274B9]/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D4A843] to-[#4274B9] transition-all duration-700"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="text-[0.6rem] text-[#8494A7] whitespace-nowrap tabular-nums">
                    {contestSpotsLabel(entryCount, entryCap)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#6AA3E0] hover:text-[#E8ECF0] transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    Contest details
                  </button>
                  <span className="text-[#4274B9]/40">·</span>
                  <span className="inline-flex items-center gap-1 text-[0.6rem] text-[#D4A843]/90">
                    <Sparkles className="w-3 h-3" />
                    Share a workout on X for +$100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
