/**
 * Judge applications sit under athlete applications.
 * Approve publishes the roster card and the Arena Chat badge.
 */

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, ClipboardList, Loader2, Scale, X } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { orgDisciplineLabel } from "../lib/org-sign";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const DISCIPLINES = ["freestyle", "statics", "freestyle_statics"];

export function JudgeAdminSection({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [applications, setApplications] = useState<any[]>([]);
  const [judges, setJudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState("");
  const [edit, setEdit] = useState({ name: "", country: "", discipline: "", bio: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.admin.getJudgeQueue(wallet, sessionToken);
    if (res.success && res.data) {
      setApplications(res.data.applications || []);
      setJudges(res.data.judges || []);
    }
    setLoading(false);
  }, [wallet, sessionToken]);

  useEffect(() => { load(); }, [load]);

  const pending = applications.filter((row) => row.status === "pending");
  const approved = judges.filter((row) => row.status === "approved");

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    const res = action === "approve"
      ? await api.admin.approveJudgeApplication(id, wallet, sessionToken)
      : await api.admin.rejectJudgeApplication(id, wallet, sessionToken);
    if (res.success) {
      toast.success(action === "approve" ? "Judge approved" : "Application rejected and deleted");
      await load();
    } else {
      toast.error(res.error || "Action failed");
    }
    setBusy("");
  };

  const saveEdit = async (id: string) => {
    setBusy(id);
    const res = await api.admin.updateJudge(id, edit, wallet, sessionToken);
    if (res.success) {
      toast.success("Judge updated");
      setEditId("");
      await load();
    } else {
      toast.error(res.error || "Update failed");
    }
    setBusy("");
  };

  const revoke = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the judge roster and Arena Chat badge?`)) return;
    setBusy(id);
    const res = await api.admin.revokeJudge(id, wallet, sessionToken);
    if (res.success) {
      toast.success("Judge removed");
      await load();
    } else {
      toast.error(res.error || "Remove failed");
    }
    setBusy("");
  };

  const downloadPhoto = async (id: string, name: string) => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57fcb0ee/admin/judges/applications/${id}/photo`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Admin-Wallet": wallet,
            "X-Admin-Session": sessionToken,
          },
        },
      );
      if (!res.ok) {
        toast.error(`Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name || "judge").replace(/[^a-zA-Z0-9._-]/g, "_")}-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="mt-6 pt-4 border-t border-[#E8ECF0]/10">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-[#E8ECF0]" />
        <h4 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
          JUDGE APPLICATIONS
        </h4>
        {pending.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[0.55rem] font-bold">{pending.length} PENDING</span>
        )}
      </div>

      {loading ? (
        <p className="text-[#8494A7] text-xs flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading judge applications...</p>
      ) : pending.length === 0 ? (
        <div className="text-center py-6 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
          <ClipboardList className="w-6 h-6 text-[#4274B9]/20 mx-auto mb-2" />
          <p className="text-[#8494A7] text-xs">No pending judge applications.</p>
          <p className="text-[#8494A7] text-[0.6rem] mt-1">Judges apply at <span className="text-[#6AA3E0] font-mono">/judges/apply</span></p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((app) => (
            <article key={app.id} className="p-3 rounded-xl bg-[#0B1120] border border-amber-500/20">
              <div className="flex items-start gap-3">
                {app.photoSignedUrl ? (
                  <img src={app.photoSignedUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#4274B9]/20" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[#162033] border border-dashed border-[#4274B9]/20" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[0.55rem] text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>PUBLIC CARD</p>
                  <p className="text-[#E8ECF0] text-sm font-semibold">{app.name} <span className="text-[0.5rem] text-amber-400">PENDING</span></p>
                  <p className="text-[#8494A7] text-[0.6rem]">{app.country} · {orgDisciplineLabel(app.discipline)}</p>
                  <p className="text-[#8494A7] text-[0.6rem] mt-1">{app.bio}</p>
                  <p className="text-[0.55rem] text-[#8494A7] mt-1">
                    {app.instagram ? `IG ${app.instagram} ` : ""}{app.youtube ? `YT ${app.youtube} ` : ""}{app.website || ""}
                  </p>
                  <p className="text-[0.55rem] text-[#D4A843] mt-2" style={{ fontFamily: "Orbitron, sans-serif" }}>PRIVATE — ADMINS ONLY</p>
                  <p className="text-[#8494A7] text-[0.6rem]">Legal name: {app.fullName || "—"}</p>
                  <p className="text-[#8494A7] text-[0.6rem]">Wallet: <span className="font-mono text-[#6AA3E0]">{app.wallet}</span></p>
                  <p className="text-[0.55rem] text-[#8494A7] mt-1">
                    {app.email ? `Email ${app.email} ` : "No email "}{app.phone ? `· Phone ${app.phone}` : ""}
                  </p>
                  {app.photoSignedUrl && (
                    <button type="button" onClick={() => downloadPhoto(app.id, app.name)} className="mt-1 text-[0.55rem] text-[#6AA3E0]">SAVE PHOTO</button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" disabled={busy === app.id} onClick={() => decide(app.id, "approve")} className="px-2 py-1 text-[0.55rem] rounded-lg bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 disabled:opacity-50">
                    <CheckCircle className="w-3 h-3 inline" /> APPROVE
                  </button>
                  <button type="button" disabled={busy === app.id} onClick={() => decide(app.id, "reject")} className="px-2 py-1 text-[0.55rem] rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 disabled:opacity-50">
                    <X className="w-3 h-3 inline" /> REJECT
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <h4 className="mt-5 mb-2 text-[0.65rem] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>APPROVED JUDGES</h4>
      {approved.length === 0 ? (
        <p className="text-[#8494A7] text-xs">No approved judges yet.</p>
      ) : (
        <div className="space-y-2">
          {approved.map((judge) => (
            <article key={judge.id} className="p-3 rounded-xl bg-[#0B1120] border border-[#E8ECF0]/15">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#E8ECF0] font-semibold">{judge.name}</p>
                  <p className="text-[0.6rem] text-[#8494A7]">{judge.country} · {orgDisciplineLabel(judge.discipline)} · <span className="font-mono">{judge.wallet}</span></p>
                  <p className="text-[0.6rem] text-[#C5D0DC] mt-1">{judge.bio}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(judge.id);
                      setEdit({ name: judge.name || "", country: judge.country || "", discipline: judge.discipline || "", bio: judge.bio || "" });
                    }}
                    className="px-2 py-1 text-[0.55rem] rounded bg-[#4274B9]/10 text-[#6AA3E0]"
                  >
                    EDIT
                  </button>
                  <button type="button" disabled={busy === judge.id} onClick={() => revoke(judge.id, judge.name)} className="px-2 py-1 text-[0.55rem] rounded bg-red-500/10 text-red-400 disabled:opacity-50">
                    REVOKE
                  </button>
                </div>
              </div>
              {editId === judge.id && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-xs text-[#E8ECF0]" placeholder="Display name" />
                  <input value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })} className="bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-xs text-[#E8ECF0]" placeholder="Country" />
                  <select value={edit.discipline} onChange={(e) => setEdit({ ...edit, discipline: e.target.value })} className="bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-xs text-[#E8ECF0]">
                    {DISCIPLINES.map((id) => <option key={id} value={id}>{orgDisciplineLabel(id)}</option>)}
                  </select>
                  <textarea value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} rows={3} className="sm:col-span-2 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-xs text-[#E8ECF0]" />
                  <button type="button" disabled={busy === judge.id} onClick={() => saveEdit(judge.id)} className="px-2 py-1 text-[0.55rem] rounded bg-[#10b981]/10 text-[#10b981] disabled:opacity-50">SAVE</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
