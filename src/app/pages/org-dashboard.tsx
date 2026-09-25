/**
 * Approved-organization dashboard.
 * Drafts stay private until a commander signs them into the Event Console
 * or onto the public calendar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import type { Athlete } from "../lib/types";
import {
  ORG_DISCIPLINES,
  ORG_FORMATS,
  eventCanonical,
  orgDisciplineLabel,
  orgFormatLabel,
  signCanonical,
  type OrgEventFormat,
} from "../lib/org-sign";
import { toast } from "sonner";

const blank = {
  draftId: "",
  name: "",
  eventDate: "",
  location: "",
  livestream: "",
  registrationUrl: "",
  website: "",
  discipline: "freestyle",
  format: "pvp" as OrgEventFormat,
  note: "",
  athleteIds: [] as string[],
};

export function OrgDashboardPage() {
  const { connected, connect, accountId, signMessage, walletSessionToken, isConnecting } = useWallet();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [form, setForm] = useState(blank);
  const [athleteQuery, setAthleteQuery] = useState("");
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

  const roster = useMemo(() => {
    const q = athleteQuery.trim().toLowerCase();
    return athletes.filter((a) => !q || a.name.toLowerCase().includes(q)).slice(0, 40);
  }, [athletes, athleteQuery]);

  async function saveDraft(action: "create" | "update") {
    if (!accountId || !walletSessionToken) return;
    const canonical = eventCanonical({ ...form, action, draftId: action === "create" ? "" : form.draftId });
    setBusy(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-ORG-EVENT-DRAFT-v1", accountId, canonical);
      if (!signed) {
        toast.error("Wallet signature is required");
        return;
      }
      const res = await api.saveOrganizationEvent(
        { wallet: accountId, ...form, draftId: action === "create" ? "" : form.draftId, ...signed },
        walletSessionToken,
      );
      if (!res.success) {
        toast.error(res.error || "Could not save");
        return;
      }
      toast.success("Draft saved");
      setForm(blank);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function submitDraft(draft: any) {
    if (!accountId || !walletSessionToken) return;
    const canonical = eventCanonical({
      action: "submit",
      draftId: draft.id,
      name: draft.name,
      eventDate: draft.eventDate || "",
      location: draft.location || "",
      livestream: draft.livestream || "",
      registrationUrl: draft.registrationUrl || "",
      website: draft.website || "",
      discipline: draft.discipline,
      format: draft.format,
      note: draft.note || "",
      athleteIds: draft.athleteIds || [],
    });
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
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <button type="button" onClick={() => connect()} disabled={isConnecting} className="px-5 py-2.5 rounded-xl bg-[#4274B9] text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
          Connect Wallet
        </button>
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
          <p className="text-[#E8ECF0] mb-3">The dashboard opens after WCO approves this wallet’s organization.</p>
          <Link to="/events/account" className="text-[#6AA3E0] text-sm">View application status</Link>
        </div>
      </div>
    );
  }

  const org = data.org;
  const drafts = data.drafts || [];
  const boards = data.boards || [];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
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
          <input className={inputCls} placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          <input className={inputCls} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className={inputCls} placeholder="Livestream https://" value={form.livestream} onChange={(e) => setForm({ ...form, livestream: e.target.value })} />
          <input className={inputCls} placeholder="Registration link https://" value={form.registrationUrl} onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })} />
          <input className={inputCls} placeholder="Website https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })}>
              {ORG_DISCIPLINES.map((id) => <option key={id} value={id}>{orgDisciplineLabel(id)}</option>)}
            </select>
            <select className={inputCls} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as OrgEventFormat })}>
              {ORG_FORMATS.map((id) => <option key={id} value={id}>{orgFormatLabel(id)}</option>)}
            </select>
          </div>
          <textarea className={inputCls} rows={3} placeholder="Note to WCO" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div>
            <p className="text-xs text-[#8494A7] mb-1">
              Athletes from the WCO roster ({form.athleteIds.length} selected).
              {form.format === "pvp" ? " Duals need an even count from 2 to 32." : " Tournament and Field need 3 to 12."}
            </p>
            <input className={inputCls} placeholder="Search athletes" value={athleteQuery} onChange={(e) => setAthleteQuery(e.target.value)} />
            <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
              {roster.map((a) => {
                const on = form.athleteIds.includes(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-[#E8ECF0]">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setForm({
                          ...form,
                          athleteIds: on ? form.athleteIds.filter((id) => id !== a.id) : [...form.athleteIds, a.id],
                        });
                      }}
                    />
                    {a.name}
                  </label>
                );
              })}
            </div>
            <Link to={`/apply?orgId=${encodeURIComponent(org.id)}`} className="inline-block mt-2 text-xs text-[#6AA3E0]">
              Add an athlete with a Pro Card application
            </Link>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => saveDraft(form.draftId ? "update" : "create")}
            className="px-4 py-2 rounded-xl bg-[#4274B9] text-white text-sm disabled:opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {busy ? "Waiting for wallet…" : "Sign and save draft"}
          </button>
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
                    <p className="text-xs text-[#8494A7]">{orgFormatLabel(draft.format)} · {draft.status}</p>
                  </div>
                  {(draft.status === "draft" || draft.status === "rejected") && (
                    <button type="button" className="text-xs text-[#6AA3E0]" onClick={() => setForm({
                      draftId: draft.id,
                      name: draft.name || "",
                      eventDate: draft.eventDate || "",
                      location: draft.location || "",
                      livestream: draft.livestream || "",
                      registrationUrl: draft.registrationUrl || "",
                      website: draft.website || "",
                      discipline: draft.discipline || "freestyle",
                      format: draft.format || "pvp",
                      note: draft.note || "",
                      athleteIds: draft.athleteIds || [],
                    })}>
                      Edit
                    </button>
                  )}
                </div>
                {draft.decisionNote && <p className="text-sm text-[#C5D0DC] mt-2 whitespace-pre-wrap">{draft.decisionNote}</p>}
                {(draft.status === "draft" || draft.status === "rejected") && (
                  <button type="button" disabled={busy} onClick={() => submitDraft(draft)} className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#4274B9]/40 text-[#6AA3E0]">
                    Sign and submit for review
                  </button>
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

const inputCls = "w-full rounded-xl bg-[#0B1120] border border-[#4274B9]/25 px-3 py-2 text-sm text-[#E8ECF0]";
