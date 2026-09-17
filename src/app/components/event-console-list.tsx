/**
 * Admin Event Console — manage list for Duals / Tournament / Field events.
 * Archive, delete drafts, batch schedule/open for duals, champ-pick shortcuts.
 */

import { useMemo, useState } from "react";
import {
  Archive, CalendarClock, CheckCircle, ChevronDown, ChevronRight,
  Loader2, Swords, Trash2, Trophy, Users, Zap, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Athlete, Battle, BattleEvent } from "../lib/types";
import {
  deriveEventDisplayStatus,
  formatLabel,
  matchesEventListFilter,
  type EventFormatFilter,
  type EventListFilter,
  isChampPick,
} from "../lib/event-admin";

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

export function EventConsoleList({
  events,
  battles,
  athletes,
  wallet,
  sessionToken,
  onRefresh,
  onOpenBattlesTab,
}: {
  events: BattleEvent[];
  battles: Battle[];
  athletes: Athlete[];
  wallet: string;
  sessionToken: string;
  onRefresh: () => void;
  /** Optional: parent can switch admin tab to Battles */
  onOpenBattlesTab?: (eventId: string) => void;
}) {
  const [listFilter, setListFilter] = useState<EventListFilter>("active");
  const [formatFilter, setFormatFilter] = useState<EventFormatFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<Record<string, { opens: string; closes: string }>>({});

  const athMap = useMemo(() => {
    const m = new Map<string, Athlete>();
    athletes.forEach((a) => m.set(a.id, a));
    return m;
  }, [athletes]);

  const filtered = useMemo(() => {
    return events
      .filter((e) => (formatFilter === "all" ? true : (e.format || "pvp") === formatFilter))
      .filter((e) => matchesEventListFilter(e, listFilter, battles))
      .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
  }, [events, battles, listFilter, formatFilter]);

  const counts = useMemo(() => {
    const c = { active: 0, drafts: 0, archived: 0, all: events.length };
    for (const e of events) {
      if (matchesEventListFilter(e, "active", battles)) c.active++;
      if (matchesEventListFilter(e, "drafts", battles)) c.drafts++;
      if (matchesEventListFilter(e, "archived", battles)) c.archived++;
    }
    return c;
  }, [events, battles]);

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

  const eventBattles = (eventId: string) => battles.filter((b) => b.eventId === eventId);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10 mb-4">
        <Trophy className="w-8 h-8 text-[#4274B9]/30 mx-auto mb-2" />
        <p className="text-[#8494A7] text-sm mb-1">No events yet.</p>
        <p className="text-[#8494A7]/70 text-[0.55rem]">Create a Duals, Tournament, or Field event above.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-1.5 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {([
            ["active", "ACTIVE"],
            ["drafts", "DRAFTS"],
            ["archived", "ARCHIVED"],
            ["all", "ALL"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setListFilter(key)}
              className={`px-2 py-1 rounded text-[0.5rem] border transition-all ${
                listFilter === key
                  ? "bg-[#4274B9]/15 border-[#4274B9]/40 text-[#E8ECF0]"
                  : "border-[#4274B9]/10 text-[#8494A7] hover:text-[#E8ECF0]"
              }`}
              style={ORBITRON}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {([
            ["all", "All formats"],
            ["pvp", "Duals"],
            ["tournament", "Tournament"],
            ["field", "Field"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFormatFilter(key)}
              className={`px-2 py-0.5 rounded text-[0.45rem] border ${
                formatFilter === key
                  ? "border-[#D4A843]/40 text-[#D4A843]"
                  : "border-[#4274B9]/10 text-[#8494A7]"
              }`}
              style={ORBITRON}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
          <p className="text-[#8494A7] text-xs">No events in this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((evt) => {
            const open = expandedId === evt.id;
            const busy = busyId === evt.id;
            const badge = deriveEventDisplayStatus(evt, battles);
            const kids = eventBattles(evt.id);
            const draftKids = kids.filter((b) => b.status === "draft");
            const format = evt.format || "pvp";
            const sched = scheduleDraft[evt.id] || {
              opens: toLocalInput(evt.startDate),
              closes: toLocalInput(evt.endDate),
            };

            return (
              <div
                key={evt.id}
                className="rounded-xl bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : evt.id)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-[#4274B9]/5"
                >
                  {open ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#8494A7] shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#8494A7] shrink-0" />
                  )}
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      format === "field"
                        ? "bg-[#10b981]/10"
                        : format === "tournament"
                          ? "bg-[#D4A843]/10"
                          : "bg-[#4274B9]/10"
                    }`}
                  >
                    {format === "pvp" || !evt.format ? (
                      <Swords className="w-3.5 h-3.5 text-[#4274B9]" />
                    ) : format === "field" ? (
                      <Users className="w-3.5 h-3.5 text-[#10b981]" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5 text-[#D4A843]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#E8ECF0] text-sm font-semibold truncate">{evt.name}</p>
                    <p className="text-[#8494A7] text-[0.55rem] truncate">
                      {formatLabel(evt.format)} ·{" "}
                      {format === "pvp" || !evt.format
                        ? `${kids.length || Math.floor((evt.bracketSize || 0) / 2)} battle(s)`
                        : `${(evt.athleteIds || evt.bracket || []).length} athletes`}
                      {evt.location ? ` · ${evt.location}` : ""}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[0.5rem] border shrink-0"
                    style={{
                      color: badge.color,
                      borderColor: `${badge.color}40`,
                      background: `${badge.color}12`,
                      ...ORBITRON,
                    }}
                  >
                    {badge.label}
                  </span>
                </button>

                {open && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[#4274B9]/10 pt-3">
                    {/* Schedule */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-[0.5rem] text-[#8494A7] block">
                        Voting opens
                        <input
                          type="datetime-local"
                          value={sched.opens}
                          onChange={(e) =>
                            setScheduleDraft((p) => ({
                              ...p,
                              [evt.id]: { ...sched, opens: e.target.value },
                            }))
                          }
                          className="mt-1 w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-2 py-1.5 text-[#E8ECF0] text-[0.65rem]"
                        />
                      </label>
                      <label className="text-[0.5rem] text-[#8494A7] block">
                        Voting closes / event end
                        <input
                          type="datetime-local"
                          value={sched.closes}
                          onChange={(e) =>
                            setScheduleDraft((p) => ({
                              ...p,
                              [evt.id]: { ...sched, closes: e.target.value },
                            }))
                          }
                          className="mt-1 w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-2 py-1.5 text-[#E8ECF0] text-[0.65rem]"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <ActionBtn
                        busy={busy}
                        icon={<CalendarClock className="w-3 h-3" />}
                        label="Save schedule"
                        onClick={() =>
                          run(evt.id, async () => {
                            const opens = fromLocalInput(sched.opens);
                            const closes = fromLocalInput(sched.closes);
                            if (format === "pvp" || !evt.format) {
                              const ids = kids.map((b) => b.id);
                              if (ids.length) {
                                const res = await api.admin.batchBattleStatus(
                                  ids,
                                  null,
                                  wallet,
                                  sessionToken,
                                  { votingOpensAt: opens, votingClosesAt: closes },
                                );
                                if (!res.success) throw new Error(res.error || "Schedule failed");
                              }
                            }
                            const res2 = await api.admin.eventLifecycle(
                              evt.id,
                              { startDate: opens, endDate: closes },
                              wallet,
                              sessionToken,
                            );
                            if (!res2.success) throw new Error(res2.error || "Failed");
                            toast.success("Schedule saved");
                          })
                        }
                      />

                      {(format === "pvp" || !evt.format) && (
                        <>
                          <ActionBtn
                            busy={busy}
                            icon={<Zap className="w-3 h-3" />}
                            label={`Publish drafts (${draftKids.length})`}
                            disabled={draftKids.length === 0}
                            onClick={() =>
                              run(evt.id, async () => {
                                const res = await api.admin.batchBattleStatus(
                                  draftKids.map((b) => b.id),
                                  "upcoming",
                                  wallet,
                                  sessionToken,
                                );
                                if (!res.success) throw new Error(res.error || "Failed");
                                toast.success(`Published ${res.data?.updated || 0} battles`);
                              })
                            }
                          />
                          <ActionBtn
                            busy={busy}
                            icon={<Swords className="w-3 h-3" />}
                            label="Open voting (all eligible)"
                            onClick={() =>
                              run(evt.id, async () => {
                                const ids = kids
                                  .filter((b) => b.status === "draft" || b.status === "upcoming")
                                  .map((b) => b.id);
                                if (!ids.length) throw new Error("No draft/upcoming battles");
                                // draft → upcoming first if needed
                                const drafts = kids.filter((b) => b.status === "draft").map((b) => b.id);
                                if (drafts.length) {
                                  await api.admin.batchBattleStatus(drafts, "upcoming", wallet, sessionToken);
                                }
                                const res = await api.admin.batchBattleStatus(
                                  kids.filter((b) => b.status === "draft" || b.status === "upcoming").map((b) => b.id),
                                  "voting_open",
                                  wallet,
                                  sessionToken,
                                );
                                if (!res.success) throw new Error(res.error || "Failed");
                                toast.success(`Opened voting on ${res.data?.updated || 0} battles`);
                              })
                            }
                          />
                          <ActionBtn
                            busy={busy}
                            icon={<CheckCircle className="w-3 h-3" />}
                            label="Complete event"
                            onClick={() =>
                              run(evt.id, async () => {
                                const res = await api.admin.eventLifecycle(
                                  evt.id,
                                  { status: "completed" },
                                  wallet,
                                  sessionToken,
                                );
                                if (!res.success) throw new Error(res.error || "Failed");
                                toast.success("Event marked completed");
                              })
                            }
                          />
                          {onOpenBattlesTab && (
                            <ActionBtn
                              busy={busy}
                              icon={<Swords className="w-3 h-3" />}
                              label="Manage battles"
                              onClick={() => onOpenBattlesTab(evt.id)}
                            />
                          )}
                        </>
                      )}

                      {isChampPick(evt) && (
                        <>
                          <ActionBtn
                            busy={busy}
                            icon={<CalendarClock className="w-3 h-3" />}
                            label="Set upcoming"
                            onClick={() =>
                              run(evt.id, async () => {
                                const res = await api.admin.setTournamentStatus(
                                  evt.id,
                                  "upcoming",
                                  wallet,
                                  sessionToken,
                                  {
                                    startDate: fromLocalInput(sched.opens),
                                    endDate: fromLocalInput(sched.closes),
                                  },
                                );
                                if (!res.success) throw new Error(res.error || "Failed");
                                toast.success("Marked upcoming");
                              })
                            }
                          />
                          <ActionBtn
                            busy={busy}
                            icon={<Zap className="w-3 h-3" />}
                            label="Open voting"
                            onClick={() =>
                              run(evt.id, async () => {
                                if (!confirm(`Open ${formatLabel(evt.format)} voting for "${evt.name}"?`)) return;
                                const res = await api.admin.setTournamentStatus(
                                  evt.id,
                                  "voting_open",
                                  wallet,
                                  sessionToken,
                                  {
                                    startDate: fromLocalInput(sched.opens),
                                    endDate: fromLocalInput(sched.closes),
                                  },
                                );
                                if (!res.success) throw new Error(res.error || "Failed");
                                toast.success("Voting opened");
                              })
                            }
                          />
                          <ActionBtn
                            busy={busy}
                            icon={<CheckCircle className="w-3 h-3" />}
                            label="Close voting"
                            onClick={() =>
                              run(evt.id, async () => {
                                const res = await api.admin.setTournamentStatus(
                                  evt.id,
                                  "voting_closed",
                                  wallet,
                                  sessionToken,
                                );
                                if (!res.success) throw new Error(res.error || "Failed");
                                toast.success("Voting closed");
                              })
                            }
                          />
                        </>
                      )}

                      {!evt.archivedAt ? (
                        <ActionBtn
                          busy={busy}
                          icon={<Archive className="w-3 h-3" />}
                          label="Archive"
                          tone="muted"
                          onClick={() =>
                            run(evt.id, async () => {
                              const res = await api.admin.eventLifecycle(
                                evt.id,
                                { archive: true },
                                wallet,
                                sessionToken,
                              );
                              if (!res.success) throw new Error(res.error || "Failed");
                              toast.success("Archived — hidden from Active");
                            })
                          }
                        />
                      ) : (
                        <ActionBtn
                          busy={busy}
                          icon={<RotateCcw className="w-3 h-3" />}
                          label="Unarchive"
                          tone="muted"
                          onClick={() =>
                            run(evt.id, async () => {
                              const res = await api.admin.eventLifecycle(
                                evt.id,
                                { archive: false },
                                wallet,
                                sessionToken,
                              );
                              if (!res.success) throw new Error(res.error || "Failed");
                              toast.success("Restored to Active list");
                            })
                          }
                        />
                      )}

                      <ActionBtn
                        busy={busy}
                        icon={<Trash2 className="w-3 h-3" />}
                        label="Delete"
                        tone="danger"
                        onClick={() =>
                          run(evt.id, async () => {
                            const force = !!(evt.archivedAt || evt.status === "completed");
                            const msg = force
                              ? `Permanently delete archived/completed event "${evt.name}" and all battles/votes?`
                              : `Delete draft event "${evt.name}" and cascade battles/votes?`;
                            if (!confirm(msg)) return;
                            const res = await api.admin.deleteEvent(evt.id, wallet, sessionToken, force);
                            if (!res.success) throw new Error(res.error || "Delete failed");
                            toast.success(
                              `Deleted · ${res.data?.battlesRemoved || 0} battles · ${
                                (res.data?.votesRemoved || 0) + (res.data?.tournamentVotesRemoved || 0)
                              } votes`,
                            );
                          })
                        }
                      />
                    </div>

                    {/* Entrants preview */}
                    {(evt.bracket?.length || 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {evt.bracket.slice(0, 12).map((s) => (
                          <span
                            key={s.seat}
                            className="px-1.5 py-0.5 rounded bg-[#162033] text-[0.45rem] text-[#8494A7]"
                          >
                            #{s.seat} {athMap.get(s.athleteId)?.name || s.athleteId}
                          </span>
                        ))}
                        {evt.bracket.length > 12 && (
                          <span className="text-[0.45rem] text-[#8494A7]">+{evt.bracket.length - 12} more</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  icon,
  onClick,
  busy,
  disabled,
  tone = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "default" | "muted" | "danger";
}) {
  const tones = {
    default: "bg-[#4274B9]/10 text-[#6AA3E0] border-[#4274B9]/25 hover:bg-[#4274B9]/20",
    muted: "bg-[#162033] text-[#8494A7] border-[#4274B9]/15 hover:text-[#E8ECF0]",
    danger: "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20",
  };
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.5rem] font-bold border disabled:opacity-40 ${tones[tone]}`}
      style={ORBITRON}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    // date-only YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T12:00`;
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return local;
  return d.toISOString();
}
