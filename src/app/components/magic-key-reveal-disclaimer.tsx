/**
 * HashPack-style disclaimer before Magic Hedera private-key reveal.
 * ================================================================
 * Magic’s SDK opens its own modal for the actual key. This dialog only
 * collects acknowledgements — it never displays or stores a private key.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { magicRevealHederaPrivateKey } from "../lib/magic-wallet";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CHECKS = [
  {
    id: "control",
    label:
      "Anyone with this private key can permanently control my Hedera account and funds.",
  },
  {
    id: "wco",
    label:
      "WCO / Battle of the Bars never sees, stores, or recovers this key — Magic’s UI shows it only to me.",
  },
  {
    id: "share",
    label:
      "I will not screenshot, paste into chat, or enter this key on any website except a wallet import flow I start myself.",
  },
  {
    id: "hashpack",
    label:
      "Signing into HashPack with the same email creates a different wallet. To use THIS account I must import the private key — not re-login with email.",
  },
] as const;

interface MagicKeyRevealDisclaimerProps {
  open: boolean;
  onClose: () => void;
  /** Called after Magic UI completes successfully (key never passed). */
  onRevealed?: () => void;
}

export function MagicKeyRevealDisclaimer({
  open,
  onClose,
  onRevealed,
}: MagicKeyRevealDisclaimerProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setChecked({});
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const allChecked = CHECKS.every((c) => checked[c.id]);

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReveal = async () => {
    if (!allChecked || busy) return;
    setBusy(true);
    const result = await magicRevealHederaPrivateKey();
    setBusy(false);

    if (result.ok) {
      toast.success("Follow Magic’s prompts to view your key securely.", {
        duration: 5000,
      });
      onRevealed?.();
      onClose();
      return;
    }

    toast.error(result.error || "Key reveal cancelled.", { duration: 6000 });
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="key-reveal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => !busy && onClose()}
      />

      <div
        className="relative w-full max-w-lg rounded-2xl border border-[#4274B9]/25 bg-[#0B1220]/98 p-5 sm:p-6 shadow-2xl"
        style={dmSans}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div>
            <p
              className="text-[0.55rem] tracking-[0.2em] text-[#8494A7] mb-1"
              style={orbitron}
            >
              BEFORE YOU CONTINUE
            </p>
            <h2
              id="key-reveal-title"
              className="text-lg text-[#E8ECF0] font-semibold"
              style={orbitron}
            >
              Reveal Hedera private key
            </h2>
            <p className="text-sm text-[#8494A7] mt-1.5 leading-relaxed">
              Magic will open a secure window to show your key. Check every box
              below — the same pattern HashPack uses before export.
            </p>
          </div>
        </div>

        <ul className="space-y-3 mb-5">
          {CHECKS.map((c) => (
            <li key={c.id}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checked[c.id]}
                  onChange={() => toggle(c.id)}
                  disabled={busy}
                  className="mt-1 h-4 w-4 rounded border-[#4274B9]/40 bg-transparent accent-[#4274B9]"
                />
                <span className="text-sm text-[#C5CDD6] group-hover:text-[#E8ECF0] leading-snug">
                  {c.label}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2 rounded-lg border border-[#4274B9]/20 bg-[#4274B9]/8 px-3 py-2.5 mb-5">
          <Shield className="w-4 h-4 text-[#6AA3E0] mt-0.5 shrink-0" />
          <p className="text-xs text-[#8494A7] leading-relaxed">
            After reveal: install{" "}
            <a
              href="https://www.hashpack.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6AA3E0] hover:underline"
            >
              HashPack
            </a>
            , choose <strong className="text-[#E8ECF0]">Import account</strong>{" "}
            / private key — not email login — then paste the key only inside
            HashPack.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-[#8494A7] hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allChecked || busy}
            onClick={handleReveal}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: allChecked
                ? "linear-gradient(135deg, #4274B9, #2a4f82)"
                : "rgba(66,116,185,0.35)",
            }}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening Magic…
              </span>
            ) : (
              "Reveal with Magic"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
