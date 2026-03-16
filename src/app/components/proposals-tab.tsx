/**
 * Admin Proposals Tab — Create & Manage Governor Proposals
 * =========================================================
 * Full CRUD + lifecycle management for governance proposals.
 * Status flow: draft → active → passed/rejected (or cancelled)
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Vote, Plus, Loader2, ChevronRight, Clock, CheckCircle,
  XCircle, AlertTriangle, FileText, Users, X, Ban,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Proposal, ProposalCategory, ProposalStatus } from "../lib/types";

const CATEGORIES: ProposalCategory[] = [
  "Governance", "Economics", "Athletes", "Events", "Partnerships", "Technical", "Community",
];

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: "DRAFT", color: "text-[#8494A7]", bg: "bg-[#8494A7]/10", border: "border-[#8494A7]/30" },
  active: { label: "ACTIVE", color: "text-[#4274B9]", bg: "bg-[#4274B9]/10", border: "border-[#4274B9]/30" },
  passed: { label: "PASSED", color: "text-[#10b981]", bg: "bg-[#10b981]/10", border: "border-[#10b981]/30" },
  rejected: { label: "REJECTED", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  cancelled: { label: "CANCELLED", color: "text-[#8494A7]", bg: "bg-[#8494A7]/10", border: "border-[#8494A7]/30" },
};

const ALLOWED_TRANSITIONS: Record<ProposalStatus, { status: ProposalStatus; label: string; color: string }[]> = {
  draft: [
    { status: "active", label: "ACTIVATE", color: "bg-[#4274B9]/10 border-[#4274B9]/30 text-[#4274B9] hover:bg-[#4274B9]/20" },
    { status: "cancelled", label: "CANCEL", color: "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" },
  ],
  active: [
    { status: "passed", label: "PASS", color: "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20" },
    { status: "rejected", label: "REJECT", color: "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" },
    { status: "cancelled", label: "CANCEL", color: "bg-[#8494A7]/10 border-[#8494A7]/30 text-[#8494A7] hover:bg-[#8494A7]/20" },
  ],
  passed: [
    { status: "cancelled", label: "CANCEL", color: "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" },
  ],
  rejected: [
    { status: "cancelled", label: "CANCEL", color: "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" },
  ],
  cancelled: [],
};

interface ProposalsTabProps {
  wallet: string;
  sessionToken: string;
}

export function ProposalsTab({ wallet, sessionToken }: ProposalsTabProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProposalCategory>("Governance");
  const [endsAt, setEndsAt] = useState("");

  const loadProposals = useCallback(async () => {
    setLoading(true);
    const res = await api.getProposals();
    if (res.success && res.data) {
      setProposals(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProposals(); }, [loadProposals]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("Governance");
    setEndsAt("");
    setEditingId(null);
    setShowForm(false);
  };

  const editProposal = (p: Proposal) => {
    setTitle(p.title);
    setDescription(p.description);
    setCategory(p.category);
    setEndsAt(p.endsAt ? p.endsAt.slice(0, 16) : "");
    setEditingId(p.id);
    setShowForm(true);
  };

  const saveProposal = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }

    setSaving(true);
    try {
      const data: Partial<Proposal> = {
        title: title.trim(),
        description: description.trim(),
        category,
        endsAt: endsAt ? new Date(endsAt).toISOString() : "",
        proposer: "WCO Admin",
      };

      let res;
      if (editingId) {
        res = await api.admin.updateProposal(editingId, data, wallet, sessionToken);
      } else {
        res = await api.admin.createProposal(data, wallet, sessionToken);
      }

      if (res.success) {
        toast.success(`Proposal ${editingId ? "updated" : "created"}!`);
        resetForm();
        loadProposals();
      } else {
        toast.error(res.error || "Failed to save proposal");
      }
    } catch (err: any) {
      toast.error(`Error: ${sanitizeErrorMessage(err.message)}`);
    } finally {
      setSaving(false);
    }
  };

  const transitionStatus = async (id: string, newStatus: ProposalStatus, proposalTitle: string) => {
    const actionLabels: Record<string, string> = {
      active: "activate",
      passed: "pass",
      rejected: "reject",
      cancelled: "cancel",
    };
    const action = actionLabels[newStatus] || newStatus;

    if (!confirm(`Are you sure you want to ${action} "${proposalTitle}"?`)) return;

    setTransitioning(id);
    try {
      const res = await api.admin.updateProposalStatus(id, newStatus, wallet, sessionToken);
      if (res.success) {
        toast.success(`Proposal ${action}ed successfully!`);
        loadProposals();
      } else {
        toast.error(res.error || `Failed to ${action} proposal`);
      }
    } catch (err: any) {
      toast.error(`Error: ${sanitizeErrorMessage(err.message)}`);
    } finally {
      setTransitioning(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
            PROPOSAL MANAGEMENT
          </h3>
          <p className="text-[#8494A7] text-xs">
            {proposals.length} proposals &middot; {proposals.filter(p => p.status === "active").length} active
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] text-xs hover:bg-[#D4A843]/20 transition-all"
          style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
        >
          <Plus className="w-3 h-3" /> NEW PROPOSAL
        </button>
      </div>

      {/* Lifecycle guide */}
      <div className="flex items-center gap-1.5 mb-4 text-[0.55rem] flex-wrap">
        {(["draft", "active", "passed"] as const).map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border ${STATUS_CONFIG[s].border}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
              {STATUS_CONFIG[s].label}
            </span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-[#8494A7]" />}
          </span>
        ))}
        <span className="text-[#8494A7] mx-1">/</span>
        <span className={`px-2 py-0.5 rounded ${STATUS_CONFIG.rejected.bg} ${STATUS_CONFIG.rejected.color} border ${STATUS_CONFIG.rejected.border}`} style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem" }}>
          REJECTED
        </span>
      </div>

      {/* Proposals list */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-[#D4A843] animate-spin mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm">Loading proposals...</p>
        </div>
      ) : proposals.length === 0 && !showForm ? (
        <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
          <Vote className="w-8 h-8 text-[#4274B9]/30 mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm mb-1">No proposals yet.</p>
          <p className="text-[#8494A7] text-xs">Click "NEW PROPOSAL" to create a governance proposal for Governor voting.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {proposals.map((p) => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            const transitions = ALLOWED_TRANSITIONS[p.status] || [];
            const totalVotes = p.votesFor + p.votesAgainst;
            const forPct = totalVotes > 0 ? Math.round((p.votesFor / totalVotes) * 100) : 0;

            return (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-[#0B1120] border border-[#4274B9]/10 hover:border-[#4274B9]/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[0.5rem] border ${sc.bg} ${sc.color} ${sc.border}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                        {sc.label}
                      </span>
                      <span className="text-[0.5rem] text-[#8494A7] px-2 py-0.5 rounded bg-[#162033]">{p.category}</span>
                    </div>
                    <p className="text-[#E8ECF0] text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-[#8494A7] text-xs mt-0.5 line-clamp-2">{p.description}</p>
                  </div>

                  {/* Edit button (only for draft) */}
                  {p.status === "draft" && (
                    <button
                      onClick={() => editProposal(p)}
                      className="px-2 py-1 text-[0.55rem] rounded bg-[#4274B9]/10 text-[#6AA3E0] hover:bg-[#4274B9]/20 transition-all shrink-0"
                    >
                      EDIT
                    </button>
                  )}
                </div>

                {/* Vote stats (if any votes) */}
                {totalVotes > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-[0.5rem] mb-1">
                      <span className="text-[#10b981]">FOR: {p.votesFor.toFixed(1)} ({forPct}%)</span>
                      <span className="text-red-400">AGAINST: {p.votesAgainst.toFixed(1)} ({100 - forPct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-[#162033] flex">
                      <div className="h-full bg-[#10b981]" style={{ width: `${forPct}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${100 - forPct}%` }} />
                    </div>
                    <p className="text-[0.5rem] text-[#8494A7] mt-1">
                      <Users className="w-3 h-3 inline mr-1" />{p.totalVoters} voter{p.totalVoters !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Status transition buttons */}
                {transitions.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#4274B9]/10 flex-wrap">
                    {transitions.map((t) => (
                      <button
                        key={t.status}
                        onClick={() => transitionStatus(p.id, t.status, p.title)}
                        disabled={transitioning === p.id}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[0.55rem] border transition-all disabled:opacity-50 ${t.color}`}
                        style={{ fontFamily: "Orbitron, sans-serif" }}
                      >
                        {transitioning === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : t.status === "active" ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : t.status === "passed" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : t.status === "rejected" ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Ban className="w-3 h-3" />
                        )}
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0B1120] rounded-xl border border-[#D4A843]/20 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  {editingId ? "EDIT PROPOSAL" : "NEW PROPOSAL"}
                </h4>
                <button onClick={resetForm} className="p-1 rounded hover:bg-[#162033] text-[#8494A7] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-[0.6rem] text-[#8494A7] mb-1 uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Increase Governor voting multiplier to 3x"
                    className="w-full px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#E8ECF0] text-sm placeholder-[#8494A7]/50 focus:border-[#D4A843]/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[0.6rem] text-[#8494A7] mb-1 uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the proposal in detail. What will change and why?"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#E8ECF0] text-sm placeholder-[#8494A7]/50 focus:border-[#D4A843]/50 focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div>
                    <label className="block text-[0.6rem] text-[#8494A7] mb-1 uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProposalCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#E8ECF0] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Voting Deadline */}
                  <div>
                    <label className="block text-[0.6rem] text-[#8494A7] mb-1 uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>Voting Deadline (optional)</label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#E8ECF0] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#4274B9]/10">
                <button
                  onClick={saveProposal}
                  disabled={saving || !title.trim() || !description.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[#D4A843] to-[#B8932B] text-[#0B1120] hover:from-[#E5B94E] hover:to-[#D4A843] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                >
                  {saving ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> SAVING...</>
                  ) : (
                    <><FileText className="w-3 h-3" /> {editingId ? "UPDATE PROPOSAL" : "CREATE PROPOSAL"}</>
                  )}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg text-xs text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#162033] transition-all"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}