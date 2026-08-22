/**
 * Cali PRs — every personal record the user has set, grouped by category.
 * Backed by GET /cali/prs.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { CaliLoader } from "./cali-loader";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface PR {
  exerciseId: string;
  name: string;
  category: string;
  metric: "reps" | "time_sec";
  value: number;
  achievedAt: number;
  workoutId: string;
}

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "push", label: "Push" },
  { key: "pull", label: "Pull" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
  { key: "conditioning", label: "Conditioning" },
  { key: "mobility", label: "Mobility" },
];

export function CaliPRs() {
  const cali = useCaliSession();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cali.sessionToken) {
      setPrs([]);
      setError(null);
      setLoading(false);
      return;
    }
    const token = cali.sessionToken;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await api.cali.prs(token);
      if (cancelled) return;
      if (res.success && res.data) setPrs(res.data.prs);
      else {
        cali.handleAuthError(res.code);
        setError(res.error || "Couldn't load PRs.");
        setPrs([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cali.sessionToken, cali.handleAuthError]);

  const grouped = useMemo(() => {
    const map = new Map<string, PR[]>();
    for (const pr of prs) {
      const arr = map.get(pr.category) ?? [];
      arr.push(pr);
      map.set(pr.category, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.value - a.value);
    return map;
  }, [prs]);

  if (loading) {
    return <CaliLoader variant="list" />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-5">
      <Link to="/calisthenics" className="flex items-center gap-1.5 text-xs text-[#8494A7] hover:text-[#E8ECF0]" style={dmSans}>
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <div>
        <p className="text-[0.65rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
          PERSONAL RECORDS
        </p>
        <h1 className="text-2xl font-bold text-white" style={orbitron}>
          Your best ever
        </h1>
      </div>

      {error && <p className="text-xs text-red-300" style={dmSans}>{error}</p>}

      {prs.length === 0 ? (
        <div className="rounded-2xl border border-[#4274B9]/15 bg-white/[0.02] p-8 text-center">
          <Trophy className="w-6 h-6 text-[#8494A7] mx-auto mb-3" />
          <p className="text-sm text-[#A3B0C2]" style={dmSans}>
            Log a set in any workout to set your first PR.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map((cat) => {
            const items = grouped.get(cat.key);
            if (!items || items.length === 0) return null;
            return (
              <section key={cat.key}>
                <h2 className="text-xs font-bold tracking-widest text-[#6AA3E0] mb-2" style={orbitron}>
                  {cat.label.toUpperCase()}
                </h2>
                <ul className="space-y-1.5">
                  {items.map((pr) => {
                    const fresh = Date.now() - pr.achievedAt < 7 * 24 * 60 * 60 * 1000;
                    return (
                      <li
                        key={pr.exerciseId}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#4274B9]/12 bg-white/[0.02]"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate" style={dmSans}>
                            {pr.name}
                          </span>
                          {fresh && (
                            <span className="px-1.5 py-0.5 text-[0.5rem] rounded bg-[#D4A843]/15 text-[#D4A843] font-bold flex-shrink-0" style={orbitron}>
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-sm text-[#6AA3E0] flex-shrink-0" style={orbitron}>
                          {pr.metric === "reps" ? `${pr.value} reps` : `${pr.value}s`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
