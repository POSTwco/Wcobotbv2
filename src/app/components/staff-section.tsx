/**
 * Judge strip on the Athletes page, under Arena Chat.
 * Officers live on the contact page. This dropdown is approved judges only.
 * Cards and the profile dialog match the athlete roster.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronDown, Flame, Scale, Target, Zap } from "lucide-react";
import { InlineFlag } from "./country-flag";
import { api } from "../lib/api";
import { orgDisciplineLabel } from "../lib/org-sign";
import { JudgeBadge } from "./judge-badge";
import { JudgeDossier } from "./judge-dossier";
import { JudgeMark } from "./judge-mark";
import { TiltCard } from "./ui-enhancements";
import type { PublicJudge } from "../lib/types";

const STEPS = ["Create an account", "Pro Judge Registration", "Application submitted"];
const BORDER = "#4274B9";

const DISCIPLINE_ICON = {
  freestyle: Zap,
  statics: Target,
  freestyle_statics: Flame,
} as const;

function JudgeCard({
  judge,
  index,
  compact,
  onOpen,
}: {
  judge: PublicJudge;
  index: number;
  compact: boolean;
  onOpen: (id: string) => void;
}) {
  const discipline = orgDisciplineLabel(judge.discipline);
  const DisciplineIcon = DISCIPLINE_ICON[judge.discipline as keyof typeof DISCIPLINE_ICON] || Scale;

  return (
    <TiltCard maxTilt={compact ? 3 : 5} scale={compact ? 1.01 : 1.02} glowColor={BORDER} className="relative">
      <motion.div
        id={`judge-card-${judge.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4) }}
        role="button"
        tabIndex={0}
        aria-label={`Open profile for ${judge.name}`}
        onClick={() => onOpen(judge.id)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onOpen(judge.id);
        }}
        className={`bg-[#111827] border overflow-hidden cursor-pointer hover:border-opacity-60 transition-all group scroll-mt-24 ${
          compact ? "rounded-xl" : "rounded-2xl"
        }`}
        style={{ borderColor: `${BORDER}20` }}
      >
        <div className="relative bg-[#0B1120]">
          <JudgeMark
            id={judge.id}
            hasPhoto={judge.hasPhoto}
            name={judge.name}
            iconClassName={compact ? "w-8 h-8 text-[#4274B9]/20" : "w-16 h-16 text-[#4274B9]/15"}
            className={`block w-full h-auto object-contain ${judge.hasPhoto ? "" : "min-h-36"} ${compact ? "max-h-40" : "max-h-[28rem]"}`}
          />
          <div className={`absolute ${compact ? "top-1.5 left-1.5" : "top-3 left-3"}`}>
            <JudgeBadge small={compact} />
          </div>
          {judge.country ? (
            <div className={`absolute ${compact ? "bottom-1.5 right-1.5 text-[0.45rem]" : "bottom-3 right-3 text-xs"} text-[#E8ECF0] flex items-center gap-1`}>
              <InlineFlag country={judge.country} /> {!compact && judge.country}
            </div>
          ) : null}
        </div>

        <div className={compact ? "p-2" : "p-3 sm:p-5"}>
          <div className={`flex items-center mb-0.5 min-w-0 ${compact ? "gap-1" : "gap-1.5"}`}>
            <h3
              className="text-[#E8ECF0] font-bold truncate"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: compact ? "0.6rem" : "0.8rem" }}
            >
              {judge.name}
            </h3>
            {discipline ? (
              <span
                className={`shrink-0 inline-flex items-center rounded font-bold leading-none ${
                  compact ? "px-1 py-0.5 text-[0.4rem] tracking-normal" : "gap-1 px-1.5 py-0.5 text-[0.45rem] tracking-wide"
                }`}
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: "rgba(66,116,185,0.18)",
                  border: "1px solid rgba(106,163,224,0.4)",
                  color: "#6AA3E0",
                }}
              >
                {!compact && <DisciplineIcon className="w-2.5 h-2.5" />}
                {discipline}
              </span>
            ) : null}
          </div>
          {!compact && judge.bio ? (
            <p className="text-[0.65rem] text-[#8494A7] mt-2 line-clamp-3 leading-relaxed">{judge.bio}</p>
          ) : null}
        </div>
      </motion.div>
    </TiltCard>
  );
}

export function StaffSection() {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
  const top = judges.slice(0, 3);
  const rest = judges.slice(3);

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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {top.map((judge, i) => (
                    <JudgeCard key={judge.id} judge={judge} index={i} compact={false} onOpen={setOpenId} />
                  ))}
                </div>
                {rest.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAll((v) => !v)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#111827] border border-[#4274B9]/20 hover:border-[#4274B9]/40 transition-all group"
                    >
                      <span
                        className="text-[#8494A7] group-hover:text-[#E8ECF0] text-xs tracking-wider transition-colors"
                        style={{ fontFamily: "Orbitron, sans-serif" }}
                      >
                        {showAll ? "HIDE" : "VIEW ALL"} JUDGES ({rest.length} MORE)
                      </span>
                      <motion.span animate={{ rotate: showAll ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown className="w-4 h-4 text-[#4274B9]" />
                      </motion.span>
                    </button>
                    {showAll && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="mt-4 sm:mt-6 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
                      >
                        {rest.map((judge, i) => (
                          <JudgeCard key={judge.id} judge={judge} index={i + 3} compact onOpen={setOpenId} />
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </>
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
