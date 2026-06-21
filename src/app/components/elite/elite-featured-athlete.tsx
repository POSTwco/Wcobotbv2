/**
 * Elite Tech Vault — weekly/monthly featured athlete spotlight.
 * Content is edited from the Cali Routine Operations admin console.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Instagram, Twitter, Youtube, Link2, Zap, Trophy, Play, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { api } from "../../lib/api";
import type { EliteFeaturedAthlete } from "../../lib/types";
import { InlineFlag } from "../country-flag";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const STYLES_ID = "elite-featured-athlete-keyframes";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = `
    @keyframes elite-featured-glow-pulse {
      0%, 100% { opacity: 0.45; transform: scale(0.98); }
      50%      { opacity: 0.85; transform: scale(1.03); }
    }
    @keyframes elite-featured-glow-ring {
      0%   { transform: scale(0.97); opacity: 0.5; }
      50%  { transform: scale(1.02); opacity: 0.3; }
      100% { transform: scale(1.06); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function socialHref(platform: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http")) return v;
  if (platform === "instagram") return `https://instagram.com/${v.replace("@", "")}`;
  if (platform === "twitter") return `https://x.com/${v.replace("@", "")}`;
  if (platform === "youtube") return v.startsWith("@") ? `https://youtube.com/${v}` : `https://youtube.com/${v}`;
  return v.startsWith("http") ? v : `https://${v}`;
}

const glassChip = "rounded-xl bg-black/55 backdrop-blur-md border border-white/10 shadow-lg";

export function EliteFeaturedAthleteSpotlight() {
  const [featured, setFeatured] = useState<EliteFeaturedAthlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    ensureStyles();
    api.elite.getFeaturedAthlete().then((res) => {
      if (res.success && res.data?.featured) {
        setFeatured(res.data.featured);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const container = viewerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.volume = 0.5;
          video.muted = true;
          video.play().then(() => {
            video.muted = false;
            video.volume = 0.5;
          }).catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [featured?.highlightVideoUrl]);

  const toggleOverlays = useCallback(() => {
    setShowOverlays((v) => !v);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOverlays();
    }
  }, [toggleOverlays]);

  if (loading || !featured?.enabled) return null;

  const socials = [
    { key: "instagram", icon: Instagram, href: socialHref("instagram", featured.socials?.instagram || ""), color: "text-pink-400" },
    { key: "twitter", icon: Twitter, href: socialHref("twitter", featured.socials?.twitter || ""), color: "text-sky-400" },
    { key: "youtube", icon: Youtube, href: socialHref("youtube", featured.socials?.youtube || ""), color: "text-red-400" },
    { key: "website", icon: Link2, href: socialHref("website", featured.socials?.website || ""), color: "text-[#6AA3E0]" },
  ].filter((s) => s.href);

  const periodBadge = featured.periodLabel
    || (featured.periodType === "weekly" ? "Athlete of the Week" : "Athlete of the Month");

  const overlayTransition = "transition-all duration-500 ease-out";
  const overlayHidden = showOverlays
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 translate-y-2 pointer-events-none";

  return (
    <section className="mt-6 mb-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold tracking-widest text-[#D4A843]" style={orbitron}>
          FEATURED ATHLETE
        </h2>
        <span
          className="text-[0.6rem] px-2 py-0.5 rounded-full border border-[#D4A843]/35 text-[#F0D078]"
          style={orbitron}
        >
          {periodBadge}
        </span>
      </div>

      <motion.div
        className="relative"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
      >
        {/* Animated back-glow */}
        <div
          className="absolute -inset-2 rounded-[1.4rem] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(212,168,67,0.5) 0%, rgba(66,116,185,0.25) 45%, transparent 75%)",
            filter: "blur(18px)",
            animation: "elite-featured-glow-pulse 3s ease-in-out infinite",
            opacity: isHovered ? 1 : 0.7,
            transition: "opacity 0.4s ease",
          }}
          aria-hidden
        />

        {/* Pulsing glow ring */}
        <div
          className="absolute -inset-1 rounded-[1.35rem] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(212,168,67,0.4) 0%, transparent 70%)",
            animation: "elite-featured-glow-ring 2.8s ease-out infinite",
          }}
          aria-hidden
        />

        {/* Iridescent border */}
        <div
          className="absolute -inset-[2px] rounded-[1.25rem] pointer-events-none"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(212,168,67,0.75) 0%,
              rgba(106,163,224,0.45) 40%,
              rgba(212,168,67,0.55) 70%,
              rgba(212,168,67,0.75) 100%
            )`,
            opacity: isHovered ? 1 : 0.65,
            transition: "opacity 0.35s ease",
          }}
          aria-hidden
        />

        {/* Viewer */}
        <div
          ref={viewerRef}
          role="button"
          tabIndex={0}
          aria-pressed={!showOverlays}
          aria-label={showOverlays ? "Hide athlete info for full video view" : "Show athlete info"}
          onClick={toggleOverlays}
          onKeyDown={handleKeyDown}
          className="relative rounded-2xl overflow-hidden border border-[#D4A843]/25 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120]"
          style={{
            boxShadow: isHovered
              ? "0 0 48px rgba(212,168,67,0.35), 0 8px 32px rgba(0,0,0,0.4)"
              : "0 0 28px rgba(212,168,67,0.18), 0 4px 20px rgba(0,0,0,0.3)",
            transition: "box-shadow 0.4s ease",
          }}
        >
          <div className="relative aspect-video bg-[#0B1120]">
            {featured.highlightVideoUrl ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                loop
                playsInline
                preload="auto"
                poster={featured.photoUrl || undefined}
              >
                <source src={featured.highlightVideoUrl} />
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8494A7] text-sm" style={dmSans}>
                Highlight video coming soon
              </div>
            )}

            {/* Gradient scrims for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" />

            {/* Overlay layer */}
            <div className={`absolute inset-0 z-10 ${overlayTransition} ${overlayHidden}`}>
              {/* Top-left: highlight reel */}
              <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 ${glassChip} border-[#D4A843]/30`}>
                <Play className="w-3 h-3 text-[#F0D078]" />
                <span className="text-[0.6rem] font-bold text-[#F0D078]" style={orbitron}>HIGHLIGHT REEL</span>
              </div>

              {/* Top-right: tap hint */}
              <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 ${glassChip}`}>
                <Eye className="w-3 h-3 text-[#8494A7]" />
                <span className="text-[0.55rem] text-[#8494A7]" style={dmSans}>Tap for full view</span>
              </div>

              {/* Mid-left: power moves */}
              {featured.powerMoves.length > 0 && (
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 max-w-[42%] sm:max-w-[38%] p-2 ${glassChip}`}>
                  <p className="text-[0.55rem] font-bold tracking-widest text-[#6AA3E0] mb-1.5 flex items-center gap-1" style={orbitron}>
                    <Zap className="w-2.5 h-2.5" /> POWER MOVES
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {featured.powerMoves.map((move) => (
                      <span
                        key={move}
                        className="text-[0.6rem] px-1.5 py-0.5 rounded-md border border-[#4274B9]/30 bg-[#4274B9]/15 text-[#E8ECF0]"
                        style={dmSans}
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mid-right: accolades */}
              {featured.accolades.length > 0 && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 max-w-[42%] sm:max-w-[36%] p-2 ${glassChip}`}>
                  <p className="text-[0.55rem] font-bold tracking-widest text-[#D4A843] mb-1.5 flex items-center gap-1" style={orbitron}>
                    <Trophy className="w-2.5 h-2.5" /> ACCOLADES
                  </p>
                  <ul className="space-y-0.5">
                    {featured.accolades.slice(0, 3).map((acc) => (
                      <li key={acc} className="text-[0.6rem] text-[#C8D0DC] flex items-start gap-1 leading-snug" style={dmSans}>
                        <span className="text-[#D4A843] shrink-0">★</span>
                        <span className="line-clamp-2">{acc}</span>
                      </li>
                    ))}
                    {featured.accolades.length > 3 && (
                      <li className="text-[0.55rem] text-[#8494A7]" style={dmSans}>
                        +{featured.accolades.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Bottom-left: identity */}
              <div className={`absolute bottom-3 left-3 max-w-[55%] sm:max-w-[48%] p-2.5 sm:p-3 ${glassChip} border-[#D4A843]/20`}>
                <div className="flex items-center gap-2.5">
                  {featured.photoUrl && (
                    <ImageWithFallback
                      src={featured.photoUrl}
                      alt={featured.athleteName}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-[#D4A843]/25 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate" style={orbitron}>
                      {featured.athleteName}
                    </h3>
                    {featured.tagline && (
                      <p className="text-[0.65rem] sm:text-xs text-[#D4A843] mt-0.5 line-clamp-2" style={dmSans}>
                        {featured.tagline}
                      </p>
                    )}
                    {featured.country && (
                      <p className="text-[0.6rem] text-[#8494A7] mt-0.5 flex items-center gap-1" style={dmSans}>
                        <InlineFlag country={featured.country} /> {featured.country}
                      </p>
                    )}
                  </div>
                </div>
                {featured.description && (
                  <p className="text-[0.65rem] text-[#A3B0C2] leading-snug mt-2 line-clamp-2 hidden sm:block" style={dmSans}>
                    {featured.description}
                  </p>
                )}
              </div>

              {/* Bottom-right: socials */}
              {socials.length > 0 && (
                <div
                  className={`absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-2 ${glassChip}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {socials.map(({ key, icon: Icon, href, color }) => (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${color} opacity-80 hover:opacity-100 transition-opacity`}
                      aria-label={key}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                  <span className="text-[0.55rem] text-[#8494A7] flex items-center gap-0.5 ml-0.5" style={dmSans}>
                    Follow <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              )}
            </div>

            {/* Minimal indicator when overlays hidden */}
            <div
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 ${glassChip} ${overlayTransition} ${showOverlays ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <EyeOff className="w-3 h-3 text-[#8494A7]" />
              <span className="text-[0.6rem] text-[#8494A7]" style={dmSans}>Tap to show info</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}