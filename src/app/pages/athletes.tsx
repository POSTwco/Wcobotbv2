/**
 * BOTB Athletes Page — Live from KV Store
 * =========================================
 * Fetches athletes from the production API (KV store).
 * Falls back to empty state if no athletes are seeded yet.
 * Athletes added via the Admin Panel auto-appear here.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Trophy, Flame, Target, TrendingUp, Loader2,
  Instagram, Twitter, Youtube, Link2, Zap, User, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useVIP } from "../components/vip/vip-context";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { api } from "../lib/api";
import type { Athlete } from "../lib/types";
import { SponsorMarqueeStrip } from "../components/sponsor-showcase";
import { ArenaChat } from "../components/arena-chat";
import { ErrorCard } from "../components/error-boundary";
import { BOTBSpinner, SkeletonAthleteCard } from "../components/botb-spinner";
import { getCountryFlag } from "../lib/country-flags";
import { InlineFlag } from "../components/country-flag";
import { TiltCard, BlurImage, FadeInWhenVisible } from "../components/ui-enhancements";

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
  const { vipActive } = useVIP();
  const location = useLocation();

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
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-2">
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

          const renderAthleteCard = (athlete: Athlete, i: number) => {
              const borderColor = athlete.nftCardBorderColor || "#4274B9";
              const hasPfp = athlete.pfpUrl && athlete.pfpUrl !== "placeholder";
              const isExpanded = selectedAthlete === athlete.id;
              const winRate = athlete.wins + athlete.losses > 0
                ? ((athlete.wins / (athlete.wins + athlete.losses)) * 100).toFixed(1)
                : "0.0";

              return (
                <TiltCard
                  key={athlete.id}
                  maxTilt={5}
                  scale={1.02}
                  glowColor={borderColor}
                  className="relative"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedAthlete(isExpanded ? null : athlete.id)}
                    className="bg-[#111827] border rounded-2xl overflow-hidden cursor-pointer hover:border-opacity-60 transition-all group"
                    style={{ borderColor: `${borderColor}20` }}
                  >
                    {/* Image */}
                    <div className="relative h-72 sm:h-96 overflow-hidden bg-[#0B1120]">
                      {hasPfp ? (
                        <ImageWithFallback
                          src={athlete.pfpUrl}
                          alt={athlete.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-16 h-16 text-[#4274B9]/15" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

                      {/* Rank badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-lg" style={{ background: `${borderColor}20`, border: `1px solid ${borderColor}40` }}>
                        <span className="text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif", color: borderColor }}>
                          #{athlete.rank}
                        </span>
                      </div>

                      {/* Streak badge */}
                      {athlete.streak > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/40">
                          <Flame className="w-3 h-3 text-[#f59e0b]" />
                          <span className="text-xs text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.streak}</span>
                        </div>
                      )}

                      {/* Status badge */}
                      {athlete.status !== "active" && (
                        <div className="absolute top-3 right-3">
                          <span className={`px-2 py-0.5 rounded text-[0.5rem] font-bold ${
                            athlete.status === "champion" ? "bg-[#D4A843]/20 text-[#D4A843]" :
                            "bg-red-500/20 text-red-400"
                          }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {athlete.status.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Country + Flag */}
                      <div className="absolute bottom-3 right-3 text-xs text-[#8494A7] flex items-center gap-1">
                        <InlineFlag country={athlete.country} /> {athlete.country}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 sm:p-5">
                      <h3 className="text-[#E8ECF0] mb-0.5 font-bold truncate" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                        {athlete.name}
                      </h3>
                      {athlete.nickname && (
                        <p className="text-[0.65rem] mb-1" style={{ color: borderColor }}>
                          "{athlete.nickname}"
                        </p>
                      )}
                      {athlete.weightClass && (
                        <p className="text-[0.5rem] text-[#8494A7]/70 mb-2 truncate" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {athlete.weightClass}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                          <p className="text-lg text-[#10b981]" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.wins}</p>
                          <p className="text-xs text-[#8494A7]">Wins</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg text-red-400" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.losses}</p>
                          <p className="text-xs text-[#8494A7]">Losses</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {athlete.totalPowerRating?.toFixed(1) || "—"}
                          </p>
                          <p className="text-xs text-[#8494A7]">Power</p>
                        </div>
                      </div>

                      {/* Skill bars (compact) */}
                      {athlete.skills && (
                        <div className="space-y-1 mb-2">
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

                      {/* Expanded details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-3 pt-3 border-t border-[#4274B9]/10"
                        >
                          {athlete.bio && (
                            <p className="text-[#8494A7] text-xs leading-relaxed">{athlete.bio}</p>
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

                          {/* Social links */}
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

                          {/* NFT info if present */}
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
              {/* Top 3 Athletes — always visible */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {top3.map((athlete, i) => renderAthleteCard(athlete, i))}
              </div>

              {/* Remaining Athletes — collapsible */}
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
                      {showAllAthletes ? "HIDE" : "VIEW ALL"} ATHLETES ({rest.length} MORE)
                    </span>
                    <motion.div
                      animate={{ rotate: showAllAthletes ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4 text-[#4274B9]" />
                    </motion.div>
                  </button>

                  {showAllAthletes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
                    >
                      {rest.map((athlete, i) => renderAthleteCard(athlete, i + 3))}
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