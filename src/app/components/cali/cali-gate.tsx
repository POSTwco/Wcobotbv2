/**
 * Cali Gate — Wallet-connect + HBAR-balance check + signature verification.
 *
 * Shown whenever the cali session phase is not "eligible". Drives the entire
 * sign-and-verify flow via useCaliSession().enter(). Matches the platform's
 * dark BOTB look (#0B1120 / #4274B9 accent, DM Sans + Orbitron, lucide icons).
 */

import { Dumbbell, Loader2, Wallet, ShieldCheck, AlertCircle, Coins } from "lucide-react";
import { useCaliSession } from "./cali-context";
import { useWallet } from "../wallet-context";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function CaliGate() {
  const cali = useCaliSession();
  const wallet = useWallet();

  const busy =
    cali.phase === "checking" ||
    cali.phase === "connecting" ||
    cali.phase === "challenging" ||
    cali.phase === "signing" ||
    cali.phase === "verifying";

  const phaseLabel: Record<typeof cali.phase, string> = {
    idle: wallet.connected ? "Verify your wallet to continue" : "Connect your wallet",
    checking: "Checking your session…",
    connecting: "Opening wallet…",
    challenging: "Requesting challenge…",
    signing: "Waiting for HashPack signature…",
    verifying: "Verifying HBAR balance…",
    eligible: "You're in.",
    revoked: "Access revoked — HBAR balance dropped below the gate.",
    error: "Something went wrong.",
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-xl rounded-2xl border p-6 sm:p-8"
        style={{
          background: "linear-gradient(160deg, rgba(66,116,185,0.06), rgba(11,17,32,0.85))",
          borderColor: "rgba(66,116,185,0.18)",
          boxShadow: "0 10px 40px rgba(66,116,185,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #4274B9, #3563A0)",
              boxShadow: "0 4px 20px rgba(66,116,185,0.35)",
            }}
          >
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-[#6AA3E0]" style={orbitron}>
              WCO CALISTHENICS
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight" style={orbitron}>
              Free Workout Plans for HBAR Holders
            </h1>
          </div>
        </div>

        {/* Pitch */}
        <p className="text-sm text-[#A3B0C2] mb-6 leading-relaxed" style={dmSans}>
          Auto-generated calisthenics sessions, 30–45 min, levels 1–3. Track every set,
          beat your PRs, build a streak — all gated to verified HBAR holders.
          Anchor your favorite workouts on Hedera when you're ready.
        </p>

        {/* Eligibility checklist */}
        <div className="space-y-2.5 mb-6">
          <ChecklistItem
            ok={wallet.connected}
            label={wallet.connected ? `Connected: ${wallet.address ?? wallet.accountId}` : "Connect HashPack wallet"}
            icon={<Wallet className="w-4 h-4" />}
          />
          <ChecklistItem
            ok={cali.phase === "eligible"}
            label="Hold at least 1 HBAR (verified live)"
            icon={<Coins className="w-4 h-4" />}
          />
          <ChecklistItem
            ok={cali.phase === "eligible"}
            label="Sign one challenge in HashPack"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
        </div>

        {/* Status banner */}
        {(cali.phase === "error" || cali.phase === "revoked") && cali.error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4 bg-red-500/8 border border-red-500/20">
            <AlertCircle className="w-4 h-4 mt-0.5 text-red-300 flex-shrink-0" />
            <p className="text-xs text-red-200 leading-relaxed" style={dmSans}>
              {cali.error}
            </p>
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 bg-[#4274B9]/8 border border-[#4274B9]/20">
            <Loader2 className="w-4 h-4 animate-spin text-[#6AA3E0]" />
            <p className="text-xs text-[#A3B0C2]" style={dmSans}>
              {phaseLabel[cali.phase]}
            </p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={cali.enter}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            ...dmSans,
            background: "linear-gradient(135deg, #4274B9, #3563A0)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(66,116,185,0.3)",
          }}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Dumbbell className="w-5 h-5" />
          )}
          {!wallet.connected
            ? "Connect Wallet & Verify"
            : cali.phase === "revoked"
              ? "Re-verify HBAR Balance"
              : "Enter Calisthenics"}
        </button>

        {/* Privacy note */}
        <p className="text-[0.65rem] text-[#8494A7] mt-5 leading-relaxed text-center" style={dmSans}>
          Your wallet signs one short message — no transactions, no fees. Your workout
          data stays in your account; only hashes go on-graph when you opt to anchor.
        </p>
      </div>
    </div>
  );
}

function ChecklistItem({
  ok,
  label,
  icon,
}: {
  ok: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: ok ? "rgba(16,185,129,0.12)" : "rgba(132,148,167,0.08)",
          color: ok ? "#10b981" : "#8494A7",
        }}
      >
        {icon}
      </div>
      <p
        className="text-xs"
        style={{ ...dmSans, color: ok ? "#E8ECF0" : "#A3B0C2" }}
      >
        {label}
      </p>
    </div>
  );
}
