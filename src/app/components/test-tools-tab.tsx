/**
 * BOTB Phase 2 Test Tools Tab — Admin Command Center
 * ====================================================
 * Provides the CEO with a complete testing toolkit for live Phase 2 testing.
 * Every action requires an active admin session (challenge-sign + 20-min token).
 *
 * SECURITY TIERS:
 *   Tier 1 (safe)       — Simple confirm button (cache flush, no data loss)
 *   Tier 2 (destructive) — Wallet re-sign required before execution
 *
 * Nuclear / platform-wide wipe tools were retired pre-mainnet (deployment safety).
 *
 * REMOVAL: Delete this entire file when going fully live. Also remove:
 *   - The "test-tools" tab entry in admin-panel.tsx
 *   - The testTools section in api.ts
 *   - The /admin/test/* routes in server/index.tsx
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle, Trash2, RotateCcw, Database, RefreshCw,
  Loader2, CheckCircle, XCircle, Swords, Vote, Users,
  Trophy, MessageSquare, Camera, Zap, BarChart3,
  ChevronDown, ChevronRight, Shield, Fingerprint, Lock,
  ShieldAlert, Wifi, Eye, Clock,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useWallet } from "./wallet-context";
import type { Battle, Proposal, Athlete, BattleEvent } from "../lib/types";

import React from "react";

interface TestToolsTabProps {
  wallet: string;
  sessionToken: string;
}

// Security tiers for confirmation modals
type SecurityTier = "safe" | "destructive";

// ---------------------------------------------------------------------------
// Enhanced Confirmation Modal with Wallet Re-Sign
// ---------------------------------------------------------------------------
function SecureConfirmModal({
  open, onClose, onConfirm, title, description, confirmLabel,
  tier, loading, walletId, signMessage,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel: string;
  tier: SecurityTier; loading?: boolean;
  walletId: string;
  signMessage: (msg: string) => Promise<string | null>;
}) {
  const [step, setStep] = useState<"warning" | "signing" | "signed">("warning");
  const [signError, setSignError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const requiresSign = tier === "destructive";

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep("warning");
      setSignError(null);
      setIsSigning(false);
    }
  }, [open]);

  if (!open) return null;

  const tierColors = {
    safe: { border: "border-[#D4A843]/30", bg: "bg-[#D4A843]/10", text: "text-[#D4A843]" },
    destructive: { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400" },
  };
  const tc = tierColors[tier];

  const handleNextFromWarning = () => {
    if (requiresSign) {
      handleSign();
    } else {
      onConfirm();
    }
  };

  const handleSign = async () => {
    setStep("signing");
    setIsSigning(true);
    setSignError(null);

    try {
      // Generate a unique challenge message for this specific action
      const timestamp = new Date().toISOString();
      const challenge = `BOTB Admin Test Tool Confirmation\n\nAction: ${title}\nWallet: ${walletId}\nTimestamp: ${timestamp}\n\nBy signing this message, I confirm I am the authorized admin executing this destructive test operation.`;

      toast.info("Check your HashPack wallet — approve the signature to confirm this action.", { duration: 12000 });

      const signature = await signMessage(challenge);

      if (!signature) {
        setSignError("Signature cancelled or timed out. The action was NOT executed.");
        setStep("warning");
        setIsSigning(false);
        return;
      }

      // Signature received — mark as verified
      setStep("signed");
      setIsSigning(false);

      // Small delay so the user sees the "verified" state before action fires
      await new Promise((r) => setTimeout(r, 400));
      onConfirm();
    } catch (err: any) {
      const msg = err?.message || "Signature failed";
      if (msg.includes("cancelled") || msg.includes("rejected") || msg.includes("denied")) {
        setSignError("You cancelled the signature. The action was NOT executed.");
      } else if (msg.includes("timed out")) {
        setSignError("Signature request timed out. Open HashPack and try again.");
      } else {
        setSignError(`Signature error: ${msg}`);
      }
      setStep("warning");
      setIsSigning(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        onClick={() => !loading && !isSigning && onClose()}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
          className={`bg-[#0C1824] border-2 ${tc.border} rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Security Header Bar */}
          <div className={`px-5 py-3 ${tc.bg} border-b ${tc.border} flex items-center gap-2`}>
            {tier === "destructive" ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : (
              <Shield className="w-4 h-4 text-[#D4A843]" />
            )}
            <span className="text-[0.6rem] font-bold uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif", color: tier === "safe" ? "#D4A843" : "#f87171" }}>
              {tier === "destructive" ? "DESTRUCTIVE ACTION — SIGNATURE REQUIRED" : "CONFIRM ACTION"}
            </span>
          </div>

          <div className="p-5">
            {/* Step: Warning */}
            {step === "warning" && (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${tc.bg} shrink-0`}>
                    <AlertTriangle className={`w-5 h-5 ${tc.text}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h3>
                    <p className="text-xs text-[#8494A7] mt-1.5 leading-relaxed">{description}</p>
                  </div>
                </div>

                {tier === "destructive" && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <Fingerprint className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[0.6rem] text-amber-300/90">You will be asked to sign a message with your wallet to verify your identity before this action executes.</span>
                    </div>
                  </div>
                )}

                {/* Admin identity */}
                <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-[#162033] border border-[#4274B9]/10">
                  <Shield className="w-3 h-3 text-[#6AA3E0]" />
                  <span className="text-[0.55rem] text-[#8494A7]">Executing as admin:</span>
                  <span className="text-[0.55rem] font-mono text-[#6AA3E0]">{walletId}</span>
                </div>

                {signError && (
                  <div className="flex items-start gap-2 px-3 py-2 mb-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-[0.6rem] text-red-300/90">{signError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onClose} disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-xs border border-[#4274B9]/20 text-[#8494A7] hover:bg-[#162033] transition-all disabled:opacity-50"
                  >Cancel</button>
                  <button
                    onClick={handleNextFromWarning} disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${tc.bg} border ${tc.border} ${tc.text}`}
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
                  >
                    {requiresSign ? (
                      <>
                        <Fingerprint className="w-3 h-3" />
                        SIGN TO CONFIRM
                      </>
                    ) : (
                      confirmLabel
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step: Signing (waiting for HashPack) */}
            {step === "signing" && (
              <div className="text-center py-6">
                <div className="inline-flex p-4 rounded-full bg-[#D4A843]/5 border border-[#D4A843]/20 mb-4 animate-pulse">
                  <Fingerprint className="w-10 h-10 text-[#D4A843]" />
                </div>
                <h3 className="text-sm font-bold text-[#E8ECF0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  AWAITING WALLET SIGNATURE
                </h3>
                <p className="text-xs text-[#8494A7] leading-relaxed mb-3">
                  Open <span className="text-[#D4A843] font-semibold">HashPack</span> on your device and approve the signature request.
                </p>
                <div className="flex items-center justify-center gap-2 text-[#D4A843]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs animate-pulse" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}>
                    Waiting for signature...
                  </span>
                </div>
                <button
                  onClick={() => { setStep("warning"); setIsSigning(false); }}
                  className="mt-4 px-4 py-1.5 rounded-lg text-[0.55rem] border border-[#4274B9]/20 text-[#8494A7] hover:bg-[#162033] transition-all"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Step: Signed / Executing */}
            {step === "signed" && (
              <div className="text-center py-6">
                <div className="inline-flex p-4 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 mb-4">
                  <CheckCircle className="w-10 h-10 text-[#10b981]" />
                </div>
                <h3 className="text-sm font-bold text-[#10b981] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  SIGNATURE VERIFIED
                </h3>
                <p className="text-xs text-[#8494A7] mb-3">Identity confirmed. Executing action...</p>
                <Loader2 className="w-5 h-5 text-[#D4A843] animate-spin mx-auto" />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Tool Card
// ---------------------------------------------------------------------------
function ToolCard({
  icon, title, description, children, danger,
}: {
  icon: React.ReactNode; title: string; description: string;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${danger ? "border-red-500/20 bg-red-950/10" : "border-[#4274B9]/10 bg-[#0C1824]/60"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <h4 className="text-xs font-bold text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h4>
      </div>
      <p className="text-[0.6rem] text-[#8494A7] mb-3 leading-relaxed">{description}</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Accordion
// ---------------------------------------------------------------------------
function Section({ title, icon, children, defaultOpen, badge }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border border-[#4274B9]/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#162033]/50 transition-all"
      >
        {icon}
        <span className="text-xs font-bold text-[#E8ECF0] flex-1" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</span>
        {badge && <span className="text-[0.5rem] px-1.5 py-0.5 rounded-full bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/20">{badge}</span>}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-[#8494A7]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#8494A7]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select + Action Button — MUST be defined outside the main component.
// Defining it inside causes React to treat it as a new component type on every
// parent re-render, which unmounts/remounts the <select> and kills the native
// dropdown mid-interaction (the "flash" bug).
// ---------------------------------------------------------------------------
function SelectButton({ value, onChange, options, label, onAction, actionLabel, danger }: {
  value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
  label: string; onAction: () => void; actionLabel: string; danger?: boolean;
}) {
  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider mb-1 block">{label}</label>
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full text-[0.6rem] bg-[#162033] border border-[#4274B9]/20 rounded-lg px-2 py-1.5 text-[#E8ECF0] outline-none focus:border-[#D4A843]/40"
        >
          <option value="">Select...</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <button
        onClick={onAction} disabled={!value}
        className={`px-3 py-1.5 rounded-lg text-[0.55rem] font-bold transition-all disabled:opacity-30 flex items-center gap-1 ${
          danger
            ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
            : "bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20"
        }`}
      >
        <Fingerprint className="w-2.5 h-2.5" />
        {actionLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function TestToolsTab({ wallet, sessionToken }: TestToolsTabProps) {
  const { signMessage } = useWallet();
  const [inventory, setInventory] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [ipFlags, setIpFlags] = useState<any[]>([]);
  const [clearingFlags, setClearingFlags] = useState(false);

  // Modal state — now with security tier
  const [confirm, setConfirm] = useState<{
    title: string; description: string; confirmLabel: string;
    tier: SecurityTier; action: () => Promise<void>;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Selectors
  const [selectedBattle, setSelectedBattle] = useState("");
  const [selectedProposal, setSelectedProposal] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedSnapshot, setSelectedSnapshot] = useState("");

  // Load data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, btl, prop, ath, evt, flags] = await Promise.all([
        api.testTools.getDataInventory(wallet, sessionToken),
        api.getBattles(),
        api.getProposals({ adminSessionToken: sessionToken }),
        api.getAthletes(),
        api.getEvents(),
        api.testTools.getIpFlags(wallet, sessionToken),
      ]);
      if (inv.success && inv.data) setInventory(inv.data);
      if (btl.success && btl.data) setBattles(btl.data);
      if (prop.success && prop.data) setProposals(prop.data);
      if (ath.success && ath.data) setAthletes(ath.data);
      if (evt.success && evt.data) setEvents(evt.data);
      if (flags.success && flags.data) setIpFlags(flags.data);
    } catch (err) {
      console.error("[TestTools] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [wallet, sessionToken]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Confirm handler — the modal calls this after signature verification
  const runConfirm = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      await confirm.action();
    } finally {
      setConfirming(false);
      setConfirm(null);
    }
  };

  // Helper: execute with toast
  const exec = async (label: string, fn: () => Promise<any>) => {
    try {
      const res = await fn();
      if (res.success) {
        toast.success(`${label} completed.`);
        loadAll();
      } else {
        toast.error(res.error || `${label} failed.`);
      }
    } catch (err: any) {
      toast.error(`${label} error: ${err.message || err}`);
    }
  };

  // Battle options with status badges
  const battleOptions = battles.map((b) => ({
    id: b.id,
    label: `${b.title || b.id} [${b.status}]`,
  }));

  const declaredBattles = battles.filter((b) => b.status === "winner_declared" || b.status === "rewards_distributed");
  const declaredBattleOptions = declaredBattles.map((b) => ({
    id: b.id,
    label: `${b.title || b.id} [winner: ${b.winnerId || "?"}]`,
  }));

  const snapshotBattleOptions = battles.filter((b) => b.status === "winner_declared" || b.status === "rewards_distributed").map((b) => ({
    id: b.id,
    label: `${b.title || b.id}`,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#D4A843]" />
          <h3 className="text-xs font-bold text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            PHASE 2 TEST TOOLS
          </h3>
          <span className="text-[0.45rem] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            REMOVE BEFORE MAINNET LAUNCH
          </span>
        </div>
        <button
          onClick={loadAll} disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.55rem] bg-[#162033] border border-[#4274B9]/20 text-[#8494A7] hover:text-[#E8ECF0] transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Security Notice Banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#D4A843]/5 border border-[#D4A843]/20">
        <Fingerprint className="w-4 h-4 text-[#D4A843] shrink-0 mt-0.5" />
        <div>
          <p className="text-[0.6rem] font-bold text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>WALLET SIGNATURE REQUIRED</p>
          <p className="text-[0.55rem] text-[#8494A7] mt-0.5 leading-relaxed">
            All destructive actions require a fresh wallet signature via HashPack to cryptographically verify your identity.
            Every action is logged server-side.
          </p>
        </div>
      </div>

      {/* IP Anomaly Flags */}
      <Section
        title="IP ANOMALY FLAGS"
        icon={<Wifi className="w-3.5 h-3.5 text-amber-400" />}
        defaultOpen={ipFlags.length > 0}
        badge={ipFlags.length > 0 ? `${ipFlags.length} FLAGGED` : "CLEAN"}
      >
        <div className="space-y-3">
          {ipFlags.length === 0 ? (
            <div className="text-center py-6 bg-[#0C1824]/40 rounded-xl border border-[#10b981]/10">
              <Shield className="w-6 h-6 text-[#10b981]/40 mx-auto mb-2" />
              <p className="text-xs text-[#10b981]/70 font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>NO ANOMALIES DETECTED</p>
              <p className="text-[0.55rem] text-[#8494A7] mt-1">All voting traffic looks clean. IPs are flagged when &gt;5 unique wallets vote from the same IP within 10 minutes.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[0.6rem] font-bold text-amber-400" style={{ fontFamily: "Orbitron, sans-serif" }}>SUSPICIOUS ACTIVITY DETECTED</p>
                  <p className="text-[0.55rem] text-[#8494A7] mt-0.5">
                    {ipFlags.length} IP{ipFlags.length > 1 ? "s" : ""} flagged for multi-wallet voting.
                    This may indicate bot activity or coordinated manipulation.
                    Review the wallets below and consider blacklisting if patterns persist.
                  </p>
                </div>
              </div>

              {ipFlags.map((flag: any, idx: number) => {
                const walletEntries = Object.entries(flag.wallets || {}) as [string, any][];
                return (
                  <motion.div
                    key={flag.ip || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-xl border border-amber-500/20 bg-[#0C1824]/60 overflow-hidden"
                  >
                    {/* Flag Header */}
                    <div className="px-3 py-2.5 bg-amber-500/5 border-b border-amber-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <Eye className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-xs text-[#E8ECF0] font-mono font-bold">{flag.ip}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[0.5rem] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/15" style={{ fontFamily: "Orbitron, sans-serif" }}>
                              {flag.uniqueWalletCount} WALLETS
                            </span>
                            <span className="text-[0.5rem] text-[#8494A7] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {flag.windowMinutes}min window
                            </span>
                            <span className="text-[0.5rem] text-[#8494A7]">
                              {flag.totalVotesInWindow} total votes
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.5rem] text-[#8494A7]">Flagged</p>
                        <p className="text-[0.55rem] text-amber-400 font-mono">{new Date(flag.flaggedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Wallet Table */}
                    <div className="p-2">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-1 text-[0.5rem]">
                        {/* Header */}
                        <span className="text-[#8494A7] uppercase tracking-wider font-bold px-1" style={{ fontFamily: "Orbitron, sans-serif" }}>Wallet</span>
                        <span className="text-[#8494A7] uppercase tracking-wider font-bold text-center" style={{ fontFamily: "Orbitron, sans-serif" }}>Votes</span>
                        <span className="text-[#8494A7] uppercase tracking-wider font-bold text-center" style={{ fontFamily: "Orbitron, sans-serif" }}>First</span>
                        <span className="text-[#8494A7] uppercase tracking-wider font-bold text-center" style={{ fontFamily: "Orbitron, sans-serif" }}>Last</span>

                        {walletEntries.map(([w, detail]: [string, any]) => (
                          <React.Fragment key={w}>
                            <span className="font-mono text-[#6AA3E0] px-1 py-0.5 bg-[#162033]/50 rounded truncate">
                              {w}
                            </span>
                            <span className="text-center text-[#E8ECF0] font-bold py-0.5">
                              {detail.voteCount}
                            </span>
                            <span className="text-center text-[#8494A7] font-mono py-0.5">
                              {new Date(detail.firstSeen).toLocaleTimeString()}
                            </span>
                            <span className="text-center text-[#8494A7] font-mono py-0.5">
                              {new Date(detail.lastSeen).toLocaleTimeString()}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Clear Flags Button */}
              <button
                onClick={async () => {
                  setClearingFlags(true);
                  try {
                    const res = await api.testTools.clearIpFlags(wallet, sessionToken);
                    if (res.success) {
                      toast.success(`Cleared ${res.data?.flagsCleared || 0} IP anomaly flags.`);
                      setIpFlags([]);
                    } else {
                      toast.error(res.error || "Failed to clear flags.");
                    }
                  } catch (err: any) {
                    toast.error(`Clear flags error: ${err.message || err}`);
                  } finally {
                    setClearingFlags(false);
                  }
                }}
                disabled={clearingFlags}
                className="w-full py-2 rounded-lg text-[0.6rem] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                {clearingFlags ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                CLEAR ALL FLAGS
              </button>
            </>
          )}
        </div>
      </Section>

      {/* Data Inventory */}
      {inventory && (
        <div className="rounded-xl border border-[#4274B9]/10 bg-[#0C1824]/60 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#6AA3E0]" />
            <span className="text-[0.6rem] font-bold text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>DATA INVENTORY</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(inventory).map(([prefix, count]) => (
              <div key={prefix} className="bg-[#162033] rounded-lg px-2 py-1.5 text-center">
                <div className="text-sm font-bold text-[#E8ECF0]">{count}</div>
                <div className="text-[0.45rem] text-[#8494A7] truncate">{prefix.replace(":", "")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Vote Management */}
      <Section title="VOTE MANAGEMENT" icon={<Vote className="w-3.5 h-3.5 text-[#6AA3E0]" />} defaultOpen badge={`${inventory?.["vote:battle:"] || 0} battle / ${inventory?.["vote:proposal:"] || 0} prop / ${inventory?.["vote:skill:"] || 0} skill`}>
        <ToolCard
          icon={<Swords className="w-3.5 h-3.5 text-[#6AA3E0]" />}
          title="PURGE BATTLE VOTES"
          description="Wipe all votes for a specific battle. Resets tallies to 0, deletes snapshot. Battle record is preserved — re-open voting to test again."
        >
          <SelectButton
            value={selectedBattle} onChange={setSelectedBattle}
            options={battleOptions} label="Select Battle"
            actionLabel="PURGE VOTES" danger
            onAction={() => setConfirm({
              title: "Purge Battle Votes",
              description: `This will permanently delete ALL votes for "${battles.find(b => b.id === selectedBattle)?.title || selectedBattle}", reset tallies to 0, and delete any reward snapshot. The battle record itself is preserved.`,
              confirmLabel: "PURGE VOTES", tier: "destructive",
              action: () => exec("Purge battle votes", () => api.testTools.purgeBattleVotes(selectedBattle, wallet, sessionToken)),
            })}
          />
        </ToolCard>

        <ToolCard
          icon={<Vote className="w-3.5 h-3.5 text-[#6AA3E0]" />}
          title="PURGE PROPOSAL VOTES"
          description="Wipe all votes on a governance proposal. Resets for/against/totalVoters to 0. Proposal is preserved for re-voting."
        >
          <SelectButton
            value={selectedProposal} onChange={setSelectedProposal}
            options={proposals.map(p => ({ id: p.id, label: `${p.title} [${p.status}]` }))}
            label="Select Proposal" actionLabel="PURGE VOTES" danger
            onAction={() => setConfirm({
              title: "Purge Proposal Votes",
              description: `This will permanently delete ALL votes for "${proposals.find(p => p.id === selectedProposal)?.title || selectedProposal}" and reset counters to 0.`,
              confirmLabel: "PURGE VOTES", tier: "destructive",
              action: () => exec("Purge proposal votes", () => api.testTools.purgeProposalVotes(selectedProposal, wallet, sessionToken)),
            })}
          />
        </ToolCard>

        {/* PURGE SKILL VOTES — REMOVED. Skills are now admin-only. */}
      </Section>

      {/* Section 2: Battle & Winner Controls */}
      <Section title="BATTLE & WINNER CONTROLS" icon={<Swords className="w-3.5 h-3.5 text-[#D4A843]" />} badge={`${battles.length} battles`}>
        <ToolCard
          icon={<RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
          title="REVERT WINNER DECLARATION"
          description="Un-declare a winner: reverts battle to voting_closed, undoes W/L records on both athletes, deletes snapshot. Streak is reset to 0 (cannot be reliably restored)."
        >
          <SelectButton
            value={selectedBattle} onChange={setSelectedBattle}
            options={declaredBattleOptions} label="Select Declared Battle"
            actionLabel="REVERT WINNER"
            onAction={() => setConfirm({
              title: "Revert Winner Declaration",
              description: `This will un-declare the winner of "${declaredBattles.find(b => b.id === selectedBattle)?.title || selectedBattle}", revert status to voting_closed, undo W/L records, and delete the reward snapshot. Winner streak will be reset to 0.`,
              confirmLabel: "REVERT WINNER", tier: "destructive",
              action: () => exec("Revert winner", () => api.testTools.revertWinner(selectedBattle, wallet, sessionToken)),
            })}
          />
        </ToolCard>

        <ToolCard
          icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
          title="FORCE-DELETE BATTLE"
          description="Permanently delete any battle regardless of status, plus all associated votes, nonces, allocation indices, and snapshots."
          danger
        >
          <SelectButton
            value={selectedBattle} onChange={setSelectedBattle}
            options={battleOptions} label="Select Battle"
            actionLabel="FORCE DELETE" danger
            onAction={() => setConfirm({
              title: "Force-Delete Battle",
              description: `This will PERMANENTLY delete "${battles.find(b => b.id === selectedBattle)?.title || selectedBattle}" and ALL associated data (votes, nonces, allocations, snapshots). This cannot be undone.`,
              confirmLabel: "PERMANENTLY DELETE", tier: "destructive",
              action: () => exec("Force-delete battle", () => api.testTools.forceDeleteBattle(selectedBattle, wallet, sessionToken)),
            })}
          />
        </ToolCard>

        <ToolCard
          icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
          title="DELETE EVENT"
          description="Delete an entire event plus ALL battles and votes within it. Cascading delete."
          danger
        >
          <SelectButton
            value={selectedEvent} onChange={setSelectedEvent}
            options={events.map(e => ({ id: e.id, label: `${e.name} [${e.status}]` }))}
            label="Select Event" actionLabel="DELETE EVENT" danger
            onAction={() => setConfirm({
              title: "Delete Entire Event",
              description: `This will PERMANENTLY delete "${events.find(e => e.id === selectedEvent)?.name || selectedEvent}" and ALL battles + votes within it. This is a cascading delete.`,
              confirmLabel: "DELETE EVENT + ALL BATTLES", tier: "destructive",
              action: () => exec("Delete event", () => api.testTools.deleteEvent(selectedEvent, wallet, sessionToken)),
            })}
          />
        </ToolCard>

        <ToolCard
          icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
          title="DELETE PROPOSAL"
          description="Delete a governance proposal plus all associated votes."
          danger
        >
          <SelectButton
            value={selectedProposal} onChange={setSelectedProposal}
            options={proposals.map(p => ({ id: p.id, label: `${p.title} [${p.status}]` }))}
            label="Select Proposal" actionLabel="DELETE PROPOSAL" danger
            onAction={() => setConfirm({
              title: "Delete Proposal",
              description: `This will PERMANENTLY delete "${proposals.find(p => p.id === selectedProposal)?.title || selectedProposal}" and ALL associated votes.`,
              confirmLabel: "DELETE PROPOSAL", tier: "destructive",
              action: () => exec("Delete proposal", () => api.testTools.deleteProposal(selectedProposal, wallet, sessionToken)),
            })}
          />
        </ToolCard>
      </Section>

      {/* Section 3: Cache & Records */}
      <Section title="CACHE, RECORDS & CHAT" icon={<Database className="w-3.5 h-3.5 text-emerald-400" />}>
        <ToolCard
          icon={<Zap className="w-3.5 h-3.5 text-emerald-400" />}
          title="FLUSH LEADERBOARD CACHES"
          description="Immediately invalidate all in-memory leaderboard caches (athlete + voter). Next request will recompute fresh. Safe — no data loss."
        >
          <button
            onClick={() => setConfirm({
              title: "Flush Leaderboard Caches",
              description: "This will invalidate all in-memory leaderboard caches. Next request recomputes fresh. No data is lost — this is a safe operation.",
              confirmLabel: "FLUSH ALL CACHES", tier: "safe",
              action: () => exec("Flush caches", () => api.testTools.flushCaches(wallet, sessionToken)),
            })}
            className="w-full py-2 rounded-lg text-[0.6rem] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" /> FLUSH ALL CACHES
          </button>
        </ToolCard>

        <ToolCard
          icon={<RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
          title="RESET ATHLETE W/L RECORDS"
          description="Reset ALL athlete W/L/streak/rank/totalVotes/tokensStaked to 0. Skills and profile data are preserved. Use between test cycles."
        >
          <button
            onClick={() => setConfirm({
              title: "Reset All Athlete Records",
              description: "This will reset wins, losses, streak, rank, totalVotes, and tokensStaked to 0 for ALL athletes. Skills and profile data are preserved.",
              confirmLabel: "RESET ALL RECORDS", tier: "destructive",
              action: () => exec("Reset athlete records", () => api.testTools.resetAthleteRecords(wallet, sessionToken)),
            })}
            className="w-full py-2 rounded-lg text-[0.6rem] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1"
          >
            <Fingerprint className="w-3 h-3" /> RESET ALL W/L RECORDS
          </button>
        </ToolCard>

        <ToolCard
          icon={<MessageSquare className="w-3.5 h-3.5 text-[#6AA3E0]" />}
          title="CLEAR ARENA CHAT"
          description="Wipe all arena chat messages. The chat feed will be empty after this."
        >
          <button
            onClick={() => setConfirm({
              title: "Clear Arena Chat",
              description: `This will permanently delete all ${inventory?.["chat:messages"] || 0} chat messages. The chat feed will be empty.`,
              confirmLabel: "CLEAR CHAT", tier: "destructive",
              action: () => exec("Clear chat", () => api.testTools.clearChat(wallet, sessionToken)),
            })}
            className="w-full py-2 rounded-lg text-[0.6rem] font-bold bg-[#6AA3E0]/10 border border-[#6AA3E0]/30 text-[#6AA3E0] hover:bg-[#6AA3E0]/20 transition-all flex items-center justify-center gap-1"
          >
            <Fingerprint className="w-3 h-3" /> CLEAR ALL CHAT MESSAGES
          </button>
        </ToolCard>

        <ToolCard
          icon={<Camera className="w-3.5 h-3.5 text-purple-400" />}
          title="DELETE SNAPSHOT"
          description="Delete a reward distribution snapshot without touching the battle itself. Use if you want to re-run winner declaration."
        >
          <SelectButton
            value={selectedSnapshot} onChange={setSelectedSnapshot}
            options={snapshotBattleOptions} label="Select Battle Snapshot"
            actionLabel="DELETE SNAPSHOT" danger
            onAction={() => setConfirm({
              title: "Delete Reward Snapshot",
              description: `This will delete the reward distribution snapshot for this battle. The battle record itself is unchanged.`,
              confirmLabel: "DELETE SNAPSHOT", tier: "destructive",
              action: () => exec("Delete snapshot", () => api.testTools.deleteSnapshot(selectedSnapshot, wallet, sessionToken)),
            })}
          />
        </ToolCard>
      </Section>

      {/* Info Footer */}
      <div className="text-[0.5rem] text-[#8494A7]/60 text-center leading-relaxed border-t border-[#4274B9]/10 pt-3">
        All test tools require an active admin session (challenge-sign authenticated).
        <br />Destructive actions require a fresh wallet signature.
        <br />Every action is logged server-side with the admin wallet ID and timestamp.
        <br />Remove this entire tab and all /admin/test/* routes before mainnet launch.
      </div>

      {/* Secure Confirmation Modal */}
      <SecureConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirm?.title || ""}
        description={confirm?.description || ""}
        confirmLabel={confirm?.confirmLabel || "Confirm"}
        tier={confirm?.tier || "safe"}
        loading={confirming}
        walletId={wallet}
        signMessage={signMessage}
      />
    </div>
  );
}