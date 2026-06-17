/**
 * Cali Dashboard — the post-eligibility landing screen.
 *
 * Shows the user their level (editable inline), equipment, current streak,
 * recent PRs, and a primary "Generate today's workout" CTA. On click, calls
 * api.cali.generate(...) and navigates to the workout screen.
 *
 * Backend dependencies:
 *   GET  /cali/profile        (lazy-create on first read)
 *   GET  /cali/streak
 *   GET  /cali/prs
 *   POST /cali/workout/generate
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Dumbbell, Flame, Trophy, Settings2, RefreshCw, Loader2, AlertCircle,
} from "lucide-react";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { LevelPicker } from "./cali-level-picker";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Profile {
  level: 1 | 2 | 3;
  equipment: string[];
  displayName: string;
}
interface Streak {
  current: number;
  longest: number;
  lastDate: string;
}
interface PR {
  exerciseId: string;
  name: string;
  category: string;
  metric: "reps" | "time_sec";
  value: number;
  achievedAt: number;
}

export function CaliDashboard() {
  const cali = useCaliSession();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingLevel, setSavingLevel] = useState(false);

  // ── Initial load ───────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!cali.sessionToken) return;
    setLoading(true);
    setError(null);
    const [p, s, r] = await Promise.all([
      api.cali.getProfile(cali.sessionToken),
      api.cali.streak(cali.sessionToken),
      api.cali.prs(cali.sessionToken),
    ]);
    if (p.success && p.data) setProfile(p.data.profile);
    if (s.success && s.data) setStreak(s.data.streak);
    if (r.success && r.data) setPrs(r.data.prs);
    if (!p.success) {
      cali.handleAuthError(p.code);
      setError(p.error || "Failed to load profile.");
    }
    setLoading(false);
  }, [cali]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Level change ───────────────────────────────────────────────────────
  const onLevelChange = async (level: 1 | 2 | 3) => {
    if (!cali.sessionToken || !profile) return;
    setSavingLevel(true);
    const prev = profile.level;
    setProfile({ ...profile, level }); // optimistic
    const res = await api.cali.updateProfile(cali.sessionToken, { level });
    if (!res.success) {
      setProfile({ ...profile, level: prev });
      cali.handleAuthError(res.code);
      setError(res.error || "Couldn't update level.");
    } else if (res.data) {
      setProfile(res.data.profile);
    }
    setSavingLevel(false);
  };

  // ── Generate workout ───────────────────────────────────────────────────
  const onGenerate = async () => {
    if (!cali.sessionToken || !profile) return;
    setGenerating(true);
    setError(null);
    const res = await api.cali.generate(cali.sessionToken);
    setGenerating(false);
    if (!res.success || !res.data) {
      cali.handleAuthError(res.code);
      setError(res.error || "Couldn't generate workout.");
      return;
    }
    navigate(`/calisthenics/workout/${encodeURIComponent(res.data.workout.workoutId)}`);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6AA3E0]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold tracking-widest text-[#6AA3E0]" style={orbitron}>
            WCO CALISTHENICS
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white" style={orbitron}>
            Today's Session
          </h1>
          <p className="text-xs text-[#8494A7] mt-1" style={dmSans}>
            {cali.accountId} · {((cali.eligibility?.tinybars ?? 0) / 1e8).toFixed(4)} ℏ
          </p>
        </div>
        <button
          onClick={loadAll}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-white bg-white/[0.02] border border-[#4274B9]/15"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/8 border border-red-500/20">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-300" />
          <p className="text-xs text-red-200" style={dmSans}>{error}</p>
        </div>
      )}

      {/* Streak + PR strip */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Streak"
          value={streak ? `${streak.current}` : "0"}
          sub={streak && streak.longest > 0 ? `Best: ${streak.longest}` : "Complete a workout to start"}
          accent="#F97316"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="PRs"
          value={`${prs.length}`}
          sub={prs.length > 0 ? `Latest: ${prs[0].name}` : "Log a set to set your first"}
          accent="#D4A843"
        />
      </div>

      {/* Level picker */}
      {profile && (
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            background: "linear-gradient(160deg, rgba(66,116,185,0.05), rgba(11,17,32,0.85))",
            borderColor: "rgba(66,116,185,0.15)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0]" style={orbitron}>
              CHOOSE YOUR LEVEL
            </h2>
            {savingLevel && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8494A7]" />}
          </div>
          <LevelPicker value={profile.level} onChange={onLevelChange} disabled={savingLevel} />
        </div>
      )}

      {/* Primary CTA */}
      <button
        onClick={onGenerate}
        disabled={generating || !profile}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          ...dmSans,
          background: "linear-gradient(135deg, #4274B9, #3563A0)",
          color: "#fff",
          boxShadow: "0 6px 24px rgba(66,116,185,0.35)",
        }}
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Dumbbell className="w-5 h-5" />}
        {generating ? "Building workout…" : "Generate today's workout"}
      </button>

      {/* Recent PRs */}
      {prs.length > 0 && (
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            background: "rgba(11,17,32,0.6)",
            borderColor: "rgba(66,116,185,0.15)",
          }}
        >
          <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0] mb-3" style={orbitron}>
            RECENT PRs
          </h2>
          <ul className="space-y-2">
            {prs.slice(0, 5).map((pr) => (
              <li key={pr.exerciseId} className="flex items-center justify-between text-xs">
                <span className="text-[#A3B0C2]" style={dmSans}>{pr.name}</span>
                <span className="font-mono text-[#6AA3E0]">
                  {pr.metric === "reps" ? `${pr.value} reps` : `${pr.value}s`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between text-xs text-[#8494A7] pt-2" style={dmSans}>
        <button
          className="flex items-center gap-1.5 hover:text-[#E8ECF0]"
          onClick={() => navigate("/calisthenics/history")}
        >
          View history →
        </button>
        <button
          className="flex items-center gap-1.5 hover:text-[#E8ECF0]"
          onClick={cali.signOut}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: "rgba(11,17,32,0.6)",
        borderColor: "rgba(66,116,185,0.15)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5" style={{ color: accent }}>
        {icon}
        <span className="text-[0.65rem] font-bold tracking-widest" style={orbitron}>
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-white leading-none" style={orbitron}>
        {value}
      </p>
      <p className="text-[0.65rem] text-[#8494A7] mt-1.5 truncate" style={dmSans}>
        {sub}
      </p>
    </div>
  );
}
