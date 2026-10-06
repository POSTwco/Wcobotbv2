/**
 * Judge profile dialog. Same popup footprint as an athlete dossier.
 * Only the public card is shown.
 */

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Instagram, Link2, X, Youtube } from "lucide-react";
import type { PublicJudge } from "../lib/types";
import { orgDisciplineLabel } from "../lib/org-sign";
import { InlineFlag } from "./country-flag";
import { JudgeBadge } from "./judge-badge";
import { JudgeMark } from "./judge-mark";

function socialHref(kind: "instagram" | "youtube" | "website", raw: string): string {
  if (kind === "website" || raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  return `https://youtube.com/${handle}`;
}

export function JudgeDossier({
  judge,
  roster,
  onClose,
  onSelect,
}: {
  judge: PublicJudge;
  roster: PublicJudge[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onSelectRef = useRef(onSelect);
  const judgeIdRef = useRef(judge.id);
  const rosterRef = useRef(roster);
  onCloseRef.current = onClose;
  onSelectRef.current = onSelect;
  judgeIdRef.current = judge.id;
  rosterRef.current = roster;

  const index = Math.max(0, roster.findIndex((row) => row.id === judge.id));
  const canStep = roster.length > 1;
  const discipline = orgDisciplineLabel(judge.discipline);
  const socials = [
    judge.instagram
      ? { key: "instagram", label: "Instagram", icon: Instagram, href: socialHref("instagram", judge.instagram) }
      : null,
    judge.youtube
      ? { key: "youtube", label: "YouTube", icon: Youtube, href: socialHref("youtube", judge.youtube) }
      : null,
    judge.website
      ? { key: "website", label: "Website", icon: Link2, href: socialHref("website", judge.website) }
      : null,
  ].filter((row): row is NonNullable<typeof row> => !!row);

  const step = useCallback((dir: -1 | 1) => {
    const list = rosterRef.current;
    if (list.length < 2) return;
    const i = list.findIndex((row) => row.id === judgeIdRef.current);
    const next = list[(i + dir + list.length) % list.length];
    if (next && next.id !== judgeIdRef.current) onSelectRef.current(next.id);
  }, []);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    root?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (nodes.length === 0) return;
      const i = nodes.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        nodes[nodes.length - 1].focus();
      } else if (!e.shiftKey && (i === -1 || i === nodes.length - 1)) {
        e.preventDefault();
        nodes[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prevFocus?.focus?.();
    };
  }, [step]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      onClick={() => onCloseRef.current()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${judge.name} judge profile`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-[#111827] border border-[#E8ECF0]/25 outline-none overflow-hidden shadow-[0_0_40px_rgba(232,236,240,0.12)]"
      >
        <div className="absolute top-3 right-3 z-20">
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-white"
            aria-label="Close judge profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="relative h-56 bg-[#0B1120]">
            <JudgeMark
              id={judge.id}
              hasPhoto={judge.hasPhoto}
              name={judge.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl text-[#E8ECF0] font-bold truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {judge.name}
                </h2>
                {judge.country ? (
                  <p className="mt-1 text-sm text-[#C5D0DC] flex items-center gap-1.5">
                    <InlineFlag country={judge.country} /> {judge.country}
                  </p>
                ) : null}
              </div>
              <JudgeBadge />
            </div>
            {discipline ? <p className="text-xs text-[#6AA3E0]">{discipline}</p> : null}
            {judge.bio ? <p className="text-sm text-[#C5D0DC] leading-relaxed whitespace-pre-wrap">{judge.bio}</p> : null}
            {socials.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {socials.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#4274B9]/30 text-xs text-[#6AA3E0] hover:border-[#6AA3E0]/60"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {canStep ? (
          <div className="flex items-center justify-between gap-2 border-t border-[#4274B9]/20 px-3 py-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[#6AA3E0]"
              aria-label="Previous judge"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-[0.65rem] text-[#8494A7]">{index + 1} / {roster.length}</span>
            <button
              type="button"
              onClick={() => step(1)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[#6AA3E0]"
              aria-label="Next judge"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
