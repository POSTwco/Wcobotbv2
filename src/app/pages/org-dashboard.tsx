/**
 * Approved-organization dashboard.
 * Drafts stay private until a commander signs them into the Event Console
 * or onto the public calendar.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import type { Athlete } from "../lib/types";
import {
  eventCanonical,
  orgDisciplineLabel,
  orgFormatLabel,
  signCanonical,
} from "../lib/org-sign";
import { OrgEventBuilder, blankOrgEvent, orgEventFromRecord, type OrgEventDraft } from "../components/org-event-builder";
import { toast } from "sonner";

export function OrgDashboardPage() {
  const { connected, connect, accountId, signMessage, walletSessionToken, isConnecting } = useWallet();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [form, setForm] = useState(blankOrgEvent);
  const [builderKey, setBuilderKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!accountId || !walletSessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [dash, roster, notes] = await Promise.all([
      api.getOrganizationDashboard(accountId, walletSessionToken),
      api.getAthletes(),
      api.getNotifications(accountId, walletSessionToken),
    ]);
    setLoading(false);
    if (dash.success) setData(dash.data);
    else setData({ error: dash.error, code: dash.code });
    if (roster.success && roster.data) setAthletes(roster.data);
    if (notes.success && notes.data) {
      setNotices(
        notes.data.filter((n: any) =>
          ["org_approved", "org_rejected", "org_event_approved", "org_event_rejected"].includes(n.type),
        ),
      );
    }
  }, [accountId, walletSessionToken]);

  useEffect(() => {
    load();
  }, [load]);

  function signedEvent(draft: OrgEventDraft, action: "create" | "update" | "submit") {
    return eventCanonical({
      action,
      draftId: action === "create" ? "" : draft.draftId,
      name: draft.name,
      eventDate: draft.eventDate,
      endDate: draft.endDate,
      location: draft.location,
      livestream: draft.livestream,
      registrationUrl: draft.registrationUrl,
      website: draft.website,
      discipline: draft.discipline,
      format: draft.format,
      note: draft.note,
      description: draft.description,
      prizePool: draft.prizePool,
      elimination: draft.format === "tournament" ? "single" : "none",
      performanceRounds: draft.performanceRounds,
      athleteIds: draft.athleteIds,
    });
  }

  async function saveDraft(payload: OrgEventDraft, reset = true): Promise<string> {
    if (!accountId || !walletSessionToken) return "";
    const action = payload.draftId ? "update" : "create";
    setBusy(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-ORG-EVENT-DRAFT-v1", accountId, signedEvent(payload, action));
      if (!signed) {
        toast.error("Wallet signature is required");
        return "";
      }
      const res = await api.saveOrganizationEvent(
        { wallet: accountId, ...payload, draftId: action === "create" ? "" : payload.draftId, ...signed },
        walletSessionToken,
      );
      if (!res.success || !res.data) {
        toast.error(res.error || "Could not save");
        return "";
      }
      if (reset) {
        toast.success("Draft saved");
        setForm(blankOrgEvent());
        setBuilderKey((n) => n + 1);
        await load();
      }
      return res.data.id;
    } finally {
      setBusy(false);
    }
  }

  async function submitDraft(draft: any) {
    if (!accountId || !walletSessionToken) return;
    const canonical = signedEvent(orgEventFromRecord(draft), "submit");
    setBusy(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-ORG-EVENT-v1", accountId, canonical);
      if (!signed) {
        toast.error("Wallet signature is required");
        return;
      }
      const res = await api.submitOrganizationEvent(draft.id, { wallet: accountId, ...signed }, walletSessionToken);
      if (!res.success) {
        toast.error(res.error || "Could not submit");
        return;
      }
      toast.success("Sent to WCO for approval");
      setForm(blankOrgEvent());
      setBuilderKey((n) => n + 1);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function submitBuilt(payload: OrgEventDraft) {
    const id = await saveDraft(payload, false);
    if (!id) return;
    setForm({ ...payload, draftId: id });
    setBuilderKey((n) => n + 1);
    toast.message("Draft saved. Sign once more to send it to WCO.");
    await submitDraft({ ...payload, id });
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl text-[#E8ECF0] mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>Organization dashboard</h1>
          <p className="text-sm text-[#8494A7] mb-6">Connect the wallet that owns the organization. Drafts stay private until WCO approves them.</p>
          <button type="button" onClick={() => connect()} disabled={isConnecting} className="px-5 py-3 rounded-xl bg-[#4274B9] text-white text-sm font-semibold disabled:opacity-50" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#6AA3E0]" /></div>;
  }

  if (!data?.org || data.org.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl text-[#E8ECF0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>Approval comes first</h1>
          <p className="text-sm text-[#8494A7] mb-4">The dashboard opens after WCO approves this wallet’s organization. You can check the application, or submit one, from the sign-in page.</p>
          <Link to="/events/account" className="inline-flex px-4 py-2 rounded-xl bg-[#4274B9] text-white text-sm">View application status</Link>
        </div>
      </div>
    );
  }

  const org = data.org;
  const drafts = data.drafts || [];
  const boards = data.boards || [];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-xs text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>ORGANIZATION DASHBOARD</p>
          <h1 className="text-2xl text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{org.name}</h1>
          <p className="text-sm text-[#8494A7] mt-1">{orgDisciplineLabel(org.discipline)} · {org.country}</p>
        </header>

        {notices.length > 0 && (
          <section className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4 space-y-3">
            <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>WCO REPORTS</h2>
            {notices.slice(0, 6).map((n) => (
              <article key={n.id} className="text-sm">
                <p className="text-[#E8ECF0] font-semibold">{n.title}</p>
                <p className="text-[#C5D0DC] whitespace-pre-wrap mt-1">{n.message}</p>
              </article>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4 space-y-3">
          <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {form.draftId ? "EDIT DRAFT" : "NEW EVENT"}
          </h2>
          <p className="text-xs text-[#8494A7]">Build the card the way the Event Console does. A partial board stays a private draft. A finished board is an approval request. WCO decides whether it becomes an Only Gains draft or a calendar listing.</p>
          <OrgEventBuilder
            key={builderKey}
            initial={form}
            athletes={athletes}
            orgId={org.id}
            busy={busy}
            onSave={(payload) => { void saveDraft(payload); }}
            onSubmit={(payload) => { void submitBuilt(payload); }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>YOUR EVENTS</h2>
          {drafts.length === 0 && <p className="text-sm text-[#8494A7]">No drafts yet.</p>}
          {drafts.map((draft: any) => {
            const board = boards.find((b: any) => b.draftId === draft.id);
            return (
              <article key={draft.id} className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[#E8ECF0] font-semibold">{draft.name}</p>
                    <p className="text-xs text-[#8494A7]">{orgFormatLabel(draft.format)} · {draftStatusLabel(draft)}</p>
                  </div>
                  {(draft.status === "draft" || draft.status === "rejected") && (
                    <button type="button" className="text-xs text-[#6AA3E0]" onClick={() => {
                      setForm(orgEventFromRecord(draft));
                      setBuilderKey((n) => n + 1);
                    }}>
                      Edit
                    </button>
                  )}
                </div>
                {draft.decisionNote && <p className="text-sm text-[#C5D0DC] mt-2 whitespace-pre-wrap">{draft.decisionNote}</p>}
                {(draft.status === "draft" || draft.status === "rejected") && boardReady(draft) && (
                  <>
                    <p className="text-xs text-[#8494A7] mt-3">Every seat is filled. A commander signs this before it is public.</p>
                    <button type="button" disabled={busy} onClick={() => submitDraft(draft)} className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-[#4274B9]/40 text-[#6AA3E0]">
                      Sign and submit for review
                    </button>
                  </>
                )}
                {draft.gamified && draft.battleEventId && board && (
                  <div className="mt-3 text-sm text-[#C5D0DC] space-y-1">
                    <p>Status: {board.votingStatus || board.status}</p>
                    {board.leader && <p>Leader: {board.leader}</p>}
                    {board.battles?.map((b: any) => (
                      <p key={b.id}>{b.title} — {b.votes1Count} / {b.votes2Count} {b.leader ? `· ${b.leader}` : ""}</p>
                    ))}
                    {board.pool?.slice(0, 5).map((p: any) => (
                      <p key={p.athleteId}>{p.name} — {p.count} picks</p>
                    ))}
                  </div>
                )}
                {draft.status === "approved" && !draft.gamified && (
                  <p className="text-sm text-[#8494A7] mt-2">Listed on your organization card.</p>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function boardReady(draft: { format?: string; athleteIds?: string[] }): boolean {
  const count = draft.athleteIds?.length || 0;
  if (draft.format === "pvp") return count >= 2 && count <= 32 && count % 2 === 0;
  return count >= 3 && count <= 12;
}

function draftStatusLabel(draft: { status?: string; gamified?: boolean }): string {
  if (draft.status === "submitted") return "In review";
  if (draft.status === "approved" && draft.gamified) return "In the Event Console";
  if (draft.status === "approved") return "Listed on your card";
  if (draft.status === "rejected") return "Needs changes";
  return "Draft";
}
