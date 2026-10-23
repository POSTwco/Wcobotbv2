/**
 * Admin helpers for event console status badges and filters.
 */

import type { Battle, BattleEvent, EventCompetitionFormat } from "./types";

export type EventListFilter = "active" | "drafts" | "archived" | "all";
export type EventFormatFilter = "all" | EventCompetitionFormat;

export function isChampPick(evt: BattleEvent): boolean {
  return evt.format === "tournament" || evt.format === "field";
}

/** Human status for admin badges — never leave PvP stuck as DRAFT when children are live. */
export function deriveEventDisplayStatus(
  evt: BattleEvent,
  battles: Battle[] = [],
): { label: string; color: string; key: string } {
  if (evt.archivedAt) {
    return { label: "ARCHIVED", color: "#8494A7", key: "archived" };
  }

  if (isChampPick(evt)) {
    const vs = evt.votingStatus || "draft";
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: "DRAFT", color: "#8494A7" },
      upcoming: { label: "UPCOMING", color: "#f59e0b" },
      voting_open: { label: "VOTING OPEN", color: "#EF4444" },
      voting_closed: { label: "VOTING CLOSED", color: "#6AA3E0" },
      champion_declared: { label: "WINNER DECLARED", color: "#10b981" },
      rewards_distributed: { label: "REWARDS DONE", color: "#22C55E" },
    };
    const m = map[vs] || map.draft;
    return { ...m, key: vs };
  }

  const children = battles.filter((b) => b.eventId === evt.id);
  if (children.length > 0) {
    const terminal = new Set(["winner_declared", "rewards_distributed", "cancelled"]);
    const liveish = new Set(["upcoming", "voting_open", "voting_closed", "winner_declared", "rewards_distributed"]);
    if (children.every((b) => b.status === "cancelled")) {
      return { label: "CANCELLED", color: "#8494A7", key: "cancelled" };
    }
    if (children.every((b) => terminal.has(b.status))) {
      return { label: "COMPLETED", color: "#4274B9", key: "completed" };
    }
    if (children.some((b) => b.status === "voting_open")) {
      return { label: "LIVE", color: "#EF4444", key: "live" };
    }
    if (children.some((b) => liveish.has(b.status))) {
      return { label: "ACTIVE", color: "#10b981", key: "active" };
    }
  }

  const st = evt.status || "draft";
  if (st === "active") return { label: "ACTIVE", color: "#10b981", key: "active" };
  if (st === "completed") return { label: "COMPLETED", color: "#4274B9", key: "completed" };
  if (st === "cancelled") return { label: "CANCELLED", color: "#8494A7", key: "cancelled" };
  return { label: "DRAFT", color: "#8494A7", key: "draft" };
}

export function matchesEventListFilter(
  evt: BattleEvent,
  filter: EventListFilter,
  battles: Battle[] = [],
): boolean {
  const derived = deriveEventDisplayStatus(evt, battles);
  if (filter === "all") return true;
  if (filter === "archived") return !!evt.archivedAt;
  if (filter === "drafts") return !evt.archivedAt && derived.key === "draft";
  // active = not archived and not pure draft
  return !evt.archivedAt && derived.key !== "draft";
}

export function formatLabel(format?: EventCompetitionFormat): string {
  if (format === "field") return "FIELD";
  if (format === "tournament") return "TOURNAMENT";
  return "1v1 DUALS";
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
}

/**
 * Date fans should see for the live event.
 * A voting window (open and close both set) must not stand in for the show.
 * Older organization drafts stored the live date in startDate and left voting blank.
 */
export function liveEventWhen(event?: { eventDate?: string; startDate?: string; endDate?: string } | null): string {
  if (!event) return "";
  if (event.eventDate) return event.eventDate;
  if (event.startDate && !event.endDate) return event.startDate;
  return "";
}

/** Blank when close is at least 1 hour before the live start, or either value is empty. */
export function voteCloseWarning(closesLocal: string, eventLocal: string): string {
  if (!closesLocal || !eventLocal) return "";
  const close = new Date(closesLocal).getTime();
  const show = new Date(eventLocal).getTime();
  if (!Number.isFinite(close) || !Number.isFinite(show)) return "";
  const hour = 60 * 60 * 1000;
  if (close > show) {
    return "Vote close is after the live start. Set it at least 1 hour before the event.";
  }
  if (close > show - hour) {
    return "Vote close is inside the last hour before the show. Leave at least 1 hour so the result is locked when the stream starts.";
  }
  return "";
}
