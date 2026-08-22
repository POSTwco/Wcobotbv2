/**
 * Governors Hub — Live Proposal Voting
 * ======================================
 * Governors vote FOR/AGAINST proposals with wallet-backed voting power.
 * Votes are persisted server-side with duplicate prevention.
 * Results are computed from KV vote records and displayed in real-time.
 * Proposal lifecycle: draft → active → passed/rejected
 *
 * SIGNING FLOW (same security standard as battle votes):
 *   1. User clicks FOR/AGAINST
 *   2. Frontend builds a human-readable vote message containing proposalId, direction, nonce
 *   3. wallet-connect.ts sends hedera_signMessage via WC relay → HashPack
 *   4. User approves in HashPack → signature returned
 *   5. Server validates: signature content, nonce replay, mainnet wallet, NFT holdings
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Vote, CheckCircle, Clock, ThumbsUp, ThumbsDown, Users, Zap, Lock, Crown,
  Loader2, XCircle, Ban, FileText, Fingerprint, RefreshCw,
} from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { useVIP } from "../components/vip/vip-context";
import { VIPBadge, VIPGovernorPill } from "../components/vip/vip-badge";
import { WCO3DBadge } from "../components/wco-3d-badge";
import { useProposals } from "../lib/hooks";
import { api } from "../lib/api";
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { toast } from "sonner";
import { AdminPanel } from "../components/admin-panel";
import { generateSecureNonce } from "../lib/api";
import { signatureCancelledMessage, signaturePromptMessage } from "../lib/magic-signing-guidance";
import type { ProposalVote, ProposalStatus } from "../lib/types";
import { BOTBSpinner, SkeletonProposalCard } from "../components/botb-spinner";

// ---------------------------------------------------------------------------
// Status rendering config
// ---------------------------------------------------------------------------
const STATUS_DISPLAY: Record<ProposalStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}> = {
  draft: {
    label: "DRAFT",
    icon: <FileText className="w-3 h-3" />,
    color: "text-[#8494A7]",
    bg: "bg-[#8494A7]/10",
    border: "border-[#8494A7]/30",
  },
  active: {
    label: "ACTIVE",
    icon: <Clock className="w-3 h-3" />,
    color: "text-[#4274B9]",
    bg: "bg-[#4274B9]/10",
    border: "border-[#4274B9]/30",
  },
  passed: {
    label: "PASSED",
    icon: <CheckCircle className="w-3 h-3" />,
    color: "text-[#10b981]",
    bg: "bg-[#10b981]/10",
    border: "border-[#10b981]/30",
  },
  rejected: {
    label: "REJECTED",
    icon: <XCircle className="w-3 h-3" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  cancelled: {
    label: "CANCELLED",
    icon: <Ban className="w-3 h-3" />,
    color: "text-[#8494A7]",
    bg: "bg-[#8494A7]/10",
    border: "border-[#8494A7]/30",
  },
};

function generateNonce(): string {
  return generateSecureNonce();
}

export function GovernancePage() {
  const { connected, connect, votingPower, hasGovernorNFT, isAdmin, accountId, signMessage, walletSessionToken, isLoadingBalances, walletProvider } = useWallet();
  const { vipActive, sound, tierName, governorCount } = useVIP();

  // Existing votes loaded from server
  const [myVotes, setMyVotes] = useState<Map<string, ProposalVote>>(new Map());
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [signingStep, setSigningStep] = useState<"idle" | "building" | "signing" | "submitting">("idle");
  const [changingVoteId, setChangingVoteId] = useState<string | null>(null);

  const { data: proposals, loading: proposalsLoading, refresh: refreshProposals } = useProposals(walletSessionToken);

  // Load existing votes when wallet connects
  const loadMyVotes = useCallback(async () => {
    if (!accountId) {
      setMyVotes(new Map());
      return;
    }
    setLoadingVotes(true);
    try {
      const res = await api.getMyProposalVotes(accountId, walletSessionToken ?? undefined);
      if (res.success && res.data) {
        const map = new Map<string, ProposalVote>();
        res.data.forEach((v) => map.set(v.proposalId, v));
        setMyVotes(map);
      }
    } catch (err) {
      console.error("[Governance] Failed to load existing votes:", err);
    } finally {
      setLoadingVotes(false);
    }
  }, [accountId, walletSessionToken]);

  useEffect(() => { loadMyVotes(); }, [loadMyVotes]);

  // ── Cast vote via wallet signature + server verification ──
  // Same security chain as battle votes: build message → sign via HashPack → submit with sig
  const handleVote = async (proposalId: string, direction: "for" | "against") => {
    if (!connected || !accountId || !signMessage) {
      connect();
      return;
    }

    // Governor NFT check — fast-fail before requesting signature
    if (!hasGovernorNFT) {
      toast.error("Governance voting requires a WCO Governors NFT. Your wallet does not hold one.");
      return;
    }

    const existingVote = myVotes.get(proposalId);
    const isVoteChange = !!existingVote;

    // Block no-op: same direction
    if (isVoteChange && existingVote.direction === direction) {
      toast.error(`You have already voted ${direction.toUpperCase()} on this proposal.`);
      return;
    }

    const proposal = proposals.find((p) => p.id === proposalId);
    const proposalTitle = proposal?.title || proposalId;
    const nonce = generateNonce();

    // Build human-readable message for wallet signing — must contain
    // proposalId, direction, and nonce so the server can validate content.
    // VOTE CHANGE messages include a distinct "VOTE CHANGE" marker that the
    // server requires to accept an overwrite (prevents replayed original sigs).
    const voteMessage = isVoteChange
      ? [
          "═══════════════════════════════════",
          "  BATTLE OF THE BARS — GOVERNANCE",
          "  World Calisthenics Organization",
          "═══════════════════════════════════",
          "",
          "⚠ VOTE CHANGE REQUEST ⚠",
          "",
          `Proposal: ${proposalTitle}`,
          `Previous Vote: ${existingVote.direction.toUpperCase()}`,
          `New Vote: ${direction.toUpperCase()}`,
          `Proposal ID: ${proposalId}`,
          `Direction: ${direction}`,
          `Wallet: ${accountId}`,
          `Timestamp: ${new Date().toISOString()}`,
          `Nonce: ${nonce}`,
          "",
          "You are changing your governance",
          "vote. This is a VOTE CHANGE, not",
          "a transaction. No tokens will be",
          "transferred.",
          "═══════════════════════════════════",
        ].join("\n")
      : [
          "═══════════════════════════════════",
          "  BATTLE OF THE BARS — GOVERNANCE",
          "  World Calisthenics Organization",
          "═══════════════════════════════════",
          "",
          `Proposal: ${proposalTitle}`,
          `Vote: ${direction.toUpperCase()}`,
          `Proposal ID: ${proposalId}`,
          `Direction: ${direction}`,
          `Wallet: ${accountId}`,
          `Timestamp: ${new Date().toISOString()}`,
          `Nonce: ${nonce}`,
          "",
          "This is a GOVERNANCE VOTE, not a",
          "transaction. No tokens will be",
          "transferred.",
          "═══════════════════════════════════",
        ].join("\n");

    setVotingId(proposalId);
    setSigningStep("building");

    try {
      // Step 1: Request wallet / Magic signature
      setSigningStep("signing");
      toast.info(
        signaturePromptMessage(
          walletProvider,
          isVoteChange ? "approve the VOTE CHANGE signature" : "approve the governance vote signature"
        ),
        { duration: 15000 },
      );

      const signature = await signMessage(voteMessage);
      if (!signature) {
        toast.error(signatureCancelledMessage(walletProvider));
        return;
      }

      // Step 2: Submit signed vote to server
      setSigningStep("submitting");

      const res = await api.voteProposal({
        proposalId,
        wallet: accountId,
        direction,
        signature,
        signedMessage: voteMessage,
        nonce,
      }, walletSessionToken || undefined);

      if (res.success && res.data) {
        if (vipActive) sound.playVote();

        // Update local vote map immediately
        setMyVotes((prev) => {
          const next = new Map(prev);
          next.set(proposalId, res.data!);
          return next;
        });

        // Close change-vote UI
        setChangingVoteId(null);

        const v = res.data;
        toast.success(
          <div className="space-y-1">
            <p className="font-bold">{isVoteChange ? "Vote changed!" : "Governance vote recorded!"}</p>
            <p className="text-xs opacity-80">
              {isVoteChange
                ? `Changed from ${existingVote.direction.toUpperCase()} to ${direction.toUpperCase()} on "${proposalTitle}"`
                : `Voted ${direction.toUpperCase()} on "${proposalTitle}"`}
            </p>
            <p className="text-xs opacity-80">
              {v.votingPower}x voting power applied
              {v.hasGovernorNFT && " (Governor boost)"}
            </p>
            <p className="text-xs opacity-60 flex items-center gap-1">
              <Fingerprint className="w-3 h-3" /> Signature verified
            </p>
          </div>,
          { duration: 6000 },
        );

        refreshProposals();
      } else {
        toast.error(res.error || "Failed to cast vote");
      }
    } catch (err: any) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("rejected")) {
        toast.error(signatureCancelledMessage(walletProvider));
      } else {
        console.error("[Governance] Vote error:", err);
        toast.error("Vote failed. Please try again or check your wallet connection.");
      }
    } finally {
      setVotingId(null);
      setSigningStep("idle");
    }
  };

  // Filter: only show active, passed, rejected to public (not draft/cancelled)
  const visibleProposals = proposals.filter(
    (p) => p.status === "active" || p.status === "passed" || p.status === "rejected",
  );

  // ── TOKEN GATE: Governor NFT required to access the hub ──
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center py-6 sm:py-8">
        <div className="max-w-lg mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-[#4274B9]/20 rounded-2xl p-8 sm:p-10"
          >
            <div className="w-16 h-16 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/20 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-8 h-8 text-[#4274B9]" />
            </div>
            <img src={botbShield} alt="BOTB" className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">GOVERNORS HUB</span>
            </h1>
            <p className="text-[#8494A7] text-sm mb-6">
              This area is exclusively for <span className="text-[#D4A843] font-semibold">WCO Governors NFT</span> holders.
              Connect your wallet to verify your Governor status and unlock governance voting.
            </p>
            <button
              onClick={connect}
              className="px-6 py-3 bg-[#4274B9] text-white text-sm rounded-xl hover:bg-[#3563A0] transition-all w-full sm:w-auto"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
            >
              CONNECT WALLET
            </button>
            <p className="text-[#8494A7]/60 text-[0.6rem] mt-4">
              Don't have a Governors NFT? Visit the WCO marketplace to acquire one.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoadingBalances) {
    return (
      <div className="min-h-screen flex items-center justify-center py-6 sm:py-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#4274B9] animate-spin mx-auto mb-4" />
          <p className="text-[#8494A7] text-sm" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
            VERIFYING GOVERNOR STATUS...
          </p>
        </div>
      </div>
    );
  }

  if (!hasGovernorNFT && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center py-6 sm:py-8">
        <div className="max-w-lg mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-red-500/20 rounded-2xl p-8 sm:p-10"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <Ban className="w-8 h-8 text-red-400" />
            </div>
            <img src={botbShield} alt="BOTB" className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="text-red-400">ACCESS DENIED</span>
            </h1>
            <p className="text-[#8494A7] text-sm mb-2">
              Your wallet <span className="text-[#E8ECF0] font-mono text-xs">{accountId}</span> does not hold a <span className="text-[#D4A843] font-semibold">WCO Governors NFT</span>.
            </p>
            <p className="text-[#8494A7] text-sm mb-6">
              The Governors Hub is token-gated and requires at least one WCO Governors NFT to access governance proposals and voting.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="px-5 py-2.5 bg-[#162033] text-[#8494A7] text-sm rounded-xl hover:bg-[#1a2840] border border-[#4274B9]/10 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}
              >
                GO BACK
              </button>
            </div>
            <p className="text-[#8494A7]/60 text-[0.6rem] mt-5">
              Acquire a WCO Governors NFT to unlock exclusive governance access.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with 3D Badge */}
        <div className="mb-8 sm:mb-10">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <img src={botbShield} alt="BOTB" className={`h-7 sm:h-8 w-auto ${vipActive ? "drop-shadow-[0_0_10px_rgba(212,168,67,0.4)]" : ""}`} />
                <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <span className={vipActive ? "vip-gold-text" : "bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent"}>GOVERNORS HUB</span>
                </h1>
                {vipActive && <VIPBadge size="md" showLabel />}
              </div>
              <p className="text-[#8494A7] mb-4">
                {vipActive
                  ? "Welcome back, Governor. Your voice shapes the future of World Calisthenics."
                  : "The WCO Governors NFT gates access to this exclusive hub. Rank athletes, vote on token distribution, manage event brackets, and connect directly with WCO admins."}
              </p>

              {/* VIP Governor Stats Panel */}
              {vipActive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="vip-glass-card vip-shimmer-overlay rounded-xl p-4 mb-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Crown className="w-5 h-5 vip-crown" style={{ color: "#D4A843" }} />
                    <span className="vip-gold-text text-sm font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                      {tierName.toUpperCase()} ACCESS
                    </span>
                    <VIPGovernorPill />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="vip-gold-text text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>{governorCount}</p>
                      <p className="text-[0.6rem] text-[#8494A7]">Governor NFTs</p>
                    </div>
                    <div>
                      <p className="vip-gold-text text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>{votingPower}x</p>
                      <p className="text-[0.6rem] text-[#8494A7]">Vote Power</p>
                    </div>
                    <div>
                      <p className="vip-gold-text text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>Elite</p>
                      <p className="text-[0.6rem] text-[#8494A7]">Access Tier</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Governance Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-[#111827] border border-[#6AA3E0]/10 rounded-xl p-2.5 sm:p-3 text-center">
                  <p className="text-lg sm:text-xl text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {proposalsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : visibleProposals.filter(p => p.status === "active").length}
                  </p>
                  <p className="text-[0.6rem] sm:text-[0.65rem] text-[#8494A7] mt-1">Active Proposals</p>
                </div>
                <div className="bg-[#111827] border border-[#4274B9]/10 rounded-xl p-2.5 sm:p-3 text-center">
                  <p className="text-lg sm:text-xl text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {connected ? `${votingPower}x` : "--"}
                  </p>
                  <p className="text-[0.6rem] sm:text-[0.65rem] text-[#8494A7] mt-1">Governor Power</p>
                </div>
                <div className="bg-[#111827] border border-[#10b981]/10 rounded-xl p-2.5 sm:p-3 text-center">
                  <p className="text-lg sm:text-xl text-[#10b981]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {proposalsLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : visibleProposals.filter(p => p.status === "passed").length}
                  </p>
                  <p className="text-[0.6rem] sm:text-[0.65rem] text-[#8494A7] mt-1">Passed</p>
                </div>
              </div>
            </div>

            {/* 3D WCO Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative hidden sm:block"
            >
              <WCO3DBadge className="h-[300px] sm:h-[350px] w-full" />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1120]/80 backdrop-blur-sm border border-[#4274B9]/20">
                  <img src={wcoLogoWhite} alt="WCO" className="h-3 w-auto" />
                  <span className="text-[#8494A7] text-[0.6rem] tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    WCO GOVERNORS BADGE
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Admin Panel — only visible to admin wallets */}
        {isAdmin && <AdminPanel />}

        {/* Proposals */}
        {proposalsLoading ? (
          <BOTBSpinner
            messages={[
              "Loading proposals...",
              "Syncing governance...",
              "Fetching vote tallies...",
              "Preparing hub...",
            ]}
          >
            <div className="w-full space-y-4 sm:space-y-6">
              {[0, 1, 2].map((i) => (
                <SkeletonProposalCard key={i} delay={i * 0.15} />
              ))}
            </div>
          </BOTBSpinner>
        ) : visibleProposals.length === 0 ? (
          <div className="text-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
            <Vote className="w-10 h-10 text-[#4274B9]/20 mx-auto mb-3" />
            <h3 className="text-[#E8ECF0] text-lg font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>NO PROPOSALS YET</h3>
            <p className="text-[#8494A7] text-sm max-w-md mx-auto">Governance proposals will appear here once created and activated by WCO admins.</p>
          </div>
        ) : (
        <div className="space-y-4 sm:space-y-6">
          {visibleProposals.map((proposal, i) => {
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            const forPercent = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 50;
            const againstPercent = 100 - forPercent;
            const existingVote = myVotes.get(proposal.id);
            const isActive = proposal.status === "active";
            const sd = STATUS_DISPLAY[proposal.status] || STATUS_DISPLAY.draft;
            const isVoting = votingId === proposal.id;

            // Check if deadline has passed
            const deadlinePassed = proposal.endsAt ? new Date(proposal.endsAt).getTime() <= Date.now() : false;
            const canVote = isActive && !existingVote && !deadlinePassed && connected;

            return (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-[#111827] border rounded-2xl overflow-hidden transition-all ${
                  isActive ? "border-[#4274B9]/20 hover:border-[#4274B9]/40" : "border-[#4274B9]/10"
                }`}
              >
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${sd.bg} border ${sd.border}`}>
                          {sd.icon}
                          <span className={`${sd.color} text-xs`} style={{ fontFamily: "Orbitron, sans-serif" }}>{sd.label}</span>
                        </div>
                        <span className="text-xs text-[#8494A7] px-2 py-0.5 rounded bg-[#162033]">{proposal.category}</span>
                        {proposal.endsAt && isActive && (
                          <span className={`text-[0.6rem] px-2 py-0.5 rounded ${deadlinePassed ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[#162033] text-[#8494A7]"}`}>
                            {deadlinePassed ? "VOTING CLOSED" : `Ends ${new Date(proposal.endsAt).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}>
                        {proposal.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-[#8494A7] text-sm mb-6">{proposal.description}</p>

                  {/* Vote bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[#10b981] flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> For: {proposal.votesFor.toFixed(1)} ({forPercent}%)
                      </span>
                      <span className="text-red-400 flex items-center gap-1">
                        Against: {proposal.votesAgainst.toFixed(1)} ({againstPercent}%) <ThumbsDown className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden bg-[#162033] flex">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${forPercent}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-[#10b981] to-[#10b981]/70"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${againstPercent}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-red-500/70 to-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#8494A7] mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      <span>{proposal.totalVoters.toLocaleString()} voter{proposal.totalVoters !== 1 ? "s" : ""}</span>
                    </div>
                    <span>Proposed by {proposal.proposer}</span>
                  </div>

                  {/* Vote actions */}
                  {isActive && (
                    <div className="pt-4 border-t border-[#4274B9]/10">
                      {existingVote && !deadlinePassed ? (
                        <div className="space-y-2">
                          {/* Current vote display */}
                          <div className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                            existingVote.direction === "for" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}>
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              You voted {existingVote.direction === "for" ? "FOR" : "AGAINST"} ({existingVote.votingPower}x power)
                            </span>
                            {changingVoteId !== proposal.id && (
                              <button
                                onClick={() => setChangingVoteId(proposal.id)}
                                disabled={isVoting}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[0.6rem] bg-[#162033] text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#1a2840] border border-[#4274B9]/10 transition-all disabled:opacity-50"
                                style={{ fontFamily: "Orbitron, sans-serif" }}
                              >
                                <RefreshCw className="w-3 h-3" />
                                CHANGE
                              </button>
                            )}
                          </div>

                          {/* Change vote panel — only visible when governor clicks CHANGE */}
                          {changingVoteId === proposal.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 rounded-lg bg-[#0B1120] border border-[#D4A843]/20">
                                <div className="flex items-center gap-2 mb-3">
                                  <RefreshCw className="w-3.5 h-3.5 text-[#D4A843]" />
                                  <span className="text-[#D4A843] text-[0.65rem] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                                    CHANGE YOUR VOTE
                                  </span>
                                </div>
                                <p className="text-[#8494A7] text-[0.65rem] mb-3">
                                  You will be asked to re-sign with your wallet. This creates a new cryptographic signature to verify the change.
                                </p>

                                {isVoting && signingStep !== "idle" ? (
                                  <div className="text-center py-2 rounded-lg text-xs bg-[#4274B9]/5 border border-[#4274B9]/20 text-[#6AA3E0] flex items-center justify-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {signingStep === "building" && "Preparing vote change..."}
                                    {signingStep === "signing" && (walletProvider === "magic" ? "Approve VOTE CHANGE in Magic..." : "Approve VOTE CHANGE in HashPack...")}
                                    {signingStep === "submitting" && "Verifying change on-chain..."}
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    {existingVote.direction === "against" && (
                                      <button
                                        onClick={() => handleVote(proposal.id, "for")}
                                        disabled={isVoting}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all disabled:opacity-50"
                                        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}
                                      >
                                        <ThumbsUp className="w-3 h-3" />
                                        CHANGE TO FOR
                                      </button>
                                    )}
                                    {existingVote.direction === "for" && (
                                      <button
                                        onClick={() => handleVote(proposal.id, "against")}
                                        disabled={isVoting}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}
                                      >
                                        <ThumbsDown className="w-3 h-3" />
                                        CHANGE TO AGAINST
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setChangingVoteId(null)}
                                      className="px-3 py-2 rounded-lg text-xs bg-[#162033] text-[#8494A7] hover:text-[#E8ECF0] border border-[#4274B9]/10 transition-all"
                                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}
                                    >
                                      CANCEL
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ) : existingVote && deadlinePassed ? (
                        <div className={`flex-1 text-center py-2 rounded-lg text-sm ${
                          existingVote.direction === "for" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}>
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            You voted {existingVote.direction === "for" ? "FOR" : "AGAINST"} ({existingVote.votingPower}x power)
                          </span>
                        </div>
                      ) : deadlinePassed ? (
                        <div className="flex-1 text-center py-2 rounded-lg text-sm bg-[#162033] text-[#8494A7] border border-[#8494A7]/20">
                          <span className="flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" />
                            Voting deadline has passed
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {isVoting && signingStep !== "idle" && (
                            <div className="flex-1 text-center py-2 rounded-lg text-xs bg-[#4274B9]/5 border border-[#4274B9]/20 text-[#6AA3E0] flex items-center justify-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {signingStep === "building" && "Preparing vote..."}
                              {signingStep === "signing" && (walletProvider === "magic" ? "Approve in Magic..." : "Approve in HashPack...")}
                              {signingStep === "submitting" && "Verifying on-chain..."}
                            </div>
                          )}
                          {!(isVoting && signingStep !== "idle") && (
                            <>
                              <button
                                onClick={() => handleVote(proposal.id, "for")}
                                disabled={isVoting}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all disabled:opacity-50"
                                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                FOR
                              </button>
                              <button
                                onClick={() => handleVote(proposal.id, "against")}
                                disabled={isVoting}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
                              >
                                <ThumbsDown className="w-3 h-3" />
                                AGAINST
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolved status message */}
                  {(proposal.status === "passed" || proposal.status === "rejected") && (
                    <div className={`flex items-center gap-2 pt-4 border-t border-[#4274B9]/10 text-sm ${
                      proposal.status === "passed" ? "text-[#10b981]" : "text-red-400"
                    }`}>
                      {proposal.status === "passed" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                        PROPOSAL {proposal.status.toUpperCase()}
                      </span>
                      {existingVote && (
                        <span className="text-[#8494A7] text-xs ml-auto">
                          You voted {existingVote.direction.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}