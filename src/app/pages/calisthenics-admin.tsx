/**
 * Calisthenics ROUTINE OPERATIONS CONSOLE — Exercise Library Editor
 * Full 111+ exercise list (base + added, max 250) only inside EDIT/NEW scroll selector.
 * Edit name, educational description, all cues, pattern, dose, and — most importantly — the live Supabase WORKOUT BUCKET public URL.
 * Changes wire directly to overrides and appear instantly in generated workouts.
 * Opened exclusively by clicking the CALISTHENICS panel in the Admin Command Center (inherits session token).
 * Production-grade, theme-matched, no engine or auth changes.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft, RefreshCw, Save, Plus, Trash2, Upload, CheckCircle2,
  AlertTriangle, Search, Users, Play, Dumbbell, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useWallet } from "../components/wallet-context";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const ORBIT = { fontFamily: "Orbitron, sans-serif" } as const;
const DMS = { fontFamily: "'DM Sans', sans-serif" } as const;

const SUPABASE_URL = `https://${projectId}.supabase.co`;
const SUPABASE_ANON = publicAnonKey;
const WORKOUT_BUCKET_NAME = "WORKOUT BUCKET";

// Helper: returns usable src for <img> (Supabase public URL, data URL, or empty)
function getImageSrc(ref: string | null | undefined): string {
  if (!ref) return "";
  if (typeof ref === "string" && (ref.startsWith("http") || ref.startsWith("data:"))) return ref;
  return "";
}

// For legacy local refs only (fallback during transition)
const refModules: Record<string, any> = (import.meta as any)?.glob
  ? (import.meta as any).glob("../assets/cali-motion/refs/*.{jpg,jpeg,png}", { eager: true, import: "default" })
  : {};
function resolvePreviewSrc(ref: string | null | undefined): string {
  const direct = getImageSrc(ref);
  if (direct) return direct;
  const keys = Object.keys(refModules || {});
  const hit = keys.find((k) => k.includes(ref as string) || k.endsWith(ref as string));
  return hit ? (refModules[hit] as string) : "";
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  pattern: string;
  level: number;
  difficulty: number;
  cues: string[];
  defaultDose: number[];
  equipment: string;
  unilateral?: boolean;
  description?: string;
  previewImageRef?: string | null;
}

// Fallback list of real exercises for display when library load doesn't return data (e.g. direct access).
// When opened from Admin Command Center with valid token, the full live list (base + overrides + custom) will load from backend.
const DEFAULT_EXERCISES: Exercise[] = [
  { id: "push_standard", name: "Push-Up", category: "push", pattern: "horizontal_push", level: 1, difficulty: 4, equipment: "none", unilateral: false, metric: "reps", defaultDose: [3, 5, 5, 15], cues: ["Hands under shoulders", "Squeeze glutes, brace abs", "Full lockout at the top"], description: "The classic push-up. Build chest, shoulders and triceps.", previewImageRef: null },
  { id: "legs_bw_squat", name: "Bodyweight Squat", category: "legs", pattern: "squat", level: 1, difficulty: 2, equipment: "none", unilateral: false, metric: "reps", defaultDose: [3, 4, 10, 20], cues: ["Feet shoulder-width", "Hips back, knees track over toes", "Chest tall, full depth"], description: "Fundamental squat pattern for legs and core.", previewImageRef: null },
  { id: "pull_up", name: "Pull-Up", category: "pull", pattern: "vertical_pull", level: 2, difficulty: 6, equipment: "bar", unilateral: false, metric: "reps", defaultDose: [3, 4, 3, 8], cues: ["Dead hang start", "Chin over bar", "Controlled lower"], description: "Vertical pulling strength.", previewImageRef: null },
  { id: "core_plank", name: "Plank", category: "core", pattern: "iso_hold", level: 1, difficulty: 3, equipment: "none", unilateral: false, metric: "time_sec", defaultDose: [3, 3, 20, 60], cues: ["Body straight", "Brace abs and glutes", "Breathe steadily"], description: "Core anti-extension hold.", previewImageRef: null },
  { id: "sprint_30", name: "30s Sprint", category: "conditioning", pattern: "locomotion", level: 1, difficulty: 4, equipment: "none", unilateral: false, metric: "time_sec", defaultDose: [3, 3, 30, 30], cues: ["High knees", "Powerful arm drive", "Stay tall"], description: "High intensity locomotion.", previewImageRef: null },
];

export function CalisthenicsAdminPage() {
  const wallet = useWallet();
  const { accountId, isAdmin, connected } = wallet;
  const navigate = useNavigate();
  const location = useLocation();

  // Get the original admin session token created when the user signed into the main Admin Command Center.
  // We do NOT perform any extra challenge/sign here to avoid rate limits.
  const passedSessionToken = location.state?.sessionToken as string | undefined;
  const passedWallet = location.state?.wallet as string | undefined;

  // Persist the admin session (token + wallet) to sessionStorage so the full 111 list works
  // even if the user refreshes /calisthenics/admin or lands here directly after one successful panel open.
  // This re-uses the original session key from the Admin Command Center gate — no new signatures.
  const storedSessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminSessionToken') : null;
  const storedWallet = typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminWallet') : null;

  // Effective identity prefers (in order): live context, navigation state from panel, last stored value.
  const effectiveWallet = (accountId || passedWallet || storedWallet || '').trim();

  // Seed sessionToken from navigation OR persisted storage so we keep the ability to call the protected library endpoint.
  const [sessionToken, setSessionToken] = useState<string | null>(passedSessionToken || storedSessionToken || null);

  // Persist whenever we have a good token/wallet (survives refresh, no extra auth).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (passedSessionToken) {
      sessionStorage.setItem('caliAdminSessionToken', passedSessionToken);
      if (passedWallet) sessionStorage.setItem('caliAdminWallet', passedWallet);
    }
    if (sessionToken) {
      sessionStorage.setItem('caliAdminSessionToken', sessionToken);
    }
    const w = effectiveWallet;
    if (w) sessionStorage.setItem('caliAdminWallet', w);
  }, [passedSessionToken, passedWallet, sessionToken, effectiveWallet]);

  // Adopt token from navigation state if provided (kept for backward compat).
  // Also kick a load if we just adopted from storage or passed so the full list appears immediately.
  useEffect(() => {
    if (passedSessionToken && !sessionToken) {
      setSessionToken(passedSessionToken);
    }
    // If we have a token from storage or just received one, ensure we pull the real library.
    const hasTok = passedSessionToken || sessionToken || (typeof window !== 'undefined' && sessionStorage.getItem('caliAdminSessionToken'));
    if (hasTok) {
      // Defer slightly so state settles
      setTimeout(() => loadLibrary(), 10);
    }
  }, [passedSessionToken, sessionToken]);

  const [stats, setStats] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [overrides, setOverrides] = useState<any>({});
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [customRoutines, setCustomRoutines] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [librarySource, setLibrarySource] = useState<'full' | 'fallback'>('fallback');

  // Supabase bucket images (replaces local refs)
  const [bucketImages, setBucketImages] = useState<string[]>([]);
  const [bucketLoading, setBucketLoading] = useState(false);

  // Wonderful editor state: selected exercise + controlled edit buffer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);

  // Default NEW buffer only when we intentionally open the editor (not forced on mount)
  const hasDefaultedForm = useRef(false);
  const openNewEditor = () => {
    const newId = `custom_${Date.now().toString(36)}`;
    setSelectedId(newId);
    setEditBuffer({ id: newId, name: '', description: '', category: 'push', pattern: 'horizontal_push', level: 1, difficulty: 5, equipment: 'none', unilateral: false, metric: 'reps', defaultDose: [3,4,8,12], cues: ['Perform with control'], previewImageRef: null });
    // Force a library load right when the pane (and its scroll selector) opens.
    // This guarantees the full 111+ list appears in the dropdown/scroll even if earlier mount timing missed.
    // Use timeout so we don't hit TDZ if this definition appears before loadLibrary in source.
    setTimeout(() => loadLibrary(), 0);
  };

  // Track whether we have ever successfully loaded the real full library (protect against races / fallback overwrites)
  const hasFullLibraryRef = useRef(false);

  // Robust: load full library independently (no blocking Promise.all). Critical for 111+ list.
  // The session token (from panel or persisted storage) is authoritative on the backend.
  // We attempt the call whenever we have a tok — server derives the wallet from the validated session.
  const loadLibrary = useCallback(async () => {
    // Always attempt to fetch the library. The backend now returns the full base list (111+)
    // even without a session token (for the selector to always show everything editable).
    // With a valid token we get the live enriched version (overrides + added + current URLs).
    const tok = sessionToken || passedSessionToken || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminSessionToken') : null);
    const w = effectiveWallet || passedWallet || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminWallet') : null) || '';

    try {
      const lib = await api.admin.getCaliLibrary(w || 'public', tok || '');
      if (lib.success && lib.data && Array.isArray(lib.data.exercises) && lib.data.exercises.length > 0) {
        console.log('[calisthenics-admin] loaded full library:', lib.data.exercises.length, 'items (source of truth from server)');
        setExercises(lib.data.exercises);
        setOverrides(lib.data.overrides || {});
        setPhotoMap(lib.data.photoMap || {});
        setLibrarySource('full');
        hasFullLibraryRef.current = true;
        return true;
      }
      console.warn('[calisthenics-admin] library response had no exercises or not success', lib);
    } catch (e) {
      console.warn('[calisthenics-admin] library load error (will keep current list)', e);
    }

    // Only fall back to the tiny 5-item DEFAULT if we truly have nothing and never succeeded.
    if (!hasFullLibraryRef.current && exercises.length === 0) {
      setExercises(DEFAULT_EXERCISES);
      setLibrarySource('fallback');
    }
    return false;
  }, [effectiveWallet, sessionToken, passedSessionToken, passedWallet]);

  // Separate light stats load (never blocks library)
  const loadStatsOnly = useCallback(async () => {
    const tok = sessionToken || passedSessionToken || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminSessionToken') : null);
    const w = effectiveWallet || passedWallet || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminWallet') : null) || 'session';
    if (!tok) return;
    try {
      const s = await api.admin.getCaliStats(w, tok);
      if (s.success && s.data) setStats(s.data);
    } catch {}
  }, [effectiveWallet, sessionToken, passedSessionToken, passedWallet]);

  // Wrapper for Refresh button (library + bucket + stats)
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([loadLibrary(), loadStatsOnly()]);
    setLoading(false);
  }, [loadLibrary, loadStatsOnly]);

  // Supabase Storage helpers for WORKOUT BUCKET (using REST for no extra dep) - defined early
  const loadBucketImages = useCallback(async () => {
    setBucketLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(WORKOUT_BUCKET_NAME)}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 500, sortBy: { column: "name", order: "asc" } }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const images: string[] = (data || [])
        .filter((f: any) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name || ""))
        .map((f: any) => `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(WORKOUT_BUCKET_NAME)}/${encodeURIComponent(f.name)}`);
      setBucketImages(images);
    } catch (e) {
      console.warn("Could not list WORKOUT BUCKET. Using empty list.", e);
      setBucketImages([]);
    } finally {
      setBucketLoading(false);
    }
  }, []);

  // No extra signing. We inherit the original admin session token from the main Admin Command Center gate.
  const ensureAdminSession = useCallback(async () => {
    if (sessionToken) return sessionToken;
    if (passedSessionToken) {
      setSessionToken(passedSessionToken);
      return passedSessionToken;
    }
    return null;
  }, [sessionToken, passedSessionToken]);

  // Robust initial + reactive loads: always attempt full library when token present.
  // Uses effectiveWallet + storage so the full 111 list appears even after refresh.
  useEffect(() => {
    loadLibrary();
    loadBucketImages();
    loadStatsOnly();
  }, [connected, isAdmin, sessionToken, passedSessionToken, accountId, passedWallet, loadLibrary]);

  // Always attempt to load the (now publicly readable base) full library on mount.
  // This guarantees the scroll selector inside EDIT/NEW always sees the complete list.
  useEffect(() => {
    loadLibrary();
  }, []); // run once on mount

  // Adopt token and force a library reload (critical for panel navigation flow)
  useEffect(() => {
    if (passedSessionToken && !sessionToken) {
      setSessionToken(passedSessionToken);
    }
    if (passedSessionToken || sessionToken) {
      // Give router state a tick, then load full
      setTimeout(() => { loadLibrary(); }, 0);
    }
  }, [passedSessionToken, passedWallet]);

  // Live poll stats only (never blocks library view)
  useEffect(() => {
    const tok = sessionToken || passedSessionToken || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminSessionToken') : null);
    const w = effectiveWallet || passedWallet || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminWallet') : null) || 'session';
    if (!tok) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        api.admin.getCaliStats(w, tok).then((r) => {
          if (r.success && r.data) setStats(r.data);
        }).catch(() => {});
      }
    }, 45000);
    return () => clearInterval(id);
  }, [effectiveWallet, sessionToken, passedSessionToken, passedWallet]);

  const filtered = exercises.filter((e) => {
    const q = search.toLowerCase().trim();
    if (!q) {
      const catOk = filterCat === "all" || e.category === filterCat;
      return catOk;
    }
    const inName = e.name.toLowerCase().includes(q);
    const inId = e.id.toLowerCase().includes(q);
    const inDesc = (e.description || "").toLowerCase().includes(q);
    const inCues = (e.cues || []).join(" ").toLowerCase().includes(q);
    const inCat = e.category.toLowerCase().includes(q);
    const inPattern = e.pattern.toLowerCase().includes(q);
    const match = inName || inId || inDesc || inCues || inCat || inPattern;
    const catOk = filterCat === "all" || e.category === filterCat;
    return match && catOk;
  });

  // Legacy helpers removed (URL editor + unified saveFromBuffer handle everything now).

  // Wonderful editor helpers
  const startEdit = (ex: any) => {
    setSelectedId(ex.id);
    setEditBuffer({ ...ex, cues: [...(ex.cues || [])], previewImageRef: ex.previewImageRef || null });
  };

  const updateBuffer = (k: string, v: any) => {
    setEditBuffer((b: any) => ({ ...b, [k]: v }));
  };

  const cancelEdit = () => {
    setSelectedId(null);
    setEditBuffer(null);
  };

  // Small helper for new exercise ids (safe, non-destructive)
  const slugifyId = (name: string) => {
    const base = (name || 'exercise').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'exercise';
    return `custom_${base}_${Date.now().toString(36).slice(-6)}`;
  };

  const saveFromBuffer = async () => {
    if (!editBuffer || !selectedId) return;

    const tok = sessionToken || passedSessionToken || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminSessionToken') : null);
    const w = effectiveWallet || passedWallet || (typeof window !== 'undefined' ? sessionStorage.getItem('caliAdminWallet') : null) || 'session';
    if (!tok) {
      toast.error("Admin session missing — open from the Admin Command Center to get a fresh session");
      return;
    }

    const name = (editBuffer.name || '').trim();
    const id = (editBuffer.id || '').trim();
    const cues = (editBuffer.cues || []).filter((c: string) => c && c.trim());

    if (!name) { toast.error("Name is required"); return; }
    if (!id) { toast.error("ID is required"); return; }
    if (cues.length === 0) { toast.error("Add at least one cue"); return; }

    const isNew = !exercises.some((e: any) => e.id === selectedId);
    if (isNew) {
      if (exercises.length >= 250) {
        toast.error("Max 250 exercises reached (anti-spam limit)");
        return;
      }
      // ensure unique id on new
      if (exercises.some((e: any) => e.id === id)) {
        toast.error("ID already exists — choose a unique ID");
        return;
      }
    }

    const payload = { ...editBuffer, id, name, cues, description: (editBuffer.description || '').trim() || undefined };

    try {
      if (isNew) {
        const r = await api.admin.addCaliExercise(w, tok, { exercise: payload });
        if (r.success) {
          toast.success(`Added ${name} — live in engine`);
        }
      } else {
        const res = await api.admin.saveCaliOverride(w, tok, { override: payload });
        if (res.success) toast.success(`Saved ${name} — live in engine`);
      }

      // Force full reload of the real list
      await loadLibrary();
      // Re-select the saved item with fresh server data (use effective w here too)
      setTimeout(async () => {
        try {
          const lib = await api.admin.getCaliLibrary(w, tok);
          const fresh = lib.data?.exercises?.find((e: any) => e.id === selectedId) || payload;
          setEditBuffer({ ...fresh, cues: [...(fresh.cues || [])], previewImageRef: fresh.previewImageRef || null });
        } catch {}
      }, 80);

      // Light stats refresh
      loadStatsOnly();
    } catch (e) {
      toast.error("Save failed");
    }
  };

  // (loadBucketImages moved earlier for hoisting)

  const uploadToBucket = async (file: File): Promise<string | null> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `uploads/${Date.now()}-${safeName}`;
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(WORKOUT_BUCKET_NAME)}/${encodeURIComponent(path)}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: file,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(WORKOUT_BUCKET_NAME)}/${encodeURIComponent(path)}`;
      return publicUrl;
    } catch (e: any) {
      toast.error("Supabase bucket upload failed: " + (e.message || e));
      return null;
    }
  };

  if (!connected || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 text-[#D4A843]" />
          <div style={ORBIT} className="text-xl mb-2">ADMIN ONLY</div>
          <p className="text-[#8494A7]">Connect an admin wallet and unlock the Admin Command Center, then click the CALISTHENICS panel.</p>
          <button onClick={() => navigate("/governance")} className="mt-4 px-4 py-2 bg-[#D4A843] text-black rounded">Back to Governance</button>
        </div>
      </div>
    );
  }

  // Note: For full live library (beyond defaults) and saving, open via the CALISTHENICS panel in Admin Command Center to pass the session token.
  // The editor and list are always visible for workflow.

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6 pb-24 text-[#E8ECF0]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/governance")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-[#4274B9]/30 hover:bg-white/5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Command Center
        </button>
        <div style={ORBIT} className="text-sm tracking-widest text-[#D4A843]">WCO CALISTHENICS ROUTINE OPERATOR CONSOLE</div>
      </div>

      {/* Live Stats Header (sign ins + gens) */}
      <div className="mb-4 rounded-xl border border-[#D4A843]/20 bg-[#0B1120]/60 p-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <div className="uppercase text-[0.55rem] tracking-widest text-[#8494A7]">LIVE — PEOPLE SIGNING IN</div>
            <div className="text-3xl font-bold tabular-nums" style={ORBIT}>{(stats?.caliSignInsToday || 0).toLocaleString()} <span className="text-base text-[#8494A7]">today</span></div>
            <div className="text-xs text-[#6AA3E0]">{(stats?.caliSignInsTotal || 0).toLocaleString()} total</div>
          </div>
          <div>
            <div className="uppercase text-[0.55rem] tracking-widest text-[#8494A7]">WORKOUTS GENERATED TOTAL</div>
            <div className="text-3xl font-bold tabular-nums" style={ORBIT}>{(stats?.workoutsGeneratedTotal || 0).toLocaleString()}</div>
            <div className="text-xs text-[#6AA3E0]">all-time (operator visible)</div>
          </div>
          <div className="ml-auto text-right text-xs text-[#8494A7]">
            {stats?.libraryVersion}<br />{exercises.length} exercises in live library
          </div>
          <button onClick={() => { loadAll(); loadBucketImages(); }} className="px-3 py-1.5 text-xs border border-white/10 rounded hover:bg-white/5 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh All + Bucket
          </button>
        </div>
        <div className="text-[10px] text-[#8494A7] mt-2">This page gives complete manual control. Use it to reach 100% perfect photo + name match on every routine.</div>
      </div>

      {/* EXERCISE EDITOR */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div style={ORBIT} className="uppercase text-xs tracking-widest">ROUTINE OPERATIONS — Edit or Add Exercises</div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded ${librarySource === 'full' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[#8494A7]'}`}>
              {exercises.length} / 250 {librarySource === 'full' ? 'LIVE' : 'exercises'}
            </span>
            <span className="text-[#8494A7]">Bucket: {bucketImages.length}</span>
          </div>
        </div>

        <div className="mb-3 text-xs text-[#8494A7]">
          Admin session active. The full exercise library (111+ with cues, descriptions and bucket URLs) loads here. Click EDIT / NEW EXERCISE to see and edit the complete scrollable list.
        </div>

        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => {
              if (!editBuffer) {
                openNewEditor();
              } else {
                // already open — switch to fresh new
                openNewEditor();
              }
            }}
            className="px-3 py-1 bg-emerald-600 text-xs rounded flex items-center gap-1 font-medium"
          >
            <Plus className="w-3 h-3" /> EDIT / NEW EXERCISE
          </button>
          <button onClick={() => { loadLibrary(); loadBucketImages(); }} className="px-2 py-1 text-xs border border-white/10 rounded hover:bg-white/5 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh Library
          </button>
          <span className="text-[10px] text-[#8494A7] ml-1">Scroll list appears only inside the editor pane</span>
        </div>

        <div className="flex gap-2 mb-2 items-center flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, id, cue, desc..." className="w-full bg-[#111827] border border-white/10 rounded px-3 py-1.5 text-sm" />
            <Search className="absolute right-3 top-2 w-4 h-4 text-[#8494A7]" />
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-[#111827] border border-white/10 rounded px-2 text-sm">
            <option value="all">All categories</option>
            <option value="push">push</option>
            <option value="pull">pull</option>
            <option value="core">core</option>
            <option value="legs">legs</option>
            <option value="conditioning">conditioning</option>
            <option value="mobility">mobility</option>
          </select>
        </div>

        {/* Wonderful live editor pane — EDIT/NEW unified. The full scroll list of ALL exercises is hidden until this pane is open. */}
        {editBuffer && selectedId ? (
          <div className="mt-1 p-4 border border-[#D4A843]/40 bg-[#111827] rounded">
            <div className="flex justify-between mb-3">
              <div className="font-bold" style={ORBIT}>{selectedId.startsWith('custom_') ? 'NEW EXERCISE' : 'EDIT EXERCISE'}: {editBuffer.name || 'Untitled'}</div>
              <div className="flex gap-2">
                <button onClick={openNewEditor} className="text-xs px-3 py-1 bg-emerald-600 text-black rounded">Switch to NEW</button>
                <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-white/20 rounded">Close</button>
                <button onClick={saveFromBuffer} className="text-xs px-3 py-1 bg-[#D4A843] text-black rounded flex items-center gap-1"><Save className="w-3 h-3"/>Save to Live Engine</button>
              </div>
            </div>

            {/* Scroll selector — only visible inside EDIT/NEW pane (dropdown + scroll style). Full list when loaded via panel. */}
            <div className="mb-3">
              <div className="text-[10px] text-[#8494A7] mb-1 flex items-center justify-between">
                <span>FULL LIBRARY — scroll &amp; click to load (all cues + descriptions + current bucket URL)</span>
                <span>{exercises.length} total • max 250</span>
              </div>
              <div className="border border-white/10 rounded p-1 max-h-52 overflow-y-auto bg-black/30 text-xs">
                {(() => {
                  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
                  return sorted.length > 0 ? sorted.map((ex) => {
                    const img = getImageSrc(ex.previewImageRef);
                    const firstCue = (ex.cues && ex.cues[0]) || (ex.description || '').slice(0, 60);
                    const hasUrl = !!ex.previewImageRef;
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          setSelectedId(ex.id);
                          setEditBuffer({ ...ex, cues: [...(ex.cues || [])], description: ex.description || '', previewImageRef: ex.previewImageRef || null });
                        }}
                        className={`flex items-start gap-2 p-1.5 cursor-pointer rounded hover:bg-[#D4A843]/10 ${selectedId === ex.id ? 'bg-[#D4A843]/20 ring-1 ring-[#D4A843]/40' : ''}`}
                      >
                        {img ? (
                          <img src={img} className="w-8 h-8 object-contain border border-white/10 rounded flex-shrink-0 mt-0.5" alt="" />
                        ) : (
                          <div className="w-8 h-8 border border-white/10 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-[#8494A7]">IMG</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium leading-tight">{ex.name} <span className="text-[#8494A7] font-mono text-[10px]">({ex.id})</span></div>
                          <div className="text-[10px] text-[#8494A7] truncate">{ex.category} / {ex.pattern} {hasUrl ? '• ✓ URL' : ''}</div>
                          {firstCue && <div className="text-[10px] opacity-80 truncate mt-0.5">“{firstCue}”</div>}
                        </div>
                      </div>
                    );
                  }) : <div className="p-1 text-[#8494A7]">No matches — adjust search or open from Admin panel for full library.</div>;
                })()}
              </div>
              <div className="text-[9px] text-[#8494A7] mt-1">Search &amp; category filters apply to this list. Full library (111+ exercises with all cues, descriptions and current bucket URLs) is loaded using the admin session.</div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {/* Name / ID */}
              <div>
                <label className="text-[10px] text-[#8494A7]">Name</label>
                <input value={editBuffer.name || ''} onChange={e => updateBuffer('name', e.target.value)} className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded" />
              </div>
              <div>
                <label className="text-[10px] text-[#8494A7]">ID (unique, no spaces)</label>
                <input value={editBuffer.id || ''} onChange={e => updateBuffer('id', e.target.value)} disabled={!selectedId.startsWith('custom_')} className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded disabled:opacity-60" />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="text-[10px] text-[#8494A7]">Description (educational)</label>
                <textarea value={editBuffer.description || ''} onChange={e => updateBuffer('description', e.target.value)} className="w-full h-16 bg-black/40 border border-white/10 px-2 py-1 rounded" />
              </div>

              {/* Cues - rich editor */}
              <div className="md:col-span-2">
                <label className="text-[10px] text-[#8494A7]">Cues (click to edit, X to remove)</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {(editBuffer.cues || []).map((c: string, i: number) => (
                    <div key={i} className="flex items-center bg-white/5 px-2 py-0.5 rounded text-xs">
                      <input value={c} onChange={e => {
                        const newCues = [...editBuffer.cues]; newCues[i] = e.target.value; updateBuffer('cues', newCues);
                      }} className="bg-transparent border-0 p-0 text-xs w-40" />
                      <button onClick={() => { const nc=[...(editBuffer.cues||[])]; nc.splice(i,1); updateBuffer('cues', nc); }} className="ml-1 text-red-400">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input id="newcue" placeholder="New cue" className="flex-1 bg-black/40 border border-white/10 px-2 py-1 text-xs rounded" onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim(); if (val) { updateBuffer('cues', [...(editBuffer.cues||[]), val]); (e.target as HTMLInputElement).value=''; }
                    }
                  }} />
                  <button onClick={() => {
                    const inp = document.getElementById('newcue') as HTMLInputElement; const val = inp?.value.trim(); if (val) { updateBuffer('cues', [...(editBuffer.cues||[]), val]); inp.value=''; }
                  }} className="text-xs px-2 bg-[#4274B9]/30 rounded">Add Cue</button>
                </div>
              </div>

              {/* Pattern / Category */}
              <select value={editBuffer.pattern} onChange={e=>updateBuffer('pattern', e.target.value)} className="bg-black/40 border border-white/10 px-2 py-1 rounded">
                {["horizontal_push","vertical_push","horizontal_pull","vertical_pull","squat","lunge","hinge","anti_extension","anti_rotation","flexion","iso_hold","locomotion","plyo","stretch"].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <select value={editBuffer.category} onChange={e=>updateBuffer('category', e.target.value)} className="bg-black/40 border border-white/10 px-2 py-1 rounded">
                {["push","pull","core","legs","conditioning","mobility"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>

              {/* Dose, level etc */}
              <div className="flex gap-2 items-center text-xs">
                <span>Level</span><input type="number" value={editBuffer.level||1} onChange={e=>updateBuffer('level', parseInt(e.target.value)||1)} className="w-12 bg-black/40 border px-1 rounded" />
                <span>Diff</span><input type="number" value={editBuffer.difficulty||5} onChange={e=>updateBuffer('difficulty', parseInt(e.target.value)||5)} className="w-12 bg-black/40 border px-1 rounded" />
              </div>
              <div className="flex gap-1 items-center text-xs">
                <span>Dose</span>
                {(editBuffer.defaultDose||[3,4,8,12]).map((n:number,i:number)=> <input key={i} type="number" value={n} onChange={e=>{const d=[...(editBuffer.defaultDose||[])]; d[i]=parseInt(e.target.value)||0; updateBuffer('defaultDose',d);}} className="w-12 bg-black/40 border px-1 rounded"/> )}
              </div>

              {/* Image live - editable Supabase URL for both edit and new (first-class operator control) */}
              <div className="md:col-span-2">
                <div className="text-[10px] text-[#8494A7] mb-1 font-medium">Supabase WORKOUT BUCKET URL (paste or pick — upload to bucket then share URL here)</div>

                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <input 
                    type="text" 
                    value={editBuffer.previewImageRef || ''} 
                    onChange={e => updateBuffer('previewImageRef', e.target.value || null)}
                    placeholder="https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/WORKOUT%20BUCKET/your-file.jpg"
                    className="flex-1 min-w-[240px] bg-black/40 border border-white/10 px-2 py-1 text-xs font-mono rounded"
                  />
                  {getImageSrc(editBuffer.previewImageRef) && (
                    <img src={getImageSrc(editBuffer.previewImageRef)} className="w-14 h-14 object-contain border border-white/10 rounded bg-black/40" alt="preview" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <label className="cursor-pointer text-xs px-2.5 py-1 border border-white/20 rounded hover:bg-white/5 active:bg-white/10">
                    Upload to Bucket
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadToBucket(f);
                      if (url) updateBuffer('previewImageRef', url);
                    }} />
                  </label>

                  <select 
                    value={editBuffer.previewImageRef && editBuffer.previewImageRef.includes('supabase') ? editBuffer.previewImageRef : ''} 
                    onChange={e => updateBuffer('previewImageRef', e.target.value || null)} 
                    className="text-xs bg-black/40 border px-1 py-1 rounded max-w-[210px]"
                    disabled={bucketLoading}
                  >
                    <option value="">{bucketLoading ? "Loading bucket..." : "— pick from current bucket —"}</option>
                    {bucketImages.map(url => {
                      const name = url.split('/').pop();
                      return <option key={url} value={url}>{name}</option>;
                    })}
                  </select>

                  <button onClick={async () => {
                    if (!editBuffer.name) return;
                    const q = editBuffer.name.toLowerCase();
                    const match = bucketImages.find(u => u.toLowerCase().includes(q) || q.includes((u.split('/').pop() || '').toLowerCase()));
                    if (match) { updateBuffer('previewImageRef', match); toast.success("Matched from bucket"); }
                    else toast("No close name match in bucket");
                  }} className="text-xs px-2 py-1 border border-white/20 rounded">Suggest</button>

                  <button onClick={async () => {
                    const url = editBuffer.previewImageRef;
                    if (url && typeof url === 'string') { await navigator.clipboard?.writeText(url); toast.success('URL copied'); }
                  }} className="text-xs px-2 py-1 border border-white/20 rounded">Copy</button>

                  <button onClick={() => {
                    const url = getImageSrc(editBuffer.previewImageRef);
                    if (url) window.open(url, '_blank');
                  }} className="text-xs px-2 py-1 border border-white/20 rounded">Open</button>

                  <button onClick={() => updateBuffer('previewImageRef', null)} className="text-xs px-2 py-1">Clear</button>
                </div>

                <div className="text-[10px] text-[#6AA3E0]">Operator flow: upload in Supabase Storage → WORKOUT BUCKET → copy public URL → paste or pick here. Applies to both EDIT and NEW. Saved value is used in live routines.</div>
                {!getImageSrc(editBuffer.previewImageRef) && editBuffer.previewImageRef && <div className="text-[10px] text-amber-400 mt-0.5">Note: replace legacy ref with full bucket public URL.</div>}
              </div>
            </div>
          </div>
        ) : null}
        <div className="text-[10px] text-[#8494A7] mt-1">Click EDIT / NEW EXERCISE to reveal the full scrollable library selector + editor. All changes to cues, descriptions, and bucket URLs are live for the workout engine.</div>
      </section>

      <div className="text-center text-[10px] text-[#8494A7] mt-8">WCO Calisthenics Routine Operator Console — full library scroll inside EDIT/NEW • editable Supabase URLs • 250 max</div>
    </div>
  );
}

