/**
 * BOTB Athlete Application Page
 * ==============================
 * Public-facing "lite" version of the admin athlete form.
 * Requires wallet connection. Collects personal info, socials,
 * YouTube routine video, and a binding legal disclaimer.
 * Submissions go to the admin panel for review (approve/reject).
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Globe, Youtube, Instagram, Twitter, Link2,
  Shield, AlertTriangle, CheckCircle, Loader2,
  Zap, FileText, ChevronDown, ExternalLink, Mail, Phone,
  Dumbbell,
} from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import { WCO_WEIGHT_CLASSES } from "../lib/types";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "../components/error-boundary";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

// ---------------------------------------------------------------------------
// Country list
// ---------------------------------------------------------------------------
const COUNTRIES = [
  "USA", "Mexico", "Russia", "Brazil", "Germany", "France", "Japan",
  "South Korea", "UK", "Spain", "Italy", "Nigeria", "Australia",
  "Canada", "Ukraine", "Poland", "Sweden", "Netherlands", "India",
  "Colombia", "Argentina", "Chile", "South Africa", "Kenya", "Egypt",
  "Philippines", "Thailand", "Indonesia", "China", "Other",
];

const DISCLAIMER_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function ApplyPage() {
  const { connected, connect, accountId, isConnecting } = useWallet();

  const [form, setForm] = useState({
    name: "",
    fullName: "",
    nickname: "",
    country: "",
    weightClass: "",
    bio: "",
    pfpStoragePath: "",
    pfpPreviewUrl: "",
    specialMove: "",
    email: "",
    phone: "",
    instagram: "",
    twitter: "",
    youtube: "",
    website: "",
    youtubeRoutine: "",
  });

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState("");

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Validation
  const hasSocial = !!(form.instagram.trim() || form.twitter.trim() || form.website.trim());
  const isValid =
    form.name.trim() &&
    form.fullName.trim() &&
    form.country &&
    form.weightClass &&
    form.bio.trim() &&
    form.pfpStoragePath &&
    form.youtubeRoutine.trim() &&
    hasSocial &&
    disclaimerAccepted;

  const handleSubmit = useCallback(async () => {
    if (!accountId || !isValid) return;

    setSubmitting(true);
    try {
      const res = await api.submitApplication({
        wallet: accountId,
        ...form,
        disclaimerAccepted: true,
        disclaimerVersion: DISCLAIMER_VERSION,
        disclaimerAcceptedAt: new Date().toISOString(),
      });

      if (res.success && res.data) {
        setSubmitted(true);
        setAppId(res.data.id);
        toast.success("Application submitted! The WCO team will review it shortly.");
      } else {
        toast.error(res.error || "Failed to submit application");
      }
    } catch (err: any) {
      console.error("[Apply] Submission error:", err);
      toast.error(sanitizeErrorMessage(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }, [accountId, form, isValid]);

  // ── Not connected ──────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <img src={botbShield} alt="BOTB" className="h-20 w-auto mx-auto mb-6 drop-shadow-2xl" />
          <h1
            className="text-2xl sm:text-3xl mb-4"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            <span className="text-white">ENTER THE </span>
            <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">ARENA</span>
          </h1>
          <p className="text-[#8494A7] text-sm mb-8 leading-relaxed">
            Connect your Hedera wallet to apply as a BOTB athlete.
            Your wallet identity verifies your application and links you to the platform.
          </p>
          <button
            onClick={connect}
            disabled={isConnecting}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-xl bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all disabled:opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
          >
            <Zap className="w-4 h-4" />
            {isConnecting ? "CONNECTING..." : "CONNECT WALLET TO APPLY"}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Submitted success ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="inline-flex p-4 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 mb-6">
            <CheckCircle className="w-12 h-12 text-[#10b981]" />
          </div>
          <h1
            className="text-2xl sm:text-3xl mb-4 text-[#E8ECF0]"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            APPLICATION SUBMITTED
          </h1>
          <p className="text-[#8494A7] text-sm mb-3 leading-relaxed">
            Your application has been received and is pending review by the WCO admin team.
            Once approved, you'll appear on the athlete roster and be eligible for battle matchups.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 mb-6">
            <span className="text-[#8494A7] text-xs">Application ID:</span>
            <span className="text-[#6AA3E0] text-xs font-mono">{appId}</span>
          </div>
          <div className="flex justify-center gap-4">
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#4274B9] text-white text-xs hover:bg-[#3563A0] transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              BACK TO HOME
            </a>
            <a
              href="/athletes"
              className="px-5 py-2.5 rounded-xl border border-[#4274B9]/30 text-[#4274B9] text-xs hover:bg-[#4274B9]/10 transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              VIEW ROSTER
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Application Form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img src={botbShield} alt="BOTB" className="h-16 w-auto mx-auto mb-4 drop-shadow-2xl" />
          <h1
            className="text-2xl sm:text-3xl mb-3"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            <span className="text-white">ATHLETE </span>
            <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">APPLICATION</span>
          </h1>
          <p className="text-[#8494A7] text-sm max-w-xl mx-auto leading-relaxed">
            Apply to compete in Battle of the Bars. Fill out your details below and submit for WCO admin review.
            Once approved, you'll be added to the official athlete roster.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-[#162033] border border-[#4274B9]/20">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[#6AA3E0] text-xs font-mono">{accountId}</span>
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0D1526] border border-[#4274B9]/20 rounded-2xl overflow-hidden"
        >
          <div className="p-5 sm:p-6 space-y-6">
            {/* ── Section: Personal Info ── */}
            <FormSection icon={<User className="w-3.5 h-3.5" />} title="PERSONAL INFORMATION">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Display Name *"
                  value={form.name}
                  onChange={(v) => updateField("name", v)}
                  placeholder="e.g. Tony Gaste"
                />
                <Field
                  label="Legal / Full Name *"
                  value={form.fullName}
                  onChange={(v) => updateField("fullName", v)}
                  placeholder="e.g. Antonio Gastelum"
                />
                <Field
                  label="Nickname"
                  value={form.nickname}
                  onChange={(v) => updateField("nickname", v)}
                  placeholder='e.g. "The Machine"'
                />
                <div>
                  <label className="text-[#8494A7] text-[0.6rem] block mb-1">Country *</label>
                  <select
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#8494A7] text-[0.6rem] flex items-center gap-1 mb-1">
                    <Dumbbell className="w-3 h-3 text-[#D4A843]" />
                    Weight Class *
                  </label>
                  <select
                    value={form.weightClass}
                    onChange={(e) => updateField("weightClass", e.target.value)}
                    className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60"
                  >
                    <option value="">Select your division...</option>
                    {WCO_WEIGHT_CLASSES.map((wc) => (
                      <option key={wc} value={wc}>{wc}</option>
                    ))}
                  </select>
                  <p className="text-[#8494A7]/50 text-[0.5rem] mt-0.5">
                    Official WCO division. You must make weight at the competition (within 1 lb of class limit).
                  </p>
                </div>
                <Field
                  label="Signature Move"
                  value={form.specialMove}
                  onChange={(v) => updateField("specialMove", v)}
                  placeholder="e.g. 360 Muscle-Up to Planche"
                />
                <PfpUploader
                  wallet={accountId || ""}
                  storagePath={form.pfpStoragePath}
                  previewUrl={form.pfpPreviewUrl}
                  onUploaded={(path, url) => {
                    updateField("pfpStoragePath", path);
                    updateField("pfpPreviewUrl", url);
                  }}
                  onClear={() => {
                    updateField("pfpStoragePath", "");
                    updateField("pfpPreviewUrl", "");
                  }}
                />
              </div>
              <div className="mt-3">
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">Bio / About You *</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Tell us about your calisthenics journey, training style, competitive achievements, and what drives you to compete..."
                  className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60 resize-none placeholder:text-[#8494A7]/40"
                />
                <p className="text-[#8494A7]/50 text-[0.55rem] text-right mt-0.5">{form.bio.length}/2000</p>
              </div>
            </FormSection>

            {/* ── Section: Contact Info ── */}
            <FormSection icon={<Mail className="w-3.5 h-3.5" />} title="CONTACT INFORMATION">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWithIcon
                  icon={<Mail className="w-3 h-3 text-[#D4A843]" />}
                  label="Email Address"
                  value={form.email}
                  onChange={(v) => updateField("email", v)}
                  placeholder="your@email.com"
                />
                <FieldWithIcon
                  icon={<Phone className="w-3 h-3 text-[#10b981]" />}
                  label="Phone Number"
                  value={form.phone}
                  onChange={(v) => updateField("phone", v)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <p className="text-[#8494A7]/50 text-[0.5rem] mt-1.5">Contact info is kept private — only visible to WCO admins for competition coordination.</p>
            </FormSection>

            {/* ── Section: Social Accounts ── */}
            <FormSection icon={<Globe className="w-3.5 h-3.5" />} title="SOCIAL ACCOUNTS (at least 1 required)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWithIcon
                  icon={<Instagram className="w-3 h-3 text-pink-400" />}
                  label="Instagram"
                  value={form.instagram}
                  onChange={(v) => updateField("instagram", v)}
                  placeholder="@handle or full URL"
                />
                <FieldWithIcon
                  icon={<Twitter className="w-3 h-3 text-sky-400" />}
                  label="Twitter / X"
                  value={form.twitter}
                  onChange={(v) => updateField("twitter", v)}
                  placeholder="@handle or full URL"
                />
                <FieldWithIcon
                  icon={<Youtube className="w-3 h-3 text-red-400" />}
                  label="YouTube Channel"
                  value={form.youtube}
                  onChange={(v) => updateField("youtube", v)}
                  placeholder="Channel URL"
                />
                <FieldWithIcon
                  icon={<Link2 className="w-3 h-3 text-[#6AA3E0]" />}
                  label="Website"
                  value={form.website}
                  onChange={(v) => updateField("website", v)}
                  placeholder="https://..."
                />
              </div>
              {!hasSocial && (
                <p className="text-amber-400/80 text-[0.6rem] mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Provide at least one social account (Instagram, Twitter/X, or Website)
                </p>
              )}
            </FormSection>

            {/* ── Section: YouTube Routine (Required) ── */}
            <FormSection icon={<Youtube className="w-3.5 h-3.5 text-red-400" />} title="YOUTUBE ROUTINE VIDEO (required)">
              <div>
                <label className="text-[#8494A7] text-[0.6rem] block mb-1">
                  YouTube Link to Your Competition Routine *
                </label>
                <input
                  type="text"
                  value={form.youtubeRoutine}
                  onChange={(e) => updateField("youtubeRoutine", e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60 placeholder:text-[#8494A7]/40"
                />
                <p className="text-[#8494A7]/60 text-[0.55rem] mt-1">
                  Submit a video showcasing your best calisthenics routine. This is reviewed by WCO admins to evaluate your skill level and competitive readiness.
                </p>
              </div>
            </FormSection>

            {/* ── Section: Legal Disclaimer ── */}
            <div className="border border-amber-500/20 rounded-xl overflow-hidden">
              <button
                onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 transition-all"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                    ATHLETE AGREEMENT & DATA CONSENT
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${disclaimerExpanded ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {disclaimerExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-4 space-y-4 text-[0.75rem] text-[#B0BCC9] leading-relaxed max-h-[50vh] overflow-y-auto scrollbar-thin">
                      <DisclaimerSection title="1. Athlete Participation Agreement">
                        By submitting this application, you ("Applicant") agree to be considered for participation in the
                        Battle of the Bars ("BOTB") competition series organized by the World Calisthenics Organization ("WCO").
                        Upon acceptance, you agree to compete in assigned matchups, adhere to competition rules and scheduling,
                        and represent yourself professionally within the BOTB ecosystem. <strong className="text-[#E8ECF0]">Failure to fulfill
                        competition obligations after acceptance may result in removal from the roster, forfeiture of token
                        rewards, and suspension from future events.</strong>
                      </DisclaimerSection>

                      <DisclaimerSection title="2. Grant of Promotional Rights">
                        You hereby grant the WCO a <strong className="text-[#E8ECF0]">non-exclusive, worldwide, royalty-free, perpetual license</strong> to
                        use, reproduce, distribute, display, and create derivative works from the content you submit in this
                        application — including but not limited to your name, likeness, photographs, videos, biographical information,
                        social media handles, and YouTube routine footage — for promotional, marketing, editorial, and commercial
                        purposes across all media now known or hereafter developed. This includes use on the BOTB platform,
                        WCO social media channels, NFT card artwork, broadcast materials, merchandise, and partner media.
                      </DisclaimerSection>

                      <DisclaimerSection title="3. Data Collection & Processing">
                        The personal data submitted in this application is collected and processed for the purpose of evaluating
                        your eligibility, managing your athlete profile on the BOTB platform, and facilitating competition operations.
                        Data collected includes: legal name, display name, country of origin, biographical information, social media
                        accounts, profile images, YouTube routine video, and your Hedera wallet address. This data will be stored
                        in the WCO's secure backend systems and may be displayed publicly on the BOTB platform if your application
                        is approved. For full details on data handling, see our{" "}
                        <a href="/privacy" className="text-[#6AA3E0] hover:underline">Privacy Policy</a>.
                      </DisclaimerSection>

                      <DisclaimerSection title="4. Blockchain & Digital Asset Acknowledgment">
                        You acknowledge that the BOTB platform operates on the <strong className="text-[#E8ECF0]">Hedera Hashgraph</strong> mainnet.
                        Your Hedera wallet address will be publicly associated with your athlete profile. If approved, an NFT
                        card may be minted representing your athlete profile via the Hedera Token Service (HTS). You understand
                        that blockchain data is immutable and publicly accessible. You further acknowledge that BOTB tokens and
                        NFTs are utility items and do not constitute securities, investment contracts, or financial instruments.
                      </DisclaimerSection>

                      <DisclaimerSection title="5. Intellectual Property">
                        You represent and warrant that all content submitted — including photos, videos, and biographical
                        information — is your original work or that you have obtained all necessary rights and permissions to
                        submit it. You agree to indemnify and hold harmless the WCO from any claims arising from the unauthorized
                        use of third-party intellectual property in your application.
                      </DisclaimerSection>

                      <DisclaimerSection title="6. Competition Obligations">
                        Upon acceptance into the BOTB roster, you agree to: (a) be available for scheduled competition matchups
                        as arranged by the WCO; (b) compete in good faith and in accordance with BOTB rules; (c) maintain
                        professional conduct in all public-facing BOTB interactions; (d) not engage in any activity that could
                        bring the WCO or BOTB brand into disrepute. The WCO reserves the right to remove any athlete from the
                        roster at its sole discretion for violation of these obligations or for conduct detrimental to the
                        competition.
                      </DisclaimerSection>

                      <DisclaimerSection title="7. Limitation of Liability">
                        To the fullest extent permitted by applicable law, the WCO shall not be liable for any injuries,
                        damages, or losses — whether physical, financial, or otherwise — arising from your participation in
                        BOTB competitions or use of the platform. You participate at your own risk and acknowledge the inherent
                        physical risks associated with competitive calisthenics.
                      </DisclaimerSection>

                      <DisclaimerSection title="8. Governing Law & Dispute Resolution">
                        This agreement shall be governed by and construed in accordance with the laws of the jurisdiction in
                        which the WCO is incorporated. Any disputes arising under or in connection with this agreement shall be
                        resolved through binding arbitration, unless otherwise required by applicable consumer protection laws.
                      </DisclaimerSection>

                      <div className="pt-2 border-t border-[#4274B9]/10">
                        <div className="flex items-center gap-2 text-[0.65rem] text-[#8494A7]">
                          <ExternalLink className="w-3 h-3" />
                          <span>Full legal documents:</span>
                          <a href="/privacy" className="text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Privacy Policy</a>
                          <span className="text-[#4274B9]/30">|</span>
                          <a href="/terms" className="text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Terms of Service</a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Checkbox */}
              <div className="px-4 py-3 border-t border-amber-500/10 bg-[#0A0F1A]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#4274B9]/40 bg-[#162033] text-[#4274B9] focus:ring-[#4274B9]/50 accent-[#4274B9]"
                  />
                  <span className="text-[0.7rem] text-[#E8ECF0] leading-relaxed">
                    I have read and agree to the Athlete Agreement & Data Consent above. I understand that upon acceptance,
                    I am contractually obligated to compete in assigned BOTB matchups and that the WCO may use my submitted
                    content for promotional purposes. I agree to the{" "}
                    <a href="/terms" className="text-[#6AA3E0] hover:underline">Terms of Service</a> and{" "}
                    <a href="/privacy" className="text-[#6AA3E0] hover:underline">Privacy Policy</a>.
                  </span>
                </label>
              </div>
            </div>

            {/* ── Submit Button ── */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={submitting || !isValid}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] text-white hover:shadow-lg hover:shadow-[#4274B9]/25 active:scale-[0.98]"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    SUBMIT APPLICATION
                  </>
                )}
              </button>
              {!isValid && (
                <p className="text-amber-400/70 text-[0.6rem] text-center sm:text-left">
                  {!form.name.trim() || !form.fullName.trim() || !form.country || !form.bio.trim()
                    ? "Fill all required fields (Name, Full Name, Country, Bio)"
                    : !form.weightClass
                    ? "Select your official WCO weight class"
                    : !form.pfpStoragePath
                    ? "Upload a profile picture"
                    : !form.youtubeRoutine.trim()
                    ? "YouTube routine video link is required"
                    : !hasSocial
                    ? "At least one social account is required"
                    : "Accept the terms to continue"}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3 border-t border-[#4274B9]/10 bg-[#0A0F1A]">
            <p className="text-center text-[0.6rem] text-[#8494A7]/50">
              Agreement v{DISCLAIMER_VERSION} &middot; World Calisthenics Organization &middot; Battle of the Bars
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PfpUploader({
  wallet, storagePath, previewUrl, onUploaded, onClear,
}: {
  wallet: string;
  storagePath: string;
  previewUrl: string;
  onUploaded: (path: string, url: string) => void;
  onClear: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!wallet) {
      toast.error("Connect your wallet before uploading");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Only PNG, JPEG, or WEBP images are allowed");
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadApplicationPfp(file, wallet);
      if (res.success && res.data) {
        onUploaded(res.data.path, res.data.previewUrl);
        toast.success("Profile picture uploaded securely");
      } else {
        toast.error(res.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-[#8494A7] text-[0.6rem] block mb-1">Profile Picture *</label>
      <div className="flex items-center gap-2">
        <label className={`flex-1 cursor-pointer bg-[#162033] border border-dashed border-[#4274B9]/30 hover:border-[#4274B9]/60 rounded-lg px-3 py-2 text-xs text-center transition-all ${uploading ? "opacity-50 cursor-wait" : ""}`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          {uploading ? (
            <span className="flex items-center justify-center gap-2 text-[#6AA3E0]">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
            </span>
          ) : storagePath ? (
            <span className="text-[#10b981]">✓ Uploaded — click to replace</span>
          ) : (
            <span className="text-[#8494A7]">Choose image (PNG/JPEG/WEBP, max 5 MB)</span>
          )}
        </label>
        {previewUrl && (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#4274B9]/20 shrink-0">
            <ImageWithFallback src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        {storagePath && !uploading && (
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1.5 text-[0.55rem] rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20"
          >
            REMOVE
          </button>
        )}
      </div>
      <p className="text-[#8494A7]/50 text-[0.5rem] mt-0.5">
        Stored privately. Only WCO admins can access it for review.
      </p>
    </div>
  );
}

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
        className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60 placeholder:text-[#8494A7]/40"
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
        className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#4274B9]/60 placeholder:text-[#8494A7]/40"
      />
    </div>
  );
}

function DisclaimerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4
        className="text-[0.65rem] font-bold text-[#E8ECF0] tracking-wider mb-1"
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        {title}
      </h4>
      <p className="text-[0.75rem] text-[#B0BCC9] leading-relaxed">{children}</p>
    </div>
  );
}