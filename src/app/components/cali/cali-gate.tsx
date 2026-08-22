/**
 * Cali Gate — Wallet connect + HBAR check + signature verification.
 * Supports HashPack (WalletConnect) and Magic email wallets.
 */

import { Dumbbell, Loader2, Wallet, ShieldCheck, AlertCircle, Coins, Mail } from "lucide-react";
import { useCaliSession } from "./cali-context";
import { useWallet } from "../wallet-context";
import { isMagicEnabled } from "../../lib/wallet-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function CaliGate() {
  const cali = useCaliSession();
  const wallet = useWallet();
  const magicOn = isMagicEnabled();

  const busy =
    cali.phase === "checking" ||
    cali.phase === "connecting" ||
    cali.phase === "challenging" ||
    cali.phase === "signing" ||
    cali.phase === "verifying";

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
    verifying: "Verifying HBAR balance…",
    eligible: "You're in.",
    revoked: "Access revoked — HBAR balance dropped below the gate.",
    error: "Something went wrong.",
  };

  const connectLabel = wallet.connected
    ? `Connected: ${wallet.address ?? wallet.accountId}${
        wallet.walletProvider === "magic" ? " (Magic)" : wallet.walletProvider === "hashpack" ? " (HashPack)" : ""
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
              Free Workout Plans for HBAR Holders
            </h1>
          </div>
        </div>

        <p className="text-sm text-[#A3B0C2] mb-6 leading-relaxed" style={dmSans}>
          Auto-generated calisthenics sessions, 30–45 min, levels 1–3. Track every set,
          beat your PRs, build a streak — gated to verified HBAR holders.
          Use HashPack or email (Magic) — both can sign the gate challenge on this site.
        </p>

        <div className="space-y-2.5 mb-6">
          <ChecklistItem
            ok={wallet.connected}
            label={connectLabel}
            icon={<Wallet className="w-4 h-4" />}
          />
          <ChecklistItem
            ok={cali.phase === "eligible"}
            label="Hold at least 1 HBAR (verified live)"
            icon={<Coins className="w-4 h-4" />}
          />
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
              After connecting, tap Verify below.
            </p>
            <button
              type="button"
              onClick={cali.enter}
              className="w-full py-2.5 rounded-xl text-xs text-[#8494A7] border border-white/10 hover:bg-white/5"
              style={dmSans}
            >
              Verify (after connect)
            </button>
          </div>
        ) : (
          <button
            onClick={cali.enter}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              ...dmSans,
              background: "linear-gradient(135deg, #4274B9, #3563A0)",
              color: "#fff",
            }}
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {busy ? "Verifying…" : cali.phase === "revoked" ? "Re-verify Access" : "Verify & Enter Workouts"}
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
      <span
        className={`text-xs ${ok ? "text-emerald-200" : "text-[#8494A7]"}`}
        style={dmSans}
      >
        {label}
      </span>
    </div>
  );
}
