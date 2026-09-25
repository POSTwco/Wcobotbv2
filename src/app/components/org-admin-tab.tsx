/**
 * Commander queue for organization applications, profile edits, and events.
 * Approve and reject each require a fresh wallet signature on top of the admin session.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useWallet } from "./wallet-context";
import {
  applyCanonical,
  decisionCanonical,
  eventCanonical,
  normalizeApply,
  orgDisciplineLabel,
  orgFormatLabel,
  signCanonical,
} from "../lib/org-sign";

type Queue = "applications" | "edits" | "events" | "orgs";

export function OrgAdminTab({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const { signMessage, walletSessionToken, accountId } = useWallet();
  const [queue, setQueue] = useState<Queue>("applications");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState("");
  const [gamified, setGamified] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.admin.getOrgQueue(wallet, sessionToken);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Could not load organizations");
      return;
    }
    setData(res.data);
  }, [wallet, sessionToken]);

  useEffect(() => {
    load();
  }, [load]);

  function select(item: any) {
    setSelected(item);
    setNote("");
    setGamified(false);
  }

  async function saveApplicationEdits() {
    if (!selected || queue !== "applications") return;
    setBusy(true);
    const res = await api.admin.saveOrgApplication(selected.id, selected, wallet, sessionToken);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error || "Save failed");
      return;
    }
    toast.success("Edits saved on the application");
    setSelected(res.data);
    await load();
  }

  async function decideOrg(decision: "approved" | "rejected") {
    if (!selected || !accountId || !walletSessionToken) {
      toast.error("Reconnect the commander wallet so the signature can be checked");
      return;
    }
    const fields = normalizeApply(selected);
    const canonical = decisionCanonical(decision, note, applyCanonical(fields));
    setBusy(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-APPROVE-ORG-v1", accountId, canonical);
      if (!signed) {
        toast.error("Signature cancelled");
        return;
      }
      const res = queue === "edits"
        ? await api.admin.decideOrgEdit(selected.orgId, { decision, note, fields, ...signed }, wallet, sessionToken, walletSessionToken)
        : await api.admin.decideOrgApplication(selected.id, { decision, note, fields, ...signed }, wallet, sessionToken, walletSessionToken);
      if (!res.success) {
        toast.error(res.error || "Decision failed");
        return;
      }
      toast.success(decision === "approved" ? "Approved. Report sent to their wallet." : "Not accepted. Report sent.");
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function decideEvent(decision: "approved" | "rejected") {
    if (!selected || !accountId || !walletSessionToken) {
      toast.error("Reconnect the commander wallet so the signature can be checked");
      return;
    }
    const fields = {
      name: selected.name || "",
      eventDate: selected.eventDate || "",
      location: selected.location || "",
      livestream: selected.livestream || "",
      registrationUrl: selected.registrationUrl || "",
      website: selected.website || "",
      discipline: selected.discipline,
      format: selected.format,
      note: selected.note || "",
      athleteIds: selected.athleteIds || [],
      draftId: selected.id,
      action: "submit" as const,
    };
    const canonical = decisionCanonical(
      `${decision}|gamified=${gamified ? "1" : "0"}`,
      note,
      eventCanonical(fields),
    );
    setBusy(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-APPROVE-ORG-EVENT-v1", accountId, canonical);
      if (!signed) {
        toast.error("Signature cancelled");
        return;
      }
      const res = await api.admin.decideOrgEvent(
        selected.id,
        { decision, note, gamified, fields, ...signed },
        wallet,
        sessionToken,
        walletSessionToken,
      );
      if (!res.success) {
        toast.error(res.error || "Decision failed");
        return;
      }
      toast.success(gamified && decision === "approved"
        ? "Draft created in the Event Console. Publish it there when you are ready."
        : "Decision saved. Report sent.");
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(decision: "suspended" | "approved") {
    if (!selected || !accountId || !walletSessionToken) return;
    const canonical = decisionCanonical(decision, note, `id=${selected.id}`);
    setBusy(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-APPROVE-ORG-v1", accountId, canonical);
      if (!signed) return;
      const res = await api.admin.setOrgStatus(
        selected.id,
        { decision, note, ...signed },
        wallet,
        sessionToken,
        walletSessionToken,
      );
      if (!res.success) {
        toast.error(res.error || "Update failed");
        return;
      }
      toast.success("Organization updated");
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const applications = (data?.applications || []).filter((a: any) => a.status === "pending");
  const edits = data?.edits || [];
  const events = (data?.drafts || []).filter((d: any) => d.status === "submitted");
  const orgs = (data?.orgs || []).filter((o: any) => o.id !== "org-wco");
  const rows = queue === "applications" ? applications : queue === "edits" ? edits : queue === "events" ? events : orgs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <QueueButton current={queue} id="applications" label={`Pending orgs (${applications.length})`} onClick={setQueue} />
        <QueueButton current={queue} id="edits" label={`Profile edits (${edits.length})`} onClick={setQueue} />
        <QueueButton current={queue} id="events" label={`Submitted events (${events.length})`} onClick={setQueue} />
        <QueueButton current={queue} id="orgs" label={`Approved orgs (${orgs.length})`} onClick={setQueue} />
      </div>
      {loading && <Loader2 className="w-5 h-5 animate-spin text-[#D4A843]" />}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {rows.length === 0 && <p className="text-sm text-[#8494A7]">Nothing in this queue.</p>}
          {rows.map((row: any) => (
            <button
              key={row.id || row.orgId}
              type="button"
              onClick={() => select(row)}
              className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${
                selected?.id === row.id ? "border-[#D4A843] text-[#E8ECF0]" : "border-[#D4A843]/20 text-[#8494A7]"
              }`}
            >
              <span className="block text-[#E8ECF0]">{row.name || row.orgId}</span>
              <span className="text-[0.65rem]">{row.status || "pending"} · {row.wallet || ""}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-2xl border border-[#D4A843]/20 p-4 space-y-3">
            {(queue === "applications" || queue === "edits") && (
              <>
                <AdminField label="Name" value={selected.name || ""} onChange={(v) => setSelected({ ...selected, name: v })} />
                <AdminField label="Country" value={selected.country || ""} onChange={(v) => setSelected({ ...selected, country: v })} />
                <AdminField label="Email" value={selected.email || ""} onChange={(v) => setSelected({ ...selected, email: v })} />
                <AdminField label="Discipline" value={selected.discipline || ""} onChange={(v) => setSelected({ ...selected, discipline: v })} />
                <AdminField label="Bio" value={selected.bio || ""} onChange={(v) => setSelected({ ...selected, bio: v })} multiline />
                <AdminField label="Instagram" value={selected.instagram || ""} onChange={(v) => setSelected({ ...selected, instagram: v })} />
                <AdminField label="YouTube" value={selected.youtube || ""} onChange={(v) => setSelected({ ...selected, youtube: v })} />
                <AdminField label="Website" value={selected.website || ""} onChange={(v) => setSelected({ ...selected, website: v })} />
                <p className="text-xs text-[#8494A7]">Discipline label: {orgDisciplineLabel(selected.discipline)}</p>
              </>
            )}
            {queue === "events" && (
              <>
                <AdminField label="Name" value={selected.name || ""} onChange={(v) => setSelected({ ...selected, name: v })} />
                <AdminField label="Date" value={selected.eventDate || ""} onChange={(v) => setSelected({ ...selected, eventDate: v })} />
                <AdminField label="Location" value={selected.location || ""} onChange={(v) => setSelected({ ...selected, location: v })} />
                <AdminField label="Livestream" value={selected.livestream || ""} onChange={(v) => setSelected({ ...selected, livestream: v })} />
                <AdminField label="Registration" value={selected.registrationUrl || ""} onChange={(v) => setSelected({ ...selected, registrationUrl: v })} />
                <AdminField label="Website" value={selected.website || ""} onChange={(v) => setSelected({ ...selected, website: v })} />
                <AdminField label="Discipline" value={selected.discipline || ""} onChange={(v) => setSelected({ ...selected, discipline: v })} />
                <AdminField label="Format (pvp, tournament, field)" value={selected.format || ""} onChange={(v) => setSelected({ ...selected, format: v })} />
                <p className="text-xs text-[#8494A7]">{orgFormatLabel(selected.format)} · {(selected.athleteIds || []).length} athletes</p>
                <label className="flex items-center gap-2 text-sm text-[#E8ECF0]">
                  <input type="checkbox" checked={gamified} onChange={(e) => setGamified(e.target.checked)} />
                  Gamify — create a draft battle event. Leave off for a calendar listing only.
                </label>
              </>
            )}
            {queue === "orgs" && (
              <div className="text-sm text-[#E8ECF0]">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-[#8494A7]">{selected.status} · {selected.country}</p>
                <p className="mt-2">Email stays on this admin record: {selected.email || "—"}</p>
              </div>
            )}
            <label className="block text-xs text-[#8494A7]">
              Note included in the wallet report
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-lg bg-[#0B1120] border border-[#D4A843]/20 px-3 py-2 text-sm text-[#E8ECF0]" />
            </label>
            <div className="flex flex-wrap gap-2">
              {queue === "applications" && (
                <button type="button" disabled={busy} onClick={saveApplicationEdits} className="px-3 py-2 rounded-lg border border-[#D4A843]/40 text-xs text-[#D4A843]">
                  Save edits
                </button>
              )}
              {(queue === "applications" || queue === "edits" || queue === "events") && (
                <>
                  <button type="button" disabled={busy} onClick={() => (queue === "events" ? decideEvent("approved") : decideOrg("approved"))} className="px-3 py-2 rounded-lg bg-[#D4A843] text-[#0B1120] text-xs font-bold">
                    Sign and approve
                  </button>
                  <button type="button" disabled={busy} onClick={() => (queue === "events" ? decideEvent("rejected") : decideOrg("rejected"))} className="px-3 py-2 rounded-lg border border-red-400/50 text-xs text-red-300">
                    Sign and decline
                  </button>
                </>
              )}
              {queue === "orgs" && selected.id !== "org-wco" && (
                <>
                  <button type="button" disabled={busy} onClick={() => setStatus("suspended")} className="px-3 py-2 rounded-lg border border-red-400/50 text-xs text-red-300">
                    Sign and suspend
                  </button>
                  <button type="button" disabled={busy} onClick={() => setStatus("approved")} className="px-3 py-2 rounded-lg bg-[#D4A843] text-[#0B1120] text-xs font-bold">
                    Sign and restore
                  </button>
                </>
              )}
            </div>
            {busy && <p className="text-xs text-[#8494A7]">Waiting for the wallet signature…</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function QueueButton({
  current,
  id,
  label,
  onClick,
}: {
  current: Queue;
  id: Queue;
  label: string;
  onClick: (id: Queue) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`px-3 py-1.5 rounded-lg text-[0.65rem] border ${
        current === id ? "border-[#D4A843] text-[#D4A843]" : "border-[#D4A843]/20 text-[#8494A7]"
      }`}
      style={{ fontFamily: "Orbitron, sans-serif" }}
    >
      {label}
    </button>
  );
}

function AdminField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const cls = "mt-1 w-full rounded-lg bg-[#0B1120] border border-[#D4A843]/20 px-3 py-2 text-sm text-[#E8ECF0]";
  return (
    <label className="block text-xs text-[#8494A7]">
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}
