/**
 * Terms of Service Page — Complete (13/13 sections)
 * ===================================================
 * Production-grade terms for a Web3 competition platform on Hedera mainnet.
 * Section 1 inline; Sections 2-5 in terms-sections.tsx; Sections 6-13 in terms-sections-b.tsx.
 */

import { Link } from "react-router";
import { ArrowLeft, Scale, FileText } from "lucide-react";
import {
  Section2_PlatformEligibility, Section3_WalletAuth,
  Section4_NFTOwnershipIP, Section5_TokenMechanics,
} from "./terms-sections";
import {
  Section6_VotingRules, Section7_CompetitionRewards,
  Section8_Governance, Section9_ProhibitedConduct,
  Section10_Disclaimers, Section11_Liability,
  Section12_DisputeResolution, Section13_ModificationsTermination,
} from "./terms-sections-b";

export function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#6AA3E0] hover:text-[#4274B9] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#4274B9]/10 border border-[#4274B9]/30 flex items-center justify-center">
            <Scale className="w-6 h-6 text-[#4274B9]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
              TERMS OF SERVICE
            </h1>
            <p className="text-sm text-[#8494A7] mt-1">
              Last Updated: March 2026 &middot; Version 1.0 (Beta)
            </p>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-300/90 leading-relaxed">
              <strong>Document Status: Complete — Beta Period</strong>
              <p className="mt-1 text-amber-300/70">
                These Terms of Service govern your use of the BOTB platform during the
                public beta period and beyond. All 13 sections are finalized covering
                platform usage, eligibility, NFT ownership, token mechanics, voting rules,
                staking, prohibited conduct, disclaimers, liability, dispute resolution,
                and governing law. The WCO reserves the right to amend these Terms as
                described in Section 13.
              </p>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="prose prose-invert max-w-none space-y-8">
          <section className="p-6 rounded-xl bg-[#0D1526]/80 border border-[#4274B9]/10">
            <h2 className="text-lg font-bold text-[#E8ECF0] mb-4" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem", letterSpacing: "0.08em" }}>
              1. ACCEPTANCE OF TERMS
            </h2>
            <p className="text-sm text-[#B0BCC9] leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", 
              "you", "your") and the World Calisthenics Organization ("WCO", "we", "us", "our") governing 
              your access to and use of the Battle of the Bars platform ("BOTB", "the Platform"), including 
              all associated smart contracts, tokens, NFTs, APIs, and web applications deployed on the 
              Hedera Hashgraph network.
            </p>
            <p className="text-sm text-[#B0BCC9] leading-relaxed mt-3">
              By connecting a Hedera wallet, casting a vote, participating in governance, or otherwise 
              interacting with the Platform, you signify your acceptance of these Terms in their entirety. 
              If you do not agree, you must immediately discontinue use of the Platform.
            </p>
          </section>

          {/* ================================================================ */}
          {/* SECTION 2 — PLATFORM DESCRIPTION & ELIGIBILITY (imported)       */}
          {/* ================================================================ */}
          <Section2_PlatformEligibility />

          {/* ================================================================ */}
          {/* SECTION 3 — WALLET CONNECTION & AUTHENTICATION (imported)        */}
          {/* ================================================================ */}
          <Section3_WalletAuth />

          {/* ================================================================ */}
          {/* SECTION 4 — NFT OWNERSHIP & IP (imported)                       */}
          {/* ================================================================ */}
          <Section4_NFTOwnershipIP />

          {/* ================================================================ */}
          {/* SECTION 5 — TOKEN MECHANICS & UTILITY (imported)                */}
          {/* ================================================================ */}
          <Section5_TokenMechanics />

          {/* ================================================================ */}
          {/* SECTION 6 — VOTING RULES & STAKING (imported)                   */}
          {/* ================================================================ */}
          <Section6_VotingRules />

          {/* ================================================================ */}
          {/* SECTION 7 — COMPETITION & REWARD DISTRIBUTION (imported)        */}
          {/* ================================================================ */}
          <Section7_CompetitionRewards />

          {/* ================================================================ */}
          {/* SECTION 8 — GOVERNANCE PARTICIPATION (imported)                 */}
          {/* ================================================================ */}
          <Section8_Governance />

          {/* ================================================================ */}
          {/* SECTION 9 — PROHIBITED CONDUCT (imported)                       */}
          {/* ================================================================ */}
          <Section9_ProhibitedConduct />

          {/* ================================================================ */}
          {/* SECTION 10 — DISCLAIMERS & RISK DISCLOSURES (imported)          */}
          {/* ================================================================ */}
          <Section10_Disclaimers />

          {/* ================================================================ */}
          {/* SECTION 11 — LIMITATION OF LIABILITY (imported)                 */}
          {/* ================================================================ */}
          <Section11_Liability />

          {/* ================================================================ */}
          {/* SECTION 12 — DISPUTE RESOLUTION & GOVERNING LAW (imported)       */}
          {/* ================================================================ */}
          <Section12_DisputeResolution />

          {/* ================================================================ */}
          {/* SECTION 13 — MODIFICATIONS, TERMINATION & GENERAL (imported)     */}
          {/* ================================================================ */}
          <Section13_ModificationsTermination />
        </div>

        {/* Progress */}
        <div className="mt-10 p-4 rounded-xl bg-[#0D1526]/50 border border-[#4274B9]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-[#8494A7] space-y-0.5">
            <p><strong className="text-[#E8ECF0]">Document:</strong> BOTB Terms of Service v1.0 (Beta)</p>
            <p><strong className="text-[#E8ECF0]">Effective:</strong> March 7, 2026</p>
            <p><strong className="text-[#E8ECF0]">Sections Complete:</strong> 13 of 13</p>
          </div>
          <div className="flex gap-3">
            <Link to="/privacy" className="text-xs text-[#6AA3E0] hover:text-[#4274B9] transition-colors">&larr; Privacy Policy</Link>
            <Link to="/whitepaper" className="text-xs text-[#6AA3E0] hover:text-[#4274B9] transition-colors">Whitepaper &rarr;</Link>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-[#4274B9]/10 flex flex-wrap gap-6 text-sm text-[#8494A7]">
          <Link to="/privacy" className="hover:text-[#6AA3E0] transition-colors">Privacy Policy</Link>
          <Link to="/whitepaper" className="hover:text-[#6AA3E0] transition-colors">Whitepaper</Link>
          <a href="https://worldcalisthenics.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#6AA3E0] transition-colors">
            worldcalisthenics.org
          </a>
        </div>
      </div>
    </div>
  );
}