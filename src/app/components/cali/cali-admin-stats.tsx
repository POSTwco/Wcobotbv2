/**
 * Cali Admin Stats — compact metrics card for the command center.
 * Polls /admin/cali/stats on mount + every 60s while the page is visible.
 */

import { useCallback, useEffect, useState } from "react";
import { Dumbbell, Users, Activity, Anchor, RefreshCw, Loader2, UserCheck, Play } from "lucide-react";
import { api } from "../../lib/api";

interface Stats {
  totalProfiles: number;
  totalWorkouts: number;
  totalLogs: number;
  totalSetsLogged: number;
  totalPRs: number;
  totalAnchored: number;
  workoutsLast24h: number;
  activeWallets: number;
  topExercises: Array<{ exerciseId: string; name: string; count: number }>;
  libraryVersion: string;
  // Live ops numbers required for the clickable states panel + dedicated ops page
  caliSignInsToday?: number;
  caliSignInsTotal?: number;
  workoutsGeneratedTotal?: number;
}

export function CaliAdminStats({
  wallet,
  sessionToken,
  onClick,
}: {
  wallet: string;
  sessionToken: string;
  onClick?: () => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.admin.getCaliStats(wallet, sessionToken);
    if (res.success && res.data) setStats(res.data);
    setLoading(false);
  }, [wallet, sessionToken]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const handleClick = () => {
    if (onClick) onClick();
  };

  const signInsToday = stats?.caliSignInsToday ?? 0;
  const signInsTotal = stats?.caliSignInsTotal ?? 0;
  const gensTotal = stats?.workoutsGeneratedTotal ?? 0;

  return (
    <div
      onClick={handleClick}
      className={`px-4 sm:px-5 py-3 border-b border-[#D4A843]/10 bg-[#0B1120]/40 ${onClick ? "cursor-pointer hover:bg-[#0B1120]/70 active:bg-[#162033] transition-colors" : ""}`}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "Open Calisthenics Routine Operator Console" : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#4274B9]/12 border border-[#4274B9]/25">
            <Dumbbell className="w-3.5 h-3.5 text-[#6AA3E0]" />
          </div>
          <span className="text-[0.65rem] font-bold tracking-widest text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            CALISTHENICS
          </span>
          {stats && (
            <span className="text-[0.55rem] text-[#8494A7] font-mono">{stats.libraryVersion}</span>
          )}
          {onClick && (
            <span className="text-[0.5rem] ml-1 px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843] tracking-wider">OPEN OPS →</span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); load(); }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#8494A7] hover:text-white hover:bg-white/5"
          aria-label="Refresh"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <Cell icon={<Users className="w-3 h-3" />} label="Wallets" value={stats.activeWallets} />
            <Cell icon={<Activity className="w-3 h-3" />} label="Workouts 24h" value={stats.workoutsLast24h} sub={`${stats.totalWorkouts} total`} />
            <Cell icon={<Dumbbell className="w-3 h-3" />} label="Sets logged" value={stats.totalSetsLogged} sub={`${stats.totalPRs} PRs`} />
            <Cell icon={<Anchor className="w-3 h-3" />} label="Anchored" value={stats.totalAnchored} />
          </div>

          {/* NEW: prominent live sign-ins + total generated (per user request for states panel) */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Cell icon={<UserCheck className="w-3 h-3" />} label="SIGN-INS (live)" value={signInsToday} sub={`${signInsTotal.toLocaleString()} total`} />
            <Cell icon={<Play className="w-3 h-3" />} label="WORKOUTS GEN" value={gensTotal} sub="total generated" />
          </div>

          {stats.topExercises.length > 0 && (
            <div className="text-[0.6rem] text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span className="text-[#A3B0C2]">Top exercises:</span>{" "}
              {stats.topExercises.map((e, i) => (
                <span key={e.exerciseId}>
                  {i > 0 && " · "}
                  {e.name} <span className="text-[#6AA3E0]">×{e.count}</span>
                </span>
              ))}
            </div>
          )}
          {onClick && <div className="text-[0.5rem] text-[#D4A843] mt-1">Click panel to open full routine generation + photo/workout controls</div>}
        </>
      ) : loading ? (
        <p className="text-[0.65rem] text-[#8494A7]">Loading stats…</p>
      ) : (
        <p className="text-[0.65rem] text-[#8494A7]">Stats unavailable.</p>
      )}
    </div>
  );
}

function Cell({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-md bg-white/[0.02] border border-[#4274B9]/12 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[#8494A7] text-[0.55rem] uppercase tracking-wider">
        {icon}
        <span style={{ fontFamily: "Orbitron, sans-serif" }}>{label}</span>
      </div>
      <p className="text-base font-bold text-white leading-none mt-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-[0.55rem] text-[#8494A7] mt-0.5">{sub}</p>}
    </div>
  );
}
