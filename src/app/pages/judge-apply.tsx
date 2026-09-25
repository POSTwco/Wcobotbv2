/**
 * Pro Judge Card application.
 * Wallet session required. Commanders approve it beside athlete applications.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { CheckCircle, Clock, Loader2, Scale, Shield, Zap } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "../components/error-boundary";
import { COUNTRY_OPTIONS } from "../lib/country-flags";
import { InlineFlag } from "../components/country-flag";
import { orgDisciplineLabel } from "../lib/org-sign";
import { JudgeBadge } from "../components/judge-badge";
import type { JudgeAccount } from "../lib/types";

const DISCLAIMER_VERSION = "judge-1.0.0";
const DISCIPLINES = ["freestyle", "statics", "freestyle_statics"] as const;

const EMPTY = {
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
  photoPath: "",
};

export function JudgeApplyPage() {
  const { connected, connect, accountId, isConnecting, walletSessionToken } = useWallet();
  const [form, setForm] = useState(EMPTY);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [account, setAccount] = useState<JudgeAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const setField = (key: keyof typeof EMPTY, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!connected || !accountId || !walletSessionToken) {
      setAccount(null);
      return;
    }
    let cancel = false;
    setLoadingAccount(true);
    api.getJudgeAccount(accountId, walletSessionToken).then((res) => {
      if (cancel) return;
      setAccount(res.success && res.data ? res.data : { status: "none" });
    }).catch(() => {
      if (!cancel) setAccount({ status: "none" });
    }).finally(() => {
      if (!cancel) setLoadingAccount(false);
    });
    return () => {
      cancel = true;
    };
  }, [connected, accountId, walletSessionToken]);

  const hasSocial = !!(form.instagram.trim() || form.youtube.trim() || form.website.trim());
  const canSubmit = !!(
    form.name.trim().length >= 2 &&
    form.fullName.trim().length >= 2 &&
    form.country &&
    form.discipline &&
    form.bio.trim().length >= 20 &&
    form.photoPath &&
    hasSocial &&
    disclaimerAccepted &&
    accountId &&
    walletSessionToken
  );

  const uploadPhoto = async (file: File | null) => {
    if (!file || !accountId || !walletSessionToken) {
      toast.error("Reconnect your wallet before uploading a photo");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Only PNG, JPEG, or WEBP images are allowed");
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadJudgePhoto(file, accountId, walletSessionToken);
      if (res.success && res.data?.path) {
        setField("photoPath", res.data.path);
        setPreviewUrl(URL.createObjectURL(file));
        toast.success("Photo uploaded");
      } else {
        toast.error(res.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  const submit = useCallback(async () => {
    if (!accountId || !walletSessionToken || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.submitJudgeApplication({
        wallet: accountId,
        ...form,
        disclaimerAccepted: true,
        disclaimerVersion: DISCLAIMER_VERSION,
      }, walletSessionToken);
      if (res.success && res.data) {
        setSubmittedId(res.data.id);
        toast.success("Judge application submitted");
      } else {
        toast.error(res.error || "Failed to submit application");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }, [accountId, walletSessionToken, canSubmit, form]);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
          <Scale className="w-12 h-12 text-[#E8ECF0] mx-auto mb-4" />
          <h1 className="text-2xl text-[#E8ECF0] mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
            PRO JUDGE CARD
          </h1>
          <p className="text-sm text-[#8494A7] mb-4">Connect the Hedera wallet that should wear the Judge badge in Arena Chat.</p>
          <div className="flex justify-center mb-6"><JudgeBadge /></div>
          <button
            type="button"
            onClick={connect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4274B9] text-white disabled:opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
          >
            <Zap className="w-4 h-4" />
            {isConnecting ? "CONNECTING..." : "CONNECT WALLET TO APPLY"}
          </button>
        </motion.div>
      </div>
    );
  }

  if (loadingAccount && !account && !submittedId) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#8494A7] text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking this wallet…
      </div>
    );
  }

  if (submittedId || account?.status === "pending") {
    const id = submittedId || account?.application?.id || "";
    return (
      <StatusScreen
        tone="waiting"
        title="Application in review"
        body="A WCO admin is reading your Pro Judge Card. You will get a notification when it is approved or declined. Until then you are not listed, and Arena Chat does not show a Judge badge."
        detail={id ? `Application ID: ${id}` : ""}
      />
    );
  }

  if (account?.status === "approved") {
    return (
      <StatusScreen
        tone="ready"
        title="You are a WCO judge"
        body={`${account.judge?.name || "Your card"} is on Meet the Staff. Arena Chat shows your Judge badge when you send a message.`}
        detail=""
      />
    );
  }

  const judgeChecks = [
    { ok: form.name.trim().length >= 2, label: "Display name" },
    { ok: form.fullName.trim().length >= 2, label: "Legal name" },
    { ok: !!form.country, label: "Country" },
    { ok: !!form.discipline, label: "Discipline" },
    { ok: form.bio.trim().length >= 20, label: "Experience (20 characters)" },
    { ok: !!form.photoPath, label: "Profile photo" },
    { ok: hasSocial, label: "Instagram, YouTube, or website" },
    { ok: disclaimerAccepted, label: "Disclaimer" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <ol className="grid grid-cols-3 gap-2 mb-6">
        {["Connect wallet", "Registration", "Submitted"].map((step, i) => (
          <li key={step} className={`rounded-lg border px-2 py-2 ${i === 1 ? "border-[#6AA3E0]/50 bg-[#4274B9]/10" : "border-[#4274B9]/15"}`}>
            <span className="block text-[0.6rem] text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{i + 1}</span>
            <span className="block text-[0.65rem] text-[#E8ECF0]">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mb-6">
        <p className="text-[0.65rem] tracking-wide text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>OFFICIAL PRO CALISTHENICS JUDGE CARD</p>
        <h1 className="text-2xl text-[#E8ECF0] mt-2" style={{ fontFamily: "Orbitron, sans-serif" }}>Judge registration</h1>
        <p className="text-sm text-[#8494A7] mt-2">WCO admins approve the card before your name is public. The wallet confirms the form. It does not send HBAR.</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-[#8494A7]">
          <span>Arena Chat badge after approval</span>
          <JudgeBadge />
        </div>
      </div>

      {loadingAccount && (
        <p className="text-xs text-[#8494A7] mb-4 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Checking this wallet…</p>
      )}
      {account?.status === "revoked" && (
        <p className="text-xs text-amber-300 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          A previous Pro Judge Card on this wallet was removed. You can apply again.
        </p>
      )}

      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
          <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>IDENTITY</h2>
          <p className="text-xs text-[#8494A7]">Fans see the display name, country, discipline, and photo on Meet the Staff.</p>
          <label className="block text-[0.65rem] text-[#8494A7]">
            Display name
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} maxLength={100} className={fieldClass} placeholder="Name fans should see" />
          </label>
          <label className="block text-[0.65rem] text-[#8494A7]">
            Country
            <span className="mt-1 flex items-center gap-2">
              {form.country ? <InlineFlag country={form.country} /> : null}
              <select value={form.country} onChange={(e) => setField("country", e.target.value)} className={fieldClass}>
                <option value="">Select country...</option>
                {COUNTRY_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </span>
          </label>
          <label className="block text-[0.65rem] text-[#8494A7]">
            Discipline
            <select value={form.discipline} onChange={(e) => setField("discipline", e.target.value)} className={fieldClass}>
              <option value="">Select discipline...</option>
              {DISCIPLINES.map((id) => <option key={id} value={id}>{orgDisciplineLabel(id)}</option>)}
            </select>
            <span className="block mt-1 text-[0.55rem] text-[#8494A7]/80">FreeStyle, Statics, or Both.</span>
          </label>
          <div>
            <p className="text-[0.65rem] text-[#8494A7] mb-1">Profile photo</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => uploadPhoto(e.target.files?.[0] || null)} />
              <span className="px-3 py-2 rounded-lg border border-dashed border-[#4274B9]/40 text-xs text-[#C5D0DC]">
                {uploading ? "Uploading…" : form.photoPath ? "Replace photo" : "Choose PNG, JPEG, or WEBP under 5 MB"}
              </span>
              {previewUrl ? <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#4274B9]/30" /> : null}
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
          <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>EXPERIENCE</h2>
          <label className="block text-[0.65rem] text-[#8494A7]">
            Judging experience
            <textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} maxLength={2000} rows={5} className={fieldClass} placeholder="Events you have judged, years of experience, and the styles you score." />
            <span className="block text-right text-[0.55rem]">{form.bio.trim().length}/2000 · at least 20 characters</span>
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-[#D4A843]/25 bg-[#111827] p-4">
          <h2 className="text-xs text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>PRIVATE CONTACT</h2>
          <p className="text-xs text-[#8494A7]">Admins only. Legal name, email, and phone are not published.</p>
          <label className="block text-[0.65rem] text-[#8494A7]">
            Legal name
            <input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} maxLength={150} className={fieldClass} placeholder="Name on the application" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-[0.65rem] text-[#8494A7]">Email
              <input value={form.email} onChange={(e) => setField("email", e.target.value)} className={fieldClass} placeholder="Optional" />
            </label>
            <label className="block text-[0.65rem] text-[#8494A7]">Phone
              <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={fieldClass} placeholder="Optional" />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
          <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>PUBLIC LINKS</h2>
          <p className="text-xs text-[#8494A7]">Add at least one. A handle or an https link both work. Website must be https.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.instagram} onChange={(e) => setField("instagram", e.target.value)} className={fieldClass} placeholder="Instagram" aria-label="Instagram" />
            <input value={form.youtube} onChange={(e) => setField("youtube", e.target.value)} className={fieldClass} placeholder="YouTube" aria-label="YouTube" />
            <input value={form.website} onChange={(e) => setField("website", e.target.value)} className={fieldClass} placeholder="https://website" aria-label="Website" />
          </div>
          <label className="flex items-start gap-2 text-xs text-[#C5D0DC]">
            <input type="checkbox" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} className="mt-0.5" />
            <span>
              I confirm this information is accurate. WCO reviews the card before I am listed. My email and phone stay private. WCO may decline or later remove the card. <Shield className="inline w-3 h-3" />
            </span>
          </label>
        </section>

        <div className="rounded-2xl border border-[#4274B9]/25 bg-[#0B1120] p-4">
          <p className="text-xs text-[#6AA3E0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>BEFORE YOU SUBMIT</p>
          <ul className="space-y-1 mb-4">
            {judgeChecks.map((item) => (
              <li key={item.label} className={`text-xs ${item.ok ? "text-[#10b981]" : "text-[#8494A7]"}`}>
                {item.ok ? "Ready" : "Still needed"} · {item.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4274B9] text-white text-xs font-semibold disabled:opacity-40"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
            SUBMIT PRO JUDGE CARD
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldClass = "mt-1 w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60";

function StatusScreen({ title, body, detail, tone }: { title: string; body: string; detail: string; tone: "waiting" | "ready" }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        {tone === "waiting"
          ? <Clock className="w-12 h-12 text-[#D4A843] mx-auto mb-4" />
          : <CheckCircle className="w-12 h-12 text-[#10b981] mx-auto mb-4" />}
        <h1 className="text-2xl text-[#E8ECF0] mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h1>
        <p className="text-sm text-[#8494A7] mb-4">{body}</p>
        {detail ? <p className="text-xs font-mono text-[#6AA3E0] mb-4">{detail}</p> : null}
        <div className="flex justify-center mb-5"><JudgeBadge /></div>
        <Link to="/athletes#wco-staff" className="text-xs text-[#6AA3E0] underline">Back to Meet the Staff</Link>
      </div>
    </div>
  );
}
