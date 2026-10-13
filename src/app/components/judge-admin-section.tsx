/**
 * Judge applications sit under athlete applications.
 * Approve publishes the roster card and the Arena Chat badge.
 */

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, ClipboardList, Loader2, Scale, X } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { orgDisciplineLabel } from "../lib/org-sign";
import { COUNTRY_OPTIONS } from "../lib/country-flags";
import { InlineFlag } from "./country-flag";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const DISCIPLINES = ["freestyle", "statics", "freestyle_statics"];

export function JudgeAdminSection({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [applications, setApplications] = useState<any[]>([]);
  const [judges, setJudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState("");
  const [edit, setEdit] = useState({
    name: "",
    fullName: "",
    country: "",
    discipline: "",
    bio: "",
    email: "",
    phone: "",
    instagram: "",
    youtube: "",
    website: "",
    showPhoto: true,
    showCountry: true,
    showBio: true,
    showLinks: true,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

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

  const closeEdit = () => {
    setEditId("");
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const saveEdit = async (id: string) => {
    if (edit.name.trim().length < 2 || edit.fullName.trim().length < 2 || !edit.country || !edit.discipline) {
      toast.error("Display name, legal name, country, and discipline are required");
      return;
    }
    if (edit.bio.trim().length < 20) {
      toast.error("Judging experience must be at least 20 characters");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email.trim())) {
      toast.error("A valid email is required");
      return;
    }
    if (photoFile && (photoFile.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(photoFile.type))) {
      toast.error("Photo must be a PNG, JPEG, or WEBP under 5 MB");
      return;
    }
    setBusy(id);
    const res = await api.admin.updateJudge(id, edit, wallet, sessionToken);
    if (!res.success) {
      toast.error(res.error || "Update failed");
      setBusy("");
      return;
    }
    if (photoFile) {
      const uploaded = await api.admin.uploadJudgePhoto(id, photoFile, wallet, sessionToken);
      if (!uploaded.success) {
        toast.error(uploaded.error || "The text was saved, but the photo did not update");
        setBusy("");
        await load();
        return;
      }
    }
    toast.success("Judge updated");
    closeEdit();
    await load();
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

  const openEdit = (judge: any) => {
    const flags = judge.publicFields || {};
    setPhotoFile(null);
    setPhotoPreview(judge.photoSignedUrl || "");
    setEditId(judge.id);
    setEdit({
      name: judge.name || "",
      fullName: judge.fullName || "",
      country: judge.country || "",
      discipline: judge.discipline || "",
      bio: judge.bio || "",
      email: judge.email || "",
      phone: judge.phone || "",
      instagram: judge.instagram || "",
      youtube: judge.youtube || "",
      website: judge.website || "",
      showPhoto: flags.photo !== false,
      showCountry: flags.country !== false,
      showBio: flags.bio !== false,
      showLinks: flags.links !== false,
    });
  };

  const editing = approved.find((judge) => judge.id === editId) || null;
  const countryOptions = edit.country && !COUNTRY_OPTIONS.includes(edit.country)
    ? [edit.country, ...COUNTRY_OPTIONS]
    : COUNTRY_OPTIONS;
  const fieldClass = "w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50";

  return (
    <div className="mt-6 pt-4 border-t border-[#4274B9]/10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
            JUDGE MANAGEMENT
          </h3>
          <p className="text-[#8494A7] text-xs">{approved.length} judges on Meet the Judges</p>
        </div>
      </div>

      {loading ? (
        <p className="text-[#8494A7] text-xs flex items-center gap-2 mb-4"><Loader2 className="w-3 h-3 animate-spin" /> Loading judges...</p>
      ) : approved.length === 0 ? (
        <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10 mb-4">
          <Scale className="w-8 h-8 text-[#4274B9]/30 mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm">No approved judges yet.</p>
          <p className="text-[#8494A7] text-xs">Approve an application below to add a judge.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {approved.map((judge) => (
            <div key={judge.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B1120] border border-[#4274B9]/10 hover:border-[#4274B9]/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                {judge.photoSignedUrl ? (
                  <img src={judge.photoSignedUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-[#162033] border border-[#4274B9]/20 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#162033] border border-[#4274B9]/20 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[#E8ECF0] text-sm font-semibold truncate">{judge.name}</p>
                  <p className="text-[#8494A7] text-[0.6rem] truncate">
                    {judge.country || "Country hidden"} · {orgDisciplineLabel(judge.discipline)}
                  </p>
                  <p className="text-[#6AA3E0] text-[0.55rem] font-mono truncate mt-0.5">{judge.wallet}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded text-[0.55rem] bg-[#E8ECF0]/10 text-[#E8ECF0]">JUDGE</span>
                <button type="button" onClick={() => openEdit(judge)} className="px-2 py-1 text-[0.55rem] rounded bg-[#4274B9]/10 text-[#6AA3E0] hover:bg-[#4274B9]/20 transition-all">
                  EDIT
                </button>
                <button type="button" disabled={busy === judge.id} onClick={() => revoke(judge.id, judge.name)} className="px-2 py-1 text-[0.55rem] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                  REVOKE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="bg-[#0B1120] rounded-xl border border-[#D4A843]/20 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#D4A843]/10 bg-[#D4A843]/5">
            <h4 className="text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
              EDIT JUDGE
            </h4>
            <button type="button" onClick={closeEdit} className="text-[#8494A7] hover:text-[#E8ECF0]" aria-label="Close judge editor">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-5">
            <div>
              <p className="text-[0.6rem] text-[#6AA3E0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>BASIC INFO</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Display Name *</span>
                  <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={fieldClass} />
                </label>
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Legal Name *</span>
                  <input value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} className={fieldClass} />
                </label>
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Country *</span>
                  <div className="flex items-center gap-2">
                    {edit.country ? (
                      <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#162033] border border-[#4274B9]/20">
                        <InlineFlag country={edit.country} />
                      </span>
                    ) : null}
                    <select value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })} className={fieldClass}>
                      <option value="">Select country...</option>
                      {countryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                </label>
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Discipline *</span>
                  <select value={edit.discipline} onChange={(e) => setEdit({ ...edit, discipline: e.target.value })} className={fieldClass}>
                    <option value="">Select discipline...</option>
                    {DISCIPLINES.map((id) => <option key={id} value={id}>{orgDisciplineLabel(id)}</option>)}
                  </select>
                </label>
              </div>
              <label className="block mt-3">
                <span className="text-[#8494A7] text-[0.6rem] block mb-1">Judging experience *</span>
                <textarea value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} rows={4} className={`${fieldClass} resize-none`} />
              </label>
            </div>

            <div>
              <p className="text-[0.6rem] text-[#6AA3E0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>PHOTO</p>
              <p className="text-[#8494A7] text-[0.55rem] mb-2">Fans see this whole photo. It is not cropped.</p>
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full max-h-80 object-contain bg-[#162033] rounded-lg border border-[#4274B9]/20" />
              ) : (
                <div className="h-24 rounded-lg border border-dashed border-[#4274B9]/30" />
              )}
              <label className="mt-2 inline-flex items-center gap-2 text-[0.6rem] text-[#6AA3E0] cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="text-[0.6rem] text-[#8494A7]"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPhotoFile(file);
                    setPhotoPreview(file ? URL.createObjectURL(file) : (editing.photoSignedUrl || ""));
                  }}
                />
              </label>
              <label className="mt-2 flex items-center gap-2 text-[0.6rem] text-[#C5D0DC]">
                <input type="checkbox" checked={edit.showPhoto} onChange={(e) => setEdit({ ...edit, showPhoto: e.target.checked })} />
                Show photo on Meet the Judges
              </label>
            </div>

            <div>
              <p className="text-[0.6rem] text-[#6AA3E0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>SHOWN ON MEET THE JUDGES</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <label className="flex items-center gap-2 text-[0.6rem] text-[#C5D0DC]">
                  <input type="checkbox" checked={edit.showCountry} onChange={(e) => setEdit({ ...edit, showCountry: e.target.checked })} />
                  Show country
                </label>
                <label className="flex items-center gap-2 text-[0.6rem] text-[#C5D0DC]">
                  <input type="checkbox" checked={edit.showBio} onChange={(e) => setEdit({ ...edit, showBio: e.target.checked })} />
                  Show experience
                </label>
                <label className="flex items-center gap-2 text-[0.6rem] text-[#C5D0DC]">
                  <input type="checkbox" checked={edit.showLinks} onChange={(e) => setEdit({ ...edit, showLinks: e.target.checked })} />
                  Show links
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Instagram</span>
                  <input value={edit.instagram} onChange={(e) => setEdit({ ...edit, instagram: e.target.value })} className={fieldClass} placeholder="@handle or https://" />
                </label>
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">YouTube</span>
                  <input value={edit.youtube} onChange={(e) => setEdit({ ...edit, youtube: e.target.value })} className={fieldClass} placeholder="@handle or https://" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Website</span>
                  <input value={edit.website} onChange={(e) => setEdit({ ...edit, website: e.target.value })} className={fieldClass} placeholder="https://" />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-[#D4A843]/25 p-3 space-y-3">
              <p className="text-[0.6rem] text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>CONTACT INFORMATION (admin-only)</p>
              <p className="text-[#8494A7]/70 text-[0.55rem]">Legal name, email, and phone stay off Meet the Judges. The wallet owns the Judge badge and is not edited here.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Email *</span>
                  <input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className={fieldClass} />
                </label>
                <label className="block">
                  <span className="text-[#8494A7] text-[0.6rem] block mb-1">Phone</span>
                  <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className={fieldClass} />
                </label>
              </div>
              <p className="text-[0.6rem] text-[#8494A7] font-mono break-all">{editing.wallet}</p>
            </div>

            <div className="flex gap-2">
              <button type="button" disabled={busy === editing.id} onClick={() => saveEdit(editing.id)} className="px-3 py-2 rounded-lg bg-[#D4A843]/15 border border-[#D4A843]/30 text-[#D4A843] text-[0.6rem] disabled:opacity-50" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {busy === editing.id ? "SAVING..." : "SAVE JUDGE"}
              </button>
              <button type="button" onClick={closeEdit} className="px-3 py-2 rounded-lg bg-[#162033] text-[#8494A7] text-[0.6rem]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

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
      </div>
    </div>
  );
}
