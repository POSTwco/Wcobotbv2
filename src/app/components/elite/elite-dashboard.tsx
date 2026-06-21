import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Crown, Loader2, ChevronRight, Wrench, Sparkles, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { useEliteSession } from "./elite-context";
import { EliteSponsoredAthleteCta } from "./elite-sponsored-athlete-cta";
import { EliteFeaturedAthleteSpotlight } from "./elite-featured-athlete";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const HEADER_STYLES_ID = "elite-pro-vault-header-keyframes";

function ensureHeaderStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(HEADER_STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = HEADER_STYLES_ID;
  style.textContent = `
    @keyframes elite-pro-vault-glow-pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.98); }
      50%      { opacity: 0.85; transform: scale(1.02); }
    }
  `;
  document.head.appendChild(style);
}

const TRACKS = [
  { id: "static", label: "Static Power", desc: "Holds 3s+ — levers, planches, flags" },
  { id: "ascension", label: "Ascension", desc: "Muscle-ups, hefesto, skin-the-cat" },
  { id: "dynamic", label: "Dynamic Spins", desc: "360s, geingers, alley-oops" },
  { id: "flow", label: "Combos & Flow", desc: "Battle chains and freestyle" },
  { id: "auto", label: "Auto Focus", desc: "Engine picks today's skill track" },
] as const;

const DURATIONS = [60, 90, 120] as const;

export function EliteDashboard() {
  const elite = useEliteSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [skillTrack, setSkillTrack] = useState<string>("auto");
  const [durationTarget, setDurationTarget] = useState<number>(90);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!elite.sessionToken) return;
    setLoading(true);
    const res = await api.elite.getProfile(elite.sessionToken);
    if (res.success && res.data?.profile) {
      setProfile(res.data.profile);
      setSkillTrack(res.data.profile.skillTrack || "static");
      setDurationTarget(res.data.profile.durationTarget || 90);
    } else {
      // Use defaults so generate still works if profile read fails transiently
      setProfile({ skillTrack: "static", durationTarget: 90, equipment: ["bar", "none"] });
      elite.handleAuthError(res.code);
      setError(res.error || "Failed to load profile — you can still generate a session.");
    }
    setLoading(false);
  }, [elite.sessionToken, elite.handleAuthError]);

  useEffect(() => { ensureHeaderStyles(); }, []);
  useEffect(() => { load(); }, [load]);

  const onGenerate = async () => {
    if (!elite.sessionToken) return;
    setGenerating(true);
    setError(null);
    await api.elite.updateProfile(elite.sessionToken, { skillTrack, durationTarget });
    const res = await api.elite.generate(elite.sessionToken, { skillTrack, durationTarget });
    setGenerating(false);
    if (res.success && res.data?.workout?.workoutId) {
      navigate(`/calisthenics/elite/workout/${res.data.workout.workoutId}`);
    } else {
      elite.handleAuthError(res.code);
      setError(res.error || "Generation failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#D4A843] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <Link to="/calisthenics" className="inline-flex items-center gap-1.5 text-[#8494A7] text-xs mb-6 hover:text-[#D4A843]" style={dmSans}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Calisthenics
      </Link>

      <div className="relative mb-8">
        <div
          className="absolute -inset-1.5 rounded-[1.35rem] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(212,168,67,0.45) 0%, rgba(66,116,185,0.2) 50%, transparent 75%)",
            filter: "blur(16px)",
            animation: "elite-pro-vault-glow-pulse 3s ease-in-out infinite",
          }}
          aria-hidden
        />
        <div
          className="absolute -inset-[2px] rounded-[1.25rem] pointer-events-none"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(212,168,67,0.7) 0%,
              rgba(168,216,234,0.45) 40%,
              rgba(212,168,67,0.55) 70%,
              rgba(212,168,67,0.7) 100%
            )`,
          }}
          aria-hidden
        />
        <div
          className="relative rounded-2xl overflow-hidden border border-white/[0.12] p-6"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(212,168,67,0.14) 0%,
              rgba(11,17,32,0.78) 35%,
              rgba(66,116,185,0.08) 65%,
              rgba(212,168,67,0.1) 100%
            )`,
            backdropFilter: "blur(20px) saturate(1.6)",
            WebkitBackdropFilter: "blur(20px) saturate(1.6)",
            boxShadow:
              "0 0 40px rgba(212,168,67,0.15), inset 0 1px 0 rgba(255,248,220,0.15), inset 0 -8px 24px rgba(0,0,0,0.2)",
          }}
        >
          <div
            className="absolute inset-0 backdrop-blur-[2px] bg-white/[0.03] pointer-events-none"
            style={{ boxShadow: "inset 0 0 28px rgba(255,255,255,0.04)" }}
            aria-hidden
          />
          <motion.div
            className="absolute inset-0 mix-blend-screen pointer-events-none"
            style={{
              background: `linear-gradient(
                125deg,
                transparent 0%,
                rgba(201,162,39,0.1) 18%,
                rgba(168,216,234,0.14) 38%,
                rgba(212,168,67,0.12) 68%,
                transparent 88%
              )`,
              backgroundSize: "220% 220%",
            }}
            animate={{ backgroundPosition: ["0% 40%", "100% 60%", "0% 40%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-[#D4A843] drop-shadow-[0_0_8px_rgba(212,168,67,0.5)]" />
              <h1 className="text-xl sm:text-2xl font-bold text-white" style={orbitron}>PRO VAULT UNLOCKED</h1>
            </div>
            <p className="text-sm text-[#A3B0C2]" style={dmSans}>
              PRO CALISTHENICS · BATTLE OF THE BARS · Elite 1–2 hour skill sessions. Copy → drill → dominate.
            </p>
          </div>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-bold tracking-widest text-[#D4A843] mb-3" style={orbitron}>SKILL TRACK</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSkillTrack(t.id)}
              className={`text-left p-3 rounded-xl border transition-all ${skillTrack === t.id ? "border-[#D4A843]/50 bg-[#D4A843]/10" : "border-[#4274B9]/15 bg-white/[0.02] hover:border-[#D4A843]/30"}`}
            >
              <p className="text-sm font-semibold text-white" style={dmSans}>{t.label}</p>
              <p className="text-[0.65rem] text-[#8494A7] mt-0.5" style={dmSans}>{t.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold tracking-widest text-[#D4A843] mb-3" style={orbitron}>SESSION LENGTH</h2>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDurationTarget(d)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${durationTarget === d ? "border-[#D4A843] bg-[#D4A843]/15 text-[#D4A843]" : "border-[#4274B9]/20 text-[#8494A7]"}`}
              style={orbitron}
            >
              {d} min
            </button>
          ))}
        </div>
      </section>

      {error && <p className="text-red-300 text-sm mb-4" style={dmSans}>{error}</p>}

      <button
        type="button"
        disabled={generating}
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-[#0B1120] mb-3 disabled:opacity-50"
        style={{ ...dmSans, background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        Generate Elite Session
        <ChevronRight className="w-4 h-4" />
      </button>

      <Link
        to="/calisthenics/elite/custom"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#D4A843]/30 text-[#D4A843] text-sm font-semibold hover:bg-[#D4A843]/5 mb-4"
        style={dmSans}
      >
        <Wrench className="w-4 h-4" /> Build Custom Workout
      </Link>

      <EliteSponsoredAthleteCta />

      <EliteFeaturedAthleteSpotlight />
    </div>
  );
}