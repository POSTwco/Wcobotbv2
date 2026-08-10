/**
 * BOTB Admin: Athlete Add/Edit Form with Live Preview
 * ====================================================
 * Full athlete creation/editing form with:
 * - Basic info (Name, Nickname, Country, Bio, PFP URL)
 * - Social links (Instagram, Twitter, YouTube, Website)
 * - Skill scores with visual slider bars (0-10 scale)
 * - NFT info (Token ID, Image URL, Rarity, Series)
 * - Brand Colors (Dynamic Theme Engine)
 * - Weight Class
 * - Bracket seat assignment (1-12 dropdown)
 * - Live preview card that updates in real-time
 *
 * Used inside the Athletes tab of the Admin Panel.
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  X, CheckCircle, Loader2, Eye, User, Globe, Zap,
  Instagram, Twitter, Youtube, Link2, Image, Mail, Phone,
  Dumbbell,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { WCO_WEIGHT_CLASSES } from "../lib/types";
import { Checkbox } from "./ui/checkbox";
import { COUNTRY_OPTIONS } from "../lib/country-flags";
import { InlineFlag } from "./country-flag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AthleteFormState {
  name: string;
  fullName: string;
  nickname: string;
  country: string;
  bio: string;
  pfpUrl: string;
  specialMove: string;
  status: string;
  // Contact
  email: string;
  phone: string;
  // Socials
  instagram: string;
  twitter: string;
  youtube: string;
  website: string;
  // Skills
  energy: number;
  performance: number;
  static: number;
  aggression: number;
  dynamic: number;
  // NFT
  nftTokenId: string;
  nftImageUrl: string;
  nftRarity: string;
  nftMetadataUri: string;
  nftSeriesName: string;
  nftCardBorderColor: string;
  nftCardGlowGradient: string;
  // Brand Colors (Dynamic Theme Engine)
  primaryColor: string;
  secondaryColor: string;
  // Weight Class
  weightClass: string;
  // Bracket
  bracketSeat: number;
  // Verified Hedera wallet for Arena Chat badge
  wallet: string;
  eliteAccess: boolean;
}

interface AthleteFormProps {
  form: AthleteFormState;
  setForm: (form: AthleteFormState) => void;
  editingId: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Skill bar colors
// ---------------------------------------------------------------------------
const SKILL_COLORS: Record<string, string> = {
  energy: "#f59e0b",
  performance: "#8B5CF6",
  static: "#22C55E",
  aggression: "#EF4444",
  dynamic: "#6AA3E0",
};

const SKILL_LABELS: Record<string, string> = {
  energy: "Power Dynamics",
  performance: "Combinations & Flow",
  static: "Statics",
  aggression: "Offense & Defense",
  dynamic: "Dynamics",
};

const RARITY_OPTIONS = ["", "Common", "Rare", "Epic", "Legendary"];

// ---------------------------------------------------------------------------
// Athlete Form Component
// ---------------------------------------------------------------------------

export function AthleteForm({
  form, setForm, editingId, saving, onSave, onCancel,
}: AthleteFormProps) {
  const [showPreview, setShowPreview] = useState(true);

  const totalPower = useMemo(() => {
    return (
      Number(form.energy) +
      Number(form.performance) +
      Number(form.static) +
      Number(form.aggression) +
      Number(form.dynamic)
    );
  }, [form.energy, form.performance, form.static, form.aggression, form.dynamic]);

  const updateField = <K extends keyof AthleteFormState>(key: K, value: AthleteFormState[K]) => {
    setForm({ ...form, [key]: value });
  };

  const isValid = form.name && form.fullName && form.country && form.bio;

  return (
    <div className="bg-[#0B1120] rounded-xl border border-[#D4A843]/20 overflow-hidden">
      {/* Form Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#D4A843]/10 bg-[#D4A843]/5">
        <h4 className="text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
          {editingId ? "EDIT ATHLETE" : "NEW ATHLETE"}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[0.55rem] transition-all ${
              showPreview
                ? "bg-[#4274B9]/20 text-[#6AA3E0] border border-[#4274B9]/30"
                : "bg-[#162033] text-[#8494A7] border border-transparent"
            }`}
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            <Eye className="w-3 h-3" />
            PREVIEW
          </button>
          <button onClick={onCancel} className="text-[#8494A7] hover:text-[#E8ECF0] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* ── Left: Form Fields ────────────────────────────────────── */}
        <div className={`p-4 sm:p-5 space-y-5 ${showPreview ? "lg:w-[60%]" : "w-full"}`}>

          {/* Section: Basic Info */}
          <FormSection icon={<User className="w-3.5 h-3.5" />} title="BASIC INFO">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Display Name *" value={form.name} onChange={(v) => updateField("name", v)} placeholder="e.g. Tony Gaste" />
              <Field label="Full Name *" value={form.fullName} onChange={(v) => updateField("fullName", v)} placeholder="e.g. Antonio Gastelum" />
              <Field label="Nickname" value={form.nickname} onChange={(v) => updateField("nickname", v)} placeholder="e.g. The Mexican Monster" />
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Country *</label>
                <div className="flex items-center gap-2">
                  {form.country ? (
                    <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#162033] border border-[#4274B9]/20">
                      <InlineFlag country={form.country} />
                    </span>
                  ) : null}
                  <select
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="w-full min-w-0 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                  >
                    <option value="">Select country...</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Field label="Special Move" value={form.specialMove} onChange={(v) => updateField("specialMove", v)} placeholder="e.g. 360 Muscle-Up to Planche" />
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                >
                  <option value="active">Active</option>
                  <option value="champion">Champion</option>
                  <option value="eliminated">Eliminated</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[#8494A7] text-[0.6rem] block mb-1">Bio *</label>
              <textarea
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                rows={3}
                placeholder="Athlete biography — describe their style, achievements, and competitive strengths..."
                className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 resize-none"
              />
            </div>
            <div className="mt-3">
              <label className="text-[#8494A7] text-[0.6rem] block mb-1">Profile Picture URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.pfpUrl}
                  onChange={(e) => updateField("pfpUrl", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
                />
                {form.pfpUrl && (
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#4274B9]/20 shrink-0">
                    <ImageWithFallback src={form.pfpUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* Section: Contact Info (admin-only, not displayed publicly) */}
          <FormSection icon={<Mail className="w-3.5 h-3.5" />} title="CONTACT INFORMATION (admin-only)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWithIcon icon={<Mail className="w-3 h-3 text-[#D4A843]" />} label="Email Address" value={form.email} onChange={(v) => updateField("email", v)} placeholder="athlete@email.com" />
              <FieldWithIcon icon={<Phone className="w-3 h-3 text-[#10b981]" />} label="Phone Number" value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="+1 (555) 123-4567" />
            </div>
            <p className="text-[#8494A7]/50 text-[0.5rem] mt-1.5">Contact info is private — only visible to WCO admins, never shown publicly on the platform.</p>
            <div className="mt-3 pt-3 border-t border-[#4274B9]/10">
              <FieldWithIcon
                icon={<svg className="w-3 h-3 text-[#4274B9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7v10M16 7v10M8 12h8M8 17h8"/></svg>}
                label="Hedera Wallet (from application · admin only)"
                value={form.wallet}
                onChange={(v) => updateField("wallet", v)}
                placeholder="0.0.XXXXXXX"
              />
              <p className="text-[#4274B9]/50 text-[0.5rem] mt-1">
                Copied from the athlete application on approve. Admin-only on this form (email/phone too). Also powers the Arena Chat verified badge when they message from this wallet.
              </p>
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer group">
                <Checkbox
                  checked={form.eliteAccess}
                  onCheckedChange={(v) => updateField("eliteAccess", !!v)}
                  className="border-[#D4A843]/40 data-[state=checked]:bg-[#D4A843] data-[state=checked]:border-[#D4A843]"
                />
                <span className="text-[#D4A843]/90 text-[0.6rem] group-hover:text-[#D4A843]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Elite Vault Access — grant BoB Tech Vault entry when wallet is set
                </span>
              </label>
            </div>
          </FormSection>

          {/* Section: Bracket Seat */}
          <FormSection icon={<Zap className="w-3.5 h-3.5" />} title="BRACKET SEED POSITION">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Bracket Seat (1-12)</label>
                <select
                  value={form.bracketSeat}
                  onChange={(e) => updateField("bracketSeat", Number(e.target.value))}
                  className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                >
                  <option value={0}>Unassigned</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Seat {n}{n === 1 ? " (Top Seed)" : n === 12 ? " (#2 Seed)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-[#8494A7] text-[0.55rem] pb-2">
                  Seat 1 = top seed (best athlete). Seat 12 = #2 seed in a 12-bracket event.
                </p>
              </div>
            </div>
          </FormSection>

          {/* Section: Social Links */}
          <FormSection icon={<Globe className="w-3.5 h-3.5" />} title="SOCIAL LINKS">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWithIcon icon={<Instagram className="w-3 h-3 text-pink-400" />} label="Instagram" value={form.instagram} onChange={(v) => updateField("instagram", v)} placeholder="@handle or full URL" />
              <FieldWithIcon icon={<Twitter className="w-3 h-3 text-sky-400" />} label="Twitter / X" value={form.twitter} onChange={(v) => updateField("twitter", v)} placeholder="@handle or full URL" />
              <FieldWithIcon icon={<Youtube className="w-3 h-3 text-red-400" />} label="YouTube" value={form.youtube} onChange={(v) => updateField("youtube", v)} placeholder="Channel URL" />
              <FieldWithIcon icon={<Link2 className="w-3 h-3 text-[#6AA3E0]" />} label="Website" value={form.website} onChange={(v) => updateField("website", v)} placeholder="https://..." />
            </div>
          </FormSection>

          {/* Section: Skill Ratings */}
          <FormSection icon={<Zap className="w-3.5 h-3.5" />} title={`SKILL RATINGS — TOTAL POWER: ${totalPower.toFixed(1)}`}>
            <div className="space-y-3">
              {(["energy", "performance", "static", "aggression", "dynamic"] as const).map((skill) => (
                <SkillSlider
                  key={skill}
                  label={SKILL_LABELS[skill]}
                  value={form[skill]}
                  color={SKILL_COLORS[skill]}
                  onChange={(v) => updateField(skill, v)}
                />
              ))}
            </div>
          </FormSection>

          {/* Section: NFT Data */}
          <FormSection icon={<Image className="w-3.5 h-3.5" />} title="NFT CARD DATA (optional — fill when minted)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Hedera Token ID" value={form.nftTokenId} onChange={(v) => updateField("nftTokenId", v)} placeholder="0.0.XXXXXXX" />
              <Field label="NFT Card Image URL" value={form.nftImageUrl} onChange={(v) => updateField("nftImageUrl", v)} placeholder="https://..." />
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Rarity</label>
                <select
                  value={form.nftRarity}
                  onChange={(e) => updateField("nftRarity", e.target.value)}
                  className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                >
                  {RARITY_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r || "Not set"}</option>
                  ))}
                </select>
              </div>
              <Field label="Series Name" value={form.nftSeriesName} onChange={(v) => updateField("nftSeriesName", v)} placeholder="Sigma Series" />
              <Field label="Metadata URI" value={form.nftMetadataUri} onChange={(v) => updateField("nftMetadataUri", v)} placeholder="ipfs://... or hedera://" />
              <Field label="Card Border Color" value={form.nftCardBorderColor} onChange={(v) => updateField("nftCardBorderColor", v)} placeholder="#FFD700" />
              <div className="sm:col-span-2">
                <Field label="Glow Gradient (Tailwind)" value={form.nftCardGlowGradient} onChange={(v) => updateField("nftCardGlowGradient", v)} placeholder="from-[#FFD700] via-[#22C55E] to-[#FFD700]" />
              </div>
            </div>
          </FormSection>

          {/* Section: Brand Colors (Dynamic Theme Engine) */}
          <FormSection icon={<Zap className="w-3.5 h-3.5" />} title="BRAND COLORS (Dynamic Theme Engine)">
            <p className="text-[#8494A7]/60 text-[0.5rem] mb-3">
              When this athlete competes in a battle, these colors tint the entire battle UI — progress bars, vote buttons, ambient glows.
              Falls back to Card Border Color, then to default BOTB blue.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor || form.nftCardBorderColor || "#4274B9"}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-[#4274B9]/20 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                    placeholder={form.nftCardBorderColor || "#4274B9"}
                    className="flex-1 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Secondary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor || "#6AA3E0"}
                    onChange={(e) => updateField("secondaryColor", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-[#4274B9]/20 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={form.secondaryColor}
                    onChange={(e) => updateField("secondaryColor", e.target.value)}
                    placeholder="#6AA3E0"
                    className="flex-1 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
                  />
                </div>
              </div>
            </div>
            {/* Live color preview */}
            {(form.primaryColor || form.secondaryColor) && (
              <div className="mt-3 p-3 rounded-lg bg-[#080D17] border border-[#1e293b]">
                <p className="text-[0.5rem] text-[#8494A7] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>PREVIEW: Battle Theme</p>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div className="w-1/2 h-full" style={{ background: `linear-gradient(90deg, ${form.primaryColor || form.nftCardBorderColor || "#4274B9"}, ${form.primaryColor || form.nftCardBorderColor || "#4274B9"}dd)` }} />
                  <div className="w-1/2 h-full" style={{ background: `linear-gradient(90deg, ${form.secondaryColor || "#6AA3E0"}dd, ${form.secondaryColor || "#6AA3E0"})` }} />
                </div>
              </div>
            )}
          </FormSection>

          {/* Section: Weight Class (Official WCO Divisions) */}
          <FormSection icon={<Dumbbell className="w-3.5 h-3.5" />} title="WEIGHT CLASS (Official WCO Divisions)">
            <p className="text-[#8494A7]/60 text-[0.5rem] mb-3">
              Official World Calisthenics Organization weight divisions. Displayed as a badge next to the athlete's profile picture on battle cards.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Weight Class</label>
                <select
                  value={form.weightClass}
                  onChange={(e) => updateField("weightClass", e.target.value)}
                  className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                >
                  <option value="">Not assigned</option>
                  <optgroup label="Official WCO Divisions">
                    {WCO_WEIGHT_CLASSES.map((wc) => (
                      <option key={wc} value={wc}>{wc}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Special Divisions">
                    <option value="Open Weight">Open Weight (No limit)</option>
                  </optgroup>
                </select>
              </div>
              {form.weightClass && (
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#162033] border border-[#4274B9]/20">
                    <Dumbbell className="w-3 h-3 text-[#D4A843]" />
                    <span className="text-[0.6rem] text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {form.weightClass}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={saving || !isValid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#D4A843] to-[#B8932B] text-[#0B1120] text-xs font-bold hover:from-[#E5B94E] hover:to-[#D4A843] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              {editingId ? "UPDATE ATHLETE" : "CREATE ATHLETE"}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg bg-[#162033] text-[#8494A7] text-xs hover:text-[#E8ECF0] transition-all"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
            >
              CANCEL
            </button>
            {!isValid && (
              <span className="flex items-center text-[#f59e0b] text-[0.55rem]">
                Fill required fields: Name, Full Name, Country, Bio
              </span>
            )}
          </div>
        </div>

        {/* ── Right: Live Preview ─────────────────────────────────── */}
        {showPreview && (
          <div className="lg:w-[40%] border-t lg:border-t-0 lg:border-l border-[#4274B9]/10 p-4 sm:p-5 bg-[#080D17]">
            <p className="text-[#6AA3E0] text-[0.6rem] font-bold mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
              LIVE PREVIEW
            </p>
            <LivePreviewCard form={form} totalPower={totalPower} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Preview Card
// ---------------------------------------------------------------------------

function LivePreviewCard({ form, totalPower }: { form: AthleteFormState; totalPower: number }) {
  const borderColor = form.nftCardBorderColor || "#4274B9";

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: `${borderColor}40`, background: "linear-gradient(135deg, #111827, #0B1120)" }}
    >
      {/* Image */}
      <div className="relative h-40 bg-[#162033] overflow-hidden">
        {form.pfpUrl ? (
          <ImageWithFallback src={form.pfpUrl} alt={form.name || "Athlete"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-12 h-12 text-[#4274B9]/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

        {/* Rank badge */}
        {form.bracketSeat > 0 && (
          <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg" style={{ background: `${borderColor}20`, border: `1px solid ${borderColor}40` }}>
            <span className="text-[0.6rem] font-bold" style={{ fontFamily: "Orbitron, sans-serif", color: borderColor }}>
              SEAT {form.bracketSeat}
            </span>
          </div>
        )}

        {/* Country */}
        {form.country && (
          <div className="absolute bottom-2 right-2 text-[0.6rem] text-[#8494A7]">{form.country}</div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-0.5 rounded text-[0.5rem] font-bold ${
            form.status === "active" ? "bg-[#10b981]/20 text-[#10b981]" :
            form.status === "champion" ? "bg-[#D4A843]/20 text-[#D4A843]" :
            "bg-red-500/20 text-red-400"
          }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
            {(form.status || "ACTIVE").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="text-[#E8ECF0] font-bold truncate mb-0.5"
          style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
        >
          {form.name || "Athlete Name"}
        </h3>
        {form.nickname && (
          <p className="text-[0.6rem] mb-1.5" style={{ color: borderColor }}>
            "{form.nickname}"
          </p>
        )}
        {form.specialMove && (
          <p className="text-[#f59e0b] text-[0.55rem] mb-2">
            Signature: {form.specialMove}
          </p>
        )}

        {/* Skill Bars */}
        <div className="space-y-1.5 mb-3">
          {(["energy", "performance", "static", "aggression", "dynamic"] as const).map((skill) => {
            const val = Number(form[skill]) || 0;
            return (
              <div key={skill} className="flex items-center gap-2">
                <span className="text-[0.5rem] text-[#8494A7] w-16 truncate">{SKILL_LABELS[skill]}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#162033] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: SKILL_COLORS[skill] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / 10) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-[0.5rem] font-mono w-6 text-right" style={{ color: SKILL_COLORS[skill] }}>
                  {val.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total Power */}
        <div className="flex items-center justify-between pt-2 border-t border-[#4274B9]/10">
          <span className="text-[0.55rem] text-[#8494A7]">Total Power Rating</span>
          <span className="text-[0.7rem] font-bold text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {totalPower.toFixed(1)}
          </span>
        </div>

        {/* NFT Rarity */}
        {form.nftRarity && (
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[0.55rem] text-[#8494A7]">NFT Rarity</span>
            <span className={`text-[0.55rem] font-bold ${
              form.nftRarity === "Legendary" ? "text-[#FFD700]" :
              form.nftRarity === "Epic" ? "text-[#8B5CF6]" :
              form.nftRarity === "Rare" ? "text-[#6AA3E0]" :
              "text-[#8494A7]"
            }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
              {form.nftRarity}
            </span>
          </div>
        )}

        {/* Social icons */}
        {(form.instagram || form.twitter || form.youtube || form.website) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#4274B9]/10">
            {form.instagram && <Instagram className="w-3 h-3 text-pink-400/60" />}
            {form.twitter && <Twitter className="w-3 h-3 text-sky-400/60" />}
            {form.youtube && <Youtube className="w-3 h-3 text-red-400/60" />}
            {form.website && <Link2 className="w-3 h-3 text-[#6AA3E0]/60" />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skill Slider with visual bar
// ---------------------------------------------------------------------------

function SkillSlider({
  label, value, color, onChange,
}: {
  label: string; value: number; color: string; onChange: (v: number) => void;
}) {
  const numVal = Number(value) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#8494A7] text-[0.6rem]">{label}</span>
        <span className="text-[0.65rem] font-bold font-mono" style={{ color }}>
          {numVal.toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative h-2 rounded-full bg-[#162033] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
            style={{ width: `${(numVal / 10) * 100}%`, background: color }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={numVal}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-20 h-1 accent-current cursor-pointer"
          style={{ accentColor: color }}
        />
        <input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={numVal}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(0, Math.min(10, v)));
          }}
          className="w-12 bg-[#162033] border border-[#4274B9]/20 rounded px-1.5 py-1 text-[#E8ECF0] text-[0.6rem] text-center outline-none focus:border-[#D4A843]/50"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormSection({
  icon, title, children,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#6AA3E0]">{icon}</span>
        <p className="text-[#6AA3E0] text-[0.65rem] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-[#8494A7] text-[0.6rem] block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
      />
    </div>
  );
}

function FieldWithIcon({
  icon, label, value, onChange, placeholder,
}: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-[#8494A7] text-[0.6rem] flex items-center gap-1 mb-1">
        {icon}
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
      />
    </div>
  );
}