/**
 * WCO staff strip on the Athletes page, under Arena Chat.
 * Officers and judges here are placeholders until the real roster and
 * judge applications are added in this same section.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Shield } from "lucide-react";
import { InlineFlag } from "./country-flag";

const OFFICERS = [
  {
    name: "Brandon",
    title: "Chief Executive Officer",
    bio: "Leads World Calisthenics Organization and Battle of the Bars.",
  },
  {
    name: "Kyle",
    title: "Chief Technology Officer",
    bio: "Leads the platform, wallets, and competition systems.",
  },
];

const SAMPLE_JUDGES = [
  { name: "Sample Judge A", country: "United States", discipline: "FreeStyle" },
  { name: "Sample Judge B", country: "Mexico", discipline: "Statics" },
  { name: "Sample Judge C", country: "Brazil", discipline: "Both" },
];

const STEPS = ["Create an account", "Pro Judge Registration", "Application submitted"];

export function StaffSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="wco-staff" className="py-8 sm:py-12 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#4274B9]/25 bg-[#111827] px-4 py-3 text-left hover:border-[#6AA3E0]/50 transition-colors"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            <Shield className="w-4 h-4 text-[#6AA3E0]" />
            MEET THE STAFF
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown className="w-4 h-4 text-[#4274B9]" />
          </motion.span>
        </button>

        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.35 }}
            className="mt-4 space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OFFICERS.map((person) => (
                <article key={person.title} className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl bg-[#0B1120] border border-[#4274B9]/30 flex items-center justify-center text-[#6AA3E0] font-bold"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      {person.name.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>{person.name}</h3>
                      <p className="text-xs text-[#6AA3E0]">{person.title}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#C5D0DC] mt-3 leading-relaxed">{person.bio}</p>
                  <p className="text-[0.65rem] text-[#8494A7] mt-2">Profile coming soon</p>
                </article>
              ))}
            </div>

            <div>
              <h3 className="text-xs tracking-wide text-[#8494A7] mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
                REGISTERED JUDGES
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_JUDGES.map((judge) => (
                  <article key={judge.name} className="rounded-xl border border-dashed border-[#4274B9]/30 bg-[#111827]/70 p-3">
                    <p className="text-sm text-[#E8ECF0] font-semibold">{judge.name}</p>
                    <p className="text-xs text-[#8494A7] mt-1 flex items-center gap-1.5">
                      <InlineFlag country={judge.country} /> {judge.country}
                    </p>
                    <p className="text-[0.65rem] text-[#6AA3E0] mt-2">{judge.discipline}</p>
                    <p className="text-[0.6rem] text-[#8494A7] mt-2">Sample profile</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#4274B9]/20 bg-[#0B1120]/50 p-4">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#4274B9]/30 text-[#E8ECF0]/70 cursor-not-allowed text-xs sm:text-sm font-semibold"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                Apply for Official Pro Calisthenics Judge Card — Coming Soon
              </button>
              <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {STEPS.map((step, i) => (
                  <li key={step} className="rounded-lg border border-[#4274B9]/15 px-3 py-2 text-xs text-[#8494A7]">
                    <span className="text-[#6AA3E0] font-bold mr-2">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
