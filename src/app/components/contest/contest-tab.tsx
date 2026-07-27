/**
 * Admin Contest Tab — Connect-to-Enter ops
 * Metrics, entrants, export (picker), audit log, private winners.
 * Full wallet IDs are admin-only — never publish exports publicly.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Gift, RefreshCw, Loader2, Download, Users, Share2, Trophy,
  ShieldAlert, FileSpreadsheet, FileJson, ChevronLeft, ChevronRight,
  Play, Square, Target,
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import type {
  ContestAdminOverview,
  ContestAuditEvent,
  ContestEntry,
  ContestStatus,
} from "../../lib/contest-types";

interface Props {
  wallet: string;
  sessionToken: string;
}

const STATUS_ACTIONS: { status: ContestStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "closed", label: "Close" },
  { status: "drawing", label: "Drawing" },
  { status: "completed", label: "Complete" },
  { status: "draft", label: "Draft" },
];

export function ContestTab({ wallet, sessionToken }: Props) {
  const [overview, setOverview] = useState<ContestAdminOverview | null>(null);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [socialOnly, setSocialOnly] = useState(false);
  const [audit, setAudit] = useState<ContestAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [busyStatus, setBusyStatus] = useState(false);

  // Winner form (private)
  const [w1, setW1] = useState("");
  const [w2, setW2] = useState("");
  const [w3, setW3] = useState("");
  const [wSocial, setWSocial] = useState("");
  const [seedNote, setSeedNote] = useState("");
  const [savingWinners, setSavingWinners] = useState(false);

  const loadOverview = useCallback(async () => {
    const res = await api.admin.getContest(wallet, sessionToken);
    if (res.success && res.data) {
      setOverview(res.data);
      const winners = res.data.winners;
      if (winners?.main?.length) {
        setW1(winners.main.find((m) => m.place === 1)?.accountId || "");
        setW2(winners.main.find((m) => m.place === 2)?.accountId || "");
        setW3(winners.main.find((m) => m.place === 3)?.accountId || "");
      }
      if (winners?.social?.accountId) setWSocial(winners.social.accountId);
      if (winners?.seedNote) setSeedNote(winners.seedNote);
    }
  }, [wallet, sessionToken]);

  const loadEntries = useCallback(async () => {
    const res = await api.admin.getContestEntries(wallet, sessionToken, {
      page,
      pageSize: 40,
      q: q || undefined,
      social: socialOnly || undefined,
    });
    if (res.success && res.data) {
      setEntries(res.data.items);
      setEntriesTotal(res.data.total);
    }
  }, [wallet, sessionToken, page, q, socialOnly]);

  const loadAudit = useCallback(async () => {
    const res = await api.admin.getContestAudit(wallet, sessionToken, {
      page: 1,
      pageSize: 40,
    });
    if (res.success && res.data) setAudit(res.data.items);
  }, [wallet, sessionToken]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadOverview(), loadEntries(), loadAudit()]);
    } catch (e) {
      console.warn("[ContestTab] reload failed", e);
      toast.error("Failed to load contest data");
    }
    setLoading(false);
  }, [loadOverview, loadEntries, loadAudit]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const setStatus = async (status: ContestStatus) => {
    if (!confirm(`Set contest status to "${status}"?`)) return;
    setBusyStatus(true);
    try {
      const res = await api.admin.setContestStatus(status, wallet, sessionToken);
      if (res.success) {
        toast.success(`Contest → ${status}`);
        await loadOverview();
        await loadAudit();
      } else {
        toast.error(res.error || "Status update failed");
      }
    } finally {
      setBusyStatus(false);
    }
  };

  const doExport = async (format: "csv" | "json", social = false) => {
    if (
      !confirm(
        "This file contains full wallet addresses for prize administration only.\n\nDo NOT publish or share this file publicly. Continue?",
      )
    ) {
      return;
    }
    setExporting(format);
    try {
      const { url, headers } = api.admin.exportContestEntries(
        format,
        wallet,
        sessionToken,
        social,
      );
      const res = await fetch(url, { headers });
      if (!res.ok) {
        toast.error("Export failed");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `wco-contest-entries${social ? "-social" : ""}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast.success("Export downloaded — keep offline & private");
      await loadAudit();
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const saveWinners = async () => {
    if (!w1 || !w2 || !w3) {
      toast.error("Enter 1st, 2nd, and 3rd place wallets");
      return;
    }
    if (
      !confirm(
        "Save winners privately to admin storage?\n\nThese wallets will NOT be published on the public site.",
      )
    ) {
      return;
    }
    setSavingWinners(true);
    try {
      const res = await api.admin.setContestWinners(
        {
          main: [
            { place: 1, accountId: w1.trim(), amountUsd: 150 },
            { place: 2, accountId: w2.trim(), amountUsd: 75 },
            { place: 3, accountId: w3.trim(), amountUsd: 25 },
          ],
          social: wSocial.trim()
            ? { accountId: wSocial.trim(), amountUsd: 100 }
            : null,
          method: "external_picker",
          seedNote: seedNote.trim() || undefined,
          publicAnnouncement: {
            copy: "WCO Connect-to-Enter winners have been selected. Prize winners will be contacted privately. Full wallet addresses are not published publicly.",
          },
        },
        wallet,
        sessionToken,
      );
      if (res.success) {
        toast.success("Winners saved (admin-only)");
        await loadOverview();
        await loadAudit();
      } else {
        toast.error(res.error || "Failed to save winners");
      }
    } finally {
      setSavingWinners(false);
    }
  };

  const m = overview?.metrics;
  const cfg = overview?.config;
  const orbitron = { fontFamily: "Orbitron, sans-serif" } as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-[#D4A843]" />
          <div>
            <h2 className="text-sm font-bold text-white" style={orbitron}>
              CONNECT-TO-ENTER CONTEST
            </h2>
            <p className="text-[0.65rem] text-[#8494A7]">
              Admin-only wallets · picker export · full audit trail
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reloadAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4274B9]/30 text-[#6AA3E0] text-xs hover:bg-[#4274B9]/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-16 text-[#8494A7]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading contest…
        </div>
      ) : (
        <>
          {/* Status + metrics */}
          <div className="rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[0.65rem] px-2 py-0.5 rounded-full font-bold tracking-wider border ${
                    cfg?.status === "open"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : cfg?.status === "full"
                        ? "bg-red-500/15 text-red-300 border-red-500/30"
                        : "bg-[#4274B9]/15 text-[#6AA3E0] border-[#4274B9]/30"
                  }`}
                >
                  {(cfg?.status || "draft").toUpperCase()}
                </span>
                <span className="text-xs text-[#E8ECF0]" style={orbitron}>
                  {cfg?.title}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ACTIONS.map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    disabled={busyStatus || cfg?.status === a.status}
                    onClick={() => setStatus(a.status)}
                    className="px-2 py-1 rounded-md text-[0.6rem] border border-[#4274B9]/25 text-[#B0BCC9] hover:bg-[#4274B9]/10 disabled:opacity-40"
                  >
                    {a.status === "open" ? (
                      <span className="inline-flex items-center gap-1">
                        <Play className="w-3 h-3" /> {a.label}
                      </span>
                    ) : a.status === "closed" ? (
                      <span className="inline-flex items-center gap-1">
                        <Square className="w-3 h-3" /> {a.label}
                      </span>
                    ) : (
                      a.label
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Metric
                icon={<Users className="w-3.5 h-3.5" />}
                label="ENTRIES"
                value={`${m?.entryCount ?? 0} / ${m?.entryCap ?? 5000}`}
              />
              <Metric
                icon={<Target className="w-3.5 h-3.5" />}
                label="REMAINING"
                value={String(m?.remaining ?? 0)}
              />
              <Metric
                icon={<Share2 className="w-3.5 h-3.5" />}
                label="SOCIAL Q"
                value={String(m?.socialQualifiedCount ?? 0)}
              />
              <Metric
                icon={<Trophy className="w-3.5 h-3.5" />}
                label="TODAY / 7D"
                value={`${m?.entriesToday ?? 0} / ${m?.entriesLast7d ?? 0}`}
              />
            </div>

            <div className="h-2 rounded-full bg-[#0B1120] border border-[#4274B9]/15 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D4A843] to-[#4274B9] transition-all"
                style={{ width: `${m?.progressPercent ?? 0}%` }}
              />
            </div>
            <p className="text-[0.6rem] text-[#8494A7]">
              Progress {m?.progressPercent ?? 0}% · started{" "}
              {cfg?.startedAt ? new Date(cfg.startedAt).toLocaleString() : "—"} · since launch{" "}
              {m?.entriesSinceStart ?? 0} entries
            </p>
          </div>

          {/* Export */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              Picker export — admin only · never publish wallets
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => doExport("csv", false)}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4274B9] text-white text-xs font-semibold disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting === "csv" ? "…" : "CSV (all)"}
              </button>
              <button
                type="button"
                onClick={() => doExport("json", false)}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4274B9]/40 text-[#6AA3E0] text-xs font-semibold disabled:opacity-50"
              >
                <FileJson className="w-3.5 h-3.5" />
                JSON (all)
              </button>
              <button
                type="button"
                onClick={() => doExport("csv", true)}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4A843]/40 text-[#D4A843] text-xs font-semibold disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                CSV social-only ($100)
              </button>
            </div>
          </div>

          {/* Entrants */}
          <div className="rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <h3 className="text-xs font-bold text-white" style={orbitron}>
                ENTRANTS ({entriesTotal})
              </h3>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="flex items-center gap-1.5 text-[0.65rem] text-[#8494A7]">
                  <input
                    type="checkbox"
                    checked={socialOnly}
                    onChange={(e) => {
                      setPage(1);
                      setSocialOnly(e.target.checked);
                    }}
                    className="accent-[#D4A843]"
                  />
                  Social only
                </label>
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Search 0.0.x…"
                  className="px-2 py-1 rounded-md bg-[#0B1120] border border-[#4274B9]/25 text-xs text-[#E8ECF0] w-36"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.7rem]">
                <thead>
                  <tr className="text-[#8494A7] border-b border-[#4274B9]/15">
                    <th className="py-1.5 pr-2">#</th>
                    <th className="py-1.5 pr-2">Wallet</th>
                    <th className="py-1.5 pr-2">Entered</th>
                    <th className="py-1.5 pr-2">HBAR</th>
                    <th className="py-1.5 pr-2">Social</th>
                    <th className="py-1.5">Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.accountId} className="border-b border-[#4274B9]/8 text-[#E8ECF0]">
                      <td className="py-1.5 pr-2 tabular-nums">{e.entryNumber}</td>
                      <td className="py-1.5 pr-2 font-mono text-[0.65rem]">{e.accountId}</td>
                      <td className="py-1.5 pr-2 text-[#8494A7]">
                        {new Date(e.enteredAt).toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {(e.hbarTinybarsAtEntry / 1e8).toFixed(2)}
                      </td>
                      <td className="py-1.5 pr-2">
                        {e.socialQualified ? (
                          <span className="text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-[#8494A7]">—</span>
                        )}
                      </td>
                      <td className="py-1.5 text-[#8494A7]">
                        {e.lastLoginAt ? new Date(e.lastLoginAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#8494A7]">
                        No entries yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 text-xs text-[#6AA3E0] disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-[0.65rem] text-[#8494A7]">Page {page}</span>
              <button
                type="button"
                disabled={page * 40 >= entriesTotal}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 text-xs text-[#6AA3E0] disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Winners (private) */}
          <div className="rounded-xl border border-[#D4A843]/25 bg-[#D4A843]/5 p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#D4A843]" style={orbitron}>
              WINNERS (PRIVATE — NEVER PUBLISH WALLETS)
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="1st — $150" value={w1} onChange={setW1} placeholder="0.0.xxxxx" />
              <Field label="2nd — $75" value={w2} onChange={setW2} placeholder="0.0.xxxxx" />
              <Field label="3rd — $25" value={w3} onChange={setW3} placeholder="0.0.xxxxx" />
              <Field
                label="Social — $100"
                value={wSocial}
                onChange={setWSocial}
                placeholder="0.0.xxxxx (optional)"
              />
            </div>
            <Field
              label="Draw method note (e.g. random.org run id)"
              value={seedNote}
              onChange={setSeedNote}
              placeholder="external picker reference"
            />
            <button
              type="button"
              onClick={saveWinners}
              disabled={savingWinners}
              className="px-4 py-2 rounded-lg bg-[#D4A843] text-[#1a1208] text-xs font-bold disabled:opacity-50"
              style={orbitron}
            >
              {savingWinners ? "Saving…" : "Save winners (admin only)"}
            </button>
          </div>

          {/* Audit */}
          <div className="rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 p-4 space-y-2">
            <h3 className="text-xs font-bold text-white" style={orbitron}>
              AUDIT LOG
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {audit.map((a) => (
                <div
                  key={a.id}
                  className="text-[0.65rem] text-[#B0BCC9] border-b border-[#4274B9]/10 py-1.5 flex flex-wrap gap-x-2"
                >
                  <span className="text-[#8494A7]">{new Date(a.at).toLocaleString()}</span>
                  <span className="text-[#6AA3E0] font-semibold">{a.action}</span>
                  <span className="font-mono text-[0.6rem]">{a.actor}</span>
                </div>
              ))}
              {audit.length === 0 && (
                <p className="text-[0.7rem] text-[#8494A7] py-4 text-center">No audit events yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#4274B9]/15 bg-[#0B1120]/80 p-2.5">
      <div className="flex items-center gap-1 text-[#8494A7] text-[0.55rem] tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm text-[#E8ECF0] font-semibold tabular-nums" style={{ fontFamily: "Orbitron, sans-serif" }}>
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[0.6rem] text-[#8494A7] tracking-wide">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full px-2.5 py-1.5 rounded-md bg-[#0B1120] border border-[#4274B9]/25 text-xs text-[#E8ECF0] font-mono"
      />
    </label>
  );
}
