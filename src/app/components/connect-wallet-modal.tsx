/**
 * Magic email — Sign in + Sign up (same OTP backend, separate UX copy)
 * ====================================================================
 * Two processes share one glass modal:
 *   - Sign in  → returning Magic users (“Welcome back”)
 *   - Sign up  → new users (sponsored Hedera AccountCreate)
 *
 * HashPack remains the navbar Connect button.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, X, Loader2, LogIn, UserPlus } from "lucide-react";

export type MagicEmailMode = "signin" | "signup";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
  /** Same Magic OTP path for both modes */
  onCreateWithMagic: (email: string) => Promise<string | null>;
  isConnecting: boolean;
  /** Which tab to open with */
  initialMode?: MagicEmailMode;
}

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const COPY: Record<
  MagicEmailMode,
  {
    eyebrow: string;
    title: string;
    blurb: string;
    cta: string;
    footer: string;
    working: string;
  }
> = {
  signin: {
    eyebrow: "WELCOME BACK",
    title: "Sign in with email",
    blurb:
      "Already created an email account? Enter the same address and we’ll send a one-time code to sign you back in — no HashPack needed.",
    cta: "Send sign-in code",
    footer: "We’ll email a one-time code. Your Hedera key stays in Magic — WCO never sees it.",
    working: "Signing in… check your email for the code",
  },
  signup: {
    eyebrow: "JOIN WCO",
    title: "Create account with email",
    blurb:
      "New here? We create a Hedera account for you (no seed phrase, no starter HBAR). Use email OTP to get started on Battle of the Bars.",
    cta: "Send sign-up code",
    footer: "We’ll email a one-time code. Magic holds a non-custodial Hedera key — WCO never sees it.",
    working: "Creating account… check your email for the code",
  },
};

export function ConnectWalletModal({
  open,
  onClose,
  onCreateWithMagic,
  isConnecting,
  initialMode = "signup",
}: ConnectWalletModalProps) {
  const [mode, setMode] = useState<MagicEmailMode>(initialMode);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setEmail("");
      setError(null);
      setBusy(false);
    }
  }, [open, initialMode]);

  const copy = COPY[mode];

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

  const switchMode = (next: MagicEmailMode) => {
    if (busy || isConnecting) return;
    setMode(next);
    setError(null);
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
            aria-label={copy.title}
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-[0.6rem] tracking-[0.2em] text-[#F0D078] font-bold" style={orbitron}>
                  {copy.eyebrow}
                </p>
                <h2 className="text-white text-lg font-bold mt-1" style={orbitron}>
                  {copy.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy || isConnecting}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/5 border border-white/10"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Sign in / Sign up segmented control — sit together */}
              <div
                className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-white/10 bg-[#0B1120]/70"
                role="tablist"
                aria-label="Email account mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  disabled={busy || isConnecting}
                  onClick={() => switchMode("signin")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === "signin"
                      ? "bg-[#4274B9] text-white shadow-lg shadow-[#4274B9]/25"
                      : "text-[#8494A7] hover:text-white hover:bg-white/5"
                  }`}
                  style={dmSans}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  disabled={busy || isConnecting}
                  onClick={() => switchMode("signup")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === "signup"
                      ? "text-[#0B1120] shadow-lg"
                      : "text-[#8494A7] hover:text-white hover:bg-white/5"
                  }`}
                  style={{
                    ...dmSans,
                    ...(mode === "signup"
                      ? { background: "linear-gradient(135deg, #F0D078, #D4A843)" }
                      : {}),
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Sign up
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={mode}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="text-[#8494A7] text-sm leading-relaxed"
                  style={dmSans}
                >
                  {copy.blurb}{" "}
                  Already have HashPack? Use{" "}
                  <span className="text-white/80">Connect</span> instead.
                </motion.p>
              </AnimatePresence>

              <div>
                <label className="block text-[#8494A7] text-xs mb-1.5" style={dmSans}>
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
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#0B1120] border border-white/15 text-white text-sm outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/50"
                    style={dmSans}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={busy || isConnecting || !email.trim()}
                onClick={() => void submit()}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all ${
                  mode === "signin" ? "text-white" : "text-[#0B1120]"
                }`}
                style={{
                  ...orbitron,
                  background:
                    mode === "signin"
                      ? "linear-gradient(135deg, #6AA3E0, #4274B9)"
                      : "linear-gradient(135deg, #F0D078, #D4A843)",
                }}
              >
                {busy || isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "signin" ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {copy.cta}
              </button>

              <p className="text-[0.65rem] text-[#8494A7] leading-relaxed" style={dmSans}>
                {copy.footer}
              </p>

              {/* Cross-link under the CTA — keeps both processes visible together */}
              <p className="text-center text-[0.7rem] text-[#8494A7]" style={dmSans}>
                {mode === "signin" ? (
                  <>
                    New to WCO?{" "}
                    <button
                      type="button"
                      disabled={busy || isConnecting}
                      onClick={() => switchMode("signup")}
                      className="text-[#F0D078] hover:underline font-semibold"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an email account?{" "}
                    <button
                      type="button"
                      disabled={busy || isConnecting}
                      onClick={() => switchMode("signin")}
                      className="text-[#6AA3E0] hover:underline font-semibold"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              {(busy || isConnecting) && (
                <div className="flex items-center justify-center gap-2 text-[#F0D078] text-xs py-1" style={dmSans}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {copy.working}
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
