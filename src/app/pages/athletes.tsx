/**
 * BOTB Athletes Page — Live from KV Store
 * =========================================
 * Fetches athletes from the production API (KV store).
 * Falls back to empty state if no athletes are seeded yet.
 * Athletes added via the Admin Panel auto-appear here.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import {
  Trophy, Flame, Target, TrendingUp, Loader2,
  Instagram, Twitter, Youtube, Link2, Zap, User, ChevronDown,
  Search, MessageCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useVIP } from "../components/vip/vip-context";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { api } from "../lib/api";
import type { Athlete } from "../lib/types";
import { competitionCategoryLabel } from "../lib/types";
import { SponsorMarqueeStrip } from "../components/sponsor-showcase";
import { ArenaChat } from "../components/arena-chat";
import { ErrorCard } from "../components/error-boundary";
import { BOTBSpinner, SkeletonAthleteCard } from "../components/botb-spinner";
import { InlineFlag } from "../components/country-flag";
import { TiltCard } from "../components/ui-enhancements";
import { formatPower } from "../lib/format";

// ---------------------------------------------------------------------------
// Skill bar colors (matches admin form)
// ---------------------------------------------------------------------------
const SKILL_COLORS: Record<string, string> = {
  energy: "#f59e0b",
  performance: "#8B5CF6",
  static: "#22C55E",
  aggression: "#EF4444",
  dynamic: "#6AA3E0",
};

const SKILL_LABELS: Record<string, string> = {
  energy: "Pwr Dyn",
  performance: "Flow",
  static: "Statics",
  aggression: "Off/Def",
  dynamic: "Dynamics",
};

export function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [showAllAthletes, setShowAllAthletes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const { vipActive } = useVIP();
  const location = useLocation();

  const scrollToChat = useCallback(() => {
    const el = document.getElementById("arena-chat");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const jumpToAthlete = useCallback((id: string) => {
    setHighlightedId(id);
    setSelectedAthlete(id);
    window.setTimeout(() => {
      const el = document.getElementById(`athlete-card-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedId(null), 3500);
  }, []);

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAthletes();
      if (res.success && res.data) {
        setAthletes(res.data);
      } else {
        setError(res.error || "Failed to load athletes.");
      }
    } catch (err: any) {
      console.error("[Athletes Page] Failed to load athletes:", err);
      setError("Unable to reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAthletes(); }, [loadAthletes]);

  // Chat tab / deep-link: scroll to Arena Chat once page content is ready
  useEffect(() => {
    if (location.hash !== "#arena-chat") return;
    const scrollToChat = () => {
      const el = document.getElementById("arena-chat");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    // Wait a beat for roster/chat to mount (esp. after loading spinner)
    const t1 = window.setTimeout(scrollToChat, 80);
    const t2 = window.setTimeout(scrollToChat, 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [location.hash, loading]);

  return (
    <div className="min-h-screen py-6 sm:py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        <div className="mb-6 sm:mb-10">
          <div className="flex flex-col gap-3 sm:gap-4 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <img src={botbShield} alt="BOTB" className="h-7 sm:h-8 w-auto" />
                  <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">ATHLETES</span>
                  </h1>
                </div>
                <p className="text-[#8494A7]">World-class calisthenics competitors. Choose your champion.</p>
              </div>
              <Link
                to="/apply"
                className="shrink-0 self-start sm:self-center inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all text-xs sm:text-sm font-semibold tracking-wide"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                Pro Card Application
              </Link>
            </div>

            {/* Search + jump to Arena Chat */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8494A7] pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const q = searchQuery.trim().toLowerCase();
                    if (!q) return;
                    const sorted = [...athletes].sort(
                      (a, b) => (b.totalPowerRating || 0) - (a.totalPowerRating || 0),
                    );
                    const match = sorted.find(
                      (a) =>
                        a.name.toLowerCase().includes(q) ||
                        (a.nickname && a.nickname.toLowerCase().includes(q)),
                    );
                    if (!match) return;
                    const idx = sorted.findIndex((a) => a.id === match.id);
                    if (idx >= 3) setShowAllAthletes(true);
                    jumpToAthlete(match.id);
                  }}
                  placeholder="Search athletes by name…"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#111827] border border-[#4274B9]/25 text-[#E8ECF0] text-sm placeholder:text-[#8494A7]/50 outline-none focus:border-[#6AA3E0]/50"
                  aria-label="Search athletes by name"
                />
              </div>
              <button
                type="button"
                onClick={scrollToChat}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#111827] border border-[#4274B9]/30 text-[#6AA3E0] hover:border-[#6AA3E0]/50 hover:bg-[#4274B9]/10 transition-all text-xs font-semibold tracking-wide"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                <MessageCircle className="w-4 h-4" />
                CHAT
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <BOTBSpinner
            messages={[
              "Loading athletes...",
              "Fetching roster...",
              "Syncing rankings...",
              "Preparing profiles...",
            ]}
          >
            <div className="w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {[0, 1, 2].map((i) => (
                <SkeletonAthleteCard key={i} delay={i * 0.15} />
              ))}
            </div>
          </BOTBSpinner>
        ) : error ? (
          <div className="py-8">
            <ErrorCard
              title="Failed to Load Athletes"
              message={error}
              onRetry={loadAthletes}
            />
          </div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-20 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
            <User className="w-12 h-12 text-[#4274B9]/20 mx-auto mb-3" />
            <h3 className="text-[#E8ECF0] text-lg font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
              NO ATHLETES YET
            </h3>
            <p className="text-[#8494A7] text-sm max-w-md mx-auto">
              Athletes will appear here once the WCO admin seeds the initial roster or adds athletes via the Admin Command Center.
            </p>
          </div>
        ) : (() => {
          // Sort by power score descending — highest power = best athlete = top of page
          const sorted = [...athletes].sort((a, b) => (b.totalPowerRating || 0) - (a.totalPowerRating || 0));
          const top3 = sorted.slice(0, 3);
          const rest = sorted.slice(3);
          const q = searchQuery.trim().toLowerCase();
          const matchesQuery = (a: Athlete) =>
            !q ||
            a.name.toLowerCase().includes(q) ||
            (!!a.nickname && a.nickname.toLowerCase().includes(q));
          const filteredRest = rest.filter(matchesQuery);
          const searchHits = q ? sorted.filter(matchesQuery) : [];

          const renderAthleteCard = (athlete: Athlete, i: number, compact = false) => {
              const borderColor = athlete.nftCardBorderColor || "#4274B9";
              const hasPfp = athlete.pfpUrl && athlete.pfpUrl !== "placeholder";
              const isExpanded = selectedAthlete === athlete.id;
              const isHighlighted = highlightedId === athlete.id;
              const winRate = athlete.wins + athlete.losses > 0
                ? ((athlete.wins / (athlete.wins + athlete.losses)) * 100).toFixed(1)
                : "0.0";

              return (
                <TiltCard
                  key={athlete.id}
                  maxTilt={compact ? 3 : 5}
                  scale={compact ? 1.01 : 1.02}
                  glowColor={borderColor}
                  className="relative"
                >
                  <motion.div
                    id={`athlete-card-${athlete.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => setSelectedAthlete(isExpanded ? null : athlete.id)}
                    className={`bg-[#111827] border overflow-hidden cursor-pointer hover:border-opacity-60 transition-all group scroll-mt-24 ${
                      compact ? "rounded-xl" : "rounded-2xl"
                    } ${isHighlighted ? "ring-2 ring-[#D4A843] ring-offset-2 ring-offset-[#0B1120]" : ""}`}
                    style={{ borderColor: isHighlighted ? "#D4A843" : `${borderColor}20` }}
                  >
                    {/* Image — full size for top 3, ~50% for roster grid */}
                    <div
                      className={`relative overflow-hidden bg-[#0B1120] ${
                        compact ? "h-36 sm:h-40" : "h-72 sm:h-96"
                      }`}
                    >
                      {hasPfp ? (
                        <ImageWithFallback
                          src={athlete.pfpUrl}
                          alt={athlete.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className={compact ? "w-8 h-8 text-[#4274B9]/15" : "w-16 h-16 text-[#4274B9]/15"} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

                      <div
                        className={`absolute ${compact ? "top-1.5 left-1.5 px-1.5 py-0.5" : "top-3 left-3 px-3 py-1"} rounded-lg`}
                        style={{ background: `${borderColor}20`, border: `1px solid ${borderColor}40` }}
                      >
                        <span
                          className={`font-bold ${compact ? "text-[0.5rem]" : "text-xs"}`}
                          style={{ fontFamily: "Orbitron, sans-serif", color: borderColor }}
                        >
                          #{athlete.rank}
                        </span>
                      </div>

                      {athlete.streak > 0 && (
                        <div className={`absolute ${compact ? "top-1.5 right-1.5 gap-0.5 px-1 py-0.5" : "top-3 right-3 gap-1 px-2 py-1"} flex items-center rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/40`}>
                          <Flame className={compact ? "w-2.5 h-2.5 text-[#f59e0b]" : "w-3 h-3 text-[#f59e0b]"} />
                          <span className={`text-[#f59e0b] ${compact ? "text-[0.45rem]" : "text-xs"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.streak}</span>
                        </div>
                      )}

                      {athlete.status !== "active" && (
                        <div className={`absolute ${compact ? "top-1.5 right-1.5" : "top-3 right-3"}`}>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${compact ? "text-[0.4rem]" : "text-[0.5rem]"} ${
                            athlete.status === "champion" ? "bg-[#D4A843]/20 text-[#D4A843]" :
                            "bg-red-500/20 text-red-400"
                          }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {athlete.status.toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className={`absolute ${compact ? "bottom-1.5 right-1.5 text-[0.45rem]" : "bottom-3 right-3 text-xs"} text-[#8494A7] flex items-center gap-1`}>
                        <InlineFlag country={athlete.country} /> {!compact && athlete.country}
                      </div>
                    </div>

                    <div className={compact ? "p-2" : "p-3 sm:p-5"}>
                      <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                        <h3
                          className="text-[#E8ECF0] font-bold truncate"
                          style={{ fontFamily: "Orbitron, sans-serif", fontSize: compact ? "0.6rem" : "0.8rem" }}
                        >
                          {athlete.name}
                        </h3>
                        {!compact && athlete.competitionCategory && (
                          <span
                            className="shrink-0 px-1.5 py-0.5 rounded text-[0.45rem] font-bold tracking-wide"
                            style={{
                              fontFamily: "Orbitron, sans-serif",
                              background: "rgba(66,116,185,0.18)",
                              border: "1px solid rgba(106,163,224,0.4)",
                              color: "#6AA3E0",
                            }}
                          >
                            {competitionCategoryLabel(athlete.competitionCategory)}
                          </span>
                        )}
                      </div>
                      {!compact && athlete.nickname && (
                        <p className="text-[0.65rem] mb-1" style={{ color: borderColor }}>
                          "{athlete.nickname}"
                        </p>
                      )}
                      {!compact && athlete.weightClass && (
                        <p className="text-[0.5rem] text-[#8494A7]/70 mb-2 truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {athlete.weightClass}
                        </p>
                      )}

                      <div className={`grid grid-cols-3 ${compact ? "gap-1 mb-1" : "gap-3 mb-2"}`}>
                        <div className="text-center">
                          <p className={`text-[#10b981] ${compact ? "text-sm" : "text-lg"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.wins}</p>
                          <p className={`text-[#8494A7] ${compact ? "text-[0.4rem]" : "text-xs"}`}>W</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-red-400 ${compact ? "text-sm" : "text-lg"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.losses}</p>
                          <p className={`text-[#8494A7] ${compact ? "text-[0.4rem]" : "text-xs"}`}>L</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-[#4274B9] ${compact ? "text-sm" : "text-lg"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {formatPower(athlete.totalPowerRating)}
                          </p>
                          <p className={`text-[#8494A7] ${compact ? "text-[0.4rem]" : "text-xs"}`}>PWR</p>
                        </div>
                      </div>
                      {!compact && (
                        <p className="text-center text-[0.55rem] text-[#D4A843]/80 mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          Tournament {(athlete.tournamentWins || 0)}W-{(athlete.tournamentLosses || 0)}L
                        </p>
                      )}

                      {/* Skill bars — full cards only (or when compact expanded) */}
                      {athlete.skills && (!compact || isExpanded) && (
                        <div className={`space-y-1 ${compact ? "mb-1" : "mb-2"}`}>
                          {(["energy", "performance", "static", "aggression", "dynamic"] as const).map((skill) => {
                            const val = athlete.skills[skill] || 0;
                            return (
                              <div key={skill} className="flex items-center gap-1.5">
                                <span className="text-[0.45rem] text-[#8494A7] w-12 truncate">{SKILL_LABELS[skill]}</span>
                                <div className="flex-1 h-1 rounded-full bg-[#162033] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${(val / 10) * 100}%`, background: SKILL_COLORS[skill] }}
                                  />
                                </div>
                                <span className="text-[0.45rem] font-mono w-5 text-right" style={{ color: SKILL_COLORS[skill] }}>
                                  {val.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className={`space-y-2 pt-2 border-t border-[#4274B9]/10 ${compact ? "space-y-1.5" : "space-y-3 pt-3"}`}
                        >
                          {athlete.bio && (
                            <p className={`text-[#8494A7] leading-relaxed ${compact ? "text-[0.55rem]" : "text-xs"}`}>{athlete.bio}</p>
                          )}
                          {athlete.specialMove && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[#8494A7] flex items-center gap-2">
                                <Target className="w-3 h-3" /> Special Move
                              </span>
                              <span className="text-[#f59e0b] text-xs">{athlete.specialMove}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#8494A7] flex items-center gap-2">
                              <Trophy className="w-3 h-3" /> Win Rate
                            </span>
                            <span className="text-[#10b981]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                              {winRate}%
                            </span>
                          </div>
                          {athlete.totalVotes > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[#8494A7] flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Total Votes
                              </span>
                              <span className="text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                                {athlete.totalVotes.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {(athlete.socials?.instagram || athlete.socials?.twitter || athlete.socials?.youtube || athlete.socials?.website) && (
                            <div className="flex items-center gap-3 pt-2 border-t border-[#4274B9]/10">
                              {athlete.socials.instagram && (
                                <a
                                  href={athlete.socials.instagram.startsWith("http") ? athlete.socials.instagram : `https://instagram.com/${athlete.socials.instagram.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-pink-400/60 hover:text-pink-400 transition-colors"
                                >
                                  <Instagram className="w-4 h-4" />
                                </a>
                              )}
                              {athlete.socials.twitter && (
                                <a
                                  href={athlete.socials.twitter.startsWith("http") ? athlete.socials.twitter : `https://x.com/${athlete.socials.twitter.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sky-400/60 hover:text-sky-400 transition-colors"
                                >
                                  <Twitter className="w-4 h-4" />
                                </a>
                              )}
                              {athlete.socials.youtube && (
                                <a
                                  href={athlete.socials.youtube.startsWith("http") ? athlete.socials.youtube : `https://youtube.com/${athlete.socials.youtube}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-red-400/60 hover:text-red-400 transition-colors"
                                >
                                  <Youtube className="w-4 h-4" />
                                </a>
                              )}
                              {athlete.socials.website && (
                                <a
                                  href={athlete.socials.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#6AA3E0]/60 hover:text-[#6AA3E0] transition-colors"
                                >
                                  <Link2 className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          )}

                          {athlete.nftSeriesName && (
                            <div className="flex items-center justify-between text-sm pt-1">
                              <span className="text-[#8494A7] flex items-center gap-2">
                                <Zap className="w-3 h-3" /> NFT Series
                              </span>
                              <span className="text-[#D4A843] text-xs" style={{ fontFamily: "Orbitron, sans-serif" }}>
                                {athlete.nftSeriesName}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </TiltCard>
              );
          };

          return (
            <>
              {/* Top 3 Athletes — full size, always visible */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {top3.map((athlete, i) => renderAthleteCard(athlete, i, false))}
              </div>

              {/* Search results banner */}
              {q && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[#8494A7] text-xs">
                    {searchHits.length === 0
                      ? `No athletes match “${searchQuery.trim()}”`
                      : `${searchHits.length} match${searchHits.length === 1 ? "" : "es"} for “${searchQuery.trim()}”`}
                  </p>
                  {searchHits[0] && (
                    <button
                      type="button"
                      onClick={() => {
                        const hit = searchHits[0];
                        const idx = sorted.findIndex((a) => a.id === hit.id);
                        if (idx >= 3) setShowAllAthletes(true);
                        jumpToAthlete(hit.id);
                      }}
                      className="text-[0.55rem] text-[#6AA3E0] hover:underline"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      JUMP TO FIRST MATCH
                    </button>
                  )}
                </div>
              )}

              {/* Remaining Athletes — compact 6-up grid */}
              {rest.length > 0 && (
                <div className="mt-6 sm:mt-8">
                  <button
                    onClick={() => setShowAllAthletes(!showAllAthletes)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#111827] border border-[#4274B9]/20 hover:border-[#4274B9]/40 transition-all group"
                  >
                    <span
                      className="text-[#8494A7] group-hover:text-[#E8ECF0] text-xs tracking-wider transition-colors"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      {showAllAthletes || q ? "HIDE" : "VIEW ALL"} ATHLETES ({q ? filteredRest.length : rest.length} MORE)
                    </span>
                    <motion.div
                      animate={{ rotate: showAllAthletes || !!q ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4 text-[#4274B9]" />
                    </motion.div>
                  </button>

                  {(showAllAthletes || !!q) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-4 sm:mt-6 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
                    >
                      {(q ? filteredRest : rest).map((athlete, i) => renderAthleteCard(athlete, i + 3, true))}
                    </motion.div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Sponsor marquee — same rolling strip as the home page */}
      <SponsorMarqueeStrip />
      {/* Arena Chat — only visible when wallet is connected */}
      <ArenaChat />
    </div>
  );
}