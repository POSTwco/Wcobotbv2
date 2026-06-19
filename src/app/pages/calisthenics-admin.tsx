/**
 * Calisthenics ROUTINE OPERATIONS CONSOLE — Exercise Library Editor
 * Full 111+ list only inside EDIT/NEW scroll. Every field (cues, educational description, bucket URL, dose...) has inline educational tooltips explaining exactly where it appears for users.
 * Live "Simulate User View" + strong save feedback. Overrides are instantly live in generated workouts (wired end-to-end).
 * Production polished, self-documenting, fun & trustworthy for operators.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft, RefreshCw, Save, Plus, Trash2, Upload, CheckCircle2,
  AlertTriangle, Users, Play, Dumbbell, Loader2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useWallet } from "../components/wallet-context";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";


// Import the authoritative exercise library directly from the server source.
// This guarantees the admin editor scroll selector always has the complete list
// (all 111+ exercises with their cues, descriptions, etc.) even if the backend
// call for live overrides fails or no admin token is present on direct access.
import { EXERCISES as SERVER_BASE_EXERCISES } from "../../../supabase/functions/make-server-57fcb0ee/cali_library";
import confetti from "canvas-confetti";

const ORBIT = { fontFamily: "Orbitron, sans-serif" } as const;
const DMS = { fontFamily: "'DM Sans', sans-serif" } as const;

const SUPABASE_URL = `https://${projectId}.supabase.co`;
const SUPABASE_ANON = publicAnonKey;
const WORKOUT_BUCKET_NAME = "WORKOUT BUCKET";

function readStoredAdminSession(): { token: string; wallet: string } | null {
  if (typeof window === "undefined") return null;
  const token =
    sessionStorage.getItem("caliAdminSessionToken") ||
    sessionStorage.getItem("adminSessionToken");
  if (!token) return null;
  const wallet =
    sessionStorage.getItem("caliAdminWallet") ||
    sessionStorage.getItem("adminSessionWallet") ||
    "";
  return { token, wallet };
}

// Helper: returns usable src for <img> ONLY from Supabase (http) or data URLs set via admin panel.
// No local files or old refs. If no URL assigned, callers should show placeholder or motion fallback.
function getImageSrc(ref: string | null | undefined): string {
  if (!ref) return "";
  if (typeof ref === "string" && (ref.startsWith("http") || ref.startsWith("data:"))) return ref;
  return "";
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
  previewImageRefMale?: string | null;
  previewImageRefFemale?: string | null;
}

// Small fallback used only for new exercise creation defaults and as last-resort
// when the imported server list is somehow unavailable. The main list for the
// EDIT/NEW scroll selector now comes from the authoritative SERVER_BASE_EXERCISES
// import so it is always the complete set (no more 5-item limit).
const DEFAULT_EXERCISES: Exercise[] = [
  { id: "push_standard", name: "Push-Up", category: "push", pattern: "horizontal_push", level: 1, difficulty: 4, equipment: "none", unilateral: false, metric: "reps", defaultDose: [3, 5, 5, 15], cues: ["Hands under shoulders", "Squeeze glutes, brace abs", "Full lockout at the top"], description: "The classic push-up. Build chest, shoulders and triceps.", previewImageRef: null, previewImageRefMale: null, previewImageRefFemale: null },
  { id: "legs_bw_squat", name: "Bodyweight Squat", category: "legs", pattern: "squat", level: 1, difficulty: 2, equipment: "none", unilateral: false, metric: "reps", defaultDose: [3, 4, 10, 20], cues: ["Feet shoulder-width", "Hips back, knees track over toes", "Chest tall, full depth"], description: "Fundamental squat pattern for legs and core.", previewImageRef: null, previewImageRefMale: null, previewImageRefFemale: null },
  { id: "pull_up", name: "Pull-Up", category: "pull", pattern: "vertical_pull", level: 2, difficulty: 6, equipment: "bar", unilateral: false, metric: "reps", defaultDose: [3, 4, 3, 8], cues: ["Dead hang start", "Chin over bar", "Controlled lower"], description: "Vertical pulling strength.", previewImageRef: null, previewImageRefMale: null, previewImageRefFemale: null },
  { id: "core_plank", name: "Plank", category: "core", pattern: "iso_hold", level: 1, difficulty: 3, equipment: "none", unilateral: false, metric: "time_sec", defaultDose: [3, 3, 20, 60], cues: ["Body straight", "Brace abs and glutes", "Breathe steadily"], description: "Core anti-extension hold.", previewImageRef: null, previewImageRefMale: null, previewImageRefFemale: null },
  { id: "sprint_30", name: "30s Sprint", category: "conditioning", pattern: "locomotion", level: 1, difficulty: 4, equipment: "none", unilateral: false, metric: "time_sec", defaultDose: [3, 3, 30, 30], cues: ["High knees", "Powerful arm drive", "Stay tall"], description: "High intensity locomotion.", previewImageRef: null, previewImageRefMale: null, previewImageRefFemale: null },
];

export function CalisthenicsAdminPage({ embedded = false, sessionToken: propSessionToken, wallet: propWallet }: { embedded?: boolean; sessionToken?: string; wallet?: string } = {}) {
  const walletCtx = useWallet();
  const { accountId, isAdmin, connected } = walletCtx;
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer live props (when rendered as dropdown inside Admin Command Center) over
  // navigation state or storage. This is the key to reliable saves without leaving the protected panel.
  const passedSessionToken = location.state?.sessionToken as string | undefined;
  const passedWallet = location.state?.wallet as string | undefined;

  const storedSessionToken = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('caliAdminSessionToken') || sessionStorage.getItem('adminSessionToken')) 
    : null;
  const storedWallet = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('caliAdminWallet') || sessionStorage.getItem('adminSessionWallet')) 
    : null;

  // Effective values: live props (from parent AdminPanel session) win when present.
  const effectiveWallet = (propWallet || accountId || passedWallet || storedWallet || '').trim();

  const [sessionToken, setSessionToken] = useState<string | null>(propSessionToken || passedSessionToken || storedSessionToken || null);

  // Keep internal token in sync with the live prop passed from AdminPanel.
  // This prevents falling back to short/stale tokens from storage when used as dropdown.
  useEffect(() => {
    if (propSessionToken) {
      setSessionToken(propSessionToken);
    }
  }, [propSessionToken]);

  // Persist whenever we have a good token/wallet (survives refresh, no extra auth).
  // Store under both cali-specific and standard admin keys for compatibility.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tokenToStore = propSessionToken || passedSessionToken || sessionToken;
    const walletToStore = propWallet || passedWallet || effectiveWallet;
    if (tokenToStore) {
      sessionStorage.setItem('caliAdminSessionToken', tokenToStore);
      sessionStorage.setItem('adminSessionToken', tokenToStore);
    }
    if (walletToStore) {
      sessionStorage.setItem('caliAdminWallet', walletToStore);
      sessionStorage.setItem('adminSessionWallet', walletToStore);
    }
  }, [propSessionToken, propWallet, passedSessionToken, passedWallet, sessionToken, effectiveWallet]);

  // Adopt token from props (preferred) or navigation state if provided.
  // Kick a load so the full list appears immediately when inside the admin panel dropdown.
  useEffect(() => {
    if (propSessionToken && !sessionToken) {
      setSessionToken(propSessionToken);
    } else if (passedSessionToken && !sessionToken) {
      setSessionToken(passedSessionToken);
    }
    const hasTok = propSessionToken || passedSessionToken || sessionToken || (typeof window !== 'undefined' && (sessionStorage.getItem('caliAdminSessionToken') || sessionStorage.getItem('adminSessionToken')));
    if (hasTok) {
      setTimeout(() => loadLibrary(), 10);
    }
  }, [propSessionToken, passedSessionToken, sessionToken]);

  // Start with the full authoritative list from the server source so the
  // EDIT/NEW scroll selector immediately shows all exercises (no more "only 5").
  const FULL_BASE_LIST = SERVER_BASE_EXERCISES as unknown as Exercise[];
  const [exercises, setExercises] = useState<Exercise[]>(FULL_BASE_LIST);
  const [overrides, setOverrides] = useState<any>({});
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [customRoutines, setCustomRoutines] = useState<any[]>([]);

  const [filterCat, setFilterCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [librarySource, setLibrarySource] = useState<'full' | 'fallback'>('fallback');

  // Supabase bucket images (replaces local refs)
  const [bucketImages, setBucketImages] = useState<string[]>([]);
  const [bucketLoading, setBucketLoading] = useState(false);

  // Pro UX state
  const [isSaving, setIsSaving] = useState(false);
  const [showLiveBanner, setShowLiveBanner] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [simGender, setSimGender] = useState<'male' | 'female'>('male');



  // Critical: detect if the current running bundle actually exported the cali admin methods.
  // On local dev this often means "Vite didn't HMR the api.ts module — fully restart the dev server".
  // On live it means the Vercel build from the last git push hasn't finished or you need a hard refresh.
  const adminApi: any = (api as any)?.admin || {};
  const rootApi: any = api as any;
  const hasCaliMethods =
    (typeof adminApi.getCaliLibrary === 'function' || typeof rootApi.getCaliLibrary === 'function') &&
    (typeof adminApi.saveCaliOverride === 'function' || typeof rootApi.saveCaliOverride === 'function') &&
    (typeof adminApi.addCaliExercise === 'function' || typeof rootApi.addCaliExercise === 'function') &&
    (typeof adminApi.getCaliStats === 'function' || typeof rootApi.getCaliStats === 'function');

  const [showApiWarning, setShowApiWarning] = useState(!hasCaliMethods);

  // Wonderful editor state: selected exercise + controlled edit buffer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);

  // Default NEW buffer only when we intentionally open the editor (not forced on mount)
  const hasDefaultedForm = useRef(false);
  const openNewEditor = () => {
    const newId = `custom_${Date.now().toString(36)}`;
    setSelectedId(newId);
    setEditBuffer({ id: newId, name: '', description: '', category: 'push', pattern: 'horizontal_push', level: 1, difficulty: 5, equipment: 'none', unilateral: false, metric: 'reps', defaultDose: [3,4,8,12], cues: ['Perform with control'], previewImageRef: null, previewImageRefMale: null, previewImageRefFemale: null, tempoHint: '', scalingDownName: '', scalingUpName: '' });
    setDirty(false);
    // Force a library load right when the pane (and its scroll selector) opens.
    // This guarantees the full 111+ list appears in the dropdown/scroll even if earlier mount timing missed.
    // Use timeout so we don't hit TDZ if this definition appears before loadLibrary in source.
    setTimeout(() => loadLibrary(), 0);
  };

  // Track whether we have ever successfully loaded the real full library (protect against races / fallback overwrites)
  const hasFullLibraryRef = useRef(false);

  const resolveAdminCredentials = useCallback((): { token: string; wallet: string } | null => {
    const stored = readStoredAdminSession();
    const token =
      propSessionToken ||
      sessionToken ||
      passedSessionToken ||
      stored?.token ||
      null;
    const wallet =
      propWallet ||
      effectiveWallet ||
      passedWallet ||
      stored?.wallet ||
      accountId ||
      "";
    if (!token) return null;
    return { token, wallet };
  }, [
    propSessionToken, sessionToken, passedSessionToken,
    propWallet, effectiveWallet, passedWallet, accountId,
  ]);

  const adminCredentials = resolveAdminCredentials();
  const hasAdminSession = !!adminCredentials?.token;

  // Robust: load full library independently (no blocking Promise.all). Critical for 111+ list.
  // The session token (from panel or persisted storage) is authoritative on the backend.
  // We attempt the call whenever we have a tok — server derives the wallet from the validated session.
  const loadLibrary = useCallback(async () => {
    if (!hasCaliMethods) {
      console.warn('[calisthenics-admin] skipping library load — api.admin.getCaliLibrary not present in this bundle');
      return false;
    }
    // Always attempt to fetch the library. Prefer live props passed from inside AdminPanel.
    const creds = resolveAdminCredentials();
    const tok = creds?.token || "";
    const w = creds?.wallet || propWallet || effectiveWallet || passedWallet || "";

    try {
      const getLib = adminApi.getCaliLibrary || (rootApi as any).getCaliLibrary;
      if (!getLib) {
        console.warn('[calisthenics-admin] no getCaliLibrary available');
        return false;
      }
      const lib = await getLib(w || 'public', tok || '');
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
      if (lib.error) {
        console.warn('[calisthenics-admin] library error detail:', lib.error);
      }
      // Better error reporting for debugging 404s etc on local vs deployed
      if (!lib.success) {
        console.error('[calisthenics-admin] full library response on failure:', lib);
      }
    } catch (e) {
      console.warn('[calisthenics-admin] library load error (will keep current list)', e);
    }

    // Only fall back to the base list if we truly have nothing and never succeeded.
    if (!hasFullLibraryRef.current && exercises.length === 0) {
      setExercises(FULL_BASE_LIST);
      setLibrarySource('fallback');
    }
    return false;
  }, [propWallet, propSessionToken, effectiveWallet, sessionToken, passedSessionToken, passedWallet, resolveAdminCredentials]);



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
        body: JSON.stringify({ prefix: '', limit: 500, sortBy: { column: "name", order: "asc" } }),
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

  // Robust initial + reactive loads: always attempt full library when token present.
  // Uses effectiveWallet + storage so the full 111 list appears even after refresh.
  useEffect(() => {
    loadLibrary();
    loadBucketImages();
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

  // No stats polling here anymore (redundant with main admin panel's CaliAdminStats; see hasCaliMethods for API readiness only).

  const filtered = exercises.filter((e) => {
    // Category filter only (search field removed — it was shown before the list pane and didn't apply until edit was open)
    return filterCat === "all" || e.category === filterCat;
  });

  // Legacy helpers removed (URL editor + unified saveFromBuffer handle everything now).

  // Wonderful editor helpers
  const startEdit = (ex: any) => {
    setSelectedId(ex.id);
    const legacy = ex.previewImageRef || null;
    setEditBuffer({ 
      ...ex, 
      cues: [...(ex.cues || [])], 
      previewImageRefMale: ex.previewImageRefMale || legacy, 
      previewImageRefFemale: ex.previewImageRefFemale || null 
    });
    setDirty(false);
  };

  const updateBuffer = (k: string, v: any) => {
    setDirty(true);
    setEditBuffer((b: any) => ({ ...b, [k]: v }));
  };

  const cancelEdit = () => {
    setSelectedId(null);
    setEditBuffer(null);
    setDirty(false);
    setShowLiveBanner(false);
  };

  // Small helper for new exercise ids (safe, non-destructive)
  const slugifyId = (name: string) => {
    const base = (name || 'exercise').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'exercise';
    return `custom_${base}_${Date.now().toString(36).slice(-6)}`;
  };

  const saveFromBuffer = async () => {
    if (!editBuffer || !selectedId) return;

    // === DEFENSIVE GUARD: detect stale frontend bundle ===
    // This is the main reason "save does nothing". The guard we added surfaces it loudly.
    if (!hasCaliMethods) {
      const adminKeys = Object.keys(((api as any)?.admin) || {}).filter((k: string) => /cali/i.test(k) || /Cali/.test(k));
      const msg = `FRONTEND BUNDLE STALE — saveCali* methods missing. Present cali keys: ${adminKeys.join(', ') || 'none'}. ACTION: For LOCAL: stop "npm run dev", run it again, then hard-refresh browser. For LIVE: wait for Vercel build after git push + hard refresh.`;
      toast.error(msg);
      setShowApiWarning(true);
      console.error('[calisthenics-admin] STALE BUNDLE', { adminKeys, apiAdmin: Object.keys(((api as any)?.admin) || {}) });
      return;
    }

    const creds = resolveAdminCredentials();
    if (!creds?.token) {
      toast.error(
        "Admin session required. Open Governance → unlock Admin Command Center (wallet signature), then use the Calisthenics panel.",
        { duration: 10000 },
      );
      return;
    }
    const { token: tok, wallet: w } = creds;

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

    // Full payload for roundtrip safety (preserve every field the UI can show)
    const payload = {
      ...editBuffer,
      id,
      name,
      cues,
      description: (editBuffer.description || '').trim() || undefined,
      tempoHint: editBuffer.tempoHint || undefined,
      scalingDown: editBuffer.scalingDown || editBuffer.scalingDownName || undefined,
      scalingUp: editBuffer.scalingUp || editBuffer.scalingUpName || undefined,
    };

    // Detailed logging for smoke diagnostics (visible in console on live too)
    console.log('[calisthenics-admin] save attempt', { isNew, id, name, hasTok: !!tok, tokLen: tok?.length || 0, w, hasMale: !!payload.previewImageRefMale, hasFemale: !!payload.previewImageRefFemale, cueCount: cues.length });

    setIsSaving(true);
    try {
      // Use single response var to avoid scope bugs on error reporting path (r vs res)
      let saveRes: any;
      const addFn = adminApi.addCaliExercise || (rootApi as any).addCaliExercise;
      const saveFn = adminApi.saveCaliOverride || (rootApi as any).saveCaliOverride;
      if (isNew) {
        saveRes = await addFn(w, tok, { exercise: payload });
        if (saveRes?.success) {
          toast.success(`Added ${name} — live in engine`);
        }
      } else {
        saveRes = await saveFn(w, tok, { override: payload });
        if (saveRes?.success) {
          toast.success(`Saved ${name} — live in engine`);
        }
      }

      const saveOk = !!saveRes?.success;
      if (saveOk) {
        const libraryReloaded = await loadLibrary();

        let roundtripOk = libraryReloaded;
        if (libraryReloaded) {
          try {
            const getLib2 = adminApi.getCaliLibrary || (rootApi as any).getCaliLibrary;
            const lib = await getLib2(w, tok);
            const fresh = (lib.data?.exercises || []).find((e: any) => e.id === (isNew ? id : selectedId));
            if (!fresh) {
              roundtripOk = false;
              console.warn('[calisthenics-admin] roundtrip: saved exercise missing from library response');
            } else {
              const legacy = fresh.previewImageRef || null;
              setEditBuffer({
                ...fresh,
                cues: [...(fresh.cues || [])],
                previewImageRefMale: fresh.previewImageRefMale || legacy,
                previewImageRefFemale: fresh.previewImageRefFemale || null,
                tempoHint: fresh.tempoHint || payload.tempoHint,
                scalingDown: fresh.scalingDown || fresh.scalingDownName,
                scalingUp: fresh.scalingUp || fresh.scalingUpName,
              });
              setDirty(false);

              if (fresh.name !== name) {
                roundtripOk = false;
                console.warn('[calisthenics-admin] roundtrip: name mismatch', { expected: name, got: fresh.name });
              }
              const hadImage = !!(payload.previewImageRefMale || payload.previewImageRefFemale || payload.previewImageRef);
              const freshHasImage = !!(fresh.previewImageRefMale || fresh.previewImageRefFemale || fresh.previewImageRef || legacy);
              if (hadImage && !freshHasImage) {
                roundtripOk = false;
                console.warn('[calisthenics-admin] roundtrip: image URL present in payload but missing in fresh library response');
              }
              if ((payload.description || payload.cues?.length) && !(fresh.description || (fresh.cues || []).length)) {
                roundtripOk = false;
                console.warn('[calisthenics-admin] roundtrip: core coaching data may not have persisted');
              }
            }
          } catch (re) {
            roundtripOk = false;
            console.warn('[calisthenics-admin] post-save roundtrip failed', re);
          }
        }

        if (libraryReloaded && roundtripOk) {
          setShowLiveBanner(true);
          setTimeout(() => setShowLiveBanner(false), 4200);
          try {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#D4A843", "#4274B9"] });
          } catch {}
        } else if (libraryReloaded) {
          toast.warning("Saved to server but roundtrip verification failed — refresh library and confirm changes");
        } else {
          toast.warning("Saved to server but library reload failed — changes may not be visible in the editor yet");
        }
      } else {
        const errMsg = saveRes?.error || (isNew ? 'Add failed (no error detail from server)' : 'Override failed (no error detail from server)');
        toast.error(`Save failed: ${errMsg}`);
        console.error('[calisthenics-admin] save error response', saveRes);
      }
    } catch (e: any) {
      console.error('[calisthenics-admin] save exception', e);
      const errDetail = e?.response?.error || e?.error || e?.message || String(e) || 'Unknown error';
      toast.error(`Save failed: ${errDetail}`);
    } finally {
      setIsSaving(false);
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

  // Keyboard pro-ops: Ctrl/Cmd+S to save, Esc to close editor.
  // Depends only on editBuffer so the effect re-subscribes when the form content changes.
  // The called functions are closed over from the render that attached the listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!editBuffer) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFromBuffer();
      }
      if (e.key === 'Escape') {
        cancelEdit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editBuffer]);

  if (!embedded) {
    if (!connected || !isAdmin) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 text-[#D4A843]" />
            <div style={ORBIT} className="text-xl mb-2">ADMIN ONLY</div>
            <p className="text-[#8494A7]">Connect an admin wallet and unlock the Admin Command Center, then open the Calisthenics panel.</p>
            <button onClick={() => navigate("/governance")} className="mt-4 px-4 py-2 bg-[#D4A843] text-black rounded">Back to Governance</button>
          </div>
        </div>
      );
    }
    if (!hasAdminSession) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 text-[#D4A843]" />
            <div style={ORBIT} className="text-xl mb-2">SIGNATURE REQUIRED</div>
            <p className="text-[#8494A7] max-w-md mx-auto">
              Calisthenics edits require a signed admin session (20-minute token). Unlock the Admin Command Center in Governance first — wallet-only access is not sufficient.
            </p>
            <button onClick={() => navigate("/governance")} className="mt-4 px-4 py-2 bg-[#D4A843] text-black rounded">Unlock in Governance</button>
          </div>
        </div>
      );
    }
  } else if (!propSessionToken) {
    return (
      <div className="p-6 text-center text-[#8494A7] text-sm">
        Admin session missing. Re-unlock the Admin Command Center in Governance.
      </div>
    );
  }

  // When embedded inside Admin Command Center (dropdown under live stats), use a contained
  // wrapper so it fits cleanly without fighting the parent panel card. "Just as it is" otherwise.
  const rootClass = embedded
    ? "w-full text-[#E8ECF0]"
    : "max-w-[1200px] mx-auto p-4 sm:p-6 pb-24 text-[#E8ECF0]";

  return (
    <>
      <div className={rootClass}>
        <div className="flex items-center gap-3 mb-4">
          {!embedded && (
            <button onClick={() => navigate("/governance")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-[#4274B9]/30 hover:bg-white/5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Command Center
            </button>
          )}
          {!embedded && (
            <div style={ORBIT} className="text-sm tracking-widest text-[#D4A843]">WCO CALISTHENICS ROUTINE OPERATOR CONSOLE</div>
          )}
        </div>

        {!hasAdminSession && embedded && (
          <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm">
            Admin session expired or missing — saves are disabled until you re-unlock the Admin Command Center.
          </div>
        )}

        {/* PROMINENT API BUNDLE WARNING — this is the #1 reason saves "do nothing" */}
        {!hasCaliMethods && (
          <div className="mb-4 p-4 rounded-xl border-2 border-red-500/70 bg-red-950/40 text-red-200">
            <div className="font-bold text-lg mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> CALI ADMIN API METHODS MISSING IN THIS BUNDLE
            </div>
            <div className="text-sm mb-2">
              The running JavaScript does not see <code>api.admin.getCaliLibrary / saveCaliOverride / getCaliStats</code>.<br />
              <strong>Local dev:</strong> Vite HMR often fails to pick up changes to <code>api.ts</code>. <strong>FULLY RESTART the dev server</strong> (Ctrl+C in terminal, then <code>npm run dev</code> again).<br />
              <strong>Live:</strong> The latest git push may not have finished building on Vercel yet, or you need a hard refresh (Ctrl+Shift+R).
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Hard Reload This Page</button>
              <button onClick={() => { console.log('Current api.admin keys:', Object.keys(((api as any)?.admin) || {})); toast.info('See console for debug keys'); }} className="px-3 py-1 border border-red-400 text-xs rounded">Log api.admin keys to console</button>
            </div>
            <div className="text-[10px] mt-1 opacity-75">After restarting dev server, hard-refresh the browser tab too.</div>
          </div>
        )}

      {/* EXERCISE EDITOR */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div style={ORBIT} className="uppercase text-xs tracking-widest">ROUTINE OPERATIONS — Edit or Add Exercises</div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded ${librarySource === 'full' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {exercises.length} / 250 {librarySource === 'full' ? 'LIVE' : 'OFFLINE LIBRARY'}
            </span>
            <span className="text-[#8494A7]">Bucket: {bucketImages.length}</span>
          </div>
        </div>

        <div className="mb-3 text-xs text-[#8494A7]">
          Hover any ⓘ for simple explanations of what changes and where users see it. Everything saved here updates live workouts instantly.
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
          <span className="text-[10px] text-[#8494A7] ml-1">Full list + editor only visible when pane is open</span>
        </div>



        {/* Wonderful live editor pane — EDIT/NEW unified. The full scroll list of ALL exercises is hidden until this pane is open. */}
        {editBuffer && selectedId ? (
          <div className="mt-1 p-4 border border-[#D4A843]/40 bg-[#111827] rounded">
            {/* Header + status */}
            <div className="flex justify-between mb-2">
              <div className="font-bold flex items-center gap-2" style={ORBIT}>
                {selectedId.startsWith('custom_') ? 'NEW EXERCISE' : 'EDIT EXERCISE'}: {editBuffer.name || 'Untitled'}
                {dirty && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">UNSAVED</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={openNewEditor} className="text-xs px-3 py-1 bg-emerald-600 text-black rounded">Switch to NEW</button>
                <button onClick={cancelEdit} className="text-xs px-3 py-1 border border-white/20 rounded">Close</button>
                <button
                  onClick={saveFromBuffer}
                  disabled={isSaving || !hasCaliMethods || librarySource !== 'full'}
                  className="text-xs px-3 py-1 bg-[#D4A843] text-black rounded flex items-center gap-1 disabled:opacity-60"
                  title={!hasCaliMethods ? "API methods missing in current bundle — see red warning above" : librarySource !== 'full' ? "Load LIVE library first (Refresh Library)" : ""}
                >
                  <Save className="w-3 h-3" />{isSaving ? 'Saving...' : 'Save to Live Engine'}
                </button>
              </div>
            </div>

            {/* Live impact banner (educational + reassuring) */}
            {showLiveBanner && (
              <div className="mb-3 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                ✓ Override stored. Changes (cues, description, image URL, name) are live — new workouts for all users will use them immediately.
              </div>
            )}

            {/* How overrides work (educational) */}
            <div className="mb-2 text-[10px] text-[#8494A7]">
              All edits are overrides. They are merged at generation time. <span className="text-[#D4A843]">New workout generations see them instantly.</span>
            </div>

            {/* Scroll selector — only visible inside EDIT/NEW pane (dropdown + scroll style). Full list when loaded via panel. */}
            <div className="mb-3">
              <div className="text-[10px] text-[#8494A7] mb-1 flex items-center justify-between gap-2">
                <span>FULL LIBRARY — scroll &amp; click any to edit (hover for more)</span>
                <div className="flex items-center gap-2">
                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="bg-[#111827] border border-white/10 rounded px-2 py-0.5 text-xs"
                    title="Filter by category (affects the list below)"
                  >
                    <option value="all">All categories</option>
                    <option value="push">push</option>
                    <option value="pull">pull</option>
                    <option value="core">core</option>
                    <option value="legs">legs</option>
                    <option value="conditioning">conditioning</option>
                    <option value="mobility">mobility</option>
                  </select>
                  <span>{exercises.length} total • max 250</span>
                </div>
              </div>
              <div className="border border-white/10 rounded p-1 max-h-52 overflow-y-auto bg-black/30 text-xs">
                {(() => {
                  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
                  const hasOverride = (id: string) => !!overrides[id];
                  return sorted.length > 0 ? sorted.map((ex) => {
                    const maleImg = getImageSrc(ex.previewImageRefMale || ex.previewImageRef);
                    const femaleImg = getImageSrc(ex.previewImageRefFemale);
                    const firstCue = (ex.cues && ex.cues[0]) || (ex.description || '').slice(0, 60);
                    const hasUrl = !!(ex.previewImageRefMale || ex.previewImageRef || ex.previewImageRefFemale);
                    const isOver = hasOverride(ex.id);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          setSelectedId(ex.id);
                          const legacy = ex.previewImageRef || null;
                          setEditBuffer({ 
                            ...ex, 
                            cues: [...(ex.cues || [])], 
                            description: ex.description || '', 
                            previewImageRefMale: ex.previewImageRefMale || legacy, 
                            previewImageRefFemale: ex.previewImageRefFemale || null 
                          });
                          setDirty(false);
                        }}
                        className={`flex items-start gap-2 p-1.5 cursor-pointer rounded hover:bg-[#D4A843]/10 ${selectedId === ex.id ? 'bg-[#D4A843]/20 ring-1 ring-[#D4A843]/40' : ''}`}
                        title="Click to load full current cues + description + URL into the editor"
                      >
                        <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                          {maleImg ? (
                            <img src={maleImg} className="w-6 h-6 object-contain border border-white/10 rounded" alt="male" title="Male" />
                          ) : (
                            <div className="w-6 h-6 border border-white/10 rounded flex items-center justify-center text-[8px] text-[#8494A7]">♂</div>
                          )}
                          {femaleImg ? (
                            <img src={femaleImg} className="w-6 h-6 object-contain border border-white/10 rounded" alt="female" title="Female" />
                          ) : (
                            <div className="w-6 h-6 border border-white/10 rounded flex items-center justify-center text-[8px] text-[#8494A7]">♀</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium leading-tight flex items-center gap-1">
                            {ex.name} <span className="text-[#8494A7] font-mono text-[10px]">({ex.id})</span>
                            {isOver && <span className="text-[9px] px-1 rounded bg-[#D4A843]/30 text-[#D4A843]">custom</span>}
                          </div>
                          <div className="text-[10px] text-[#8494A7] truncate">{ex.category} / {ex.pattern} {hasUrl ? '• ✓ URL' : ''} • { (ex.cues||[]).length } cues</div>
                          {firstCue && <div className="text-[10px] opacity-80 truncate mt-0.5">“{firstCue}”</div>}
                        </div>
                      </div>
                    );
                  }) : <div className="p-1 text-[#8494A7]">No matches — adjust search or filters.</div>;
                })()}
              </div>
              <div className="text-[9px] text-[#8494A7] mt-1">Search &amp; filters apply here. Custom = has operator override from this console.</div>
            </div>

            {/* Form — grouped professional sections with educational tooltips */}
            <div className="space-y-4">
              {/* Identity */}
              <div className="border border-white/10 rounded p-3 bg-black/20">
                <div className="text-[10px] uppercase tracking-widest text-[#D4A843] mb-2 flex items-center gap-1">Identity</div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-[10px] text-[#8494A7] flex items-center gap-1">
                      Name
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-[#6AA3E0] cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>Name shown as title in every generated workout, cards, and history. Edit freely — ID stays stable.</TooltipContent>
                      </Tooltip>
                    </label>
                    <input value={editBuffer.name || ''} onChange={e => updateBuffer('name', e.target.value)} className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded" placeholder="e.g. Hip 90/90" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8494A7] flex items-center gap-1">
                      ID (unique, no spaces)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-[#6AA3E0] cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>Stable internal key for generation, logging, overrides. Locked after first save. Used by engine to match the exercise.</TooltipContent>
                      </Tooltip>
                    </label>
                    <input value={editBuffer.id || ''} onChange={e => updateBuffer('id', e.target.value)} disabled={!selectedId.startsWith('custom_')} className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded disabled:opacity-60 font-mono text-xs" />
                  </div>
                </div>
              </div>

              {/* Educational + Coaching (the heart of operator control) */}
              <div className="border border-white/10 rounded p-3 bg-black/20">
                <div className="text-[10px] uppercase tracking-widest text-[#D4A843] mb-2 flex items-center gap-1">Educational &amp; Coaching Cues</div>
                <div className="md:col-span-2 mb-3">
                  <label className="text-[10px] text-[#8494A7] flex items-center gap-1">
                    Description (educational)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-[#6AA3E0] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Operator-written note. Will appear to users in the workout card (newly wired) as an educational lead-in. Use for why it matters or scaling tips.</TooltipContent>
                    </Tooltip>
                  </label>
                  <textarea value={editBuffer.description || ''} onChange={e => updateBuffer('description', e.target.value)} className="w-full h-14 bg-black/40 border border-white/10 px-2 py-1 rounded text-sm" placeholder="Short educational blurb shown to users..." />
                </div>

                <div>
                  <label className="text-[10px] text-[#8494A7] flex items-center gap-1">
                    Cues (shown live to users)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-[#6AA3E0] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>1-5 short actionable lines. These replace defaults and appear exactly under “FORM CUES” in every user’s collapsible coaching guide during workouts.</TooltipContent>
                    </Tooltip>
                  </label>
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
                    <input id="newcue" placeholder="New cue — press Enter" className="flex-1 bg-black/40 border border-white/10 px-2 py-1 text-xs rounded" onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim(); if (val) { updateBuffer('cues', [...(editBuffer.cues||[]), val]); (e.target as HTMLInputElement).value=''; }
                      }
                    }} />
                    <button onClick={() => {
                      const inp = document.getElementById('newcue') as HTMLInputElement; const val = inp?.value.trim(); if (val) { updateBuffer('cues', [...(editBuffer.cues||[]), val]); inp.value=''; }
                    }} className="text-xs px-2 bg-[#4274B9]/30 rounded">Add Cue</button>
                  </div>
                  <div className="text-[9px] text-[#8494A7] mt-0.5">Recommended: 3–5 cues. Keep them specific and scannable.</div>
                </div>
              </div>

              {/* Visual Asset — gender-specific Supabase URLs, always editable from bucket, no local files */}
              <div className="border border-white/10 rounded p-3 bg-black/20">
                <div className="text-[10px] uppercase tracking-widest text-[#D4A843] mb-2 flex items-center gap-1">
                  Visual Assets (Supabase WORKOUT BUCKET — Male / Female)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-[#6AA3E0] cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Set separate editable images per gender. Always pulled from Supabase (no local). If none for gender: shows "Upload an image" placeholder. Females in bucket — set here. Matches UI gender toggle in Movement Preview.</TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {/* Male */}
                  <div>
                    <label className="text-[10px] text-[#8494A7] mb-1 block">Male Preview URL</label>
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <input 
                        type="text" 
                        value={editBuffer.previewImageRefMale || ''} 
                        onChange={e => updateBuffer('previewImageRefMale', e.target.value || null)}
                        placeholder="https://.../male.jpg"
                        className="flex-1 min-w-[140px] bg-black/40 border border-white/10 px-1 py-0.5 text-xs font-mono rounded"
                      />
                      {getImageSrc(editBuffer.previewImageRefMale) ? (
                        <img src={getImageSrc(editBuffer.previewImageRefMale)} className="w-7 h-7 object-contain border border-white/10 rounded bg-black/40" alt="m" />
                      ) : (
                        <div className="w-7 h-7 rounded border border-dashed border-white/10 flex items-center justify-center text-[7px] text-center text-[#8494A7]">M</div>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-wrap">
                      <label className="cursor-pointer text-[8px] px-1 py-0.5 border border-white/20 rounded hover:bg-white/5">Up
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadToBucket(f); if (url) updateBuffer('previewImageRefMale', url); }} />
                      </label>
                      <select value={(editBuffer.previewImageRefMale && editBuffer.previewImageRefMale.includes('supabase')) ? editBuffer.previewImageRefMale : ''} onChange={e => updateBuffer('previewImageRefMale', e.target.value || null)} className="text-[8px] bg-black/40 border px-0.5 py-0.5 rounded max-w-[80px]" disabled={bucketLoading}>
                        <option value="">{bucketLoading ? "..." : "pick"}</option>
                        {bucketImages.map(url => <option key={url} value={url}>{url.split('/').pop()}</option>)}
                      </select>
                      <button onClick={async () => { if (!editBuffer.name) return; const q = editBuffer.name.toLowerCase(); const match = bucketImages.find(u => u.toLowerCase().includes(q)); if (match) { updateBuffer('previewImageRefMale', match); toast.success('Set male'); } }} className="text-[8px] px-1 py-0.5 border border-white/20 rounded">Sug</button>
                      <button onClick={() => updateBuffer('previewImageRefMale', null)} className="text-[8px] px-1 py-0.5">Clr</button>
                    </div>
                  </div>

                  {/* Female */}
                  <div>
                    <label className="text-[10px] text-[#8494A7] mb-1 block">Female Preview URL</label>
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <input 
                        type="text" 
                        value={editBuffer.previewImageRefFemale || ''} 
                        onChange={e => updateBuffer('previewImageRefFemale', e.target.value || null)}
                        placeholder="https://.../female.jpg"
                        className="flex-1 min-w-[140px] bg-black/40 border border-white/10 px-1 py-0.5 text-xs font-mono rounded"
                      />
                      {getImageSrc(editBuffer.previewImageRefFemale) ? (
                        <img src={getImageSrc(editBuffer.previewImageRefFemale)} className="w-7 h-7 object-contain border border-white/10 rounded bg-black/40" alt="f" />
                      ) : (
                        <div className="w-7 h-7 rounded border border-dashed border-white/10 flex items-center justify-center text-[7px] text-center text-[#8494A7]">F</div>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-wrap">
                      <label className="cursor-pointer text-[8px] px-1 py-0.5 border border-white/20 rounded hover:bg-white/5">Up
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadToBucket(f); if (url) updateBuffer('previewImageRefFemale', url); }} />
                      </label>
                      <select value={(editBuffer.previewImageRefFemale && editBuffer.previewImageRefFemale.includes('supabase')) ? editBuffer.previewImageRefFemale : ''} onChange={e => updateBuffer('previewImageRefFemale', e.target.value || null)} className="text-[8px] bg-black/40 border px-0.5 py-0.5 rounded max-w-[80px]" disabled={bucketLoading}>
                        <option value="">{bucketLoading ? "..." : "pick"}</option>
                        {bucketImages.map(url => <option key={url} value={url}>{url.split('/').pop()}</option>)}
                      </select>
                      <button onClick={async () => { if (!editBuffer.name) return; const q = editBuffer.name.toLowerCase(); const match = bucketImages.find(u => u.toLowerCase().includes(q)); if (match) { updateBuffer('previewImageRefFemale', match); toast.success('Set female'); } }} className="text-[8px] px-1 py-0.5 border border-white/20 rounded">Sug</button>
                      <button onClick={() => updateBuffer('previewImageRefFemale', null)} className="text-[8px] px-1 py-0.5">Clr</button>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-[#6AA3E0] mt-1">Always Supabase editable. No local. Placeholder if unset for gender. Set female URLs from bucket here.</div>
              </div>

              {/* Generator Tuning */}
              <div className="border border-white/10 rounded p-3 bg-black/20">
                <div className="text-[10px] uppercase tracking-widest text-[#D4A843] mb-2 flex items-center gap-1">Generator Tuning</div>
                <div className="grid md:grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <label className="text-[10px] text-[#8494A7] flex items-center gap-1">Pattern <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger><TooltipContent>Determines motion family + which block it can be chosen for (push/pull/core etc). Match your bucket image pose to the pattern.</TooltipContent></Tooltip></label>
                    <select value={editBuffer.pattern} onChange={e=>updateBuffer('pattern', e.target.value)} className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded text-xs">
                      {["horizontal_push","vertical_push","horizontal_pull","vertical_pull","squat","lunge","hinge","anti_extension","anti_rotation","flexion","iso_hold","locomotion","plyo","stretch"].map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8494A7] flex items-center gap-1">Category <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger><TooltipContent>High-level bucket for warmup vs main blocks. Mobility goes to warm-up automatically.</TooltipContent></Tooltip></label>
                    <select value={editBuffer.category} onChange={e=>updateBuffer('category', e.target.value)} className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded text-xs">
                      {["push","pull","core","legs","conditioning","mobility"].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2 items-center text-xs">
                    <span>Level</span>
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger>
                      <TooltipContent>Minimum workout level this exercise is eligible for (L1/L2/L3 users).</TooltipContent>
                    </Tooltip>
                    <input type="number" value={editBuffer.level||1} onChange={e=>updateBuffer('level', parseInt(e.target.value)||1)} className="w-12 bg-black/40 border px-1 rounded" />
                    <span className="ml-2">Diff</span>
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger>
                      <TooltipContent>Fine weight inside the level band. Higher = picked more often for harder sessions.</TooltipContent>
                    </Tooltip>
                    <input type="number" value={editBuffer.difficulty||5} onChange={e=>updateBuffer('difficulty', parseInt(e.target.value)||5)} className="w-12 bg-black/40 border px-1 rounded" />
                  </div>
                  <div className="flex gap-1 items-center text-xs">
                    <span>Dose</span>
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger>
                      <TooltipContent>Generator starting range hint [setsMin, setsMax, repsOrSecMin, repsOrSecMax]. Can be tuned per level in generator.</TooltipContent>
                    </Tooltip>
                    {(editBuffer.defaultDose||[3,4,8,12]).map((n:number,i:number)=> <input key={i} type="number" value={n} onChange={e=>{const d=[...(editBuffer.defaultDose||[])]; d[i]=parseInt(e.target.value)||0; updateBuffer('defaultDose',d);}} className="w-12 bg-black/40 border px-1 rounded"/> )}
                  </div>

                  {/* New parity fields: tempo + scaling names (user-visible in cards + ladder) */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                    <div>
                      <label className="text-[10px] text-[#8494A7] flex items-center gap-1">Tempo Hint
                        <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger>
                          <TooltipContent>Optional. Shown in user card as "Tempo: 3-0-1-0". Override for custom pacing notes on this exercise. Appears below name when present.</TooltipContent>
                        </Tooltip>
                      </label>
                      <input value={editBuffer.tempoHint || ''} onChange={e=>updateBuffer('tempoHint', e.target.value || undefined)} placeholder="3-0-1-0 or 5s descent" className="w-full bg-black/40 border border-white/10 px-2 py-0.5 rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8494A7] flex items-center gap-1">Scaling Beginner
                        <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger>
                          <TooltipContent>Name shown in ladder as the easier variant. Used in "Beginner" column of user coaching card. Often a simpler progression of this movement.</TooltipContent>
                        </Tooltip>
                      </label>
                      <input value={editBuffer.scalingDownName || editBuffer.scalingDown || ''} onChange={e=>updateBuffer('scalingDownName', e.target.value || undefined)} placeholder="e.g. push_wall" className="w-full bg-black/40 border border-white/10 px-2 py-0.5 rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8494A7] flex items-center gap-1">Scaling Advanced
                        <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-[#6AA3E0] cursor-help" /></TooltipTrigger>
                          <TooltipContent>Name shown in ladder as the harder variant. Used in "Advanced" column. Leave blank to hide that column.</TooltipContent>
                        </Tooltip>
                      </label>
                      <input value={editBuffer.scalingUpName || editBuffer.scalingUp || ''} onChange={e=>updateBuffer('scalingUpName', e.target.value || undefined)} placeholder="e.g. push_diamond" className="w-full bg-black/40 border border-white/10 px-2 py-0.5 rounded text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Simulate — what the athlete actually sees (educational & fun) */}
              <div className="border border-[#D4A843]/30 rounded p-3 bg-black/30">
                <div className="text-[10px] uppercase tracking-widest text-[#D4A843] mb-1.5 flex items-center justify-between">
                  Simulate User View (live preview)
                  <div className="flex gap-1 text-[9px]">
                    <button onClick={() => setSimGender('male')} className={`px-1.5 py-0.5 rounded ${simGender==='male' ? 'bg-[#D4A843] text-black' : 'border border-white/20'}`}>♂</button>
                    <button onClick={() => setSimGender('female')} className={`px-1.5 py-0.5 rounded ${simGender==='female' ? 'bg-[#D4A843] text-black' : 'border border-white/20'}`}>♀</button>
                  </div>
                </div>
                <div className="text-xs text-[#8494A7] mb-2">This is roughly what appears in a real workout card (gender-matched image from admin).</div>
                <div className="rounded-xl border border-[#4274B9]/30 p-3 bg-[#0B1120]/70 text-sm">
                  <div className="flex items-start gap-2">
                    {(() => {
                      const simPrev = simGender === 'female' ? (editBuffer.previewImageRefFemale || editBuffer.previewImageRef) : (editBuffer.previewImageRefMale || editBuffer.previewImageRef);
                      return getImageSrc(simPrev) ? (
                        <img src={getImageSrc(simPrev)} className="w-11 h-11 object-contain border border-white/10 rounded" alt="" />
                      ) : (
                        <div className="w-11 h-11 rounded border border-dashed border-white/10 flex items-center justify-center text-[9px] text-center text-[#8494A7]">Upload image in admin for {simGender}</div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{editBuffer.name || 'Untitled Exercise'}</div>
                      <div className="text-[10px] text-[#6AA3E0]">{(editBuffer.defaultDose||[3,4,8,12]).slice(0,2).join('-')} sets × {(editBuffer.defaultDose||[3,4,8,12])[2]}-{(editBuffer.defaultDose||[3,4,8,12])[3]} {(editBuffer.defaultDose||[])[2] > 20 ? 's' : 'reps'}</div>
                      {(editBuffer.tempoHint) && <div className="text-[9px] text-[#D4A843]/80">Tempo: {editBuffer.tempoHint}</div>}
                    </div>
                  </div>
                  {(editBuffer.description || '').trim() && (
                    <div className="mt-2 text-xs text-[#C8D0DC] italic border-t border-white/10 pt-1.5">Educational: {(editBuffer.description || '').slice(0, 140)}{(editBuffer.description||'').length > 140 ? '…' : ''}</div>
                  )}
                  <div className="mt-2">
                    <div className="text-[10px] font-bold text-[#6AA3E0] mb-0.5">FORM CUES (exact)</div>
                    <ul className="text-xs text-[#A3B0C2] space-y-0.5">
                      {((editBuffer.cues || []).slice(0, 4).length ? (editBuffer.cues || []).slice(0, 4) : ['(add cues above)']).map((c: string, i: number) => (
                        <li key={i} className="flex gap-1">✓ {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="text-[10px] text-[#8494A7] mt-1">Click EDIT / NEW EXERCISE to open the scrollable library and editor (with category filter). Every saved change flows directly into user workouts via the live override system.</div>
      </section>

      <div className="text-center text-[10px] text-[#8494A7] mt-8">WCO Calisthenics Routine Operator Console — educational tooltips • live simulate • overrides instantly live for users • 111+ exercises • 250 max</div>
      </div>

    </>
  );
}

