/**
 * Elite zone featured athlete editor — embedded in Cali Routine Operations console.
 */

import { useCallback, useEffect, useState } from "react";
import { Save, Upload, Plus, Trash2, Loader2, Star, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import type { EliteFeaturedAthlete } from "../../lib/types";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const ORBIT = { fontFamily: "Orbitron, sans-serif" } as const;
const DMS = { fontFamily: "'DM Sans', sans-serif" } as const;

const SUPABASE_URL = `https://${projectId}.supabase.co`;
const SUPABASE_ANON = publicAnonKey;
const WORKOUT_BUCKET_NAME = "WORKOUT BUCKET";

const EMPTY: EliteFeaturedAthlete = {
  enabled: false,
  periodType: "monthly",
  periodLabel: "",
  athleteName: "",
  tagline: "",
  country: "",
  description: "",
  powerMoves: [],
  accolades: [],
  highlightVideoUrl: "",
  photoUrl: "",
  socials: { instagram: "", twitter: "", youtube: "", website: "" },
  athleteId: "",
  updatedAt: "",
};

async function uploadToBucket(file: File): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `featured/${Date.now()}-${safeName}`;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(WORKOUT_BUCKET_NAME)}/${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        body: file,
      },
    );
    if (!res.ok) throw new Error(await res.text());
    return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(WORKOUT_BUCKET_NAME)}/${encodeURIComponent(path)}`;
  } catch (e: any) {
    toast.error("Bucket upload failed: " + (e.message || e));
    return null;
  }
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#8494A7] uppercase tracking-wider block mb-1">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0] outline-none focus:border-[#D4A843]/50"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="text-[10px] flex items-center gap-1 text-[#6AA3E0] hover:text-[#E8ECF0]"
        >
          <Plus className="w-3 h-3" /> Add line
        </button>
      </div>
    </div>
  );
}

export function CaliFeaturedAthleteEditor({
  sessionToken,
  wallet,
  disabled,
}: {
  sessionToken: string;
  wallet: string;
  disabled?: boolean;
}) {
  const [form, setForm] = useState<EliteFeaturedAthlete>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const adminApi: any = (api as any)?.admin || api;

  const load = useCallback(async () => {
    setLoading(true);
    const getFn = adminApi.getCaliFeaturedAthlete;
    if (typeof getFn !== "function") {
      setLoading(false);
      return;
    }
    const res = await getFn(wallet, sessionToken);
    if (res.success && res.data?.featured) {
      setForm({
        ...EMPTY,
        ...res.data.featured,
        powerMoves: res.data.featured.powerMoves || [],
        accolades: res.data.featured.accolades || [],
        socials: { ...EMPTY.socials, ...res.data.featured.socials },
      });
    }
    setLoading(false);
  }, [wallet, sessionToken, adminApi]);

  useEffect(() => { load(); }, [load]);

  const patch = (partial: Partial<EliteFeaturedAthlete>) => setForm((f) => ({ ...f, ...partial }));

  const save = async () => {
    const saveFn = adminApi.saveCaliFeaturedAthlete;
    if (typeof saveFn !== "function") {
      toast.error("saveCaliFeaturedAthlete not available — restart dev server");
      return;
    }
    if (form.enabled && !form.athleteName.trim()) {
      toast.error("Athlete name is required when spotlight is enabled");
      return;
    }
    if (form.enabled && !form.highlightVideoUrl.trim()) {
      toast.error("Highlight video URL is required (upload or paste Supabase bucket URL)");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      powerMoves: form.powerMoves.filter((s) => s.trim()),
      accolades: form.accolades.filter((s) => s.trim()),
    };
    const res = await saveFn(wallet, sessionToken, payload);
    setSaving(false);
    if (res.success) {
      toast.success("Featured athlete saved — live in Elite Tech Vault");
      if (res.data?.featured) setForm({ ...form, ...res.data.featured });
    } else {
      toast.error(res.error || "Save failed");
    }
  };

  const onVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    const url = await uploadToBucket(file);
    setUploadingVideo(false);
    if (url) {
      patch({ highlightVideoUrl: url });
      toast.success("Highlight video uploaded");
    }
  };

  const onPhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    const url = await uploadToBucket(file);
    setUploadingPhoto(false);
    if (url) {
      patch({ photoUrl: url });
      toast.success("Poster photo uploaded");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#D4A843] animate-spin" />
      </div>
    );
  }

  return (
    <section className="mb-8 mt-10 pt-8 border-t border-[#D4A843]/20">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-[#D4A843]" />
        <div style={ORBIT} className="uppercase text-xs tracking-widest text-[#D4A843]">
          Elite Zone — Featured Athlete Spotlight
        </div>
      </div>
      <p className="text-xs text-[#8494A7] mb-4" style={DMS}>
        Set the weekly or monthly athlete highlight shown below the sponsored-athlete CTA in Pro Calisthenics.
        Upload highlight reels to the WORKOUT BUCKET or paste a public Supabase URL.
      </p>

      <div className="rounded-xl border border-[#D4A843]/25 bg-[#0B1120]/60 p-4 space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            disabled={disabled}
            className="rounded border-[#D4A843]/40"
          />
          <span className="text-sm text-[#E8ECF0]" style={DMS}>Show featured athlete in Elite Tech Vault</span>
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Period</label>
            <select
              value={form.periodType}
              onChange={(e) => patch({ periodType: e.target.value as "weekly" | "monthly" })}
              disabled={disabled}
              className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0]"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Badge label (optional)</label>
            <input
              value={form.periodLabel}
              onChange={(e) => patch({ periodLabel: e.target.value })}
              placeholder="e.g. Athlete of the Month — June 2026"
              disabled={disabled}
              className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0]"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Athlete name *</label>
            <input
              value={form.athleteName}
              onChange={(e) => patch({ athleteName: e.target.value })}
              placeholder="Tony Gaste"
              disabled={disabled}
              className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Tagline</label>
            <input
              value={form.tagline}
              onChange={(e) => patch({ tagline: e.target.value })}
              placeholder="2 Division WCO World Champion"
              disabled={disabled}
              className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0]"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Country</label>
          <input
            value={form.country}
            onChange={(e) => patch({ country: e.target.value })}
            placeholder="Mexico"
            disabled={disabled}
            className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0]"
          />
        </div>

        <div>
          <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={4}
            placeholder="Bio, story, and what makes this athlete elite..."
            disabled={disabled}
            className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0] resize-y"
          />
        </div>

        <ListEditor
          label="Power moves"
          items={form.powerMoves.length ? form.powerMoves : [""]}
          onChange={(powerMoves) => patch({ powerMoves })}
          placeholder="e.g. 360 Muscle-Up to Planche"
        />

        <ListEditor
          label="Accolades"
          items={form.accolades.length ? form.accolades : [""]}
          onChange={(accolades) => patch({ accolades })}
          placeholder="e.g. WCO Featherweight World Champion"
        />

        <div>
          <label className="text-[10px] text-[#8494A7] uppercase tracking-wider flex items-center gap-1">
            <Video className="w-3 h-3" /> Highlight video URL * (Supabase bucket)
          </label>
          <input
            value={form.highlightVideoUrl}
            onChange={(e) => patch({ highlightVideoUrl: e.target.value })}
            placeholder="https://....supabase.co/storage/v1/object/public/WORKOUT%20BUCKET/..."
            disabled={disabled}
            className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0] font-mono"
          />
          <label className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-[#D4A843]/40 text-xs cursor-pointer hover:bg-[#D4A843]/5 ${uploadingVideo ? "opacity-50" : ""}`}>
            {uploadingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload highlight video (mp4/webm)
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              disabled={disabled || uploadingVideo}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onVideoUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div>
          <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">Poster / thumbnail URL (optional)</label>
          <input
            value={form.photoUrl}
            onChange={(e) => patch({ photoUrl: e.target.value })}
            placeholder="https://....supabase.co/.../poster.jpg"
            disabled={disabled}
            className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0] font-mono"
          />
          <label className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-[#4274B9]/30 text-xs cursor-pointer hover:bg-white/5 ${uploadingPhoto ? "opacity-50" : ""}`}>
            {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload poster image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={disabled || uploadingPhoto}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPhotoUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {(["instagram", "twitter", "youtube", "website"] as const).map((key) => (
            <div key={key}>
              <label className="text-[10px] text-[#8494A7] uppercase tracking-wider">{key}</label>
              <input
                value={form.socials[key] || ""}
                onChange={(e) => patch({ socials: { ...form.socials, [key]: e.target.value } })}
                placeholder={key === "website" ? "https://..." : "@handle or URL"}
                disabled={disabled}
                className="w-full mt-1 bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1.5 text-xs text-[#E8ECF0]"
              />
            </div>
          ))}
        </div>

        {form.highlightVideoUrl && (
          <div className="rounded-lg border border-[#4274B9]/20 overflow-hidden aspect-video max-w-md bg-black">
            <video className="w-full h-full object-cover" controls playsInline preload="metadata" poster={form.photoUrl || undefined}>
              <source src={form.highlightVideoUrl} />
            </video>
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={disabled || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A843] text-[#0B1120] text-sm font-bold hover:brightness-110 disabled:opacity-50"
          style={DMS}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Featured Athlete
        </button>
      </div>
    </section>
  );
}