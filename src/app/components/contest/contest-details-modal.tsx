/**
 * Contest details info modal — rules, prizes, privacy.
 */

import { X, Gift, Shield, Trophy, Share2 } from "lucide-react";
import {
  CONTEST_BANNER_HEADLINE,
  CONTEST_DETAILS_SECTIONS,
  CONTEST_TITLE,
} from "./contest-copy";

interface Props {
  open: boolean;
  onClose: () => void;
  entryCount?: number;
  entryCap?: number;
  status?: string;
}

export function ContestDetailsModal({
  open,
  onClose,
  entryCount = 0,
  entryCap = 5000,
  status,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contest-details-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0D1526] border border-[#4274B9]/30 rounded-2xl shadow-2xl shadow-[#4274B9]/10 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-[#4274B9]/15 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-[#D4A843]" />
            </div>
            <div className="min-w-0">
              <h2
                id="contest-details-title"
                className="text-sm sm:text-base font-bold text-white truncate"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                {CONTEST_TITLE}
              </h2>
              <p className="text-[0.65rem] text-[#8494A7]">
                {entryCount.toLocaleString()} / {entryCap.toLocaleString()} spots
                {status ? ` · ${status}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8494A7] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close contest details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 overflow-y-auto space-y-3.5 flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 p-2.5">
              <div className="flex items-center gap-1.5 text-[#6AA3E0] text-[0.6rem] tracking-wider mb-1">
                <Trophy className="w-3 h-3" />
                MAIN
              </div>
              <p className="text-xs text-[#E8ECF0] font-semibold">$150 · $75 · $25</p>
            </div>
            <div className="rounded-xl border border-[#D4A843]/25 bg-[#D4A843]/5 p-2.5">
              <div className="flex items-center gap-1.5 text-[#D4A843] text-[0.6rem] tracking-wider mb-1">
                <Share2 className="w-3 h-3" />
                SOCIAL
              </div>
              <p className="text-xs text-[#E8ECF0] font-semibold">+$100 on X share</p>
            </div>
          </div>

          {CONTEST_DETAILS_SECTIONS.map((s) => (
            <div key={s.title}>
              <h3
                className="text-[0.7rem] font-bold text-[#E8ECF0] tracking-wider mb-1"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                {s.title}
              </h3>
              <p className="text-[0.78rem] text-[#B0BCC9] leading-relaxed">{s.body}</p>
            </div>
          ))}

          <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[0.7rem] text-amber-200/90 leading-relaxed">
              Full legal terms appear in the Beta Platform Notice. Winner wallets are{" "}
              <strong className="text-amber-100">not published publicly</strong> — only used
              by admins for prize fulfillment.
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-[#4274B9]/15 bg-[#0A0F1A] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-sm tracking-wider bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] text-white hover:shadow-lg hover:shadow-[#4274B9]/25 active:scale-[0.98] transition-all"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            GOT IT
          </button>
          <p className="text-center text-[0.6rem] text-[#8494A7]/70 mt-2">
            {CONTEST_BANNER_HEADLINE} · World Calisthenics Organization
          </p>
        </div>
      </div>
    </div>
  );
}
