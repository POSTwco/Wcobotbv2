/**
 * Cali History — paginated past workouts.
 * Backed by GET /cali/history. Tap any row to view the full workout again.
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { ArrowLeft, Calendar, Loader2, ChevronRight, Anchor as AnchorIcon } from "lucide-react";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface HistoryItem {
  workoutId: string;
  dateKey: string;
  completedAt: string | null;
  totalSets: number;
  uniqueExercises: number;
  topVolumeSet: { exerciseId: string; metric: "reps" | "time_sec"; value: number } | null;
  updatedAt: number;
}

export function CaliHistory() {
  const cali = useCaliSession();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (before?: string, append = false) => {
      if (!cali.sessionToken) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      const res = await api.cali.history(cali.sessionToken, { limit: 20, before });
      if (res.success && res.data) {
        if (append) setItems((prev) => [...prev, ...res.data!.items]);
        else setItems(res.data.items);
        setCursor(res.data.nextCursor);
        setTotal(res.data.total);
      } else {
        cali.handleAuthError(res.code);
        setError(res.error || "Couldn't load history.");
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [cali],
  );

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/calisthenics" className="flex items-center gap-1.5 text-xs text-[#8494A7] hover:text-[#E8ECF0]" style={dmSans}>
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <span className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
          {total} total
        </span>
      </div>

      <div>
        <p className="text-[0.65rem] font-bold tracking-widest text-[#6AA3E0]" style={orbitron}>
          WORKOUT HISTORY
        </p>
        <h1 className="text-2xl font-bold text-white" style={orbitron}>
          Your training log
        </h1>
      </div>

      {error && (
        <p className="text-xs text-red-300" style={dmSans}>{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#6AA3E0]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#4274B9]/15 bg-white/[0.02] p-8 text-center">
          <Calendar className="w-6 h-6 text-[#8494A7] mx-auto mb-3" />
          <p className="text-sm text-[#A3B0C2]" style={dmSans}>
            No workouts logged yet. Generate one from the dashboard to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={`${it.dateKey}-${it.workoutId}`}>
              <Link
                to={`/calisthenics/workout/${encodeURIComponent(it.workoutId)}`}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#4274B9]/12 bg-white/[0.02] hover:border-[#4274B9]/30 hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white" style={dmSans}>{it.dateKey}</span>
                    {it.completedAt && (
                      <span className="px-1.5 py-0.5 text-[0.55rem] rounded bg-[#10b981]/12 text-[#10b981] font-bold" style={orbitron}>
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <p className="text-[0.65rem] text-[#8494A7] mt-0.5" style={dmSans}>
                    {it.totalSets} sets · {it.uniqueExercises} exercises
                    {it.topVolumeSet && (
                      <> · top {it.topVolumeSet.value}{it.topVolumeSet.metric === "reps" ? " reps" : "s"}</>
                    )}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8494A7] flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          onClick={() => fetchPage(cursor, true)}
          disabled={loadingMore}
          className="w-full py-2.5 rounded-xl text-xs text-[#A3B0C2] border border-[#4274B9]/15 hover:text-white hover:border-[#4274B9]/30"
          style={dmSans}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}

      <div className="text-center pt-2">
        <Link to="/calisthenics/prs" className="text-xs text-[#6AA3E0] hover:underline" style={dmSans}>
          View all PRs →
        </Link>
      </div>
    </div>
  );
}
