/**
 * Mobile Bottom Navigation — Production-ready floating tab bar
 * =============================================================
 * Replaces the hamburger dropdown on mobile with a persistent,
 * thumb-friendly bottom navigation bar. Visible only on < md screens.
 *
 * Features:
 *   - 5 primary tabs: Home, Battles, NFTs, Leaderboard, More
 *   - Active tab indicator with animated pill + glow
 *   - "More" opens a slide-up sheet with secondary pages + wallet
 *   - VIP-aware gold theming for Governor NFT holders
 *   - Glassmorphism backdrop with safe-area padding (notch devices)
 *   - Hides on scroll-down, shows on scroll-up (like iOS Safari)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, Swords, Layers, Trophy, MoreHorizontal,
  Users, Shield, FileText, Wallet, Dumbbell,
  X, RefreshCw, Crown, ExternalLink, LogOut,
  Loader2,
} from "lucide-react";
import { useWallet } from "./wallet-context";
import { useVIP } from "./vip/vip-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NavTab {
  to: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Primary tabs
// ---------------------------------------------------------------------------
const TABS: NavTab[] = [
  {
    to: "/",
    label: "Home",
    icon: <Home className="w-5 h-5" strokeWidth={1.5} />,
    activeIcon: <Home className="w-5 h-5" strokeWidth={2} />,
  },
  {
    to: "/battles",
    label: "Battles",
    icon: <Swords className="w-5 h-5" strokeWidth={1.5} />,
    activeIcon: <Swords className="w-5 h-5" strokeWidth={2} />,
  },
  {
    to: "/nfts",
    label: "NFTs",
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
    activeIcon: <Layers className="w-5 h-5" strokeWidth={2} />,
  },
  {
    to: "/leaderboard",
    label: "Ranks",
    icon: <Trophy className="w-5 h-5" strokeWidth={1.5} />,
    activeIcon: <Trophy className="w-5 h-5" strokeWidth={2} />,
  },
];

// Secondary pages shown in the "More" sheet
const MORE_LINKS = [
  { to: "/calisthenics", label: "Calisthenics", icon: <Dumbbell className="w-5 h-5" /> },
  { to: "/athletes", label: "Athletes", icon: <Users className="w-5 h-5" /> },
  { to: "/governance", label: "Governors Hub", icon: <Shield className="w-5 h-5" /> },
  { to: "/whitepaper", label: "Whitepaper", icon: <FileText className="w-5 h-5" /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

function isTabActive(tabTo: string, pathname: string): boolean {
  if (tabTo === "/") return pathname === "/";
  return pathname.startsWith(tabTo);
}

// ---------------------------------------------------------------------------
// More Sheet — wallet + secondary nav
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
    hasGovernorNFT, connect, disconnect, isConnecting, isLoadingBalances,
    refreshBalances, network,
  } = useWallet();
  const { tierName } = useVIP();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[999] rounded-t-3xl overflow-hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            style={{
              background: "linear-gradient(180deg, #111827 0%, #0B1120 100%)",
              borderTop: `1px solid ${vipActive ? "rgba(212,168,67,0.2)" : "rgba(66,116,185,0.15)"}`,
              boxShadow: `0 -10px 60px ${vipActive ? "rgba(212,168,67,0.08)" : "rgba(66,116,185,0.08)"}`,
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-10 h-1 rounded-full ${vipActive ? "bg-[#D4A843]/30" : "bg-[#4274B9]/30"}`} />
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3
                className="text-xs font-bold tracking-widest"
                style={{ ...orbitron, color: accent }}
              >
                {connected ? "WALLET & NAVIGATION" : "NAVIGATION"}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-[#8494A7] active:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wallet Section */}
            <div className="px-5 pb-4">
              {connected ? (
                <div
                  className="rounded-2xl p-4 border"
                  style={{
                    background: vipActive
                      ? "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(11,17,32,0.8))"
                      : "linear-gradient(135deg, rgba(66,116,185,0.06), rgba(11,17,32,0.8))",
                    borderColor: vipActive ? "rgba(212,168,67,0.15)" : "rgba(66,116,185,0.12)",
                  }}
                >
                  {/* VIP banner */}
                  {vipActive && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-[#D4A843]/8 border border-[#D4A843]/15">
                      <Crown className="w-3.5 h-3.5 text-[#D4A843]" />
                      <span className="text-[0.6rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
                        {tierName.toUpperCase()}
                      </span>
                      <span className="ml-auto text-[0.5rem] text-[#D4A843]/50">
                        x{governorNftsOwned} NFT{governorNftsOwned !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Address row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${network === "mainnet" ? "bg-[#10b981]" : "bg-[#f59e0b]"} animate-pulse`} />
                      <span className="text-[0.7rem] font-mono" style={{ color: accent }}>
                        {address}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={refreshBalances}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8494A7] active:bg-white/5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? "animate-spin" : ""}`} />
                      </button>
                      <a
                        href={`https://hashscan.io/${network ?? "testnet"}/account/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8494A7] active:bg-white/5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Balances grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[0.5rem] text-[#8494A7] tracking-wider mb-0.5" style={orbitron}>HBAR</p>
                      {isLoadingBalances ? (
                        <div className="h-4 w-12 mx-auto rounded animate-pulse bg-white/5" />
                      ) : (
                        <p className="text-sm font-bold" style={{ ...orbitron, color: "#E8ECF0" }}>
                          {balance >= 1000 ? `${(balance / 1000).toFixed(1)}K` : balance.toFixed(1)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[0.5rem] text-[#8494A7] tracking-wider mb-0.5" style={orbitron}>BOTB</p>
                      {isLoadingBalances ? (
                        <div className="h-4 w-12 mx-auto rounded animate-pulse bg-white/5" />
                      ) : (
                        <p className="text-sm font-bold" style={{ ...orbitron, color: accent }}>
                          {botbBalance > 0 ? (botbBalance >= 1000 ? `${(botbBalance / 1000).toFixed(1)}K` : botbBalance.toString()) : (
                            <span className="text-[0.55rem] text-[#8494A7]/50 italic" style={dmSans}>Soon</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[0.5rem] text-[#8494A7] tracking-wider mb-0.5" style={orbitron}>NFTs</p>
                      {isLoadingBalances ? (
                        <div className="h-4 w-12 mx-auto rounded animate-pulse bg-white/5" />
                      ) : (
                        <p className="text-sm font-bold" style={{ ...orbitron, color: accentLight }}>
                          {nftsOwned}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Governor badge */}
                  {hasGovernorNFT && !vipActive && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f59e0b]/8 border border-[#f59e0b]/15 mb-3">
                      <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
                      <span className="text-[0.6rem] font-bold tracking-widest text-[#f59e0b]" style={orbitron}>
                        WCO GOVERNOR
                      </span>
                    </div>
                  )}

                  {/* Disconnect */}
                  <button
                    onClick={() => { disconnect(); onClose(); }}
                    className="w-full py-2.5 rounded-xl text-sm text-red-400 bg-red-400/5 border border-red-400/10 active:bg-red-400/10 transition-colors flex items-center justify-center gap-2"
                    style={dmSans}
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { connect(); onClose(); }}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    ...dmSans,
                    background: vipActive
                      ? "linear-gradient(135deg, #D4A843, #a07520)"
                      : "linear-gradient(135deg, #4274B9, #3563A0)",
                    color: "#fff",
                    boxShadow: vipActive
                      ? "0 4px 20px rgba(212,168,67,0.3)"
                      : "0 4px 20px rgba(66,116,185,0.3)",
                  }}
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Wallet className="w-5 h-5" />
                  )}
                  {isConnecting ? "Connecting..." : "Connect HashPack Wallet"}
                </button>
              )}
            </div>

            {/* Divider */}
            <div className={`mx-5 h-px ${vipActive ? "bg-[#D4A843]/10" : "bg-[#4274B9]/8"}`} />

            {/* Secondary navigation */}
            <div className="px-5 py-4 space-y-1">
              {MORE_LINKS.map((link) => {
                const active = isTabActive(link.to, location.pathname);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      background: active ? `${accent}10` : "transparent",
                      color: active ? accent : "#8494A7",
                    }}
                  >
                    <span style={{ color: active ? accent : "#8494A7" }}>{link.icon}</span>
                    <span className="text-sm font-medium" style={dmSans}>{link.label}</span>
                    {active && (
                      <div
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: accent, boxShadow: `0 0 6px ${accent}60` }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Safe area spacer for iOS home indicator */}
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
export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { connected } = useWallet();
  const { vipActive, sound } = useVIP();

  const accent = vipActive ? "#D4A843" : "#4274B9";
  const accentLight = vipActive ? "#F0D078" : "#6AA3E0";

  // Check if "More" section has an active page
  const moreActive = MORE_LINKS.some((l) => isTabActive(l.to, location.pathname));

  // Hide on scroll down, show on scroll up
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

  // Close more sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* More Sheet */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        accent={accent}
        accentLight={accentLight}
        vipActive={vipActive}
      />

      {/* Bottom Nav Bar — mobile only */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[997] md:hidden"
        initial={false}
        animate={{ y: visible ? 0 : 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Gradient fade above bar */}
        <div
          className="h-6 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(11,17,32,0.9))",
          }}
        />

        <nav
          className="relative"
          style={{
            background: "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(11,17,32,0.98))",
            borderTop: `1px solid ${vipActive ? "rgba(212,168,67,0.12)" : "rgba(66,116,185,0.08)"}`,
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          }}
        >
          {/* VIP top shimmer line */}
          {vipActive && (
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.25), transparent)",
              }}
            />
          )}

          <div className="flex items-center justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {TABS.map((tab) => {
              const active = isTabActive(tab.to, location.pathname);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="relative flex flex-col items-center justify-center min-w-[3.5rem] py-1 group"
                  onClick={() => {
                    if (vipActive) sound.playHover();
                  }}
                >
                  {/* Active indicator pill */}
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -top-1.5 w-8 h-1 rounded-full"
                      style={{
                        background: accent,
                        boxShadow: `0 0 12px ${accent}60, 0 0 24px ${accent}20`,
                      }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    animate={{
                      scale: active ? 1 : 0.92,
                      y: active ? -1 : 0,
                    }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    style={{ color: active ? accent : "#8494A780" }}
                  >
                    {active ? tab.activeIcon : tab.icon}
                  </motion.div>

                  {/* Label */}
                  <span
                    className="text-[0.55rem] mt-0.5 font-semibold tracking-wide transition-colors"
                    style={{
                      ...orbitron,
                      color: active ? accent : "#8494A750",
                    }}
                  >
                    {tab.label}
                  </span>

                  {/* Active glow underneath icon */}
                  {active && (
                    <div
                      className="absolute top-1 w-8 h-8 rounded-full pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
                      }}
                    />
                  )}
                </Link>
              );
            })}

            {/* More button */}
            <button
              onClick={() => {
                setMoreOpen(true);
                if (vipActive) sound.playHover();
              }}
              className="relative flex flex-col items-center justify-center min-w-[3.5rem] py-1"
            >
              {/* Active indicator when a "more" page is active */}
              {moreActive && (
                <motion.div
                  className="absolute -top-1.5 w-8 h-1 rounded-full"
                  style={{
                    background: accent,
                    boxShadow: `0 0 12px ${accent}60, 0 0 24px ${accent}20`,
                  }}
                />
              )}

              <motion.div
                animate={{ scale: moreActive ? 1 : 0.92 }}
                style={{ color: moreActive ? accent : "#8494A780" }}
              >
                {/* Wallet connected dot indicator */}
                {connected && (
                  <div
                    className="absolute top-0.5 right-3 w-2 h-2 rounded-full border-2 animate-pulse"
                    style={{
                      background: vipActive ? "#D4A843" : "#10b981",
                      borderColor: "#111827",
                    }}
                  />
                )}
                <MoreHorizontal className="w-5 h-5" strokeWidth={moreActive ? 2 : 1.5} />
              </motion.div>

              <span
                className="text-[0.55rem] mt-0.5 font-semibold tracking-wide"
                style={{
                  ...orbitron,
                  color: moreActive ? accent : "#8494A750",
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