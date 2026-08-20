/**
 * Dual-path Connect chooser — Create Account (Magic) vs Connect Existing (HashPack)
 * ================================================================================
 * Shown when VITE_MAGIC_ENABLED=true. HashPack-only when Magic is off (caller
 * should skip rendering this and call connectExistingWallet directly).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Wallet, X, Loader2, Sparkles, Chrome } from "lucide-react";
import type { MagicLoginMethod } from "../lib/wallet-types";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
  onConnectExisting: () => Promise<string | null>;
  onCreateWithMagic: (method: MagicLoginMethod, email?: string) => Promise<string | null>;
  isConnecting: boolean;
}

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function ConnectWalletModal({
  open,
  onClose,
  onConnectExisting,
  onCreateWithMagic,
  isConnecting,
}: ConnectWalletModalProps) {
  const [step, setStep] = useState<"chooser" | "email">("chooser");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("chooser");
    setEmail("");
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    if (busy || isConnecting) return;
    reset();
    onClose();
  };

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    try {
      const id = await fn();
      if (id) {
        reset();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Connect or create account"
            className="relative w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            style={{
              background:
                "linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(17,24,39,0.96) 40%, rgba(11,17,32,0.98) 100%)",
              borderColor: "rgba(212,168,67,0.25)",
              boxShadow: "0 0 60px rgba(212,168,67,0.12), inset 0 1px 0 rgba(255,255,255,0.12)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div>
                <p className="text-[0.6rem] tracking-[0.2em] text-[#F0D078] font-bold" style={orbitron}>
                  JOIN WCO
                </p>
                <h2 className="text-white text-lg font-bold mt-1" style={orbitron}>
                  {step === "chooser" ? "Get started" : "Create with email"}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy || isConnecting}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/5 border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {step === "chooser" && (
                <>
                  <p className="text-[#8494A7] text-sm" style={dmSans}>
                    New here? Create a Hedera account with email or social — stay on WCO, no seed phrase.
                    Already have HashPack? Connect your existing wallet.
                  </p>

                  <button
                    type="button"
                    disabled={busy || isConnecting}
                    onClick={() => setStep("email")}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all border border-[#D4A843]/35 bg-[#D4A843]/12 hover:bg-[#D4A843]/18 active:scale-[0.99]"
                  >
                    <span className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center bg-[#D4A843]/2 border border-[#D4A843]/3">
                      <Sparkles className="w-5 h-5 text-[#F0D078]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-white font-bold text-sm" style={orbitron}>
                        Create New Account
                      </span>
                      <span className="block text-[#8494A7] text-xs mt-1" style={dmSans}>
                        Email OTP · Google · Apple — recommended for new users
                      </span>
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy || isConnecting}
                      onClick={() => run(() => onCreateWithMagic("google"))}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                      style={dmSans}
                    >
                      <Chrome className="w-4 h-4" />
                      Google
                    </button>
                    <button
                      type="button"
                      disabled={busy || isConnecting}
                      onClick={() => run(() => onCreateWithMagic("apple"))}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                      style={dmSans}
                    >
                      <span className="text-base leading-none"></span>
                      Apple
                    </button>
                  </div>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 text-[0.65rem] text-[#8494A7] bg-[#111827]" style={dmSans}>
                        or
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy || isConnecting}
                    onClick={() => run(() => onConnectExisting())}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all border border-[#4274B9]/35 bg-[#4274B9]/10 hover:bg-[#4274B9]/16 active:scale-[0.99]"
                  >
                    <span className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center bg-[#4274B9]/2 border border-[#4274B9]/3">
                      <Wallet className="w-5 h-5 text-[#6AA3E0]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-white font-bold text-sm" style={orbitron}>
                        Connect Existing Wallet
                      </span>
                      <span className="block text-[#8494A7] text-xs mt-1" style={dmSans}>
                        HashPack / WalletConnect — for wallets you already own
                      </span>
                    </span>
                  </button>
                </>
              )}

              {step === "email" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setStep("chooser"); setError(null); }}
                    className="text-xs text-[#8494A7] hover:text-white"
                    style={dmSans}
                  >
                    ← Back
                  </button>
                  <label className="block text-[#8494A7] text-xs mb-1" style={dmSans}>
                    Email address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8494A7]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        disabled={busy}
                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#0B1120] border border-white/15 text-white text-sm outline-none focus:border-[#D4A843]/50"
                        style={dmSans}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !email.trim()}
                    onClick={() => run(() => onCreateWithMagic("email", email.trim()))}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-[#0B1120] disabled:opacity-50"
                    style={{
                      ...orbitron,
                      background: "linear-gradient(135deg, #F0D078, #D4A843)",
                    }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send login code
                  </button>
                  <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
                    We’ll email a one-time code. Magic creates a non-custodial Hedera wallet — WCO never sees your keys.
                  </p>
                </>
              )}

              {(busy || isConnecting) && (
                <div className="flex items-center justify-center gap-2 text-[#F0D078] text-xs py-1" style={dmSans}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Working… check your email or finish the wallet prompt
                </div>
              )}

              {error && (
                <p className="text-red-300 text-xs text-center" style={dmSans}>
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
