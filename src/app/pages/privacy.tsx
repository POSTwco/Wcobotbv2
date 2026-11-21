/**
 * Privacy policy. The long token sections stay on disk in privacy-sections*.tsx
 * and are not mounted.
 */

import { Link } from "react-router";
import { ArrowLeft, Shield } from "lucide-react";

export function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#6AA3E0] hover:text-[#4274B9] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#4274B9]/10 border border-[#4274B9]/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#4274B9]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
              PRIVACY POLICY
            </h1>
            <p className="text-sm text-[#8494A7] mt-1">World Calisthenics Organization</p>
          </div>
        </div>
        <div className="space-y-4 text-sm text-[#B0BCC9] leading-relaxed">
          <p>
            The World Calisthenics Organization runs Battle of the Bars. A signed-in member makes one call per bout. Each call has equal weight.
          </p>
          <p>
            We store the account used to sign in, the bout, the athlete you called, and the time. We do not sell that record. Email sign-in is handled by the existing account provider. Questions go to the contact page.
          </p>
        </div>
      </div>
    </div>
  );
}
