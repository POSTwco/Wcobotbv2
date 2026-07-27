/**
 * Admin Site Media — hero title video control
 * ===========================================
 * Signed admin session only. URL must be public Supabase Storage on this project.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Video, RefreshCw, Loader2, Save, RotateCcw, ExternalLink, Copy, Check,
  ShieldAlert, Film,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  DEFAULT_HERO_VIDEO_URL,
  isAllowedHeroVideoUrl,
  resolveHeroVideoUrl,
} from "../lib/site-media";

interface Props {
  wallet: string;
  sessionToken: string;
}

export function SiteMediaTab({ wallet, sessionToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const effectiveUrl = resolveHeroVideoUrl(currentUrl);
  const inputValid = !urlInput.trim() || isAllowedHeroVideoUrl(urlInput);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getConfig(wallet);
      if (res.success && res.data) {
        setCurrentUrl(res.data.heroVideoUrl ?? null);
        setUpdatedAt(res.data.heroVideoUpdatedAt ?? null);
        setUpdatedBy(res.data.heroVideoUpdatedBy ?? null);
        setUrlInput(res.data.heroVideoUrl || "");
      }
    } catch {
      toast.error("Failed to load site media config");
    }
    setLoading(false);
  }, [wallet]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const url = urlInput.trim();
    if (!isAllowedHeroVideoUrl(url)) {
      toast.error("Paste a valid HTTPS Supabase Storage public URL for this project");
      return;
    }
    setSaving(true);
    try {
      const res = await api.admin.setHeroVideo(url, wallet, sessionToken);
      if (res.success && res.data) {
        setCurrentUrl(res.data.heroVideoUrl ?? url);
        setUpdatedAt(res.data.heroVideoUpdatedAt ?? null);
        setUpdatedBy(res.data.heroVideoUpdatedBy ?? null);
        toast.success("Hero video updated — live on homepage");
      } else {
        toast.error(res.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  };

  const reset = async () => {
    if (!confirm("Reset hero video to the default WCOVID.M4V?")) return;
    setResetting(true);
    try {
      const res = await api.admin.resetHeroVideo(wallet, sessionToken);
      if (res.success) {
        setCurrentUrl(null);
        setUrlInput("");
        setUpdatedAt(res.data?.heroVideoUpdatedAt ?? null);
        setUpdatedBy(res.data?.heroVideoUpdatedBy ?? null);
        toast.success("Hero video reset to default");
      } else {
        toast.error(res.error || "Reset failed");
      }
    } catch {
      toast.error("Reset failed");
    }
    setResetting(false);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const orbitron = { fontFamily: "Orbitron, sans-serif" } as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#8494A7]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading site media…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-[#6AA3E0]" />
          <div>
            <h2 className="text-sm font-bold text-white" style={orbitron}>
              SITE MEDIA
            </h2>
            <p className="text-[0.65rem] text-[#8494A7]">
              Homepage hero video — admin session only
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4274B9]/30 text-[#6AA3E0] text-xs hover:bg-[#4274B9]/10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[0.7rem] text-amber-100/90 leading-relaxed">
          Only authenticated admins can change this. URL must be{" "}
          <strong className="text-amber-50">HTTPS public Supabase Storage</strong> on this project
          (<code className="text-[0.65rem] mx-1 text-amber-200/80">…/storage/v1/object/public/…</code>
          ). Upload the file in Supabase Storage first, then paste the public object URL here.
        </p>
      </div>

      {/* Hero video card */}
      <div className="rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-[#D4A843]" />
          <h3 className="text-xs font-bold text-white tracking-wider" style={orbitron}>
            HERO TITLE VIDEO
          </h3>
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full border border-[#4274B9]/30 text-[#6AA3E0]">
            {currentUrl ? "CUSTOM" : "DEFAULT"}
          </span>
        </div>

        {/* Preview */}
        <div className="relative rounded-xl overflow-hidden border border-[#4274B9]/25 bg-black aspect-video max-w-xl">
          <video
            key={effectiveUrl}
            src={effectiveUrl}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-contain bg-black"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.6rem] text-[#8494A7] tracking-wide">ACTIVE URL</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={copyUrl}
                className="inline-flex items-center gap-1 text-[0.6rem] text-[#6AA3E0] hover:text-white"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[0.6rem] text-[#6AA3E0] hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </a>
            </div>
          </div>
          <p className="text-[0.65rem] font-mono text-[#B0BCC9] break-all bg-[#0B1120] border border-[#4274B9]/15 rounded-lg px-2.5 py-2">
            {effectiveUrl}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[0.6rem] text-[#8494A7] tracking-wide">
            NEW SUPABASE PUBLIC URL
          </label>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={DEFAULT_HERO_VIDEO_URL}
            className={`w-full px-3 py-2 rounded-lg bg-[#0B1120] border text-xs text-[#E8ECF0] font-mono ${
              inputValid ? "border-[#4274B9]/30" : "border-red-500/50"
            }`}
          />
          {!inputValid && (
            <p className="text-[0.65rem] text-red-400">
              Must be https://{`wotsoauebnoyvegcvouo.supabase.co`}/storage/v1/object/public/…
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !urlInput.trim() || !inputValid}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4274B9] text-white text-xs font-bold disabled:opacity-40"
            style={orbitron}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save video URL
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D4A843]/40 text-[#D4A843] text-xs font-bold disabled:opacity-40"
            style={orbitron}
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset to default
          </button>
        </div>

        {(updatedAt || updatedBy) && (
          <p className="text-[0.6rem] text-[#8494A7]">
            Last change: {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
            {updatedBy ? ` · ${updatedBy}` : ""}
          </p>
        )}
      </div>

      <p className="text-[0.65rem] text-[#6B7A8D]">
        More branding controls (poster frame, athlete background) can live on this tab later.
      </p>
    </div>
  );
}
