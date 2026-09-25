import { Scale, Shield } from "lucide-react";

/** Athlete VERIFIED and Judge chips are independent, so a person can wear both. */
export function ChatRoleBadges({ isAthlete, isJudge }: { isAthlete: boolean; isJudge: boolean }) {
  return (
    <>
      {isAthlete && (
        <span className="inline-flex items-center gap-0.5" title="Verified Athlete">
          <Shield className="w-3 h-3 text-[#4274B9]" aria-hidden />
          <span className="text-[0.45rem] text-[#4274B9] font-bold">VERIFIED</span>
        </span>
      )}
      {isJudge && <JudgeBadge small />}
    </>
  );
}

/** Silver Arena Chat chip for an approved Pro Judge Card. Visible to every chatter. */
export function JudgeBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded border border-[#C5D0DC]/40 bg-[#E8ECF0]/10 text-[#E8ECF0] font-bold tracking-wide ${
        small ? "px-1 py-px text-[0.45rem]" : "px-1.5 py-0.5 text-[0.55rem]"
      }`}
      title="Official WCO Judge"
      data-judge-badge="true"
    >
      <Scale className={small ? "w-3 h-3" : "w-3.5 h-3.5"} aria-hidden />
      JUDGE
    </span>
  );
}
