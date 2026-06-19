/**
 * BOTB Admin Panel — WCO Command Center
 * =======================================
 * Secure admin interface visible only to whitelisted wallet addresses.
 *
 * SECURITY:
 *   1. Only shown when wallet-context reports isAdmin === true
 *   2. Requires a second wallet signature to activate (challenge-sign)
 *   3. 20-minute session timeout with visible countdown
 *   4. Session token stored in memory only (never localStorage)
 *   5. Auto-locks on timeout, manual lock button available
 *
 * SIGNING FLOW:
 *   1. Admin clicks "Sign to Authenticate"
 *   2. Server generates challenge nonce (5-min expiry)
 *   3. wallet-connect.ts sends hedera_signMessage through WC relay
 *      → HashPack shows signing dialog (no redirect/deep-link)
 *   4. User approves in HashPack → signatureMap returned via relay
 *   5. Server verifies nonce + signature → issues 20-min session token
 *
 * TABS:
 *   Athletes  — Add/edit/remove athletes, set skills, NFT info, socials
 *   Brackets  — Create events with variable bracket sizes (2-12)
 *   Battles   — Manage matchups, voting windows, declare winners
 *   Proposals — Create governance proposals for Governor votes
 *   Sponsors  — Manage site sponsors and partnerships
 *   Snapshots — View reward distribution snapshots, export CSV
 *   Manual    — Operator instruction guide
 *   Test Tools— Debugging and testing tools
 *   Launch    — Launch guide and instructions
 *
 * CALISTHENICS EDITOR:
 *   The full routine operator console (111+ list + editor form + bucket uploads + simulate)
 *   is now embedded directly under LIVE TRAFFIC / CALISTHENICS stats as a dropdown.
 *   Click the CALISTHENICS stats panel to expand. Uses the live admin session token.
 *   No navigation away from the protected panel → saves are reliable and permanent.
 *   Secondary access still available via the "Cali Editor" bottom tab.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield, Lock, Unlock, Clock, LogOut, Users, Swords, Trophy,
  Vote, Camera, BookOpen, AlertTriangle, CheckCircle, Loader2,
  ChevronDown, Database, Fingerprint, Timer, X,
  ClipboardList, ExternalLink, Youtube, Download,
  Megaphone, Rocket, Activity, Dumbbell,
} from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { useWallet } from "./wallet-context";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "./error-boundary";
import { AthleteForm, type AthleteFormState } from "./athlete-form";
import { BracketBuilder } from "./bracket-builder";
import { BattlesTab } from "./battles-tab";
import { ProposalsTab } from "./proposals-tab";
import { SponsorsTab } from "./sponsors-tab";
import { GoldenEnvelopeButton, CEOLetterModal } from "./ceo-letter";
import { SilverEnvelopeButton, VotingArchitectureModal } from "./voting-architecture";
import { BronzeEnvelopeButton, FundingModelModal } from "./funding-model";
import { BlueEnvelopeButton, CalisthenicsAdminEnvelopeModal } from "./cali-admin-envelope";
import { TestToolsTab } from "./test-tools-tab";
import { LaunchGuideTab } from "./launch-guide-tab";
import { CalisthenicsAdminPage } from "../pages/calisthenics-admin";
import { AdminWelcomeOverlay } from "./admin-welcome";
import { AthleteOnboardedOverlay } from "./athlete-onboarded-overlay";
import { SnapshotsTab } from "./snapshots-tab";
import { CaliAdminStats } from "./cali/cali-admin-stats";
import { AdminAuthEnvelope } from "./admin-auth-envelope";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminTab = "athletes" | "brackets" | "battles" | "proposals" | "sponsors" | "snapshots" | "manual" | "test-tools" | "launch" | "cali-editor";

interface AdminSession {
  token: string;
  wallet: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Tab Definitions
// ---------------------------------------------------------------------------

const TABS: { id: AdminTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "athletes", label: "Athletes", icon: <Users className="w-4 h-4" />, description: "Add, edit, and manage athlete profiles" },
  { id: "brackets", label: "Brackets", icon: <Trophy className="w-4 h-4" />, description: "Create events and bracket matchups" },
  { id: "battles", label: "Battles", icon: <Swords className="w-4 h-4" />, description: "Manage battles and voting windows" },
  { id: "proposals", label: "Proposals", icon: <Vote className="w-4 h-4" />, description: "Create governance proposals" },
  { id: "sponsors", label: "Sponsors", icon: <Megaphone className="w-4 h-4" />, description: "Manage site sponsors and partnerships" },
  { id: "snapshots", label: "Snapshots", icon: <Camera className="w-4 h-4" />, description: "View reward snapshots and export" },
  { id: "manual", label: "Manual", icon: <BookOpen className="w-4 h-4" />, description: "Operator instructions and guide" },
  { id: "test-tools", label: "Test Tools", icon: <Database className="w-4 h-4" />, description: "Debugging and testing tools" },
  { id: "launch", label: "Launch", icon: <Rocket className="w-4 h-4" />, description: "BOTB token launch guide" },
  { id: "cali-editor", label: "Cali Editor", icon: <Dumbbell className="w-4 h-4" />, description: "Edit calisthenics exercises and custom images" },
];

// ---------------------------------------------------------------------------
// Admin Panel Component
// ---------------------------------------------------------------------------

export function AdminPanel() {
  const wallet = useWallet();
  const { accountId, isAdmin, connected, signMessage } = wallet;

  // Session state (in-memory only — never persisted)
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>("manual");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calisthenics editor dropdown (lives directly under live stats / cali ops zone).
  // Sits silently (collapsed) until admin clicks the CALISTHENICS panel to expand.
  // Uses the live session object — never navigates away.
  const [showCaliEditor, setShowCaliEditor] = useState(false);

  // Welcome overlay state — triggers after successful auth
  const [showWelcome, setShowWelcome] = useState(false);

  // ---------------------------------------------------------------------------
  // Session Timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!session) {
      setTimeRemaining(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, session.expiresAt - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        console.log("[Admin Panel] Session expired — auto-locking");
        setSession(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('adminSessionToken');
          sessionStorage.removeItem('adminSessionWallet');
          sessionStorage.removeItem('caliAdminSessionToken');
          sessionStorage.removeItem('caliAdminWallet');
        }
        toast.error("Admin session expired. Please re-authenticate.");
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  // Auto-lock when wallet disconnects
  useEffect(() => {
    if (!connected || !isAdmin) {
      setSession(null);
    }
  }, [connected, isAdmin]);

  // ---------------------------------------------------------------------------
  // Authentication Flow (Challenge → Sign via wallet-context → Verify)
  // ---------------------------------------------------------------------------
  const authenticate = useCallback(async () => {
    if (!accountId) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Step 1: Request challenge nonce from server
      console.log("[Admin Panel] Step 1: Requesting challenge from server...");
      const challengeRes = await api.requestChallenge(accountId);

      if (!challengeRes.success || !challengeRes.data) {
        throw new Error(challengeRes.error || "Failed to get challenge from server");
      }

      const { challenge, nonce } = challengeRes.data;
      console.log("[Admin Panel] Step 2: Challenge received, requesting wallet signature...");

      // Step 2: Sign via wallet-context → wallet-connect.ts → WC relay → HashPack
      // This sends hedera_signMessage through the relay. NO redirects, NO deep links.
      // The user must open HashPack to approve the signature.
      toast.info(
        "Check your HashPack wallet and approve the signature request to authenticate as admin.",
        { duration: 15000 }
      );

      const signature = await signMessage(challenge);

      if (!signature) {
        throw new Error("No signature received. Make sure HashPack is open and approve the request.");
      }

      console.log("[Admin Panel] Step 3: Signature received, verifying with server...");

      // Step 3: Send signature to server for verification + session token
      const verifyRes = await api.verifyChallenge(accountId, nonce, signature);

      if (!verifyRes.success || !verifyRes.data) {
        throw new Error(verifyRes.error || "Server verification failed");
      }

      // Step 4: Store session in memory (never localStorage)
      const newSession: AdminSession = {
        token: verifyRes.data.sessionToken,
        wallet: accountId,
        expiresAt: verifyRes.data.expiresAt,
      };

      setSession(newSession);
      setActiveTab("manual");
      // Persist to sessionStorage so sub-pages (legacy) or components can re-use the session.
      // The primary embedded editor (under stats) receives the token directly as props — no reliance on storage for saves.
      // without requiring re-auth (main admin itself uses in-memory for security).
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adminSessionToken', newSession.token);
        sessionStorage.setItem('adminSessionWallet', newSession.wallet);
        // Also write cali* aliases so any legacy direct page or other consumers see the same token.
        sessionStorage.setItem('caliAdminSessionToken', newSession.token);
        sessionStorage.setItem('caliAdminWallet', newSession.wallet);
      }
      toast.success("Admin authenticated! Session active for 20 minutes.");
      console.log("[Admin Panel] Authentication complete — session active");

      // Show welcome overlay
      setShowWelcome(true);

    } catch (err: any) {
      const message = err?.message || "Authentication failed";
      console.error("[Admin Panel] Auth error:", err);

      if (
        message.includes("cancelled") ||
        message.includes("rejected") ||
        message.includes("denied") ||
        message.includes("declined")
      ) {
        setAuthError("Signature request was cancelled. You must approve the signature in HashPack to authenticate.");
      } else if (message.includes("timed out")) {
        setAuthError("Signature request timed out. Open HashPack and try again.");
      } else {
        setAuthError(message);
      }
      toast.error(`Admin auth failed: ${message}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, [accountId, signMessage]);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const lockPanel = useCallback(async () => {
    if (session?.token) {
      try {
        await api.adminLogout(session.token);
      } catch (e) {
        // Best effort
      }
    }
    setSession(null);
    toast.info("Admin panel locked.");
  }, [session]);

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeRemaining > 0 && timeRemaining < 3 * 60 * 1000;

  // Guard: don't render if not admin
  if (!isAdmin || !connected) return null;

  // ---------------------------------------------------------------------------
  // LOCKED STATE — Show authentication gate
  // ---------------------------------------------------------------------------
  if (!session) {
    return (
      <AdminAuthEnvelope
        onAuthenticate={authenticate}
        isAuthenticating={isAuthenticating}
        hasError={!!authError}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // UNLOCKED STATE — Full Admin Panel
  // ---------------------------------------------------------------------------
  return (
    <>
    <AdminWelcomeOverlay
      show={showWelcome}
      walletId={session.wallet}
      onComplete={() => setShowWelcome(false)}
    />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 mb-6"
    >
      <div className="bg-gradient-to-br from-[#0f1923] to-[#111827] border border-[#D4A843]/30 rounded-2xl overflow-hidden">
        {/* Header with Session Timer */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#D4A843]/20 bg-gradient-to-r from-[#D4A843]/5 to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30">
                <Unlock className="w-4 h-4 text-[#10b981]" />
              </div>
              <div>
                <h2 className="text-[#E8ECF0] font-bold text-sm" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  ADMIN COMMAND CENTER
                </h2>
                <p className="text-[#8494A7] text-[0.6rem]">
                  Session active for <span className="font-mono text-[#D4A843]">{session.wallet}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Session Timer */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                isLowTime
                  ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                  : "bg-[#0B1120] border-[#D4A843]/20 text-[#D4A843]"
              }`}>
                <Clock className="w-3 h-3" />
                <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {/* Lock Button */}
              <button
                onClick={lockPanel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">LOCK</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live unique-IP visit counter — privacy-preserving traffic gauge */}
        <VisitCounter wallet={session.wallet} sessionToken={session.token} />

        {/* CALISTHENICS OPS ZONE — LIVE STATS + INLINE DROPDOWN EDITOR
            Click the stats area to expand/collapse the full edit tool (library + form).
            Editor runs inside this same protected panel using the live session token.
            No navigation away = reliable permanent saves. Sits silently when closed. */}
        <div className="border-b border-[#D4A843]/10 bg-[#0B1120]/30 px-4 sm:px-5 py-1">
          <div className="text-[0.5rem] uppercase tracking-[1.5px] text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
            CALISTHENICS OPS ZONE — STATS + DROPDOWN EDITOR (click panel to toggle)
          </div>
        </div>
        <CaliAdminStats
          wallet={session.wallet}
          sessionToken={session.token}
          onClick={() => setShowCaliEditor(v => !v)}
        />

        {/* Embedded Calisthenics Routine Editor — placed directly under the live stats.
            Renders the exact same tool (scrollable 111+ list + full form + uploads + simulate).
            When collapsed it takes zero extra space. Uses live session → saves are permanent. */}
        {showCaliEditor && (
          <div className="border-b border-[#D4A843]/10 bg-[#0B1120]/20 px-4 sm:px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontFamily: "Orbitron, sans-serif" }} className="text-[10px] tracking-widest text-[#D4A843]">
                ROUTINE OPERATIONS — EDIT OR ADD EXERCISES (inside Admin Command Center)
              </div>
              <button
                onClick={() => setShowCaliEditor(false)}
                className="text-[10px] px-2 py-0.5 border border-white/20 rounded hover:bg-white/5"
              >
                CLOSE EDITOR
              </button>
            </div>
            <CalisthenicsAdminPage
              embedded
              sessionToken={session.token}
              wallet={session.wallet}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-[#D4A843]/10 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/5"
                    : "border-transparent text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#162033]/50"
                }`}
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "athletes" && <AthletesTab wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "brackets" && <BracketBuilder wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "battles" && <BattlesTab wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "proposals" && <ProposalsTab wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "sponsors" && <SponsorsTab wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "snapshots" && <SnapshotsTab wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "manual" && <ManualTab />}
              {activeTab === "test-tools" && <TestToolsTab wallet={session.wallet} sessionToken={session.token} />}
              {activeTab === "launch" && <LaunchGuideTab />}
              {activeTab === "cali-editor" && <CalisthenicsAdminPage embedded sessionToken={session.token} wallet={session.wallet} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Athletes Tab
// ---------------------------------------------------------------------------

function AthletesTab({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [processingApp, setProcessingApp] = useState<string | null>(null);

  // Athlete onboarded celebration overlay
  const [showOnboarded, setShowOnboarded] = useState(false);
  const [onboardedAthlete, setOnboardedAthlete] = useState<{ name: string; country: string; nickname?: string }>({ name: "", country: "" });

  // Form state
  const [form, setForm] = useState<AthleteFormState>({
    name: "", fullName: "", nickname: "", country: "", bio: "", pfpUrl: "",
    specialMove: "", status: "active",
    email: "", phone: "",
    instagram: "", twitter: "", youtube: "", website: "",
    energy: 5, performance: 5, static: 5, aggression: 5, dynamic: 5,
    nftTokenId: "", nftImageUrl: "", nftRarity: "", nftMetadataUri: "", nftSeriesName: "Sigma Series",
    nftCardBorderColor: "#4274B9", nftCardGlowGradient: "from-[#4274B9] via-[#6AA3E0] to-[#4274B9]",
    bracketSeat: 0,
    wallet: "",
    primaryColor: "", secondaryColor: "",
    weightClass: "",
  });

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    const res = await api.getAthletes();
    if (res.success && res.data) {
      setAthletes(res.data);
    }
    setLoading(false);
  }, []);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    const res = await api.admin.getApplications(wallet, sessionToken);
    if (res.success && res.data) {
      setApplications(res.data);
    }
    setLoadingApps(false);
  }, [wallet, sessionToken]);

  useEffect(() => { loadAthletes(); loadApplications(); }, [loadAthletes, loadApplications]);

  const resetForm = () => {
    setForm({
      name: "", fullName: "", nickname: "", country: "", bio: "", pfpUrl: "",
      specialMove: "", status: "active",
      email: "", phone: "",
      instagram: "", twitter: "", youtube: "", website: "",
      energy: 5, performance: 5, static: 5, aggression: 5, dynamic: 5,
      nftTokenId: "", nftImageUrl: "", nftRarity: "", nftMetadataUri: "", nftSeriesName: "Sigma Series",
      nftCardBorderColor: "#4274B9", nftCardGlowGradient: "from-[#4274B9] via-[#6AA3E0] to-[#4274B9]",
      bracketSeat: 0,
      wallet: "",
      primaryColor: "", secondaryColor: "",
      weightClass: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const editAthlete = (athlete: any) => {
    setForm({
      name: athlete.name || "",
      fullName: athlete.fullName || "",
      nickname: athlete.nickname || "",
      country: athlete.country || "",
      bio: athlete.bio || "",
      pfpUrl: athlete.pfpUrl || "",
      specialMove: athlete.specialMove || "",
      status: athlete.status || "active",
      email: athlete.email || "",
      phone: athlete.phone || "",
      instagram: athlete.socials?.instagram || "",
      twitter: athlete.socials?.twitter || "",
      youtube: athlete.socials?.youtube || "",
      website: athlete.socials?.website || "",
      energy: athlete.skills?.energy ?? 5,
      performance: athlete.skills?.performance ?? 5,
      static: athlete.skills?.static ?? 5,
      aggression: athlete.skills?.aggression ?? 5,
      dynamic: athlete.skills?.dynamic ?? 5,
      nftTokenId: athlete.nftTokenId || "",
      nftImageUrl: athlete.nftImageUrl || "",
      nftRarity: athlete.nftRarity || "",
      nftMetadataUri: athlete.nftMetadataUri || "",
      nftSeriesName: athlete.nftSeriesName || "Sigma Series",
      nftCardBorderColor: athlete.nftCardBorderColor || "#4274B9",
      nftCardGlowGradient: athlete.nftCardGlowGradient || "",
      bracketSeat: athlete.bracketSeat ?? 0,
      wallet: athlete.wallet || "",
      primaryColor: athlete.primaryColor || "",
      secondaryColor: athlete.secondaryColor || "",
      weightClass: athlete.weightClass || "",
    });
    setEditingId(athlete.id);
    setShowForm(true);
  };

  const saveAthlete = async () => {
    if (!form.name || !form.fullName || !form.country || !form.bio) {
      toast.error("Please fill all required fields (Name, Full Name, Country, Bio)");
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        name: form.name,
        fullName: form.fullName,
        nickname: form.nickname,
        country: form.country,
        bio: form.bio,
        pfpUrl: form.pfpUrl || "placeholder",
        specialMove: form.specialMove,
        status: form.status,
        bracketSeat: form.bracketSeat,
        email: form.email,
        phone: form.phone,
        socials: {
          instagram: form.instagram,
          twitter: form.twitter,
          youtube: form.youtube,
          website: form.website,
        },
        skills: {
          energy: Number(form.energy),
          performance: Number(form.performance),
          static: Number(form.static),
          aggression: Number(form.aggression),
          dynamic: Number(form.dynamic),
        },
        nftTokenId: form.nftTokenId,
        nftImageUrl: form.nftImageUrl,
        nftRarity: form.nftRarity,
        nftMetadataUri: form.nftMetadataUri,
        nftSeriesName: form.nftSeriesName,
        nftCardBorderColor: form.nftCardBorderColor,
        nftCardGlowGradient: form.nftCardGlowGradient,
        wallet: form.wallet,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        weightClass: form.weightClass,
      };

      let res;
      if (editingId) {
        res = await api.admin.updateAthlete(editingId, data, wallet, sessionToken);
      } else {
        res = await api.admin.createAthlete(data, wallet, sessionToken);
      }

      if (res.success) {
        // Capture form data BEFORE resetForm() clears it
        const isNewAthlete = !editingId;
        const newAthleteInfo = isNewAthlete
          ? { name: form.name, country: form.country, nickname: form.nickname || undefined }
          : null;

        toast.success(`Athlete ${editingId ? "updated" : "created"} successfully!`);
        resetForm();
        loadAthletes();

        // Trigger celebration overlay for NEW athletes only (not edits)
        if (newAthleteInfo) {
          setOnboardedAthlete(newAthleteInfo);
          setShowOnboarded(true);
        }
      } else {
        toast.error(res.error || "Failed to save athlete");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setSaving(false);
    }
  };

  const deleteAthlete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    const res = await api.admin.deleteAthlete(id, wallet, sessionToken);
    if (res.success) {
      toast.success(`${name} deleted.`);
      loadAthletes();
    } else {
      toast.error(res.error || "Delete failed");
    }
  };

  const seedData = async () => {
    setSeeding(true);
    const res = await api.admin.seedInitialData(wallet, sessionToken);
    if (res.success && res.data) {
      toast.success(res.data.message);
      loadAthletes();
    } else {
      toast.error(res.error || "Seed failed");
    }
    setSeeding(false);
  };

  const downloadAppPfp = async (appId: string, name: string, adminWallet: string, sessionTok: string) => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57fcb0ee/admin/applications/${appId}/pfp-download`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Admin-Wallet": adminWallet,
            "X-Admin-Session": sessionTok,
          },
        }
      );
      if (!res.ok) {
        toast.error(`Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      a.download = `${(name || "athlete").replace(/[^a-zA-Z0-9._-]/g, "_")}-${appId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message || err));
    }
  };

  const processApplication = async (appId: string, action: "approve" | "reject") => {
    setProcessingApp(appId);
    const res = action === "approve"
      ? await api.admin.approveApplication(appId, wallet, sessionToken)
      : await api.admin.rejectApplication(appId, wallet, sessionToken);
    if (res.success) {
      toast.success(`Application ${action === "approve" ? "approved — athlete added to roster" : "rejected — data deleted"}.`);
      loadApplications();
      if (action === "approve") loadAthletes();
    } else {
      toast.error(res.error || "Action failed");
    }
    setProcessingApp(null);
  };

  const pendingApps = applications.filter((a: any) => a.status === "pending");
  const processedApps = applications.filter((a: any) => a.status !== "pending");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
            ATHLETE MANAGEMENT
          </h3>
          <p className="text-[#8494A7] text-xs">{athletes.length} athletes registered</p>
        </div>
        <div className="flex gap-2">
          {athletes.length === 0 && (
            <button
              onClick={seedData}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/30 text-[#6AA3E0] text-xs hover:bg-[#4274B9]/20 transition-all disabled:opacity-50"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
            >
              <Database className="w-3 h-3" />
              {seeding ? "SEEDING..." : "SEED INITIAL DATA"}
            </button>
          )}
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] text-xs hover:bg-[#D4A843]/20 transition-all"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
          >
            + ADD ATHLETE
          </button>
        </div>
      </div>

      {/* Athletes List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-[#D4A843] animate-spin mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm">Loading athletes...</p>
        </div>
      ) : athletes.length === 0 && !showForm ? (
        <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
          <Users className="w-8 h-8 text-[#4274B9]/30 mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm mb-2">No athletes yet.</p>
          <p className="text-[#8494A7] text-xs">Click "Seed Initial Data" to add Tony Gaste, Starboy, and Vitalii, or "Add Athlete" to create one manually.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {athletes.map((ath: any) => (
            <div
              key={ath.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#0B1120] border border-[#4274B9]/10 hover:border-[#4274B9]/30 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4274B9] to-[#6AA3E0] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {ath.rank || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[#E8ECF0] text-sm font-semibold truncate">{ath.name}</p>
                  <p className="text-[#8494A7] text-[0.6rem] truncate">
                    {ath.country} · {ath.wins}W-{ath.losses}L · PWR: {ath.totalPowerRating?.toFixed(1) || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded text-[0.55rem] ${
                  ath.status === "active" ? "bg-[#10b981]/10 text-[#10b981]" :
                  ath.status === "champion" ? "bg-[#D4A843]/10 text-[#D4A843]" :
                  "bg-red-500/10 text-red-400"
                }`}>{ath.status?.toUpperCase()}</span>
                <button
                  onClick={() => editAthlete(ath)}
                  className="px-2 py-1 text-[0.55rem] rounded bg-[#4274B9]/10 text-[#6AA3E0] hover:bg-[#4274B9]/20 transition-all"
                >
                  EDIT
                </button>
                <button
                  onClick={() => deleteAthlete(ath.id, ath.name)}
                  className="px-2 py-1 text-[0.55rem] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AthleteForm
              form={form}
              setForm={setForm}
              editingId={editingId}
              saving={saving}
              onSave={saveAthlete}
              onCancel={resetForm}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Athlete Applications ────────────────────────────────── */}
      <div className="mt-6 pt-4 border-t border-[#D4A843]/10">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-[#D4A843]" />
          <h4 className="text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
            ATHLETE APPLICATIONS
          </h4>
          {pendingApps.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[0.55rem] font-bold animate-pulse">
              {pendingApps.length} PENDING
            </span>
          )}
        </div>

        {loadingApps ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 text-[#D4A843] animate-spin mx-auto mb-2" />
            <p className="text-[#8494A7] text-xs">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-6 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
            <ClipboardList className="w-6 h-6 text-[#4274B9]/20 mx-auto mb-2" />
            <p className="text-[#8494A7] text-xs">No athlete applications yet.</p>
            <p className="text-[#8494A7] text-[0.6rem] mt-1">Athletes can apply at <span className="text-[#6AA3E0] font-mono">/apply</span></p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingApps.map((app: any) => (
              <div
                key={app.id}
                className="p-3 rounded-xl bg-[#0B1120] border border-amber-500/20 hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  {app.pfpSignedUrl ? (
                    <div className="shrink-0">
                      <img
                        src={app.pfpSignedUrl}
                        alt={app.name}
                        className="w-14 h-14 rounded-lg object-cover border border-[#4274B9]/20"
                      />
                      <button
                        onClick={() => downloadAppPfp(app.id, app.name, wallet, sessionToken)}
                        className="mt-1 w-14 flex items-center justify-center gap-0.5 px-1 py-0.5 text-[0.5rem] rounded bg-[#4274B9]/10 text-[#6AA3E0] hover:bg-[#4274B9]/20 transition-all border border-[#4274B9]/20"
                        title="Download original image"
                      >
                        <Download className="w-2.5 h-2.5" /> SAVE
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#162033] border border-dashed border-[#4274B9]/20 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-[#4274B9]/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[#E8ECF0] text-sm font-semibold truncate">{app.name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[0.5rem] bg-amber-500/10 text-amber-400 font-bold shrink-0">PENDING</span>
                    </div>
                    <p className="text-[#8494A7] text-[0.6rem] truncate">
                      {app.fullName} · {app.country} · Wallet: <span className="font-mono text-[#6AA3E0]">{app.wallet}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {app.weightClass && (
                        <span className="px-1.5 py-0.5 rounded text-[0.5rem] bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/20 font-bold">
                          {app.weightClass}
                        </span>
                      )}
                      {app.email && (
                        <span className="text-[0.55rem] text-[#8494A7]">✉ {app.email}</span>
                      )}
                      {app.phone && (
                        <span className="text-[0.55rem] text-[#8494A7]">☎ {app.phone}</span>
                      )}
                    </div>
                    <p className="text-[#8494A7] text-[0.55rem] mt-1 line-clamp-2">{app.bio}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {app.youtubeRoutine && (
                        <a href={app.youtubeRoutine} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[0.55rem] text-red-400 hover:text-red-300">
                          <Youtube className="w-3 h-3" /> Routine Video
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {app.socials?.instagram && <span className="text-[0.55rem] text-pink-400">IG: {app.socials.instagram}</span>}
                      {app.socials?.twitter && <span className="text-[0.55rem] text-sky-400">X: {app.socials.twitter}</span>}
                      {app.specialMove && <span className="text-[0.55rem] text-[#D4A843]">★ {app.specialMove}</span>}
                      <span className="text-[0.5rem] text-[#8494A7]">{new Date(app.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => processApplication(app.id, "approve")}
                      disabled={processingApp === app.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[0.55rem] rounded-lg bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 transition-all disabled:opacity-50 border border-[#10b981]/20"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      {processingApp === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      APPROVE
                    </button>
                    <button
                      onClick={() => processApplication(app.id, "reject")}
                      disabled={processingApp === app.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[0.55rem] rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 border border-red-500/20"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      <X className="w-3 h-3" />
                      REJECT
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {processedApps.map((app: any) => (
              <div
                key={app.id}
                className="p-3 rounded-xl bg-[#0B1120] border border-[#4274B9]/10 opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[#E8ECF0] text-sm font-semibold truncate">{app.name}</p>
                    <p className="text-[#8494A7] text-[0.6rem]">{app.country} · {app.wallet}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[0.5rem] font-bold ${
                    app.status === "approved" ? "bg-[#10b981]/10 text-[#10b981]" : "bg-red-500/10 text-red-400"
                  }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {app.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Athlete Onboarded Celebration Overlay */}
      <AthleteOnboardedOverlay
        show={showOnboarded}
        athleteName={onboardedAthlete.name}
        athleteCountry={onboardedAthlete.country}
        athleteNickname={onboardedAthlete.nickname}
        onComplete={() => setShowOnboarded(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder Tab (for upcoming features)
// ---------------------------------------------------------------------------

function PlaceholderTab({ tab, description }: { tab: string; description: string }) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex p-3 rounded-full bg-[#4274B9]/5 border border-[#4274B9]/20 mb-3">
        <Swords className="w-8 h-8 text-[#4274B9]/40" />
      </div>
      <h3 className="text-[#E8ECF0] font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
        {tab.toUpperCase()} — COMING NEXT
      </h3>
      <p className="text-[#8494A7] text-sm max-w-md mx-auto">{description}</p>
      <p className="text-[#8494A7] text-xs mt-3">
        This tab will be fully functional after the next implementation step.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual Tab — Operator Instructions
// ---------------------------------------------------------------------------

function ManualTab() {
  const [openSection, setOpenSection] = useState<string | null>("getting-started");
  const [showCEOLetter, setShowCEOLetter] = useState(false);
  const [showVotingArchitecture, setShowVotingArchitecture] = useState(false);
  const [showFundingModel, setShowFundingModel] = useState(false);
  const [showCaliEnvelope, setShowCaliEnvelope] = useState(false);

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: (
        <div className="space-y-3 text-sm text-[#8494A7]">
          <p>Welcome to the <span className="text-[#D4A843] font-semibold">WCO Admin Command Center</span>. This panel is exclusively available to authorized WCO admin wallets.</p>
          <div className="bg-[#162033] rounded-lg p-3 border border-[#4274B9]/10">
            <p className="text-[#6AA3E0] text-xs font-bold mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>SECURITY NOTICE</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>You must sign a wallet message each time you access admin features</li>
              <li>The signature request appears in your HashPack wallet — open it and approve</li>
              <li>Sessions automatically expire after <span className="text-[#D4A843]">20 minutes</span></li>
              <li>The timer is visible at the top right — when it runs out, you'll need to re-sign</li>
              <li>Click "LOCK" at any time to end your session early</li>
              <li>Never share your admin wallet or approve unknown signature requests</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "athletes",
      title: "Managing Athletes",
      content: (
        <div className="space-y-3 text-sm text-[#8494A7]">
          <p>The <span className="text-[#6AA3E0]">Athletes</span> tab lets you add and manage all athletes in the BOTB system.</p>
          <div className="bg-[#162033] rounded-lg p-3 border border-[#4274B9]/10">
            <p className="text-[#6AA3E0] text-xs font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>STEP BY STEP</p>
            <ol className="text-xs space-y-1.5 list-decimal list-inside">
              <li><span className="text-[#E8ECF0]">Click "ADD ATHLETE"</span> to open the creation form</li>
              <li>Fill in required fields: <span className="text-[#D4A843]">Name, Full Name, Country, Bio</span></li>
              <li>Set initial <span className="text-[#D4A843]">skill ratings</span> (0-10) for each category — Governors will adjust these via voting</li>
              <li>Add social links (Instagram, Twitter, YouTube) — these link directly from the Athletes page</li>
              <li>NFT data is <span className="text-[#D4A843]">optional until minted</span> — add Token ID, card image URL, and metadata URI when ready</li>
              <li>Click <span className="text-[#D4A843]">CREATE ATHLETE</span> — the athlete instantly appears on the Athletes, Battles, and Leaderboard pages</li>
            </ol>
          </div>
          <p className="text-xs"><span className="text-[#D4A843]">First time?</span> Use "SEED INITIAL DATA" to auto-create Tony Gaste, Starboy, and Vitalii with their real skill ratings.</p>
        </div>
      ),
    },
    {
      id: "brackets",
      title: "Creating Brackets & Events",
      content: (
        <div className="space-y-3 text-sm text-[#8494A7]">
          <p>Events contain brackets that generate battles automatically.</p>
          <div className="bg-[#162033] rounded-lg p-3 border border-[#4274B9]/10">
            <p className="text-[#6AA3E0] text-xs font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>HOW BRACKETS WORK</p>
            <ul className="text-xs space-y-1.5 list-disc list-inside">
              <li>Choose bracket size: <span className="text-[#D4A843]">2, 4, 6, 8, 10, or 12</span> athletes</li>
              <li>Seat 1 = top seed (best athlete), Seat 12 = #2 seed (for 12-man brackets)</li>
              <li>The system auto-generates matchups based on seed order</li>
              <li>Battles are created for each matchup with default voting windows</li>
              <li>You can adjust voting start/end times for each battle individually</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "voting",
      title: "Voting & Rewards Cycle",
      content: (
        <div className="space-y-3 text-sm text-[#8494A7]">
          <p>The battle lifecycle flows through these stages:</p>
          <div className="bg-[#162033] rounded-lg p-3 border border-[#4274B9]/10">
            <div className="flex flex-wrap gap-1.5 text-[0.55rem]">
              {["DRAFT", "UPCOMING", "VOTING OPEN", "VOTING CLOSED", "WINNER DECLARED", "REWARDS DISTRIBUTED"].map((status, i) => (
                <span key={status} className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#4274B9]/10 text-[#6AA3E0] border border-[#4274B9]/20" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {status}
                  </span>
                  {i < 5 && <span className="text-[#8494A7]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
          <ul className="text-xs space-y-1.5 list-disc list-inside">
            <li>When you <span className="text-[#D4A843]">declare a winner</span>, a reward snapshot is auto-generated</li>
            <li>The snapshot lists every wallet that voted for the winner with their proportional share</li>
            <li>Download the snapshot as CSV and run the airdrop script to distribute WCO tokens</li>
            <li>Governor NFT holders get <span className="text-[#D4A843]">2x voting power</span></li>
            <li>Sigma Series NFT holders get <span className="text-[#D4A843]">1.5x voting power</span></li>
          </ul>
        </div>
      ),
    },
    {
      id: "security",
      title: "Security Best Practices",
      content: (
        <div className="space-y-3 text-sm text-[#8494A7]">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-xs font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>CRITICAL SECURITY RULES</p>
            <ul className="text-xs space-y-1.5 list-disc list-inside text-red-300/80">
              <li>Never share your admin wallet seed phrase or private keys</li>
              <li>Only sign messages you initiated — never approve unexpected signature requests</li>
              <li>Lock the admin panel when stepping away, even briefly</li>
              <li>If you suspect unauthorized access, immediately disconnect and contact the team</li>
              <li>Admin wallet addresses are stored <span className="text-red-400 font-semibold">server-side only</span> and never exposed to the frontend</li>
            </ul>
          </div>
          <p className="text-xs">Two admin wallets are whitelisted. If a wallet is compromised, contact the dev team immediately to rotate credentials.</p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-5 h-5 text-[#D4A843]" />
        <div>
          <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
            OPERATOR MANUAL
          </h3>
          <p className="text-[#8494A7] text-xs">How to use the WCO Admin Command Center</p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="bg-[#0B1120] rounded-xl border border-[#4274B9]/10 overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-[#162033]/50 transition-all"
            >
              <span className="text-[#E8ECF0] text-xs font-semibold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                {section.title}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#8494A7] transition-transform ${
                  openSection === section.id ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence>
              {openSection === section.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3">{section.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Golden Envelope — Letter to the CEO */}
      <div className="mt-8 pt-6 border-t border-[#D4A843]/10">
        <div className="flex flex-wrap items-start justify-center gap-6">
          <GoldenEnvelopeButton onClick={() => setShowCEOLetter(true)} />
          <SilverEnvelopeButton onClick={() => setShowVotingArchitecture(true)} />
          <BronzeEnvelopeButton onClick={() => setShowFundingModel(true)} />
          <BlueEnvelopeButton onClick={() => setShowCaliEnvelope(true)} />
        </div>
      </div>
      <CEOLetterModal open={showCEOLetter} onClose={() => setShowCEOLetter(false)} />
      <VotingArchitectureModal open={showVotingArchitecture} onClose={() => setShowVotingArchitecture(false)} />
      <FundingModelModal open={showFundingModel} onClose={() => setShowFundingModel(false)} />
      <CalisthenicsAdminEnvelopeModal open={showCaliEnvelope} onClose={() => setShowCaliEnvelope(false)} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// VisitCounter — Live unique-IP traffic gauge
// ───────────────────────────────────────────────────────────────────────────
// Server hashes IPs with a daily-rotating HMAC salt; raw addresses never
// touch the database. This component just polls /admin/visit-stats every
// 30s and shows the running counts. Auto-pauses when the tab is hidden.
// ───────────────────────────────────────────────────────────────────────────
function VisitCounter({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [stats, setStats] = useState<{
    today: number;
    yesterday: number;
    last7d: number;
    last30d: number;
    total: number;
    walletsConnected: number;
    walletsVoted: number;
    workoutsGenerated: number;
    userWallets: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const lastTodayRef = useRef<number>(0);

  const load = useCallback(async () => {
    const res = await api.admin.getVisitStats(wallet, sessionToken);
    if (res.success && res.data) {
      const d = res.data;
      // Pulse when today's count ticks up — visual heartbeat for the admin
      if (lastTodayRef.current > 0 && d.today > lastTodayRef.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
      }
      lastTodayRef.current = d.today;
      setStats({
        today: d.today,
        yesterday: d.yesterday,
        last7d: d.last7d,
        last30d: d.last30d,
        total: d.total,
        walletsConnected: d.walletsConnected || 0,
        walletsVoted: d.walletsVoted || 0,
        workoutsGenerated: d.workoutsGenerated || 0,
        userWallets: d.userWallets || 0,
      });
    }
    setLoading(false);
  }, [wallet, sessionToken]);

  useEffect(() => {
    load();
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(load, 30_000);
    };
    const stop = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") { load(); start(); } else { stop(); }
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="px-4 sm:px-5 py-3 border-b border-[#D4A843]/10 bg-[#0B1120]/40">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 ${pulse ? "animate-pulse" : ""}`}>
            <Activity className={`w-3.5 h-3.5 text-[#10b981] ${pulse ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#E8ECF0] text-[0.65rem] font-bold tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                LIVE TRAFFIC
              </span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]"></span>
              </span>
            </div>
            <p className="text-[#8494A7] text-[0.55rem] mt-0.5">
              Unique visitors · IPs are hashed, never stored
            </p>
          </div>
        </div>

        {loading && !stats ? (
          <div className="flex items-center gap-2 text-[#8494A7] text-[0.6rem]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading…
          </div>
        ) : stats ? (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Stat label="TODAY" value={fmt(stats.today)} highlight pulse={pulse} />
            <Stat label="YESTERDAY" value={fmt(stats.yesterday)} />
            <Stat label="7-DAY" value={fmt(stats.last7d)} />
            <Stat label="30-DAY" value={fmt(stats.last30d)} />
            <Stat label="ALL-TIME IPs" value={fmt(stats.total)} />
            <Stat label="WALLETS CONNECTED" value={fmt(stats.walletsConnected)} accent="gold" />
            <Stat label="WALLETS VOTED" value={fmt(stats.walletsVoted)} accent="gold" />
            <Stat label="WORKOUTS GENERATED" value={fmt(stats.workoutsGenerated)} accent="gold" />
            <Stat label="USER WALLETS" value={fmt(stats.userWallets)} accent="gold" />
          </div>
        ) : (
          <span className="text-[#8494A7] text-[0.6rem]">Stats unavailable</span>
        )}
      </div>
    </div>
  );
}

function Stat({
  label, value, highlight, pulse, accent,
}: {
  label: string; value: string; highlight?: boolean; pulse?: boolean; accent?: "gold";
}) {
  const isGold = accent === "gold";
  const containerCls = highlight
    ? "bg-[#10b981]/10 border-[#10b981]/40"
    : isGold
      ? "bg-[#D4A843]/10 border-[#D4A843]/40"
      : "bg-[#162033] border-[#4274B9]/15";
  const valueCls = highlight
    ? "text-[#10b981]"
    : isGold
      ? "text-[#D4A843]"
      : "text-[#E8ECF0]";
  return (
    <div
      className={`px-2.5 py-1.5 rounded-lg border ${containerCls} ${pulse && highlight ? "ring-2 ring-[#10b981]/40" : ""} transition-all`}
    >
      <div className="text-[#8494A7] text-[0.5rem] tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
        {label}
      </div>
      <div
        className={`text-xs font-bold tabular-nums ${valueCls}`}
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        {value}
      </div>
    </div>
  );
}