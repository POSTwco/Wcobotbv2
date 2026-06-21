/**
 * Elite Tech Vault — weekly/monthly featured athlete spotlight.
 * Content is edited from the Cali Routine Operations admin console.
 */

import { useEffect, useState } from "react";
import {
  Instagram, Twitter, Youtube, Link2, Zap, Trophy, Play, ExternalLink,
} from "lucide-react";
import { api } from "../../lib/api";
import type { EliteFeaturedAthlete } from "../../lib/types";
import { InlineFlag } from "../country-flag";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

function socialHref(platform: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http")) return v;
  if (platform === "instagram") return `https://instagram.com/${v.replace("@", "")}`;
  if (platform === "twitter") return `https://x.com/${v.replace("@", "")}`;
  if (platform === "youtube") return v.startsWith("@") ? `https://youtube.com/${v}` : `https://youtube.com/${v}`;
  return v.startsWith("http") ? v : `https://${v}`;
}

export function EliteFeaturedAthleteSpotlight() {
  const [featured, setFeatured] = useState<EliteFeaturedAthlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.elite.getFeaturedAthlete().then((res) => {
      if (res.success && res.data?.featured) {
        setFeatured(res.data.featured);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !featured?.enabled) return null;

  const socials = [
    { key: "instagram", icon: Instagram, href: socialHref("instagram", featured.socials?.instagram || ""), color: "text-pink-400" },
    { key: "twitter", icon: Twitter, href: socialHref("twitter", featured.socials?.twitter || ""), color: "text-sky-400" },
    { key: "youtube", icon: Youtube, href: socialHref("youtube", featured.socials?.youtube || ""), color: "text-red-400" },
    { key: "website", icon: Link2, href: socialHref("website", featured.socials?.website || ""), color: "text-[#6AA3E0]" },
  ].filter((s) => s.href);

  const periodBadge = featured.periodLabel
    || (featured.periodType === "weekly" ? "Athlete of the Week" : "Athlete of the Month");

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

      <div
        className="rounded-2xl border border-[#D4A843]/20 overflow-hidden"
        style={{ background: "linear-gradient(160deg, rgba(212,168,67,0.06), rgba(11,17,32,0.85))" }}
      >
        {/* Video */}
        <div className="relative aspect-video bg-[#0B1120]">
          {featured.highlightVideoUrl ? (
            <video
              className="w-full h-full object-cover"
              controls
              playsInline
              preload="metadata"
              poster={featured.photoUrl || undefined}
            >
              <source src={featured.highlightVideoUrl} />
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#8494A7] text-sm" style={dmSans}>
              Highlight video coming soon
            </div>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/55 backdrop-blur-sm border border-[#D4A843]/30">
            <Play className="w-3 h-3 text-[#F0D078]" />
            <span className="text-[0.6rem] font-bold text-[#F0D078]" style={orbitron}>HIGHLIGHT REEL</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            {featured.photoUrl && (
              <ImageWithFallback
                src={featured.photoUrl}
                alt={featured.athleteName}
                className="w-14 h-14 rounded-xl object-cover border border-[#D4A843]/25 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white leading-tight" style={orbitron}>
                {featured.athleteName}
              </h3>
              {featured.tagline && (
                <p className="text-xs text-[#D4A843] mt-0.5" style={dmSans}>{featured.tagline}</p>
              )}
              {featured.country && (
                <p className="text-[0.65rem] text-[#8494A7] mt-1 flex items-center gap-1" style={dmSans}>
                  <InlineFlag country={featured.country} /> {featured.country}
                </p>
              )}
            </div>
          </div>

          {featured.description && (
            <p className="text-sm text-[#A3B0C2] leading-relaxed mb-4" style={dmSans}>
              {featured.description}
            </p>
          )}

          {featured.powerMoves.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.6rem] font-bold tracking-widest text-[#6AA3E0] mb-2 flex items-center gap-1.5" style={orbitron}>
                <Zap className="w-3 h-3" /> POWER MOVES
              </p>
              <div className="flex flex-wrap gap-1.5">
                {featured.powerMoves.map((move) => (
                  <span
                    key={move}
                    className="text-[0.65rem] px-2 py-1 rounded-lg border border-[#4274B9]/25 bg-[#4274B9]/10 text-[#E8ECF0]"
                    style={dmSans}
                  >
                    {move}
                  </span>
                ))}
              </div>
            </div>
          )}

          {featured.accolades.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.6rem] font-bold tracking-widest text-[#D4A843] mb-2 flex items-center gap-1.5" style={orbitron}>
                <Trophy className="w-3 h-3" /> ACCOLADES
              </p>
              <ul className="space-y-1">
                {featured.accolades.map((acc) => (
                  <li key={acc} className="text-xs text-[#C8D0DC] flex items-start gap-1.5" style={dmSans}>
                    <span className="text-[#D4A843] mt-0.5">★</span>
                    {acc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {socials.length > 0 && (
            <div className="flex items-center gap-3 pt-3 border-t border-[#4274B9]/15">
              {socials.map(({ key, icon: Icon, href, color }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`${color} opacity-70 hover:opacity-100 transition-opacity`}
                  aria-label={key}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
              <span className="text-[0.6rem] text-[#8494A7] ml-auto flex items-center gap-1" style={dmSans}>
                Follow <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}