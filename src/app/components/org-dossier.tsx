/**
 * Organization profile dialog. Same portal pattern as the athlete dossier.
 * Email and organizer personal accounts are not on the public record.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ExternalLink, Instagram, X, Youtube } from "lucide-react";
import type { PublicOrgEvent, PublicOrganization } from "../lib/types";
import { orgDisciplineLabel, orgFormatLabel } from "../lib/org-sign";
import { InlineFlag } from "./country-flag";
import { OrgMark } from "./org-mark";

function hrefFor(kind: "instagram" | "youtube" | "website", raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("https://")) return raw;
  const handle = raw.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "youtube") return `https://youtube.com/${handle}`;
  return raw;
}

function EventRow({ event }: { event: PublicOrgEvent }) {
  const format = event.gamified ? orgFormatLabel(event.format) : "Calendar";
  const when = event.eventDate ? event.eventDate.replace("T", " ").slice(0, 16) : "Date TBA";
  const inner = (
    <div className="rounded-xl border border-[#4274B9]/20 bg-[#0B1120]/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-[#E8ECF0] font-semibold">{event.name}</p>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[0.55rem] font-bold text-[#6AA3E0]"
          style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(66,116,185,0.18)", border: "1px solid rgba(106,163,224,0.4)" }}
        >
          {format || "Event"}
        </span>
      </div>
      <p className="text-xs text-[#8494A7] mt-1">
        {when}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      {event.gamified && event.battleEventId && (
        <p className="text-[0.65rem] text-[#6AA3E0] mt-1">Open on the Battles page when voting is live.</p>
      )}
      {!event.gamified && (event.livestream || event.registrationUrl || event.website) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {event.livestream && (
            <a href={event.livestream} target="_blank" rel="noreferrer" className="text-[0.65rem] text-[#6AA3E0] inline-flex items-center gap-1">
              Livestream <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {event.registrationUrl && (
            <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="text-[0.65rem] text-[#6AA3E0] inline-flex items-center gap-1">
              Register <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {event.website && (
            <a href={event.website} target="_blank" rel="noreferrer" className="text-[0.65rem] text-[#6AA3E0] inline-flex items-center gap-1">
              Website <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
  if (event.gamified && event.battleEventId) {
    return <Link to="/battles" className="block hover:opacity-90">{inner}</Link>;
  }
  return inner;
}

export function OrgDossier({
  org,
  onClose,
}: {
  org: PublicOrganization;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const ig = hrefFor("instagram", org.instagram);
  const yt = hrefFor("youtube", org.youtube);
  const web = hrefFor("website", org.website);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={org.name}>
      <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-label="Close organization" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl border border-[#4274B9]/40 bg-[#111827] shadow-[0_0_40px_rgba(66,116,185,0.25)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-black/40 text-[#E8ECF0] hover:bg-black/60"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="h-48 sm:h-56 bg-[#0B1120] relative overflow-hidden rounded-t-2xl">
          <OrgMark id={org.id} hasLogo={org.hasLogo} name={org.name} featured={org.featured} className="w-full h-full object-contain p-8" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-[#E8ECF0]">
            <InlineFlag country={org.country} />
            <span>{org.country}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg text-[#E8ECF0] font-bold truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
              {org.name}
            </h2>
            {org.discipline && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[0.55rem] font-bold text-[#6AA3E0]"
                style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(66,116,185,0.18)", border: "1px solid rgba(106,163,224,0.4)" }}
              >
                {orgDisciplineLabel(org.discipline)}
              </span>
            )}
          </div>
          {org.bio && <p className="text-sm text-[#C5D0DC] leading-relaxed">{org.bio}</p>}
          <div className="flex flex-wrap gap-2">
            {ig && (
              <a href={ig} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#4274B9]/30 text-xs text-[#6AA3E0]">
                <Instagram className="w-4 h-4" /> Instagram
              </a>
            )}
            {yt && (
              <a href={yt} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#4274B9]/30 text-xs text-[#6AA3E0]">
                <Youtube className="w-4 h-4" /> YouTube
              </a>
            )}
            {web && (
              <a href={web} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#4274B9]/30 text-xs text-[#6AA3E0]">
                <ExternalLink className="w-4 h-4" /> Website
              </a>
            )}
          </div>
          <div>
            <p className="text-[0.65rem] tracking-wide text-[#8494A7] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
              EVENTS
            </p>
            {org.events.length === 0 ? (
              <p className="text-sm text-[#8494A7]">No public events yet.</p>
            ) : (
              <div className="space-y-2">
                {org.events.map((event) => <EventRow key={event.id} event={event} />)}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
