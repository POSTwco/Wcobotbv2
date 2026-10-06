/**
 * Judge strip on the Athletes page, under Arena Chat.
 * Officers live on the contact page. This dropdown is approved judges only.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronDown, Scale } from "lucide-react";
import { InlineFlag } from "./country-flag";
import { api } from "../lib/api";
import { orgDisciplineLabel } from "../lib/org-sign";
import { JudgeBadge } from "./judge-badge";
import { JudgeDossier } from "./judge-dossier";
import { JudgeMark } from "./judge-mark";
import type { PublicJudge } from "../lib/types";

const STEPS = ["Create an account", "Pro Judge Registration", "Application submitted"];

export function StaffSection() {
  const [open, setOpen] = useState(false);
  const [judges, setJudges] = useState<PublicJudge[]>([]);
  const [judgesReady, setJudgesReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    api.getJudges().then((res) => {
      if (cancel) return;
      setJudges(res.success && Array.isArray(res.data) ? res.data : []);
      setJudgesReady(res.success);
    }).catch(() => {
      if (!cancel) setJudgesReady(false);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const selected = openId ? judges.find((judge) => judge.id === openId) ?? null : null;

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
            <Scale className="w-4 h-4 text-[#E8ECF0]" />
            MEET THE JUDGES
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
            {judges.length === 0 ? (
              <p className="text-sm text-[#8494A7] rounded-xl border border-dashed border-[#4274B9]/30 px-3 py-4">
                {judgesReady
                  ? "Judges appear here after WCO approves their Pro Judge Card."
                  : "The live judge list is updating."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {judges.map((judge) => (
                  <button
                    key={judge.id}
                    type="button"
                    onClick={() => setOpenId(judge.id)}
                    className="rounded-xl border border-[#4274B9]/25 bg-[#111827] p-3 text-left hover:border-[#E8ECF0]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <JudgeMark id={judge.id} hasPhoto={judge.hasPhoto} name={judge.name} className="w-14 h-14 rounded-xl object-cover border border-[#E8ECF0]/20 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm text-[#E8ECF0] font-semibold truncate">{judge.name}</h3>
                        {judge.country ? (
                          <p className="text-xs text-[#8494A7] mt-1 flex items-center gap-1.5">
                            <InlineFlag country={judge.country} /> {judge.country}
                          </p>
                        ) : null}
                        <div className="mt-1"><JudgeBadge small /></div>
                      </div>
                    </div>
                    {orgDisciplineLabel(judge.discipline) ? (
                      <p className="text-[0.65rem] text-[#6AA3E0] mt-2">{orgDisciplineLabel(judge.discipline)}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-[#4274B9]/20 bg-[#0B1120]/50 p-4">
              <Link
                to="/judges/apply"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#4274B9] text-[#E8ECF0] hover:bg-[#3563A0] text-xs sm:text-sm font-semibold"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                Apply for Official Pro Calisthenics Judge Card
              </Link>
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
      {selected ? (
        <JudgeDossier
          judge={selected}
          roster={judges}
          onClose={() => setOpenId(null)}
          onSelect={setOpenId}
        />
      ) : null}
    </section>
  );
}
