/**
 * Site Map Exploratorium — replaces home Token Price / staking stats.
 * Coin360-style interactive destination map: tap a zone to explore.
 * Bottom row = remaining site functions (chat, assets, elite, etc.).
 */

import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Swords,
  Users,
  Dumbbell,
  Layers,
  Shield,
  Crown,
  FileText,
  Mail,
  Sparkles,
  ArrowRight,
  Compass,
  MessageCircle,
  Wallet,
  Flame,
  History,
  Trophy,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useWallet } from "./wallet-context";
import { isMagicEnabled } from "../lib/wallet-types";

const orbitron: CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface MapZone {
  id: string;
  label: string;
  blurb: string;
  to: string;
  Icon: LucideIcon;
  color: string;
  colorSoft: string;
  badge?: string;
  expect?: string;
  /** Compact square tile (bottom utility row) */
  mini?: boolean;
}

const ZONES: MapZone[] = [
  {
    id: "workout",
    label: "Workout",
    blurb: "Build routines, log sets, chase PRs. Open to every age — start easy, level up.",
    to: "/calisthenics",
    Icon: Dumbbell,
    color: "#D4A843",
    colorSoft: "rgba(212,168,67,0.18)",
    badge: "NEW",
    expect: "Play · train · prove",
  },
  {
    id: "battles",
    label: "Battles",
    blurb: "Vote on live IRL matchups. Pick your athlete and win from the pool — no loss staking.",
    to: "/battles",
    Icon: Swords,
    color: "#6AA3E0",
    colorSoft: "rgba(106,163,224,0.16)",
    expect: "Watch · vote · win",
  },
  {
    id: "athletes",
    label: "Athletes",
    blurb: "Meet the roster, rate competitors, and jump into Arena Chat.",
    to: "/athletes",
    Icon: Users,
    color: "#4274B9",
    colorSoft: "rgba(66,116,185,0.18)",
    expect: "Explore the roster",
  },
  {
    id: "nfts",
    label: "NFTs",
    blurb: "Governors, Sigma, and Meta series — boosts, status, and collector energy.",
    to: "/nfts",
    Icon: Layers,
    color: "#a78bfa",
    colorSoft: "rgba(167,139,250,0.16)",
    expect: "Collect & boost",
  },
  {
    id: "governors",
    label: "Governors",
    blurb: "Shape the protocol. Proposals, votes, and on-chain governance.",
    to: "/governance",
    Icon: Shield,
    color: "#10b981",
    colorSoft: "rgba(16,185,129,0.14)",
    expect: "Steer the org",
  },
  {
    id: "leaderboard",
    label: "Ranks",
    blurb: "Athletes, voters, and oracle standings — see who's climbing.",
    to: "/leaderboard",
    Icon: Crown,
    color: "#f59e0b",
    colorSoft: "rgba(245,158,11,0.14)",
    expect: "Climb the board",
  },
  {
    id: "apply",
    label: "Apply",
    blurb: "Pro Card path for athletes ready to compete under WCO.",
    to: "/apply",
    Icon: FileText,
    color: "#8494A7",
    colorSoft: "rgba(132,148,167,0.14)",
    expect: "Join the roster",
  },
  // ── Bottom utility row (6 square tiles) ──
  {
    id: "chat",
    label: "Chat",
    blurb: "Jump into Arena Chat with fans and athletes.",
    to: "/athletes#arena-chat",
    Icon: MessageCircle,
    color: "#38bdf8",
    colorSoft: "rgba(56,189,248,0.14)",
    mini: true,
  },
  {
    id: "assets",
    label: "Assets",
    blurb: "Manage HBAR, WCO, USDC, and Magic key reveal.",
    to: "/wallet/assets",
    Icon: Wallet,
    color: "#34d399",
    colorSoft: "rgba(52,211,153,0.14)",
    mini: true,
  },
  {
    id: "elite",
    label: "Elite",
    blurb: "Elite calisthenics engine for advanced athletes.",
    to: "/calisthenics/elite",
    Icon: Flame,
    color: "#f43f5e",
    colorSoft: "rgba(244,63,94,0.14)",
    mini: true,
  },
  {
    id: "history",
    label: "History",
    blurb: "Your completed workouts and session log.",
    to: "/calisthenics/history",
    Icon: History,
    color: "#818cf8",
    colorSoft: "rgba(129,140,248,0.14)",
    mini: true,
  },
  {
    id: "prs",
    label: "PRs",
    blurb: "Personal records across every movement.",
    to: "/calisthenics/prs",
    Icon: Trophy,
    color: "#eab308",
    colorSoft: "rgba(234,179,8,0.14)",
    mini: true,
  },
  {
    id: "analytics",
    label: "Stats",
    blurb: "Progress charts, heatmaps, and training analytics.",
    to: "/calisthenics/analytics",
    Icon: BarChart3,
    color: "#22d3ee",
    colorSoft: "rgba(34,211,238,0.14)",
    mini: true,
  },
];

/**
 * Fixed exploratorium layout (% of canvas).
 * Upper block = primary destinations; bottom strip = 6 equal utility tiles.
 */
const LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  workout: { x: 0, y: 0, w: 48, h: 76 },
  battles: { x: 48, y: 0, w: 52, h: 28 },
  athletes: { x: 48, y: 28, w: 26, h: 24 },
  nfts: { x: 74, y: 28, w: 26, h: 24 },
  governors: { x: 48, y: 52, w: 20, h: 24 },
  leaderboard: { x: 68, y: 52, w: 16, h: 24 },
  apply: { x: 84, y: 52, w: 16, h: 24 },
  // Bottom row — 6 equal squares across full width
  chat: { x: 0, y: 76, w: 100 / 6, h: 24 },
  assets: { x: 100 / 6, y: 76, w: 100 / 6, h: 24 },
  elite: { x: (100 / 6) * 2, y: 76, w: 100 / 6, h: 24 },
  history: { x: (100 / 6) * 3, y: 76, w: 100 / 6, h: 24 },
  prs: { x: (100 / 6) * 4, y: 76, w: 100 / 6, h: 24 },
  analytics: { x: (100 / 6) * 5, y: 76, w: 100 / 6, h: 24 },
};

function GoldTitle({
  label,
  active,
  sizeClass,
}: {
  label: string;
  active: boolean;
  sizeClass: string;
}) {
  return (
    <motion.h3
      className={`text-center leading-none tracking-[0.08em] font-extrabold ${sizeClass}`}
      style={{
        ...orbitron,
        fontWeight: 800,
        color: "#F0D078",
        textShadow:
          "0 0 12px rgba(212,168,67,0.55), 0 0 28px rgba(212,168,67,0.35), 0 1px 2px rgba(0,0,0,0.75)",
      }}
      initial={{ opacity: 0, scale: 0.86, y: 8 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.04 }}
    >
      <motion.span
        className="inline-block text-[#F0D078]"
        style={{
          color: "#F0D078",
          WebkitTextFillColor: "#F0D078",
          textShadow:
            "0 0 10px rgba(212,168,67,0.65), 0 0 22px rgba(240,208,120,0.4), 0 1px 2px rgba(0,0,0,0.8)",
        }}
        animate={{
          scale: active ? [1, 1.07, 1] : [1, 1.035, 1],
          color: active
            ? ["#F0D078", "#FFE7A0", "#F0D078"]
            : ["#E8C468", "#F0D078", "#E8C468"],
          textShadow: active
            ? [
                "0 0 10px rgba(212,168,67,0.55), 0 1px 2px rgba(0,0,0,0.8)",
                "0 0 26px rgba(255,231,160,0.95), 0 1px 2px rgba(0,0,0,0.8)",
                "0 0 10px rgba(212,168,67,0.55), 0 1px 2px rgba(0,0,0,0.8)",
              ]
            : [
                "0 0 8px rgba(212,168,67,0.4), 0 1px 2px rgba(0,0,0,0.75)",
                "0 0 18px rgba(240,208,120,0.7), 0 1px 2px rgba(0,0,0,0.75)",
                "0 0 8px rgba(212,168,67,0.4), 0 1px 2px rgba(0,0,0,0.75)",
              ],
        }}
        transition={{
          duration: active ? 2.2 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {label.toUpperCase()}
      </motion.span>
    </motion.h3>
  );
}

const PRIMARY_ZONES = ZONES.filter((z) => !z.mini);
const UTILITY_ZONES = ZONES.filter((z) => z.mini);

function tileSurface(zone: MapZone, active: boolean): CSSProperties {
  return {
    background: active
      ? `linear-gradient(145deg, ${zone.colorSoft}, rgba(11,17,32,0.92))`
      : `linear-gradient(160deg, ${zone.colorSoft}, #111827ee)`,
    border: `1px solid ${active ? zone.color + "88" : zone.color + "33"}`,
    boxShadow: active
      ? `0 0 28px ${zone.color}40, inset 0 1px 0 rgba(255,255,255,0.08)`
      : `inset 0 1px 0 rgba(255,255,255,0.04)`,
  };
}

/** Mobile-only card — readable titles, big tap targets, no cramped treemap */
function MobileZoneCard({
  zone,
  active,
  onHover,
  featured,
}: {
  zone: MapZone;
  active: boolean;
  onHover: (id: string | null) => void;
  featured?: boolean;
}) {
  const Icon = zone.Icon;
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={featured ? "col-span-2" : undefined}
    >
      <Link
        to={zone.to}
        onMouseEnter={() => onHover(zone.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(zone.id)}
        onBlur={() => onHover(null)}
        aria-label={`${zone.label}: ${zone.blurb}`}
        className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#6AA3E0] ${
          featured ? "min-h-[132px] px-3 py-4" : zone.mini ? "min-h-[88px] px-2 py-3" : "min-h-[100px] px-2.5 py-3"
        }`}
        style={tileSurface(zone, active)}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(${zone.color} 1px, transparent 1px), linear-gradient(90deg, ${zone.color} 1px, transparent 1px)`,
            backgroundSize: "14px 14px",
          }}
        />
        {zone.badge && (
          <span
            className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full text-[0.5rem] font-bold tracking-wider text-[#0B1120]"
            style={{
              ...orbitron,
              background: `linear-gradient(135deg, ${zone.color}, #fff8)`,
            }}
          >
            {zone.badge}
          </span>
        )}
        <div
          className="relative z-10 flex items-center justify-center rounded-xl mb-2 shrink-0"
          style={{
            width: featured ? "2.75rem" : "2.25rem",
            height: featured ? "2.75rem" : "2.25rem",
            background: `${zone.color}22`,
            border: `1px solid ${zone.color}55`,
          }}
        >
          <Icon
            className={featured ? "w-5 h-5" : "w-4 h-4"}
            style={{ color: zone.color }}
          />
        </div>
        <div className="relative z-10 px-1">
          <GoldTitle
            label={zone.label}
            active={active}
            sizeClass={
              featured
                ? "text-xl"
                : zone.mini
                  ? "text-[0.7rem] leading-tight"
                  : "text-sm"
            }
          />
        </div>
        {featured && zone.expect && (
          <p
            className="relative z-10 mt-1.5 text-[0.65rem] text-center"
            style={{ ...dmSans, color: zone.color }}
          >
            {zone.expect}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

function ZoneTile({
  zone,
  active,
  onHover,
}: {
  zone: MapZone;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const layout = LAYOUT[zone.id];
  if (!layout || !zone.to) return null;

  const Icon = zone.Icon;
  const showDetail = !zone.mini && (active || layout.w >= 40);
  const titleSize = zone.mini
    ? "text-[0.7rem] md:text-xs"
    : layout.w >= 40
      ? "text-lg sm:text-3xl md:text-4xl"
      : layout.w >= 22
        ? "text-xs sm:text-lg md:text-xl"
        : "text-[0.65rem] sm:text-sm md:text-base";

  return (
    <motion.div
      layout
      className="absolute"
      style={{
        left: `calc(${layout.x}% + 3px)`,
        top: `calc(${layout.y}% + 3px)`,
        width: `calc(${layout.w}% - 6px)`,
        height: `calc(${layout.h}% - 6px)`,
      }}
      whileHover={{ scale: zone.mini ? 1.04 : 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <Link
        to={zone.to}
        onMouseEnter={() => onHover(zone.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(zone.id)}
        onBlur={() => onHover(null)}
        aria-label={`${zone.label}: ${zone.blurb}`}
        className={`absolute inset-0 overflow-hidden cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#6AA3E0] block ${
          zone.mini ? "rounded-lg sm:rounded-xl" : "rounded-xl sm:rounded-2xl"
        }`}
        style={tileSurface(zone, active)}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(${zone.color} 1px, transparent 1px), linear-gradient(90deg, ${zone.color} 1px, transparent 1px)`,
            backgroundSize: zone.mini ? "12px 12px" : "18px 18px",
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(110deg, transparent 35%, ${zone.color}33 48%, transparent 62%)`,
          }}
          initial={{ x: "-120%" }}
          animate={active ? { x: "140%" } : { x: "-120%" }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />

        {zone.mini ? (
          <div className="relative h-full flex flex-col items-center justify-center gap-1.5 px-1">
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: "1.75rem",
                height: "1.75rem",
                background: `${zone.color}22`,
                border: `1px solid ${zone.color}44`,
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: zone.color }} />
            </div>
            <GoldTitle label={zone.label} active={active} sizeClass={titleSize} />
          </div>
        ) : (
          <div className="relative h-full p-2.5 sm:p-4">
            <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10">
              <div
                className="flex items-center justify-center rounded-lg sm:rounded-xl shrink-0"
                style={{
                  width: layout.w >= 40 ? "2.75rem" : "2rem",
                  height: layout.w >= 40 ? "2.75rem" : "2rem",
                  background: `${zone.color}22`,
                  border: `1px solid ${zone.color}44`,
                }}
              >
                <Icon
                  className={layout.w >= 40 ? "w-5 h-5 sm:w-6 sm:h-6" : "w-3.5 h-3.5 sm:w-4 sm:h-4"}
                  style={{ color: zone.color }}
                />
              </div>
            </div>
            {zone.badge && (
              <span
                className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-10 px-1.5 py-0.5 rounded-full text-[0.5rem] sm:text-[0.55rem] font-bold tracking-wider text-[#0B1120]"
                style={{
                  ...orbitron,
                  background: `linear-gradient(135deg, ${zone.color}, #fff8)`,
                }}
              >
                {zone.badge}
              </span>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] px-1.5 sm:px-3">
              <GoldTitle label={zone.label} active={active} sizeClass={titleSize} />
            </div>

            <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-4 z-10">
              {zone.expect && layout.w >= 24 && (
                <p
                  className="text-[0.6rem] sm:text-xs truncate text-center sm:text-left"
                  style={{ ...dmSans, color: zone.color }}
                >
                  {zone.expect}
                </p>
              )}
              <AnimatePresence>
                {showDetail && layout.h >= 28 && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[#8494A7] text-[0.65rem] sm:text-sm mt-1 sm:mt-1.5 line-clamp-2 sm:line-clamp-3"
                    style={dmSans}
                  >
                    {zone.blurb}
                  </motion.p>
                )}
              </AnimatePresence>
              {layout.w >= 40 && (
                <span
                  className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 text-[0.55rem] sm:text-xs opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ ...orbitron, color: zone.color }}
                >
                  ENTER <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export function SiteMapExploratorium() {
  const { connected, connect, openMagicEmailSignIn, isConnecting } = useWallet();
  const magicOn = isMagicEnabled();
  const [hovered, setHovered] = useState<string | null>(null);

  const preview = useMemo(
    () => ZONES.find((z) => z.id === hovered) ?? ZONES[0],
    [hovered],
  );

  return (
    <section id="explore-wco" className="py-8 sm:py-14 relative overflow-hidden scroll-mt-24">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[420px] bg-[#4274B9]/[0.05] rounded-full blur-[110px]" />
      <div className="pointer-events-none absolute -top-10 right-0 w-64 h-64 bg-[#D4A843]/[0.04] rounded-full blur-[80px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5 sm:mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/25 mb-3">
              <Compass className="w-3.5 h-3.5 text-[#6AA3E0]" />
              <span className="text-[#6AA3E0] text-[0.6rem] tracking-widest font-semibold" style={orbitron}>
                INTERACTIVE SITE MAP
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl" style={orbitron}>
              <span className="text-white">EXPLORE </span>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">
                WCO
              </span>
            </h2>
            <p className="text-[#8494A7] text-sm sm:text-base mt-2 max-w-xl" style={dmSans}>
              Tap any zone to jump in.{" "}
              <span className="text-[#6AA3E0] font-semibold">Email → verify → play</span>
              {" — "}account creation is simple enough for the whole family.
            </p>
          </div>

          {!connected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex flex-col sm:items-end gap-2 shrink-0"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#4274B9]/25 bg-[#111827]/80 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-[#D4A843]" />
                <span className="text-[0.7rem] text-[#E8ECF0]" style={dmSans}>
                  No seed phrase required to start
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {magicOn ? (
                  <button
                    type="button"
                    onClick={() => openMagicEmailSignIn("signup")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4274B9] text-white text-xs hover:bg-[#3563A0] transition-colors"
                    style={orbitron}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    CREATE WITH EMAIL
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={connect}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4274B9] text-white text-xs hover:bg-[#3563A0] transition-colors disabled:opacity-60"
                    style={orbitron}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isConnecting ? "CONNECTING…" : "CONNECT TO PLAY"}
                  </button>
                )}
                <Link
                  to="/calisthenics"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D4A843]/40 text-[#D4A843] text-xs hover:bg-[#D4A843]/10 transition-colors"
                  style={orbitron}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  TRY WORKOUT
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
          className="relative rounded-2xl sm:rounded-3xl border border-[#4274B9]/20 bg-[#0B1120]/90 overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(66,116,185,0.08), 0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6AA3E0] to-transparent z-10" />

          {/* ── Mobile: readable 2-col grid (no cramped treemap) ── */}
          <div className="sm:hidden p-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {PRIMARY_ZONES.map((zone) => (
                <MobileZoneCard
                  key={zone.id}
                  zone={zone}
                  featured={zone.id === "workout"}
                  active={hovered === zone.id || (!hovered && zone.id === "workout")}
                  onHover={setHovered}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {UTILITY_ZONES.map((zone) => (
                <MobileZoneCard
                  key={zone.id}
                  zone={zone}
                  active={hovered === zone.id}
                  onHover={setHovered}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={preview.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 rounded-xl border border-[#4274B9]/15 bg-[#111827]/80 px-3 py-2.5"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: preview.colorSoft, border: `1px solid ${preview.color}44` }}
                >
                  <preview.Icon className="w-4 h-4" style={{ color: preview.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[#F0D078] text-xs font-extrabold" style={orbitron}>
                    {preview.label.toUpperCase()}
                  </p>
                  <p className="text-[#8494A7] text-[0.7rem] line-clamp-2" style={dmSans}>
                    {preview.blurb}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Desktop / tablet: Coin360 exploratorium canvas ── */}
          <div className="hidden sm:block relative w-full aspect-[16/10] min-h-[360px]">
            {ZONES.map((zone) => (
              <ZoneTile
                key={zone.id}
                zone={zone}
                active={hovered === zone.id || (!hovered && zone.id === "workout")}
                onHover={setHovered}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
