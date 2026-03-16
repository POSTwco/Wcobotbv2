/**
 * BOTB Snapshots Tab — Admin Command Center
 * ==========================================
 * Lists all reward distribution snapshots stored in KV after winner declaration.
 * Operators can view snapshot details, export CSV/JSON, and see airdrop status.
 * Snapshots persist here even after the battle arena is cleaned out.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Download, ExternalLink, CheckCircle, Clock,
  AlertTriangle, Loader2, RefreshCw, Trophy, Users,
  ChevronDown, ChevronUp, FileJson, FileSpreadsheet,
  Zap, Eye, Copy, Check,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { publicAnonKey } from "/utils/supabase/info";
import { getNetworkConfig } from "../lib/hedera-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SnapshotSummary {
  battleId: string;
  eventId: string;
  winnerId: string;
  winnerName: string;
  totalPool: number;
  totalWinningVotes: number;
  totalVoteRecords: number;
  totalWinnerVoteRecords: number;
  recipientCount: number;
  generatedAt: string;
  generatedBy: string;
  exportedAt: string | null;
  airdropTxId: string | null;
  airdropConfirmedAt: string | null;
  headcountFallbackUsed: boolean;
  balanceVerificationEnabled: boolean;
}

interface SnapshotDetail {
  battleId: string;
  eventId: string;
  winnerId: string;
  winnerName: string;
  totalPool: number;
  totalWinningVotes: number;
  totalVoteRecords: number;
  totalWinnerVoteRecords: number;
  duplicatesRemoved: number;
  tallyDriftDetected: boolean;
  headcountFallbackUsed: boolean;
  balanceVerificationEnabled: boolean;
  recipients: {
    wallet: string;
    stakeAmount: number;
    weightedVote: number;
    sharePercent: number;
    amount: number;
    nftMultiplier: number;
    votingPower: number;
    signatureHash: string | null;
    nonce: string | null;
    balanceAtSnapshot: number | null;
    votedAt: string;
  }[];
  generatedAt: string;
  generatedBy: string;
  exportedAt?: string;
  airdropTxId?: string;
  airdropConfirmedAt?: string;
}

// ---------------------------------------------------------------------------
// SnapshotsTab
// ---------------------------------------------------------------------------

export function SnapshotsTab({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SnapshotDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [batchExporting, setBatchExporting] = useState<"csv" | "json" | null>(null);

  const explorerUrl = getNetworkConfig().explorerUrl;

  // ---------------------------------------------------------------------------
  // Load all snapshots
  // ---------------------------------------------------------------------------
  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.listSnapshots(wallet, sessionToken);
      if (res.success && res.data) {
        setSnapshots(res.data);
      } else {
        toast.error("Failed to load snapshots");
      }
    } catch (err) {
      console.error("[SnapshotsTab] Load error:", err);
      toast.error("Error loading snapshots");
    } finally {
      setLoading(false);
    }
  }, [wallet, sessionToken]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  // ---------------------------------------------------------------------------
  // Expand / load detail
  // ---------------------------------------------------------------------------
  const toggleExpand = useCallback(async (battleId: string) => {
    if (expandedId === battleId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(battleId);

    if (!detailCache[battleId]) {
      setLoadingDetail(battleId);
      try {
        const res = await api.admin.getSnapshot(battleId, wallet, sessionToken);
        if (res.success && res.data) {
          setDetailCache((prev) => ({ ...prev, [battleId]: res.data as SnapshotDetail }));
        }
      } catch (err) {
        console.error("[SnapshotsTab] Detail error:", err);
        toast.error("Failed to load snapshot detail");
      } finally {
        setLoadingDetail(null);
      }
    }
  }, [expandedId, detailCache, wallet, sessionToken]);

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  const handleExport = useCallback(async (battleId: string, format: "csv" | "json") => {
    try {
      const { url, headers } = api.admin.exportSnapshot(battleId, format, wallet, sessionToken);
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error(`Export failed: ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `snapshot-${battleId}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Exported ${format.toUpperCase()} for battle ${battleId}`);
    } catch (err) {
      console.error("[SnapshotsTab] Export error:", err);
      toast.error("Export failed");
    }
  }, [wallet, sessionToken]);

  // ---------------------------------------------------------------------------
  // Batch Export — all snapshots as one combined file
  // ---------------------------------------------------------------------------
  const handleBatchExport = useCallback(async (format: "csv" | "json") => {
    setBatchExporting(format);
    try {
      const { url, headers } = api.admin.batchExportSnapshots(format, wallet, sessionToken);
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(errBody?.error || `Batch export failed: ${resp.status}`);
      }
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ts = new Date().toISOString().split("T")[0];
      a.download = `botb-all-snapshots-${ts}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Batch ${format.toUpperCase()} exported — ${snapshots.length} snapshots`);
    } catch (err: any) {
      console.error("[SnapshotsTab] Batch export error:", err);
      toast.error(err?.message || "Batch export failed");
    } finally {
      setBatchExporting(null);
    }
  }, [wallet, sessionToken, snapshots.length]);

  // ---------------------------------------------------------------------------
  // Copy wallet
  // ---------------------------------------------------------------------------
  const copyWallet = useCallback((w: string) => {
    navigator.clipboard.writeText(w);
    setCopiedWallet(w);
    setTimeout(() => setCopiedWallet(null), 2000);
  }, []);

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------
  function getStatus(s: SnapshotSummary) {
    if (s.airdropConfirmedAt) return { label: "AIRDROP CONFIRMED", color: "#10B981", icon: CheckCircle };
    if (s.exportedAt) return { label: "EXPORTED", color: "#FACC15", icon: Download };
    return { label: "PENDING EXPORT", color: "#4274B9", icon: Clock };
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#4274B9] animate-spin mb-3" />
        <p className="text-[#8494A7] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>Loading snapshots...</p>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-3 rounded-full bg-[#4274B9]/5 border border-[#4274B9]/20 mb-3">
          <Camera className="w-8 h-8 text-[#4274B9]/40" />
        </div>
        <h3 className="text-[#E8ECF0] font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
          NO SNAPSHOTS YET
        </h3>
        <p className="text-[#8494A7] text-sm max-w-md mx-auto">
          Snapshots are generated when you declare a battle winner. They'll appear here for export, airdrop tracking, and long-term record-keeping.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#4274B9]" />
          <h3 className="text-sm text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            REWARD SNAPSHOTS
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#6AA3E0]"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            {snapshots.length}
          </span>
        </div>
        <button
          onClick={loadSnapshots}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#6AA3E0] text-xs hover:bg-[#4274B9]/10 transition-all"
          style={{ fontFamily: "Orbitron, sans-serif" }}
        >
          <RefreshCw className="w-3 h-3" /> REFRESH
        </button>
      </div>

      {/* Info bar */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#162033] border border-[#4274B9]/10">
        <AlertTriangle className="w-3.5 h-3.5 text-[#FACC15] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#8494A7] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Snapshots are created at winner declaration and preserved here permanently. You can safely clear completed battles from the Battle Arena — snapshots remain in this zone for audit, export, and airdrop reference.
        </p>
      </div>

      {/* ── Batch Export Card ── */}
      <div className="rounded-xl border border-[#FACC15]/15 bg-gradient-to-r from-[#FACC15]/[0.04] to-[#4274B9]/[0.04] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left — info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FACC15]/10 border border-[#FACC15]/20">
                <Zap className="w-4 h-4 text-[#FACC15]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  BATCH EXPORT — ALL SNAPSHOTS
                </h4>
                <p className="text-[10px] text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Combine all {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} into a single file for accounting
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {[
                { label: "Snapshots", value: snapshots.length },
                { label: "Total Recipients", value: snapshots.reduce((s, snap) => s + snap.recipientCount, 0) },
                { label: "Total Pool", value: `${snapshots.reduce((s, snap) => s + (snap.totalPool || 0), 0).toLocaleString()} WCO` },
                { label: "Airdrops Confirmed", value: snapshots.filter(s => s.airdropConfirmedAt).length },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5">
                  <span className="text-[9px] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>{stat.label}:</span>
                  <span className="text-[10px] text-[#E8ECF0] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleBatchExport("csv")}
              disabled={!!batchExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/25 text-[#FACC15] text-[10px] font-bold hover:bg-[#FACC15]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {batchExporting === "csv" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              BATCH CSV
            </button>
            <button
              onClick={() => handleBatchExport("json")}
              disabled={!!batchExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/25 text-[#6AA3E0] text-[10px] font-bold hover:bg-[#4274B9]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {batchExporting === "json" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileJson className="w-3.5 h-3.5" />
              )}
              BATCH JSON
            </button>
          </div>
        </div>

        {/* CSV format note */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[9px] text-[#8494A7] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span className="text-[#6AA3E0] font-semibold">CSV format:</span> One row per recipient across all battles — includes battleId, eventId, winnerName, wallet, stakeAmount, votingPower, nftMultiplier, weightedVote, sharePercent, rewardAmount, airdropTxId, and timestamps. Ready for spreadsheet import or accounting reconciliation.
          </p>
        </div>
      </div>

      {/* Snapshot list */}
      <div className="space-y-2">
        {snapshots.map((snap) => {
          const status = getStatus(snap);
          const StatusIcon = status.icon;
          const isExpanded = expandedId === snap.battleId;
          const detail = detailCache[snap.battleId];
          const isLoadingDetail = loadingDetail === snap.battleId;

          return (
            <motion.div
              key={snap.battleId}
              layout
              className="rounded-xl border overflow-hidden transition-all"
              style={{
                borderColor: isExpanded ? `${status.color}40` : "#4274B920",
                background: isExpanded ? "#0D1525" : "#111827",
              }}
            >
              {/* Summary row */}
              <button
                onClick={() => toggleExpand(snap.battleId)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                {/* Status dot */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${status.color}15`, border: `1px solid ${status.color}30` }}
                >
                  <StatusIcon className="w-4 h-4" style={{ color: status.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#E8ECF0] truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {snap.winnerName?.toUpperCase() || "UNKNOWN"}
                    </span>
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded"
                      style={{
                        fontFamily: "Orbitron, sans-serif",
                        background: `${status.color}15`,
                        color: status.color,
                        border: `1px solid ${status.color}25`,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span>Battle: {snap.battleId.substring(0, 8)}…</span>
                    <span>{snap.recipientCount} recipients</span>
                    <span>Pool: {snap.totalPool?.toLocaleString() || 0} WCO</span>
                    <span className="hidden sm:inline">{formatDate(snap.generatedAt)}</span>
                  </div>
                </div>

                {/* Expand chevron */}
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#8494A7]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#8494A7]" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                      {/* Meta grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Winner", value: snap.winnerName || "—" },
                          { label: "Total Pool", value: `${snap.totalPool?.toLocaleString() || 0} WCO` },
                          { label: "Total Votes", value: String(snap.totalVoteRecords || 0) },
                          { label: "Winner Votes", value: String(snap.totalWinnerVoteRecords || 0) },
                          { label: "Recipients", value: String(snap.recipientCount || 0) },
                          { label: "Weighted Total", value: String(snap.totalWinningVotes || 0) },
                          { label: "Headcount Mode", value: snap.headcountFallbackUsed ? "YES" : "NO" },
                          { label: "Balance Verified", value: snap.balanceVerificationEnabled ? "YES" : "NO" },
                        ].map((item) => (
                          <div key={item.label} className="p-2 rounded-lg bg-[#0A0F1A] border border-[#4274B9]/10">
                            <p className="text-[9px] text-[#8494A7] mb-0.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                              {item.label}
                            </p>
                            <p className="text-xs text-[#E8ECF0] font-semibold truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Timestamps */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0A0F1A] border border-[#4274B9]/10">
                          <Clock className="w-3 h-3 text-[#4274B9]" />
                          <div>
                            <p className="text-[8px] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>GENERATED</p>
                            <p className="text-[10px] text-[#E8ECF0]">{formatDate(snap.generatedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0A0F1A] border border-[#4274B9]/10">
                          <Download className="w-3 h-3 text-[#FACC15]" />
                          <div>
                            <p className="text-[8px] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>EXPORTED</p>
                            <p className="text-[10px] text-[#E8ECF0]">{formatDate(snap.exportedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0A0F1A] border border-[#4274B9]/10">
                          <CheckCircle className="w-3 h-3 text-[#10B981]" />
                          <div>
                            <p className="text-[8px] text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>AIRDROP</p>
                            <p className="text-[10px] text-[#E8ECF0]">{formatDate(snap.airdropConfirmedAt)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Airdrop TX link */}
                      {snap.airdropTxId && (
                        <a
                          href={`${explorerUrl}/transaction/${snap.airdropTxId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg bg-[#10B981]/5 border border-[#10B981]/20 hover:bg-[#10B981]/10 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#10B981]" />
                          <span className="text-[10px] text-[#10B981] truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            TX: {snap.airdropTxId}
                          </span>
                        </a>
                      )}

                      {/* Export buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExport(snap.battleId, "csv")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#6AA3E0] text-[10px] hover:bg-[#4274B9]/10 transition-all"
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          <FileSpreadsheet className="w-3 h-3" /> EXPORT CSV
                        </button>
                        <button
                          onClick={() => handleExport(snap.battleId, "json")}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#6AA3E0] text-[10px] hover:bg-[#4274B9]/10 transition-all"
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          <FileJson className="w-3 h-3" /> EXPORT JSON
                        </button>
                      </div>

                      {/* Recipients table */}
                      {isLoadingDetail ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-[#4274B9] animate-spin" />
                          <span className="text-xs text-[#8494A7] ml-2">Loading recipients...</span>
                        </div>
                      ) : detail ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3.5 h-3.5 text-[#6AA3E0]" />
                            <span className="text-[10px] text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                              RECIPIENTS ({detail.recipients.length})
                            </span>
                            {detail.duplicatesRemoved > 0 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20"
                                style={{ fontFamily: "Orbitron, sans-serif" }}>
                                {detail.duplicatesRemoved} DUPS REMOVED
                              </span>
                            )}
                            {detail.tallyDriftDetected && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                                style={{ fontFamily: "Orbitron, sans-serif" }}>
                                TALLY DRIFT
                              </span>
                            )}
                          </div>

                          <div className="rounded-lg border border-[#4274B9]/10 overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-[1fr_80px_70px_70px_60px] sm:grid-cols-[1fr_100px_80px_80px_80px_60px] gap-1 px-3 py-2 bg-[#0A0F1A] border-b border-[#4274B9]/10 text-[8px] text-[#8494A7]"
                              style={{ fontFamily: "Orbitron, sans-serif" }}>
                              <span>WALLET</span>
                              <span className="text-right">AMOUNT</span>
                              <span className="text-right">SHARE</span>
                              <span className="text-right hidden sm:block">WEIGHTED</span>
                              <span className="text-right">MULT</span>
                              <span className="text-right">PWR</span>
                            </div>

                            {/* Rows */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-[#4274B9]/5">
                              {detail.recipients
                                .sort((a, b) => b.amount - a.amount)
                                .map((r, i) => (
                                <div
                                  key={r.wallet}
                                  className="grid grid-cols-[1fr_80px_70px_70px_60px] sm:grid-cols-[1fr_100px_80px_80px_80px_60px] gap-1 px-3 py-2 text-[10px] hover:bg-white/[0.02] transition-colors"
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <button
                                      onClick={() => copyWallet(r.wallet)}
                                      className="text-[#6AA3E0] hover:text-white transition-colors shrink-0"
                                    >
                                      {copiedWallet === r.wallet ? (
                                        <Check className="w-2.5 h-2.5 text-[#10B981]" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5" />
                                      )}
                                    </button>
                                    <a
                                      href={`${explorerUrl}/account/${r.wallet}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#6AA3E0] hover:text-white truncate transition-colors"
                                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                                    >
                                      {r.wallet}
                                    </a>
                                  </div>
                                  <span className="text-right text-[#E8ECF0]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {r.amount?.toLocaleString() || 0}
                                  </span>
                                  <span className="text-right text-[#FACC15]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {r.sharePercent?.toFixed(1)}%
                                  </span>
                                  <span className="text-right text-[#8494A7] hidden sm:block" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {r.weightedVote || 0}
                                  </span>
                                  <span className="text-right text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {r.nftMultiplier || 1}x
                                  </span>
                                  <span className="text-right text-[#8494A7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {r.votingPower || 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}