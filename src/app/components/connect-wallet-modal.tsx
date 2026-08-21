/**
 * Magic email Create / Sign-in modal
 * ==================================
 * Email OTP only (Google/Apple removed — Hedera Magic path is email).
 * HashPack connect is the main Connect button (not this modal).
 *
 * Same OTP flow works for:
 *   - New users → sponsored Hedera AccountCreate
 *   - Returning Magic users → lookup existing account ("Welcome back")
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, X, Loader2 } from "lucide-react";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
  /** Email Magic create / sign-in */
  onCreateWithMagic: (email: string) => Promise<string | null>;
  isConnecting: boolean;
}

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function ConnectWalletModal({
  open,
  onClose,
  onCreateWithMagic,
  isConnecting,
}: ConnectWalletModalProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    if (busy || isConnecting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await onCreateWithMagic(trimmed);
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
            aria-label="Create or sign in with email"
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
                  CREATE ACCOUNT
                </p>
                <h2 className="text-white text-lg font-bold mt-1" style={orbitron}>
                  Create account
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
              <p className="text-[#8494A7] text-sm" style={dmSans}>
                New here? We create a Hedera account for you (no seed phrase). Returning? Same email OTP signs you back in.
                Already have HashPack? Use <span className="text-white/80">Connect</span> instead.
              </p>

              <label className="block text-[#8494A7] text-xs mb-1" style={dmSans}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8494A7]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !busy && email.trim()) void submit();
                  }}
                  placeholder="you@email.com"
                  disabled={busy || isConnecting}
                  autoFocus
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#0B1120] border border-white/15 text-white text-sm outline-none focus:border-[#D4A843]/50"
                  style={dmSans}
                />
              </div>

              <button
                type="button"
                disabled={busy || isConnecting || !email.trim()}
                onClick={() => void submit()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-[#0B1120] disabled:opacity-50"
                style={{
                  ...orbitron,
                  background: "linear-gradient(135deg, #F0D078, #D4A843)",
                }}
              >
                {busy || isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Send login code
              </button>

              <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
                We’ll email a one-time code. Magic holds a non-custodial Hedera key — WCO never sees it. No HashPack required for this path.
              </p>

              {(busy || isConnecting) && (
                <div className="flex items-center justify-center gap-2 text-[#F0D078] text-xs py-1" style={dmSans}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Working… check your email for the code
                </div>
              )}

              {error && (
                <p className="text-red-300 text-xs text-center break-words" style={dmSans}>
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
