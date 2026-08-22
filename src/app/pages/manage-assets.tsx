/**
 * Manage Assets — whitelisted balances + Magic key export path
 * ============================================================
 * Shows only HBAR, WCO, and USDC for the connected account.
 * Private-key reveal (Magic) uses Magic’s SDK UI after disclaimers —
 * this page never stores or renders a private key string.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Shield,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "../components/wallet-context";
import { MagicKeyRevealDisclaimer } from "../components/magic-key-reveal-disclaimer";
import { TOKEN_IDS, getNetworkConfig } from "../lib/hedera-config";
import { isMagicEnabled } from "../lib/wallet-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

function formatHbar(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatUsdc(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function ManageAssetsPage() {
  const {
    connected,
    accountId,
    address,
    network,
    balance,
    botbBalance,
    usdcBalance,
    walletProvider,
    isLoadingBalances,
    refreshBalances,
    connect,
    openMagicEmailSignIn,
    isConnecting,
  } = useWallet();

  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);

  // Deep-link: /wallet/assets#export opens reveal flow for Magic users
  useEffect(() => {
    if (!connected || walletProvider !== "magic") return;
    if (location.hash === "#export") {
      setRevealOpen(true);
    }
  }, [connected, walletProvider, location.hash]);

  const net = network ?? "mainnet";
  const explorer = getNetworkConfig(net).explorerUrl;
  const wcoConfigured = !!TOKEN_IDS.BOTB;

  const copyAccount = async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      toast.success("Account ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  if (!connected || !accountId) {
    return (
      <div className="min-h-[70vh] px-4 py-12 max-w-lg mx-auto" style={dmSans}>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#8494A7] hover:text-[#E8ECF0] mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="rounded-2xl border border-[#4274B9]/20 bg-[#0B1220]/80 p-8 text-center">
          <Wallet className="w-10 h-10 text-[#4274B9] mx-auto mb-4" />
          <h1 className="text-xl text-[#E8ECF0] mb-2" style={orbitron}>
            Manage Assets
          </h1>
          <p className="text-sm text-[#8494A7] mb-6 leading-relaxed">
            Connect a wallet to view HBAR, WCO, and USDC balances for your account.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isConnecting}
              onClick={() => connect()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #D4A843, #a07520)",
              }}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : (
                "Connect HashPack"
              )}
            </button>
            {isMagicEnabled() && (
              <button
                type="button"
                onClick={() => openMagicEmailSignIn("signin")}
                className="w-full py-3 rounded-xl text-sm text-[#E8ECF0] border border-[#4274B9]/30 hover:bg-[#4274B9]/10"
              >
                Sign in with email
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const providerLabel =
    walletProvider === "magic"
      ? "Magic email"
      : walletProvider === "hashpack"
        ? "HashPack"
        : "Connected";

  return (
    <div className="min-h-[70vh] px-4 py-10 max-w-2xl mx-auto" style={dmSans}>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[#8494A7] hover:text-[#E8ECF0] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p
            className="text-[0.55rem] tracking-[0.2em] text-[#8494A7] mb-1"
            style={orbitron}
          >
            WALLET
          </p>
          <h1 className="text-2xl text-[#E8ECF0]" style={orbitron}>
            Manage Assets
          </h1>
          <p className="text-sm text-[#8494A7] mt-1">
            Whitelisted balances only — HBAR, WCO, USDC.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshBalances}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#8494A7] border border-[#4274B9]/20 hover:border-[#4274B9]/40 hover:text-[#E8ECF0]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Account card */}
      <div className="rounded-2xl border border-[#4274B9]/20 bg-[#0B1220]/85 p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-[0.65rem] uppercase tracking-wider text-[#8494A7]">
            Account
          </span>
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full border border-[#4274B9]/30 text-[#6AA3E0]">
            {providerLabel} · {net}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code
            className="text-sm sm:text-base text-[#E8ECF0] break-all"
            style={{ fontFamily: "Orbitron, monospace" }}
          >
            {address}
          </code>
          <button
            type="button"
            onClick={copyAccount}
            className="p-1.5 rounded-lg text-[#8494A7] hover:text-[#E8ECF0] hover:bg-white/5"
            title="Copy account ID"
          >
            {copied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={`${explorer}/account/${accountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-[#8494A7] hover:text-[#E8ECF0] hover:bg-white/5"
            title="View on HashScan"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <AssetCard
          symbol="HBAR"
          subtitle="Native"
          loading={isLoadingBalances}
          value={formatHbar(balance)}
        />
        <AssetCard
          symbol="WCO"
          subtitle={wcoConfigured ? TOKEN_IDS.BOTB! : "Token ID pending"}
          loading={isLoadingBalances}
          value={
            !wcoConfigured
              ? "—"
              : botbBalance > 0
                ? botbBalance.toLocaleString()
                : "0"
          }
          muted={!wcoConfigured}
          hint={!wcoConfigured ? "Launching Summer 2026" : undefined}
        />
        <AssetCard
          symbol="USDC"
          subtitle={TOKEN_IDS.USDC}
          loading={isLoadingBalances}
          value={formatUsdc(usdcBalance)}
        />
      </div>

      {/* Signing / export guidance */}
      {walletProvider === "magic" && (
        <div
          id="export"
          className="rounded-2xl border border-[#4274B9]/25 bg-[#4274B9]/8 p-5 mb-4 scroll-mt-24"
        >
          <div className="flex items-start gap-3 mb-3">
            <Shield className="w-5 h-5 text-[#6AA3E0] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-[#E8ECF0]" style={orbitron}>
                Signing on this site
              </h2>
              <p className="text-sm text-[#8494A7] mt-1 leading-relaxed">
                Your Magic email wallet can sign votes, workouts, and on-chain
                Hedera transactions here — no HashPack required. Keep a little{" "}
                <strong className="text-[#E8ECF0]">HBAR</strong> for network fees.
                Exporting your key is optional backup / self-custody.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRevealOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #4274B9, #2a4f82)" }}
          >
            <KeyRound className="w-4 h-4" />
            Export private key (backup)
          </button>

          {showImportGuide && (
            <ol className="mt-4 space-y-2 text-sm text-[#8494A7] list-decimal list-inside leading-relaxed">
              <li>
                Optional: install{" "}
                <a
                  href="https://www.hashpack.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6AA3E0] hover:underline"
                >
                  HashPack
                </a>{" "}
                for a desktop wallet UI.
              </li>
              <li>
                Import <strong className="text-[#E8ECF0]">this</strong> account’s
                private key — do not sign in to HashPack with the same email (that
                creates a different wallet).
              </li>
              <li>Keep a small HBAR balance for transaction fees either way.</li>
            </ol>
          )}
          {!showImportGuide && (
            <button
              type="button"
              onClick={() => setShowImportGuide(true)}
              className="mt-3 text-xs text-[#6AA3E0] hover:underline"
            >
              Optional HashPack import steps
            </button>
          )}
        </div>
      )}

      {walletProvider === "hashpack" && (
        <div className="rounded-2xl border border-[#4274B9]/20 bg-[#0B1220]/85 p-5 mb-4">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-[#6AA3E0] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-[#E8ECF0]" style={orbitron}>
                Export keys
              </h2>
              <p className="text-sm text-[#8494A7] mt-1 leading-relaxed">
                Connected via HashPack. To view or backup your private key, use
                HashPack → Settings → Account → View Private Key (complete their
                warnings first). WCO never requests your key.
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-[0.7rem] text-[#8494A7]/70 leading-relaxed">
        WCO does not custody funds. Balances are read from the Hedera mirror node
        for your connected account only. Never share private keys with support or
        anyone claiming to represent WCO.
      </p>

      <MagicKeyRevealDisclaimer
        open={revealOpen}
        onClose={() => setRevealOpen(false)}
        onRevealed={() => setShowImportGuide(true)}
      />
    </div>
  );
}

function AssetCard({
  symbol,
  subtitle,
  value,
  loading,
  muted,
  hint,
}: {
  symbol: string;
  subtitle: string;
  value: string;
  loading: boolean;
  muted?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#4274B9]/15 bg-[#0B1220]/85 p-4">
      <p
        className="text-[0.55rem] tracking-[0.15em] text-[#8494A7] mb-1"
        style={orbitron}
      >
        {symbol}
      </p>
      {loading ? (
        <div className="h-7 w-20 rounded animate-pulse bg-[#4274B9]/15 mb-1" />
      ) : (
        <p
          className={`text-xl font-semibold ${muted ? "text-[#8494A7]" : "text-[#E8ECF0]"}`}
          style={orbitron}
        >
          {value}
        </p>
      )}
      <p className="text-[0.65rem] text-[#8494A7]/80 truncate mt-1" title={subtitle}>
        {hint || subtitle}
      </p>
    </div>
  );
}
