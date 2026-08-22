/**
 * Mobile Bottom Navigation — Production-ready floating tab bar
 * =============================================================
 * Persistent thumb-friendly bottom bar on < md screens.
 *
 * Tabs: Home · Battles · NFTs · Workout · Chat
 *   - Bright white labels + glassmorphic bar
 *   - Gold reflective glass-morphic animated icons
 *   - Chat → /athletes#arena-chat (scrolls to Arena Chat)
 *   - "More" sheet: wallet + secondary pages (Athletes, Governors, etc.)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, Swords, Layers, MessageCircle, MoreHorizontal,
  Users, Shield, FileText, Wallet, Dumbbell,
  X, RefreshCw, Crown, ExternalLink, LogOut,
  Loader2,
} from "lucide-react";
import { useWallet } from "./wallet-context";
import { useVIP } from "./vip/vip-context";
import { isMagicEnabled } from "../lib/wallet-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NavTab {
  to: string;
  label: string;
  hash?: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

// ---------------------------------------------------------------------------
// Primary tabs
// ---------------------------------------------------------------------------
const TABS: NavTab[] = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/battles", label: "Battles", Icon: Swords },
  { to: "/nfts", label: "NFTs", Icon: Layers },
  { to: "/calisthenics", label: "Workout", Icon: Dumbbell },
  { to: "/athletes", label: "Chat", hash: "#arena-chat", Icon: MessageCircle },
];

const MORE_LINKS = [
  { to: "/athletes", label: "Athletes", icon: <Users className="w-5 h-5" /> },
  { to: "/leaderboard", label: "Leaderboard", icon: <Crown className="w-5 h-5" /> },
  { to: "/governance", label: "Governors Hub", icon: <Shield className="w-5 h-5" /> },
  { to: "/whitepaper", label: "Whitepaper", icon: <FileText className="w-5 h-5" /> },
];

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

/** Gold reflective glass-morphic icon capsule */
function GoldGlassIcon({
  Icon,
  active,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <span
      className="relative flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden"
      style={{
        background: active
          ? "linear-gradient(145deg, rgba(240,208,120,0.35) 0%, rgba(212,168,67,0.18) 45%, rgba(160,120,40,0.22) 100%)"
          : "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(212,168,67,0.1) 50%, rgba(255,255,255,0.05) 100%)",
        border: active
          ? "1px solid rgba(240,208,120,0.55)"
          : "1px solid rgba(212,168,67,0.28)",
        boxShadow: active
          ? "0 0 16px rgba(212,168,67,0.45), 0 0 28px rgba(212,168,67,0.15), inset 0 1px 0 rgba(255,255,255,0.45)"
          : "0 0 10px rgba(212,168,67,0.12), inset 0 1px 0 rgba(255,255,255,0.25)",
        backdropFilter: "blur(10px) saturate(1.4)",
        WebkitBackdropFilter: "blur(10px) saturate(1.4)",
      }}
    >
      {/* Specular highlight */}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            "linear-gradient(125deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 28%, transparent 48%)",
        }}
        aria-hidden
      />
      {/* Animated gold shimmer sweep */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,248,220,0.55) 48%, rgba(212,168,67,0.35) 52%, transparent 70%)",
        }}
        animate={{ x: ["-140%", "160%"] }}
        transition={{
          duration: active ? 2.4 : 3.6,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: active ? 0.6 : 1.4,
        }}
        aria-hidden
      />
      <Icon
        className={`relative z-[1] w-[1.15rem] h-[1.15rem] ${
          active ? "text-[#FFF8DC]" : "text-[#F0D078]"
        }`}
        strokeWidth={active ? 2.25 : 1.85}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// More Sheet
// ---------------------------------------------------------------------------
function MoreSheet({
  open,
  onClose,
  accent,
  accentLight,
  vipActive,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  accentLight: string;
  vipActive: boolean;
}) {
  const location = useLocation();
  const {
    connected, address, balance, botbBalance, nftsOwned, governorNftsOwned,
    hasGovernorNFT, connect, openMagicEmailSignIn, disconnect, isConnecting, isLoadingBalances,
    refreshBalances, network,
  } = useWallet();
  const { tierName } = useVIP();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[999] rounded-t-3xl overflow-hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            style={{
              background: "linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(11,17,32,0.98) 100%)",
              borderTop: "1px solid rgba(212,168,67,0.22)",
              boxShadow: "0 -10px 60px rgba(212,168,67,0.1)",
              backdropFilter: "blur(28px) saturate(1.5)",
              WebkitBackdropFilter: "blur(28px) saturate(1.5)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#D4A843]/35" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-xs font-bold tracking-widest text-[#F0D078]" style={orbitron}>
                {connected ? "WALLET & NAVIGATION" : "NAVIGATION"}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 text-white/80 active:bg-white/15 border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-4">
              {connected ? (
                <div
                  className="rounded-2xl p-4 border"
                  style={{
                    background: vipActive
                      ? "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(11,17,32,0.75))"
                      : "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(11,17,32,0.75))",
                    borderColor: "rgba(212,168,67,0.2)",
                  }}
                >
                  {vipActive && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/2">
                      <Crown className="w-3.5 h-3.5 text-[#D4A843]" />
                      <span className="text-[0.6rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
                        {tierName.toUpperCase()}
                      </span>
                      <span className="ml-auto text-[0.5rem] text-[#D4A843]/50">
                        x{governorNftsOwned} NFT{governorNftsOwned !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${network === "mainnet" ? "bg-[#10b981]" : "bg-[#f59e0b]"} animate-pulse`} />
                      <span className="text-[0.7rem] font-mono text-[#F0D078]">
                        {address}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={refreshBalances}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 active:bg-white/10"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? "animate-spin" : ""}`} />
                      </button>
                      <a
                        href={`https://hashscan.io/${network ?? "testnet"}/account/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 active:bg-white/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-[0.5rem] text-white/50 tracking-wider mb-0.5" style={orbitron}>HBAR</p>
                      {isLoadingBalances ? (
                        <div className="h-4 w-12 mx-auto rounded animate-pulse bg-white/10" />
                      ) : (
                        <p className="text-sm font-bold text-white" style={orbitron}>
                          {balance >= 1000 ? `${(balance / 1000).toFixed(1)}K` : balance.toFixed(1)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-[0.5rem] text-white/50 tracking-wider mb-0.5" style={orbitron}>BOTB</p>
                      {isLoadingBalances ? (
                        <div className="h-4 w-12 mx-auto rounded animate-pulse bg-white/10" />
                      ) : (
                        <p className="text-sm font-bold text-[#F0D078]" style={orbitron}>
                          {botbBalance > 0 ? (botbBalance >= 1000 ? `${(botbBalance / 1000).toFixed(1)}K` : botbBalance.toString()) : (
                            <span className="text-[0.55rem] text-white/40 italic" style={dmSans}>Soon</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-[0.5rem] text-white/50 tracking-wider mb-0.5" style={orbitron}>NFTs</p>
                      {isLoadingBalances ? (
                        <div className="h-4 w-12 mx-auto rounded animate-pulse bg-white/10" />
                      ) : (
                        <p className="text-sm font-bold text-[#F0D078]" style={orbitron}>
                          {nftsOwned}
                        </p>
                      )}
                    </div>
                  </div>

                  {hasGovernorNFT && !vipActive && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/2 mb-3">
                      <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
                      <span className="text-[0.6rem] font-bold tracking-widest text-[#f59e0b]" style={orbitron}>
                        WCO GOVERNOR
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => { disconnect(); onClose(); }}
                    className="w-full py-2.5 rounded-xl text-sm text-red-300 bg-red-400/10 border border-red-400/15 active:bg-red-400/15 transition-colors flex items-center justify-center gap-2"
                    style={dmSans}
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => { connect(); onClose(); }}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] text-white"
                    style={{
                      ...dmSans,
                      background: "linear-gradient(135deg, #D4A843, #a07520)",
                      boxShadow: "0 4px 20px rgba(212,168,67,0.35)",
                    }}
                  >
                    {isConnecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wallet className="w-5 h-5" />
                    )}
                    {isConnecting ? "Connecting..." : "Connect HashPack"}
                  </button>
                  {isMagicEnabled() && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs" style={dmSans}>
                      <button
                        type="button"
                        onClick={() => { openMagicEmailSignIn("signin"); onClose(); }}
                        disabled={isConnecting}
                        className="text-[#8494A7] hover:text-[#6AA3E0] underline-offset-2 hover:underline"
                      >
                        Sign in with email
                      </button>
                      <span className="text-[#8494A7]/40">·</span>
                      <button
                        type="button"
                        onClick={() => { openMagicEmailSignIn("signup"); onClose(); }}
                        disabled={isConnecting}
                        className="text-[#8494A7] hover:text-[#F0D078] underline-offset-2 hover:underline"
                      >
                        Create account
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mx-5 h-px bg-[#D4A843]/15" />

            <div className="px-5 py-4 space-y-1">
              {MORE_LINKS.map((link) => {
                const active = location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all active:scale-[0.98] border border-transparent"
                    style={{
                      background: active ? "rgba(212,168,67,0.12)" : "rgba(255,255,255,0.03)",
                      borderColor: active ? "rgba(212,168,67,0.25)" : "rgba(255,255,255,0.06)",
                      color: active ? "#F0D078" : "#FFFFFF",
                    }}
                  >
                    <span style={{ color: active ? "#F0D078" : "rgba(240,208,120,0.75)" }}>{link.icon}</span>
                    <span className="text-sm font-medium text-white" style={dmSans}>{link.label}</span>
                    {active && (
                      <div
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F0D078]"
                        style={{ boxShadow: "0 0 6px rgba(240,208,120,0.7)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main Bottom Nav
// ---------------------------------------------------------------------------
function isWorkoutRoute(pathname: string) {
  return /^\/calisthenics\/(elite\/)?workout\/[^/]+/.test(pathname);
}

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { connected } = useWallet();
  const { vipActive, sound } = useVIP();

  const accent = "#D4A843";
  const accentLight = "#F0D078";
  const hash = location.hash || "";

  const moreActive = MORE_LINKS.some((l) => location.pathname.startsWith(l.to)
    && !(l.to === "/athletes" && hash === "#arena-chat"));

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    if (y < 60) {
      setVisible(true);
    } else if (y > lastScrollY.current + 8) {
      setVisible(false);
    } else if (y < lastScrollY.current - 4) {
      setVisible(true);
    }
    lastScrollY.current = y;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.hash]);

  if (isWorkoutRoute(location.pathname)) {
    return null;
  }

  return (
    <>
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        accent={accent}
        accentLight={accentLight}
        vipActive={vipActive}
      />

      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[997] md:hidden"
        initial={false}
        animate={{ y: visible ? 0 : 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div
          className="h-6 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(11,17,32,0.85))",
          }}
        />

        <nav
          className="relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(17,24,39,0.72) 28%, rgba(11,17,32,0.88) 100%)",
            borderTop: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "0 -8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22), 0 0 30px rgba(212,168,67,0.08)",
            backdropFilter: "blur(28px) saturate(1.65)",
            WebkitBackdropFilter: "blur(28px) saturate(1.65)",
          }}
        >
          {/* Glass sheen */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)",
            }}
            aria-hidden
          />
          {/* Soft gold ambient */}
          <motion.div
            className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full blur-2xl"
            style={{ background: "rgba(212,168,67,0.18)" }}
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          <div className="relative flex items-center justify-around px-1.5 pt-2 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
            {TABS.map((tab) => {
              const active =
                tab.hash === "#arena-chat"
                  ? location.pathname.startsWith("/athletes") && hash === "#arena-chat"
                  : tab.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(tab.to) &&
                      !(tab.to === "/athletes" && hash === "#arena-chat");

              const href = tab.hash ? `${tab.to}${tab.hash}` : tab.to;

              return (
                <Link
                  key={tab.label}
                  to={href}
                  className="relative flex flex-col items-center justify-center min-w-[3.25rem] max-w-[4.25rem] py-0.5 group"
                  onClick={() => {
                    if (vipActive) sound.playHover();
                    if (tab.hash === "#arena-chat") {
                      // Ensure hash is set even when already on /athletes
                      requestAnimationFrame(() => {
                        const el = document.getElementById("arena-chat");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -top-1 w-7 h-0.5 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, transparent, #F0D078, transparent)",
                        boxShadow: "0 0 12px rgba(240,208,120,0.7)",
                      }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    />
                  )}

                  <motion.div
                    animate={{
                      scale: active ? 1.04 : 1,
                      y: active ? -1 : 0,
                    }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  >
                    <GoldGlassIcon Icon={tab.Icon} active={active} />
                  </motion.div>

                  <span
                    className="text-[0.55rem] mt-1 font-semibold tracking-wide truncate max-w-full px-0.5"
                    style={{
                      ...orbitron,
                      color: "#FFFFFF",
                      textShadow: active
                        ? "0 0 10px rgba(255,255,255,0.45), 0 0 18px rgba(212,168,67,0.35)"
                        : "0 0 6px rgba(255,255,255,0.2)",
                      opacity: active ? 1 : 0.88,
                    }}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}

            <button
              onClick={() => {
                setMoreOpen(true);
                if (vipActive) sound.playHover();
              }}
              className="relative flex flex-col items-center justify-center min-w-[3.25rem] py-0.5"
            >
              {moreActive && (
                <motion.div
                  className="absolute -top-1 w-7 h-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, #F0D078, transparent)",
                    boxShadow: "0 0 12px rgba(240,208,120,0.7)",
                  }}
                />
              )}

              <div className="relative">
                {connected && (
                  <div
                    className="absolute -top-0.5 -right-0.5 z-[2] w-2 h-2 rounded-full border-2 animate-pulse"
                    style={{
                      background: "#10b981",
                      borderColor: "rgba(17,24,39,0.9)",
                    }}
                  />
                )}
                <GoldGlassIcon Icon={MoreHorizontal} active={moreActive || moreOpen} />
              </div>

              <span
                className="text-[0.55rem] mt-1 font-semibold tracking-wide"
                style={{
                  ...orbitron,
                  color: "#FFFFFF",
                  textShadow: "0 0 6px rgba(255,255,255,0.2)",
                  opacity: moreActive || moreOpen ? 1 : 0.88,
                }}
              >
                More
              </span>
            </button>
          </div>
        </nav>
      </motion.div>
    </>
  );
}
