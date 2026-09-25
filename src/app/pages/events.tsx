/**
 * Public Events directory — organizations, with WCO pinned first.
 * Layout follows the Athletes page: one featured card, then a 6-up more grid.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronDown, Search } from "lucide-react";
import { api } from "../lib/api";
import type { PublicOrganization } from "../lib/types";
import { orgDisciplineLabel } from "../lib/org-sign";
import { OrgMark } from "../components/org-mark";
import { OrgDossier } from "../components/org-dossier";
import { InlineFlag } from "../components/country-flag";
import { TiltCard } from "../components/ui-enhancements";
import { BOTBSpinner } from "../components/botb-spinner";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

const WCO_FALLBACK: PublicOrganization = {
  id: "org-wco",
  name: "World Calisthenics Organization",
  country: "United States",
  discipline: "freestyle_statics",
  bio: "The home organization of Battle of the Bars. WCO sanctions 1v1 duals, tournaments, and best-in-field events across calisthenics.",
  website: "https://wcorg.io",
  instagram: "",
  youtube: "",
  featured: true,
  hasLogo: false,
  status: "approved",
  events: [],
};

export function EventsPage() {
  const [orgs, setOrgs] = useState<PublicOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    api.getOrganizations().then((res) => {
      if (cancel) return;
      if (res.success && res.data && res.data.length > 0) {
        setOrgs(res.data);
        setOffline(false);
      } else {
        setOrgs([WCO_FALLBACK]);
        setOffline(true);
      }
    }).catch(() => {
      if (!cancel) {
        setOrgs([WCO_FALLBACK]);
        setOffline(true);
      }
    }).finally(() => {
      if (!cancel) setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const featured = orgs.find((o) => o.featured || o.id === "org-wco") || orgs[0];
  const rest = orgs.filter((o) => o.id !== featured?.id);
  const q = query.trim().toLowerCase();
  const filteredRest = q ? rest.filter((o) => o.name.toLowerCase().includes(q)) : rest;
  const openOrg = orgs.find((o) => o.id === openId) || null;

  const visibleRest = useMemo(() => (q ? filteredRest : rest), [q, filteredRest, rest]);

  function focusOrg(org: PublicOrganization) {
    if (org.id !== featured?.id) setShowAll(true);
    setHighlight(org.id);
    setOpenId(org.id);
    window.setTimeout(() => {
      document.getElementById(`org-card-${org.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    window.setTimeout(() => setHighlight(null), 3500);
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        <div className="mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src={botbShield} alt="BOTB" className="h-7 sm:h-8 w-auto" />
                <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">EVENTS</span>
                </h1>
              </div>
              <p className="text-[#8494A7]">Organizations and the competitions they run under WCO.</p>
            </div>
            <Link
              to="/events/account"
              className="shrink-0 self-start inline-flex flex-col items-center justify-center px-4 sm:px-5 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all text-xs sm:text-sm font-semibold tracking-wide"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              Organization Sign In
              <span className="block mt-0.5 text-[0.6rem] font-normal tracking-normal text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Host a competition under WCO
              </span>
            </Link>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {["Browse organizations", "Open a card", "Follow a live event into Battles"].map((step, i) => (
              <li key={step} className="rounded-xl border border-[#4274B9]/20 bg-[#111827]/80 px-3 py-2 text-xs text-[#C5D0DC]">
                <span className="text-[#6AA3E0] font-bold mr-2" style={{ fontFamily: "Orbitron, sans-serif" }}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8494A7]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const match = orgs.find((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
                if (match) focusOrg(match);
              }}
              placeholder="Search organizations by name…"
              aria-label="Search organizations by name"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#111827] border border-[#4274B9]/25 text-[#E8ECF0] text-sm placeholder:text-[#8494A7]/50 outline-none focus:border-[#6AA3E0]/50"
            />
          </div>
          {offline && (
            <p className="text-xs text-[#8494A7] mt-2">The live directory is updating. WCO is shown here until it connects.</p>
          )}
        </div>

        {loading ? (
          <BOTBSpinner />
        ) : (
          <>
            {featured && (q === "" || featured.name.toLowerCase().includes(q)) && (
              <FeaturedOrg
                org={featured}
                highlighted={highlight === featured.id}
                onOpen={() => setOpenId(featured.id)}
              />
            )}

            {rest.length > 0 && (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full flex items-center justify-between rounded-2xl border border-[#4274B9]/25 bg-[#111827] px-4 py-3"
                >
                  <span className="text-xs text-[#E8ECF0] tracking-wide" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {showAll || q ? "HIDE ORGANIZATIONS" : `VIEW ALL ORGANIZATIONS (${rest.length})`}
                  </span>
                  <motion.span animate={{ rotate: showAll || q ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4 text-[#4274B9]" />
                  </motion.span>
                </button>
                {(showAll || q) && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                    {visibleRest.map((org) => (
                      <CompactOrg
                        key={org.id}
                        org={org}
                        highlighted={highlight === org.id}
                        onOpen={() => setOpenId(org.id)}
                      />
                    ))}
                    {q && visibleRest.length === 0 && (
                      <p className="col-span-full text-sm text-[#8494A7]">No organization matches that name.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {openOrg && <OrgDossier org={openOrg} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function FeaturedOrg({
  org,
  highlighted,
  onOpen,
}: {
  org: PublicOrganization;
  highlighted: boolean;
  onOpen: () => void;
}) {
  return (
    <TiltCard maxTilt={4} glowColor="#4274B9">
      <button
        type="button"
        id={`org-card-${org.id}`}
        onClick={onOpen}
        className={`w-full text-left rounded-2xl border bg-[#111827] overflow-hidden scroll-mt-24 ${
          highlighted ? "ring-2 ring-[#D4A843] ring-offset-2 ring-offset-[#0B1120]" : ""
        }`}
        style={{ borderColor: "rgba(66,116,185,0.35)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
          <div className="h-56 md:h-full min-h-[220px] bg-[#0B1120]">
            <OrgMark id={org.id} hasLogo={org.hasLogo} name={org.name} featured className="w-full h-full object-contain p-8" />
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 min-w-0 mb-1">
              <h2 className="text-xl text-[#E8ECF0] font-bold truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {org.name}
              </h2>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.55rem] font-bold text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(66,116,185,0.18)", border: "1px solid rgba(106,163,224,0.4)" }}>
                {orgDisciplineLabel(org.discipline)}
              </span>
            </div>
            <p className="text-sm text-[#8494A7] flex items-center gap-2 mb-3">
              <InlineFlag country={org.country} /> {org.country}
            </p>
            <p className="text-sm text-[#C5D0DC] leading-relaxed mb-4">{org.bio}</p>
            <p className="text-[0.65rem] text-[#8494A7] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
              {org.events.length} PUBLIC EVENT{org.events.length === 1 ? "" : "S"}
            </p>
            <ul className="space-y-1">
              {org.events.slice(0, 4).map((event) => (
                <li key={event.id} className="text-sm text-[#E8ECF0]">
                  {event.name}
                  <span className="text-[#8494A7]"> · {event.gamified ? orgFormatLabelSafe(event.format) : "Calendar"}</span>
                </li>
              ))}
              {org.events.length === 0 && <li className="text-sm text-[#8494A7]">Events appear here after WCO publishes them.</li>}
            </ul>
          </div>
        </div>
      </button>
    </TiltCard>
  );
}

function orgFormatLabelSafe(format: string): string {
  if (format === "pvp") return "1v1 Duals";
  if (format === "tournament") return "Tournament";
  if (format === "field") return "Best in Field";
  return "Event";
}

function CompactOrg({
  org,
  highlighted,
  onOpen,
}: {
  org: PublicOrganization;
  highlighted: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      id={`org-card-${org.id}`}
      onClick={onOpen}
      className={`text-left rounded-xl border bg-[#111827] overflow-hidden scroll-mt-24 ${
        highlighted ? "ring-2 ring-[#D4A843]" : "border-[#4274B9]/20"
      }`}
    >
      <div className="h-24 bg-[#0B1120]">
        <OrgMark id={org.id} hasLogo={org.hasLogo} name={org.name} className="w-full h-full object-contain p-3" />
      </div>
      <div className="p-2">
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[0.65rem] text-[#E8ECF0] font-bold truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {org.name}
          </p>
          <span className="shrink-0 rounded px-1 py-0.5 text-[0.4rem] font-bold text-[#6AA3E0]" style={{ background: "rgba(66,116,185,0.18)" }}>
            {orgDisciplineLabel(org.discipline)}
          </span>
        </div>
        <p className="text-[0.6rem] text-[#8494A7] mt-1 flex items-center gap-1">
          <InlineFlag country={org.country} /> {org.events.length} events
        </p>
      </div>
    </button>
  );
}
