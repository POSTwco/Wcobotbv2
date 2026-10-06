/**
 * Logged-out Pro Card entry. Email create-account and sign-in sit with HashPack
 * so a new athlete is not sent straight into a wallet they do not have yet.
 */

import { useState } from "react";
import { Mail, Wallet, Zap } from "lucide-react";
import { useWallet } from "./wallet-context";
import { isMagicEnabled } from "../lib/wallet-types";

export function ApplyAccountChoices() {
  const { connect, isConnecting, openMagicEmailSignIn } = useWallet();
  const magicOn = isMagicEnabled();
  const [open, setOpen] = useState(false);

  if (!magicOn) {
    return (
      <button
        type="button"
        onClick={() => { void connect(); }}
        disabled={isConnecting}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all disabled:opacity-50"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
      >
        <Zap className="w-4 h-4" />
        {isConnecting ? "CONNECTING..." : "CONNECT HASHPACK TO APPLY"}
      </button>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
      >
        <Zap className="w-4 h-4" />
        SIGN UP / LOG IN TO APPLY
      </button>
      <p className="text-xs text-[#8494A7] mt-3 leading-relaxed">
        New here? You do not need a wallet app first. Create an account with email and WCO makes the Hedera account.
      </p>
      {open && (
        <div className="mt-4 grid grid-cols-1 gap-2 text-left" role="group" aria-label="How to apply">
          <button
            type="button"
            onClick={() => openMagicEmailSignIn("signup")}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111827] border border-[#D4A843]/30 text-[#F0D078] hover:border-[#D4A843]/60 disabled:opacity-50 text-sm"
          >
            <Mail className="w-4 h-4 shrink-0" />
            Create account
          </button>
          <button
            type="button"
            onClick={() => openMagicEmailSignIn("signin")}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111827] border border-[#4274B9]/30 text-[#E8ECF0] hover:border-[#6AA3E0]/60 disabled:opacity-50 text-sm"
          >
            <Mail className="w-4 h-4 shrink-0" />
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { void connect(); }}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111827] border border-[#8B5CF6]/30 text-[#C4B5FD] hover:border-[#8B5CF6]/60 disabled:opacity-50 text-sm"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            {isConnecting ? "Connecting..." : "Connect HashPack"}
          </button>
        </div>
      )}
    </div>
  );
}
