import { Crown, Loader2, Wallet, ShieldCheck, AlertCircle, Lock, Mail } from "lucide-react";
import { useEliteSession } from "./elite-context";
import { useWallet } from "../wallet-context";
import { isMagicEnabled } from "../../lib/wallet-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function EliteGate() {
  const elite = useEliteSession();
  const wallet = useWallet();
  const magicOn = isMagicEnabled();

  const busy = ["checking", "connecting", "challenging", "signing", "verifying"].includes(elite.phase);

  const signLabel =
    wallet.walletProvider === "magic"
      ? "Sign vault challenge with Magic"
      : wallet.connected
        ? "Sign vault challenge in your wallet"
        : "Sign vault challenge (HashPack or Magic)";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-xl rounded-2xl border p-6 sm:p-8"
        style={{
          background: "linear-gradient(160deg, rgba(212,168,67,0.08), rgba(11,17,32,0.92))",
          borderColor: "rgba(212,168,67,0.25)",
          boxShadow: "0 10px 40px rgba(212,168,67,0.12)",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)" }}>
            <Crown className="w-6 h-6 text-[#0B1120]" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-[#D4A843]" style={orbitron}>PRO TECH VAULT</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight" style={orbitron}>
              Battle of the Bars Elite Training
            </h1>
          </div>
        </div>

        <p className="text-sm text-[#A3B0C2] mb-6 leading-relaxed" style={dmSans}>
          Judge-destroying BoB techniques — statics, dynamics, combos. 60–120 min skill-focused sessions.
          Access requires a WCO Governors NFT or admin-granted elite whitelist.
          HashPack and Magic email wallets can both sign the challenge here.
        </p>

        <div className="space-y-2.5 mb-6">
          <Row
            ok={wallet.connected}
            icon={<Wallet className="w-4 h-4" />}
            label={
              wallet.connected
                ? `Connected: ${wallet.accountId}${wallet.walletProvider === "magic" ? " (Magic)" : ""}`
                : "Connect wallet"
            }
          />
          <Row ok={wallet.hasGovernorNFT} icon={<Crown className="w-4 h-4" />} label="WCO Governors NFT or elite whitelist" />
          <Row ok={elite.phase === "eligible"} icon={<ShieldCheck className="w-4 h-4" />} label={signLabel} />
        </div>

        {(elite.phase === "error" || elite.phase === "revoked") && elite.error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4 bg-red-500/8 border border-red-500/20">
            <AlertCircle className="w-4 h-4 mt-0.5 text-red-300" />
            <p className="text-xs text-red-200" style={dmSans}>{elite.error}</p>
          </div>
        )}

        {!wallet.connected && !busy ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={wallet.isConnecting}
              onClick={() => wallet.connect()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[#0B1120] disabled:opacity-50"
              style={{ ...dmSans, background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
            >
              {wallet.isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
              Connect HashPack
            </button>
            {magicOn && (
              <button
                type="button"
                onClick={() => wallet.openMagicEmailSignIn("signin")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#E8ECF0] border border-[#D4A843]/30 hover:bg-[#D4A843]/10"
                style={dmSans}
              >
                <Mail className="w-4 h-4" />
                Sign in with email
              </button>
            )}
            <button
              type="button"
              onClick={() => elite.enter()}
              className="w-full py-2.5 rounded-xl text-xs text-[#8494A7] border border-white/10 hover:bg-white/5"
              style={dmSans}
            >
              Unlock (after connect)
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => elite.enter()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[#0B1120] disabled:opacity-50"
            style={{ ...dmSans, background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            {busy ? "Verifying…" : elite.phase === "revoked" ? "Re-verify Access" : "Unlock Elite Vault"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${ok ? "border-emerald-500/25 bg-emerald-500/5" : "border-[#4274B9]/15 bg-white/[0.02]"}`}>
      <span className={ok ? "text-emerald-400" : "text-[#8494A7]"}>{icon}</span>
      <span className={`text-xs ${ok ? "text-emerald-200" : "text-[#8494A7]"}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    </div>
  );
}