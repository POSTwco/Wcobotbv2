/**
 * Cali Gate — Wallet connect + signature verification (free play).
 * Supports HashPack (WalletConnect) and Magic email wallets.
 * No HBAR balance required to generate or log workouts.
 */

import { useEffect, useRef } from "react";
import { Dumbbell, Loader2, Wallet, ShieldCheck, AlertCircle, Mail } from "lucide-react";
import { useCaliSession } from "./cali-context";
import { useWallet } from "../wallet-context";
import { isMagicEnabled } from "../../lib/wallet-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function CaliGate() {
  const cali = useCaliSession();
  const wallet = useWallet();
  const magicOn = isMagicEnabled();
  const autoEnterRef = useRef(false);

  const busy =
    cali.phase === "checking" ||
    cali.phase === "connecting" ||
    cali.phase === "challenging" ||
    cali.phase === "signing" ||
    cali.phase === "verifying";

  // After Magic / HashPack connects on this screen, automatically run the gate.
  useEffect(() => {
    if (!wallet.connected || !wallet.accountId) {
      autoEnterRef.current = false;
      return;
    }
    if (busy || cali.phase === "eligible") return;
    if (autoEnterRef.current) return;
    autoEnterRef.current = true;
    void cali.enter();
  }, [wallet.connected, wallet.accountId, busy, cali.phase, cali.enter]);

  const signLabel =
    wallet.walletProvider === "magic"
      ? "Sign one challenge with Magic"
      : wallet.connected
        ? "Sign one challenge in your wallet"
        : "Sign one challenge (HashPack or Magic)";

  const phaseLabel: Record<typeof cali.phase, string> = {
    idle: wallet.connected ? "Verify your wallet to continue" : "Connect your wallet",
    checking: "Checking your session…",
    connecting: "Opening wallet…",
    challenging: "Requesting challenge…",
    signing:
      wallet.walletProvider === "magic"
        ? "Waiting for Magic signature…"
        : "Waiting for wallet signature…",
    verifying: "Verifying wallet…",
    eligible: "You're in.",
    revoked: "Session expired — reconnect and verify again.",
    error: "Something went wrong.",
  };

  const connectLabel = wallet.connected
    ? `Connected: ${wallet.address ?? wallet.accountId}${
        wallet.walletProvider === "magic"
          ? " (Magic)"
          : wallet.walletProvider === "hashpack"
            ? " (HashPack)"
            : ""
      }`
    : "Connect a wallet";

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
              Free Workout Plans
            </h1>
          </div>
        </div>

        <p className="text-sm text-[#A3B0C2] mb-6 leading-relaxed" style={dmSans}>
          Auto-generated calisthenics sessions — free to play. Connect with{" "}
          <strong className="text-[#E8ECF0]">HashPack</strong> or{" "}
          <strong className="text-[#E8ECF0]">email (Magic)</strong>, sign once, then generate
          workouts and score. No HBAR required. Chain anchoring may add a fee later.
        </p>

        <div className="space-y-2.5 mb-6">
          <ChecklistItem ok={wallet.connected} label={connectLabel} icon={<Wallet className="w-4 h-4" />} />
          <ChecklistItem
            ok={cali.phase === "eligible"}
            label={signLabel}
            icon={<ShieldCheck className="w-4 h-4" />}
          />
        </div>

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

        {!wallet.connected && !busy ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => wallet.connect()}
              disabled={wallet.isConnecting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              style={{
                ...dmSans,
                background: "linear-gradient(135deg, #D4A843, #a07520)",
                color: "#0B1120",
              }}
            >
              {wallet.isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
              Connect HashPack
            </button>
            {magicOn && (
              <button
                type="button"
                onClick={() => wallet.openMagicEmailSignIn("signin")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#E8ECF0] border border-[#4274B9]/35 hover:bg-[#4274B9]/12"
                style={dmSans}
              >
                <Mail className="w-4 h-4" />
                Sign in with email
              </button>
            )}
            <p className="text-[0.65rem] text-center text-[#8494A7] pt-1" style={dmSans}>
              After you connect, verification starts automatically.
            </p>
          </div>
        ) : (
          <button
            onClick={() => {
              autoEnterRef.current = true;
              void cali.enter();
            }}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              ...dmSans,
              background: "linear-gradient(135deg, #4274B9, #3563A0)",
              color: "#fff",
            }}
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {busy
              ? "Verifying…"
              : cali.phase === "revoked"
                ? "Re-verify Access"
                : cali.phase === "error"
                  ? "Retry Verify"
                  : "Verify & Enter Workouts"}
          </button>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  ok,
  icon,
  label,
}: {
  ok: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${
        ok ? "border-emerald-500/25 bg-emerald-500/5" : "border-[#4274B9]/15 bg-white/[0.02]"
      }`}
    >
      <span className={ok ? "text-emerald-400" : "text-[#8494A7]"}>{icon}</span>
      <span className={`text-xs ${ok ? "text-emerald-200" : "text-[#8494A7]"}`} style={dmSans}>
        {label}
      </span>
    </div>
  );
}
