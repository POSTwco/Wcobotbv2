/**
 * BOTB Admin: Sponsors Management Tab
 * ====================================
 * Full CRUD for managing site sponsors with tier system (title/premium/standard),
 * dual image URLs (logo + product), custom text fields, CTA configuration,
 * active/inactive toggle, display ordering, and sponsor inquiry inbox.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, CheckCircle,
  ExternalLink, ChevronRight, AlertTriangle, Crown, Star, Building2, Dumbbell,
  BarChart3, Mail, ArrowUp, ArrowDown, X, Image as ImageIcon, Link as LinkIcon,
  Globe, MousePointerClick,
  Archive, ChevronDown,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Sponsor, SponsorTier } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_META: Record<SponsorTier, { label: string; color: string; icon: any; description: string }> = {
  title:    { label: "TITLE",    color: "#D4A843", icon: Crown,     description: "Hero banner + event naming rights" },
  premium:  { label: "PREMIUM",  color: "#6AA3E0", icon: Star,      description: "Featured showcase with product image" },
  standard: { label: "STANDARD", color: "#8494A7", icon: Building2, description: "Logo in sponsor bar" },
  routine:  { label: "ROUTINE",  color: "#D4A843", icon: Dumbbell,  description: "Logo + product tab under workout routines" },
};

const ALL_TIERS: SponsorTier[] = ["title", "premium", "standard", "routine"];

// ---------------------------------------------------------------------------
// SponsorsTab
// ---------------------------------------------------------------------------

export function SponsorsTab({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Sponsor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showInquiries, setShowInquiries] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, iRes] = await Promise.all([
        api.admin.getSponsors(wallet, sessionToken),
        api.admin.getSponsorInquiries(wallet, sessionToken),
      ]);
      if (sRes.success && sRes.data) setSponsors(sRes.data);
      if (iRes.success && iRes.data) setInquiries(iRes.data);
    } catch (err) {
      console.error("[SponsorsTab] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [wallet, sessionToken]);

  useEffect(() => { load(); }, [load]);

  // ── Save (create or update) ────────────────────────────────────────────
  const saveSponsor = useCallback(async () => {
    if (!editingSponsor?.name) { toast.error("Sponsor name is required"); return; }
    const requestedTiers: SponsorTier[] = editingSponsor.tiers?.length
      ? editingSponsor.tiers
      : (editingSponsor.tier ? [editingSponsor.tier] : ["standard"]);
    setSaving(true);
    try {
      const res = await api.admin.saveSponsor(editingSponsor, wallet, sessionToken);
      if (res.success && res.data) {
        setEditingSponsor(null);
        await load();
        const savedTiers: SponsorTier[] = res.data.tiers?.length
          ? res.data.tiers
          : [res.data.tier || "standard"];
        if (requestedTiers.includes("routine") && !savedTiers.includes("routine")) {
          toast.error((res as any).warning || "Routine tier was not saved — redeploy the edge function, then try again.");
        } else {
          toast.success(`Sponsor "${res.data.name}" ${editingSponsor.id ? "updated" : "created"}!`);
        }
      } else {
        toast.error(res.error || "Failed to save sponsor");
      }
    } catch (err: any) {
      toast.error(`Error: ${sanitizeErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }, [editingSponsor, wallet, sessionToken, load]);

  // ── Toggle active ────────────────────────────────────────────────────
  const toggleActive = useCallback(async (id: string) => {
    try {
      const res = await api.admin.toggleSponsor(id, wallet, sessionToken);
      if (res.success && res.data) {
        setSponsors((prev) => prev.map((s) => s.id === id ? res.data! : s));
        toast.success(`Sponsor ${res.data.active ? "activated" : "deactivated"}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [wallet, sessionToken]);

  // ── Delete ─────────────────────────────────────────────────────────────
  const deleteSponsor = useCallback(async (id: string) => {
    setDeleting(true);
    try {
      const res = await api.admin.deleteSponsor(id, wallet, sessionToken);
      if (res.success) {
        setSponsors((prev) => prev.filter((s) => s.id !== id));
        toast.success(`Sponsor "${res.data?.name}" deleted`);
        setDeleteModal(null);
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }, [wallet, sessionToken]);

  // ── Reorder ────────────────────────────────────────────────────────────
  const moveOrder = useCallback(async (id: string, direction: "up" | "down") => {
    const idx = sponsors.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sponsors.length) return;

    const a = sponsors[idx];
    const b = sponsors[swapIdx];
    const newOrderA = b.displayOrder;
    const newOrderB = a.displayOrder;

    try {
      await Promise.all([
        api.admin.saveSponsor({ id: a.id, displayOrder: newOrderA }, wallet, sessionToken),
        api.admin.saveSponsor({ id: b.id, displayOrder: newOrderB }, wallet, sessionToken),
      ]);
      const updated = [...sponsors];
      updated[idx] = { ...a, displayOrder: newOrderA };
      updated[swapIdx] = { ...b, displayOrder: newOrderB };
      updated.sort((x, y) => x.displayOrder - y.displayOrder);
      setSponsors(updated);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [sponsors, wallet, sessionToken]);

  const stats = useMemo(() => ({
    total: sponsors.length,
    active: sponsors.filter((s) => s.active).length,
  }), [sponsors]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 text-[#D4A843] animate-spin mx-auto mb-2" />
        <p className="text-[#8494A7] text-sm">Loading sponsors...</p>
      </div>
    );
  }

  // ── Editor Form ────────────────────────────────────────────────────────
  if (editingSponsor) {
    return <SponsorForm sponsor={editingSponsor} onSave={saveSponsor} saving={saving} onCancel={() => setEditingSponsor(null)} onChange={setEditingSponsor} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
            SPONSOR MANAGEMENT
          </h3>
          <p className="text-[#8494A7] text-xs">
            {stats.total} sponsors · {stats.active} active
            {inquiries.length > 0 && (
              <span className="text-[#D4A843] ml-2">· {inquiries.length} inquir{inquiries.length === 1 ? "y" : "ies"}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inquiries.length > 0 && (
            <button
              onClick={() => setShowInquiries(!showInquiries)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] text-[0.55rem] hover:bg-[#D4A843]/20 transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              <Mail className="w-3 h-3" /> INQUIRIES ({inquiries.length})
            </button>
          )}
          <button
            onClick={() => setEditingSponsor({ tier: "standard", tiers: ["standard"], active: true, displayOrder: sponsors.length })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-[0.55rem] hover:bg-[#10b981]/20 transition-all"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            <Plus className="w-3 h-3" /> ADD SPONSOR
          </button>
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#6AA3E0] text-[0.55rem] hover:bg-[#4274B9]/20 transition-all" style={{ fontFamily: "Orbitron, sans-serif" }}>
            REFRESH
          </button>
        </div>
      </div>

      {/* Inquiries panel */}
      <AnimatePresence>
        {showInquiries && inquiries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-[#0B1120] rounded-xl border border-[#D4A843]/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[#D4A843] text-[0.6rem] font-bold flex items-center gap-1.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <Mail className="w-3 h-3" /> SPONSOR INQUIRIES
                </h4>
                {inquiries.length > 1 && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Clear all ${inquiries.length} inquiries? This cannot be undone.`)) return;
                      try {
                        const res = await api.admin.clearSponsorInquiries(wallet, sessionToken);
                        if (res.success) {
                          setInquiries([]);
                          setShowInquiries(false);
                          toast.success(`Cleared ${res.data?.deleted || inquiries.length} inquiries`);
                        } else {
                          toast.error(res.error || "Failed to clear inquiries");
                        }
                      } catch (err: any) {
                        toast.error(sanitizeErrorMessage(err?.message || "Failed to clear inquiries"));
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.5rem] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all cursor-pointer"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    <Trash2 className="w-2.5 h-2.5" /> CLEAR ALL
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {/* New / Pending inquiries */}
                {inquiries.filter((inq: any) => !inq.status || inq.status === "new").map((inq: any) => (
                  <InquiryCard
                    key={inq.id}
                    inq={inq}
                    wallet={wallet}
                    sessionToken={sessionToken}
                    onApprove={(sponsor) => {
                      setShowInquiries(false);
                      setEditingSponsor(sponsor);
                    }}
                    onStatusChange={(id, status) => {
                      setInquiries((prev) => prev.map((i: any) => i.id === id ? { ...i, status } : i));
                    }}
                    onDelete={(id) => {
                      setInquiries((prev) => prev.filter((i: any) => i.id !== id));
                    }}
                    sponsorCount={sponsors.length}
                  />
                ))}

                {/* Archived/Declined inquiries (collapsible) */}
                {(() => {
                  const archived = inquiries.filter((inq: any) => inq.status === "declined" || inq.status === "archived");
                  const approved = inquiries.filter((inq: any) => inq.status === "approved");
                  const processed = [...approved, ...archived];
                  if (processed.length === 0) return null;
                  return (
                    <details className="group/archive mt-2">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-[0.5rem] text-[#8494A7] hover:text-[#E8ECF0] transition-colors py-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
                        <ChevronRight className="w-3 h-3 group-open/archive:rotate-90 transition-transform" />
                        {processed.length} PROCESSED ({approved.length} approved, {archived.length} declined)
                      </summary>
                      <div className="space-y-2 mt-2">
                        {processed.map((inq: any) => (
                          <div key={inq.id} className="p-2 rounded-lg bg-[#162033]/50 border border-[#4274B9]/5 opacity-60">
                            <div className="flex items-center justify-between">
                              <span className="text-[#E8ECF0] text-[0.55rem] font-semibold">{inq.companyName}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[0.4rem] font-bold ${
                                  inq.status === "approved"
                                    ? "bg-[#10b981]/10 text-[#10b981]"
                                    : "bg-[#8494A7]/10 text-[#8494A7]"
                                }`} style={{ fontFamily: "Orbitron" }}>
                                  {inq.status?.toUpperCase()}
                                </span>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete "${inq.companyName}" from archive?`)) return;
                                    try {
                                      const res = await api.admin.deleteSponsorInquiry(inq.id, wallet, sessionToken);
                                      if (res.success) {
                                        setInquiries((prev) => prev.filter((i: any) => i.id !== inq.id));
                                        toast.success("Inquiry deleted from archive");
                                      }
                                    } catch (err: any) {
                                      toast.error(sanitizeErrorMessage(err?.message));
                                    }
                                  }}
                                  className="p-0.5 rounded text-[#8494A7]/50 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[#8494A7] text-[0.45rem]">{inq.contactEmail} · {new Date(inq.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sponsor List */}
      {sponsors.length === 0 ? (
        <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
          <Megaphone className="w-8 h-8 text-[#4274B9]/20 mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm mb-3">No sponsors yet.</p>
          <button
            onClick={() => setEditingSponsor({ tier: "standard", tiers: ["standard"], active: true, displayOrder: 0 })}
            className="px-4 py-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            ADD FIRST SPONSOR
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sponsors.map((sponsor, i) => {
            const effectiveTiers: SponsorTier[] = sponsor.tiers?.length ? sponsor.tiers : [sponsor.tier || "standard"];
            return (
              <div
                key={sponsor.id}
                className={`rounded-xl bg-[#0B1120] border overflow-hidden transition-all ${
                  sponsor.active ? "border-[#4274B9]/15 hover:border-[#4274B9]/30" : "border-red-500/10 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Logo preview */}
                  <div className="w-12 h-12 rounded-lg bg-[#162033] border border-[#4274B9]/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {sponsor.logoUrl ? (
                      <ImageWithFallback src={sponsor.logoUrl} alt={sponsor.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="w-5 h-5 text-[#8494A7]/30" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <p className="text-[#E8ECF0] text-xs font-semibold truncate">{sponsor.name}</p>
                      {effectiveTiers.map((t) => {
                        const tm = TIER_META[t] || TIER_META.standard;
                        const TIcon = tm.icon;
                        return (
                          <span
                            key={t}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.45rem] border"
                            style={{ background: `${tm.color}10`, borderColor: `${tm.color}30`, color: tm.color, fontFamily: "Orbitron, sans-serif" }}
                          >
                            <TIcon className="w-2.5 h-2.5" />
                            {tm.label}
                          </span>
                        );
                      })}
                      {!sponsor.active && (
                        <span className="text-[0.45rem] text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20" style={{ fontFamily: "Orbitron" }}>
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[#8494A7] text-[0.55rem] truncate">{sponsor.tagline || "No tagline set"}</p>
                    <div className="flex items-center gap-3 mt-1 text-[0.45rem] text-[#8494A7]">
                      <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" /> {(sponsor.impressions || 0).toLocaleString()} views</span>
                      <span className="flex items-center gap-0.5"><MousePointerClick className="w-2.5 h-2.5" /> {(sponsor.clicks || 0).toLocaleString()} clicks</span>
                      {sponsor.websiteUrl && <span className="flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" /> {(() => { try { return new URL(sponsor.websiteUrl).hostname; } catch { return sponsor.websiteUrl; } })()}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveOrder(sponsor.id, "up")} disabled={i === 0}
                      className="p-1.5 rounded-lg text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#162033] transition-all disabled:opacity-20"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveOrder(sponsor.id, "down")} disabled={i === sponsors.length - 1}
                      className="p-1.5 rounded-lg text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#162033] transition-all disabled:opacity-20"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => toggleActive(sponsor.id)}
                      className={`p-1.5 rounded-lg transition-all ${sponsor.active ? "text-[#10b981] hover:bg-[#10b981]/10" : "text-red-400 hover:bg-red-500/10"}`}
                      title={sponsor.active ? "Deactivate" : "Activate"}
                    >
                      {sponsor.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button onClick={() => setEditingSponsor({ ...sponsor })}
                      className="p-1.5 rounded-lg text-[#6AA3E0] hover:bg-[#4274B9]/10 transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteModal(sponsor)}
                      className="p-1.5 rounded-lg text-[#8494A7] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0B1120] border border-red-500/30 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-red-500/10 bg-red-500/5">
                <h3 className="text-red-400 font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  <Trash2 className="w-4 h-4" /> DELETE SPONSOR
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-[#E8ECF0] text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  Permanently delete <strong>{deleteModal.name}</strong> from the site?
                </p>
                <button onClick={() => deleteSponsor(deleteModal.id)} disabled={deleting}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-all disabled:opacity-50"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "DELETE PERMANENTLY"}
                </button>
                <button onClick={() => setDeleteModal(null)} disabled={deleting}
                  className="w-full text-xs text-[#8494A7] hover:text-[#E8ECF0] py-1 transition-all disabled:opacity-50"
                >Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inquiry Card — Approve/Decline workflow with image previews
// ---------------------------------------------------------------------------

function InquiryCard({
  inq,
  wallet,
  sessionToken,
  onApprove,
  onStatusChange,
  onDelete,
  sponsorCount,
}: {
  inq: any;
  wallet: string;
  sessionToken: string;
  onApprove: (sponsor: Partial<Sponsor>) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  sponsorCount: number;
}) {
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await api.admin.updateSponsorInquiryStatus(inq.id, "approved", wallet, sessionToken);
      if (res.success) {
        toast.success(`Inquiry from "${inq.companyName}" approved — opening sponsor form.`);
        onStatusChange(inq.id, "approved");
        // Pre-populate the sponsor form with inquiry data
        onApprove({
          name: inq.companyName,
          contactName: inq.contactName || "",
          contactEmail: inq.contactEmail || "",
          logoUrl: inq.logoUrl || "",
          productImageUrl: inq.productImageUrl || "",
          websiteUrl: inq.websiteUrl || "",
          description: inq.message || "",
          tier: "standard",
          tiers: ["standard"],
          active: false, // Start inactive — admin must review and activate
          displayOrder: sponsorCount,
          fromInquiryId: inq.id,
        });
      } else {
        toast.error(res.error || "Failed to approve inquiry");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      const res = await api.admin.updateSponsorInquiryStatus(inq.id, "declined", wallet, sessionToken);
      if (res.success) {
        toast.info(`Inquiry from "${inq.companyName}" declined and archived.`);
        onStatusChange(inq.id, "declined");
      } else {
        toast.error(res.error || "Failed to decline inquiry");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete inquiry from "${inq.companyName}"?`)) return;
    try {
      const res = await api.admin.deleteSponsorInquiry(inq.id, wallet, sessionToken);
      if (res.success) {
        onDelete(inq.id);
        toast.success(`Inquiry from "${inq.companyName}" deleted`);
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    }
  };

  return (
    <div className="p-3 rounded-xl bg-[#162033] border border-amber-500/20 hover:border-amber-500/30 transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Logo preview */}
          {inq.logoUrl ? (
            <div className="w-10 h-10 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden shrink-0">
              <ImageWithFallback src={inq.logoUrl} alt={inq.companyName} className="w-full h-full object-contain p-0.5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 shrink-0 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#8494A7]/30" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[#E8ECF0] text-xs font-semibold truncate">{inq.companyName}</p>
              <span className="px-1.5 py-0.5 rounded text-[0.4rem] bg-amber-500/10 text-amber-400 font-bold shrink-0" style={{ fontFamily: "Orbitron" }}>
                NEW
              </span>
            </div>
            <p className="text-[#8494A7] text-[0.5rem] truncate">
              {inq.contactName && `${inq.contactName} · `}
              <a href={`mailto:${inq.contactEmail}`} className="text-[#6AA3E0] hover:underline">{inq.contactEmail}</a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[#8494A7] text-[0.4rem]">{new Date(inq.createdAt).toLocaleDateString()}</span>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-md text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#0B1120] transition-all">
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Budget */}
      {inq.budget && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[#D4A843] text-[0.5rem] font-bold" style={{ fontFamily: "Orbitron" }}>BUDGET:</span>
          <span className="text-[#D4A843] text-[0.5rem]">{inq.budget}</span>
        </div>
      )}

      {/* Website link */}
      {inq.websiteUrl && (
        <div className="mt-1 flex items-center gap-1">
          <Globe className="w-2.5 h-2.5 text-[#6AA3E0]" />
          <a href={inq.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[#6AA3E0] text-[0.5rem] hover:underline truncate">
            {inq.websiteUrl}
          </a>
          <ExternalLink className="w-2 h-2 text-[#6AA3E0] shrink-0" />
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-[#4274B9]/10 space-y-2">
              {inq.message && (
                <div>
                  <p className="text-[#8494A7] text-[0.45rem] mb-0.5" style={{ fontFamily: "Orbitron" }}>MESSAGE</p>
                  <p className="text-[#8494A7] text-[0.55rem] leading-relaxed">{inq.message}</p>
                </div>
              )}
              {/* Image previews */}
              {(inq.logoUrl || inq.productImageUrl) && (
                <div className="flex items-start gap-3 flex-wrap">
                  {inq.logoUrl && (
                    <div>
                      <p className="text-[#8494A7] text-[0.4rem] mb-0.5" style={{ fontFamily: "Orbitron" }}>LOGO</p>
                      <div className="w-20 h-20 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden">
                        <ImageWithFallback src={inq.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      </div>
                    </div>
                  )}
                  {inq.productImageUrl && (
                    <div>
                      <p className="text-[#8494A7] text-[0.4rem] mb-0.5" style={{ fontFamily: "Orbitron" }}>PRODUCT IMAGE</p>
                      <div className="w-32 h-20 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden">
                        <ImageWithFallback src={inq.productImageUrl} alt="Product" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#4274B9]/10">
        <button
          onClick={handleApprove}
          disabled={processing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-[0.5rem] font-bold hover:bg-[#10b981]/20 transition-all disabled:opacity-50"
          style={{ fontFamily: "Orbitron, sans-serif" }}
        >
          {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          APPROVE
        </button>
        <button
          onClick={handleDecline}
          disabled={processing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8494A7]/5 border border-[#8494A7]/15 text-[#8494A7] text-[0.5rem] font-bold hover:bg-[#8494A7]/10 hover:text-[#E8ECF0] transition-all disabled:opacity-50"
          style={{ fontFamily: "Orbitron, sans-serif" }}
        >
          <Archive className="w-3 h-3" />
          DECLINE
        </button>
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          disabled={processing}
          className="p-1.5 rounded-lg text-[#8494A7]/40 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
          title="Delete permanently"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sponsor Form — Full editor with dual image, tier selection, CTA config
// ---------------------------------------------------------------------------

function SponsorForm({
  sponsor,
  onSave,
  saving,
  onCancel,
  onChange,
}: {
  sponsor: Partial<Sponsor>;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
  onChange: (s: Partial<Sponsor>) => void;
}) {
  const isNew = !sponsor.id;
  const isFromInquiry = !!sponsor.fromInquiryId;
  const set = (field: string, value: any) => onChange({ ...sponsor, [field]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[#E8ECF0] font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
          <Megaphone className="w-4 h-4 text-[#D4A843]" />
          {isFromInquiry ? "NEW SPONSOR FROM INQUIRY" : isNew ? "ADD NEW SPONSOR" : "EDIT SPONSOR"}
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-[#8494A7] hover:text-[#E8ECF0] hover:bg-[#162033] transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Inquiry source banner */}
      {isFromInquiry && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#10b981]/5 border border-[#10b981]/20">
          <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#10b981] text-[0.55rem] font-bold" style={{ fontFamily: "Orbitron" }}>PRE-FILLED FROM APPROVED INQUIRY</p>
            <p className="text-[#8494A7] text-[0.5rem] mt-0.5 leading-relaxed">
              Company info, images, and website have been imported from the inquiry. Review the data, select sponsorship tier(s), add any additional information, then save. The sponsor starts as <span className="text-amber-400 font-semibold">inactive</span> — toggle it active when ready to go live.
            </p>
          </div>
        </div>
      )}

      {/* Tier Selection — Multi-select: sponsor can appear in multiple spots */}
      <div>
        <label className="text-[#8494A7] text-[0.55rem] block mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>SPONSORSHIP TIERS</label>
        <p className="text-[#8494A7]/60 text-[0.45rem] mb-2">Select one or more — sponsor appears in every selected display spot</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_TIERS.map((tier) => {
            const meta = TIER_META[tier];
            const Icon = meta.icon;
            const currentTiers: SponsorTier[] = sponsor.tiers && sponsor.tiers.length > 0
              ? sponsor.tiers
              : (sponsor.tier ? [sponsor.tier] : ["standard"]);
            const isSelected = currentTiers.includes(tier);
            return (
              <button
                key={tier}
                onClick={() => {
                  let updated: SponsorTier[];
                  if (isSelected) {
                    updated = currentTiers.filter((t) => t !== tier);
                    if (updated.length === 0) updated = ["standard"]; // must have at least one
                  } else {
                    updated = [...currentTiers, tier];
                  }
                  onChange({ ...sponsor, tiers: updated, tier: updated[0] });
                }}
                className={`p-3 rounded-xl border text-center transition-all relative ${
                  isSelected
                    ? "bg-[#162033]"
                    : "border-[#4274B9]/10 hover:border-[#4274B9]/20"
                }`}
                style={isSelected ? { borderColor: `${meta.color}60`, background: `${meta.color}08` } : {}}
              >
                {/* Checkmark badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: `${meta.color}25`, border: `1px solid ${meta.color}50` }}>
                    <CheckCircle className="w-2.5 h-2.5" style={{ color: meta.color }} />
                  </div>
                )}
                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: isSelected ? meta.color : "#8494A7" }} />
                <span className="text-[0.55rem] block" style={{ fontFamily: "Orbitron, sans-serif", color: isSelected ? meta.color : "#8494A7" }}>
                  {meta.label}
                </span>
                <span className="text-[0.4rem] text-[#8494A7] block mt-0.5">{meta.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Company Name *</label>
          <input value={sponsor.name || ""} onChange={(e) => set("name", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
            placeholder="Acme Corp" />
        </div>
        <div className="col-span-2">
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Tagline / Slogan</label>
          <input value={sponsor.tagline || ""} onChange={(e) => set("tagline", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
            placeholder="Innovation meets performance" />
        </div>
        <div className="col-span-2">
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Description</label>
          <textarea value={sponsor.description || ""} onChange={(e) => set("description", e.target.value)} rows={2}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 resize-none"
            placeholder="Brief description of the sponsor" />
        </div>
        <div className="col-span-2">
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Custom Display Text (overrides default on site)</label>
          <input value={sponsor.customText || ""} onChange={(e) => set("customText", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
            placeholder="e.g. 'Powered by Acme' or 'Official Partner'" />
        </div>
      </div>

      {/* Images (dual URL inputs) */}
      <div className="space-y-3">
        <p className="text-[#6AA3E0] text-[0.55rem] font-bold flex items-center gap-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
          <ImageIcon className="w-3 h-3" /> IMAGES
        </p>
        <div>
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Logo URL (Supabase Storage or external)</label>
          <input value={sponsor.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 font-mono"
            placeholder="https://your-project.supabase.co/storage/v1/object/public/..." />
          {sponsor.logoUrl && (
            <div className="mt-1.5 w-20 h-20 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden">
              <ImageWithFallback src={sponsor.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
            </div>
          )}
        </div>
        {/* Secondary Logo — only shown for title tier sponsors */}
        {((sponsor.tiers && sponsor.tiers.includes("title")) || sponsor.tier === "title") && (
          <div>
            <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">
              Secondary Product Logo URL <span className="text-[#D4A843]">(Title Sponsor)</span>
            </label>
            <p className="text-[#8494A7]/50 text-[0.4rem] mb-1">Displayed beside the primary logo in the hero title banner</p>
            <input value={sponsor.secondaryLogoUrl || ""} onChange={(e) => set("secondaryLogoUrl", e.target.value)}
              className="w-full bg-[#162033] border border-[#D4A843]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 font-mono"
              placeholder="https://your-project.supabase.co/storage/v1/object/public/..." />
            {sponsor.secondaryLogoUrl && (
              <div className="mt-1.5 w-20 h-20 rounded-lg bg-[#0B1120] border border-[#D4A843]/10 overflow-hidden">
                <ImageWithFallback src={sponsor.secondaryLogoUrl} alt="Secondary logo preview" className="w-full h-full object-contain p-1" />
              </div>
            )}
          </div>
        )}
        <div>
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Product / Promo Image URL</label>
          <input value={sponsor.productImageUrl || ""} onChange={(e) => set("productImageUrl", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 font-mono"
            placeholder="https://your-project.supabase.co/storage/v1/object/public/..." />
          {sponsor.productImageUrl && (
            <div className="mt-1.5 w-40 h-24 rounded-lg bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden">
              <ImageWithFallback src={sponsor.productImageUrl} alt="Product preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Links & CTA */}
      <div className="space-y-3">
        <p className="text-[#6AA3E0] text-[0.55rem] font-bold flex items-center gap-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
          <LinkIcon className="w-3 h-3" /> LINKS & CTA
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Website URL</label>
            <input value={sponsor.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)}
              className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
              placeholder="https://acme.com" />
          </div>
          <div>
            <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">CTA Button Label</label>
            <input value={sponsor.ctaLabel || ""} onChange={(e) => set("ctaLabel", e.target.value)}
              className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
              placeholder="Shop Now" />
          </div>
          <div>
            <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">CTA Link (optional, defaults to website)</label>
            <input value={sponsor.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)}
              className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
              placeholder="https://acme.com/promo" />
          </div>
        </div>
      </div>

      {/* Contact & Campaign */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Contact Name</label>
          <input value={sponsor.contactName || ""} onChange={(e) => set("contactName", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
            placeholder="John Smith" />
        </div>
        <div>
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Contact Email</label>
          <input value={sponsor.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
            placeholder="john@acme.com" />
        </div>
        <div>
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Campaign Start</label>
          <input type="date" value={sponsor.startDate?.slice(0, 10) || ""} onChange={(e) => set("startDate", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50" />
        </div>
        <div>
          <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Campaign End</label>
          <input type="date" value={sponsor.endDate?.slice(0, 10) || ""} onChange={(e) => set("endDate", e.target.value)}
            className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50" />
        </div>
      </div>

      {/* Display Order */}
      <div>
        <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Display Order (lower = first)</label>
        <input type="number" value={sponsor.displayOrder ?? 0} onChange={(e) => set("displayOrder", Number(e.target.value))}
          className="w-24 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
          style={{ fontFamily: "Orbitron, monospace" }} />
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-2">
        <button onClick={onSave} disabled={saving || !sponsor.name}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A843] to-[#B8932B] text-[#0B1120] text-xs font-bold hover:from-[#E5B94E] hover:to-[#D4A843] transition-all disabled:opacity-50"
          style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isFromInquiry ? "SAVE & LAUNCH SPONSOR" : isNew ? "CREATE SPONSOR" : "SAVE CHANGES"}
        </button>
        <button onClick={onCancel} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-[#8494A7] text-xs hover:text-[#E8ECF0] transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}