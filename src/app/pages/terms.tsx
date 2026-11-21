/**
 * Terms of service. The long token sections stay on disk in terms-sections*.tsx
 * and are not mounted.
 */

import { Link } from "react-router";
import { ArrowLeft, Scale } from "lucide-react";

export function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#6AA3E0] hover:text-[#4274B9] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#4274B9]/10 border border-[#4274B9]/30 flex items-center justify-center">
            <Scale className="w-6 h-6 text-[#4274B9]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
              TERMS OF SERVICE
            </h1>
            <p className="text-sm text-[#8494A7] mt-1">World Calisthenics Organization</p>
          </div>
        </div>
        <div className="space-y-4 text-sm text-[#B0BCC9] leading-relaxed">
          <p>
            These terms govern Battle of the Bars, run by the World Calisthenics Organization. By signing in and using the site, you agree to them.
          </p>
          <p>
            A signed-in member makes one call per bout. Each call has equal weight. A call is a pick. It is not a payment, a transfer, or a prize.
          </p>
          <p>
            Athletes, events, and battles stay on the site. Direct workout addresses still open. The organization can remove a call that breaks these terms or the competition rules.
          </p>
        </div>
      </div>
    </div>
  );
}
