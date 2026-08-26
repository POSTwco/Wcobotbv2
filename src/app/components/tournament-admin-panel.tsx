/**
 * Admin controls for tournament (champion-pick) events.
 * Open/close voting, advance bracket matches, declare champion.
 */

import { useState } from "react";
import { Crown, Loader2, Swords, Trophy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Athlete, BattleEvent, TournamentMatch } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const orbitron = { fontFamily: "Orbitron, sans-serif" } as const;

export function TournamentAdminPanel({
  events,
  athletes,
  wallet,
  sessionToken,
  onRefresh,
}: {
  events: BattleEvent[];
  athletes: Athlete[];
  wallet: string;
  sessionToken: string;
  onRefresh: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [champPick, setChampPick] = useState<Record<string, string>>({});

  if (events.length === 0) return null;

  const athMap = new Map(athletes.map((a) => [a.id, a]));

  const run = async (eventId: string, fn: () => Promise<void>) => {
    setBusyId(eventId);
    try {
      await fn();
      onRefresh();
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message || err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-[#D4A843]" />
        <h4 className="text-[#D4A843] font-bold text-xs tracking-wider" style={orbitron}>
          TOURNAMENT CONTROLS
        </h4>
      </div>
      {events.map((evt) => {
        const busy = busyId === evt.id;
        const open = expanded === evt.id;
        const matches = (evt.tournamentMatches || []) as TournamentMatch[];
        const openable = ["draft", "upcoming", "voting_closed"].includes(evt.votingStatus || "draft");
        const closeable = evt.votingStatus === "voting_open";
        const canDeclare =
          evt.votingStatus === "voting_open" ||
          evt.votingStatus === "voting_closed";

        return (
          <div
            key={evt.id}
            className="rounded-xl border border-[#D4A843]/20 bg-[#0B1120] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(open ? null : evt.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <p className="text-[#E8ECF0] text-sm font-semibold truncate">{evt.name}</p>
                <p className="text-[#8494A7] text-[0.55rem]">
                  {evt.bracketSize} athletes · {(evt.votingStatus || "draft").replace(/_/g, " ")} ·{" "}
                  {evt.totalVotes || 0} votes
                  {evt.championId ? ` · Champ: ${athMap.get(evt.championId)?.name || evt.championId}` : ""}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-[#8494A7] transition-transform ${open ? "rotate-90" : ""}`}
              />
            </button>

            {open && (
              <div className="px-3 pb-3 space-y-3 border-t border-[#D4A843]/10 pt-3">
                <div className="flex flex-wrap gap-2">
                  {openable && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(evt.id, async () => {
                          const res = await api.admin.setTournamentStatus(
                            evt.id,
                            "voting_open",
                            wallet,
                            sessionToken,
                          );
                          if (!res.success) throw new Error(res.error || "Failed");
                          toast.success("Tournament voting opened");
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-[0.55rem] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 disabled:opacity-50"
                      style={orbitron}
                    >
                      {busy ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null} OPEN VOTING
                    </button>
                  )}
                  {closeable && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(evt.id, async () => {
                          const res = await api.admin.setTournamentStatus(
                            evt.id,
                            "voting_closed",
                            wallet,
                            sessionToken,
                          );
                          if (!res.success) throw new Error(res.error || "Failed");
                          toast.success("Tournament voting closed");
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-[0.55rem] font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30 disabled:opacity-50"
                      style={orbitron}
                    >
                      CLOSE VOTING
                    </button>
                  )}
                </div>

                {/* Entrants + declare */}
                {canDeclare && (
                  <div className="space-y-2">
                    <p className="text-[#8494A7] text-[0.55rem]">Declare tournament champion</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(evt.athleteIds || evt.bracket?.map((s) => s.athleteId) || []).map((id) => {
                        const a = athMap.get(id);
                        const selected = champPick[evt.id] === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setChampPick((p) => ({ ...p, [evt.id]: id }))}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[0.55rem] ${
                              selected
                                ? "border-[#D4A843] bg-[#D4A843]/15 text-[#D4A843]"
                                : "border-[#4274B9]/20 text-[#8494A7] hover:border-[#4274B9]/40"
                            }`}
                          >
                            {a?.pfpUrl && (
                              <ImageWithFallback
                                src={a.pfpUrl}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            )}
                            {a?.name || id}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={busy || !champPick[evt.id]}
                      onClick={() =>
                        run(evt.id, async () => {
                          const cid = champPick[evt.id];
                          if (!cid) return;
                          if (
                            !confirm(
                              `Declare ${athMap.get(cid)?.name || cid} as champion? This updates tournament W/L and freezes votes.`,
                            )
                          ) {
                            return;
                          }
                          const res = await api.admin.declareTournamentChampion(
                            evt.id,
                            cid,
                            wallet,
                            sessionToken,
                          );
                          if (!res.success) throw new Error(res.error || "Failed");
                          toast.success(res.data?.message || "Champion declared");
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.55rem] font-bold bg-[#D4A843] text-[#0B1120] disabled:opacity-40"
                      style={orbitron}
                    >
                      <Trophy className="w-3 h-3" />
                      DECLARE CHAMPION
                    </button>
                  </div>
                )}

                {/* Advance matches */}
                {matches.length > 0 && evt.votingStatus !== "champion_declared" && (
                  <div className="space-y-2">
                    <p className="text-[#8494A7] text-[0.55rem] flex items-center gap-1">
                      <Swords className="w-3 h-3" /> Bracket advance (display only — does not change W/L)
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {matches
                        .filter((m) => m.athlete1Id && m.athlete2Id && !m.winnerId)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 text-[0.55rem] text-[#8494A7] flex-wrap"
                          >
                            <span className="text-[#6AA3E0]">{m.roundName}</span>
                            <button
                              type="button"
                              disabled={busy}
                              className="px-2 py-0.5 rounded border border-[#4274B9]/25 hover:border-[#10b981]/50 text-[#E8ECF0]"
                              onClick={() =>
                                run(evt.id, async () => {
                                  const res = await api.admin.advanceTournamentMatch(
                                    evt.id,
                                    m.id,
                                    m.athlete1Id!,
                                    wallet,
                                    sessionToken,
                                  );
                                  if (!res.success) throw new Error(res.error || "Failed");
                                  toast.success("Match advanced");
                                })
                              }
                            >
                              {athMap.get(m.athlete1Id!)?.name || m.athlete1Id} wins
                            </button>
                            <span>vs</span>
                            <button
                              type="button"
                              disabled={busy}
                              className="px-2 py-0.5 rounded border border-[#4274B9]/25 hover:border-[#10b981]/50 text-[#E8ECF0]"
                              onClick={() =>
                                run(evt.id, async () => {
                                  const res = await api.admin.advanceTournamentMatch(
                                    evt.id,
                                    m.id,
                                    m.athlete2Id!,
                                    wallet,
                                    sessionToken,
                                  );
                                  if (!res.success) throw new Error(res.error || "Failed");
                                  toast.success("Match advanced");
                                })
                              }
                            >
                              {athMap.get(m.athlete2Id!)?.name || m.athlete2Id} wins
                            </button>
                          </div>
                        ))}
                      {matches.filter((m) => m.athlete1Id && m.athlete2Id && !m.winnerId).length === 0 && (
                        <p className="text-[0.5rem] text-[#8494A7]/70">No open matchups to advance.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
