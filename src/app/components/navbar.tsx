import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Wallet, ChevronDown, Loader2, RefreshCw, Shield, Crown } from "lucide-react";
import { useWallet } from "./wallet-context";
import { useVIP } from "./vip/vip-context";
import { VIPBadge } from "./vip/vip-badge";
import { NotificationBell } from "./notification-bell";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/battles", label: "Battles" },
  { to: "/athletes", label: "Athletes" },
  { to: "/nfts", label: "NFTs" },
  { to: "/governance", label: "Governors" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/calisthenics", label: "Workout" },
];

function BalanceSkeleton({ gold = false }: { gold?: boolean }) {
  return (
    <div className={`h-4 w-16 rounded animate-pulse ${gold ? "bg-[#D4A843]/15" : "bg-[#4274B9]/10"}`} />
  );
}

export function Navbar() {
  const [walletDropdown, setWalletDropdown] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletBtnRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [scrolled, setScrolled] = useState(false);

  const {
    connected,
    address,
    balance,
    botbBalance,
    nftsOwned,
    governorNftsOwned,
    hasGovernorNFT,
    connect,
    disconnect,
    isConnecting,
    isLoadingBalances,
    refreshBalances,
    error,
    network,
  } = useWallet();
  const { vipActive, tierName, sound } = useVIP();
  const location = useLocation();

  const accent = vipActive ? "#D4A843" : "#4274B9";
  const accentLight = vipActive ? "#F0D078" : "#6AA3E0";

  // Shrink navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openDropdown = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (walletBtnRef.current) {
      const rect = walletBtnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setWalletDropdown(true);
  };

  const scheduleClose = () => {
    hoverTimeoutRef.current = setTimeout(() => setWalletDropdown(false), 300);
  };

  // Close on scroll / resize
  useEffect(() => {
    if (!walletDropdown) return;
    const close = () => setWalletDropdown(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [walletDropdown]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // ── Truncated address for mobile: "0.0.80…" ──
  const shortAddress = address
    ? address.length > 8
      ? `${address.slice(0, 6)}...`
      : address
    : "";

  return (
    <>
      {/* ===== NAVBAR ===== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-500 ${
          vipActive
            ? "bg-[#0B1120]/92 border-[#D4A843]/15 shadow-[0_2px_20px_rgba(212,168,67,0.08)]"
            : "bg-[#0B1120]/90 border-[#4274B9]/10"
        } ${scrolled ? "shadow-lg shadow-black/20" : ""}`}
      >
        {/* VIP shimmer bar */}
        {vipActive && (
          <div
            className="absolute top-0 left-0 right-0 h-[1px] vip-shimmer-overlay"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)",
            }}
          />
        )}

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? "h-12 sm:h-13" : "h-14 sm:h-16"}`}>
            {/* Logo — slightly smaller on mobile */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img
                src={wcoLogoWhite}
                alt="WCO"
                className={`h-7 sm:h-9 w-auto object-contain transition-all ${
                  vipActive ? "drop-shadow-[0_0_8px_rgba(212,168,67,0.3)]" : ""
                }`}
              />
              <div className="flex flex-col leading-none">
                <span
                  className={`font-bold tracking-wider text-xs sm:text-sm ${vipActive ? "vip-gold-text" : "text-white"}`}
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  BOTB
                </span>
                <span
                  className="hidden sm:block text-[#8494A7] text-[0.55rem] tracking-[0.15em]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  BATTLE OF THE BARS
                </span>
              </div>
              {vipActive && <VIPBadge size="sm" showRing={false} />}
            </Link>

            {/* Desktop nav links (hidden on mobile — bottom nav handles it) */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to));
                const isExactHome = link.to === "/" && location.pathname === "/";
                const active = isExactHome || (link.to !== "/" && isActive);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      active
                        ? vipActive
                          ? "text-[#D4A843] bg-[#D4A843]/10"
                          : "text-[#4274B9] bg-[#4274B9]/10"
                        : vipActive
                          ? "text-[#8494A7] hover:text-[#D4A843] hover:bg-[#D4A843]/5"
                          : "text-[#8494A7] hover:text-[#E8ECF0] hover:bg-white/5"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: 500 }}
                    onMouseEnter={() => {
                      if (vipActive) sound.playHover();
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side: Notification + Wallet */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <NotificationBell />

              {/* ─── Connected wallet button ─── */}
              {connected ? (
                <div
                  ref={walletBtnRef}
                  onMouseEnter={openDropdown}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    onClick={() => {
                      // Desktop: hover handles it. Mobile: handled by bottom nav More sheet
                      // But keep a tap-toggle for the desktop dropdown at < 768
                      if (window.innerWidth >= 768) return;
                      if (walletDropdown) setWalletDropdown(false);
                      else openDropdown();
                    }}
                    className={`flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all cursor-default ${
                      vipActive
                        ? "vip-glass-card vip-shimmer-overlay hover:border-[#D4A843]/40"
                        : "bg-[#4274B9]/10 border border-[#4274B9]/30 hover:bg-[#4274B9]/20"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                        vipActive ? "bg-[#D4A843]" : "bg-[#10b981]"
                      }`}
                    />
                    {/* Mobile: very short address. Desktop: full truncated */}
                    <span
                      className="text-[0.6rem] sm:text-sm truncate hidden sm:inline"
                      style={{ fontFamily: "Orbitron, monospace", color: accent, maxWidth: "120px" }}
                    >
                      {address}
                    </span>
                    <span
                      className="text-[0.6rem] truncate sm:hidden"
                      style={{ fontFamily: "Orbitron, monospace", color: accent, maxWidth: "52px" }}
                    >
                      {shortAddress}
                    </span>
                    {hasGovernorNFT && <Crown className="w-3.5 h-3.5 vip-crown hidden sm:block" style={{ color: "#D4A843" }} />}
                    <ChevronDown
                      className={`w-3 h-3 shrink-0 transition-transform duration-200 hidden sm:block ${walletDropdown ? "rotate-180" : ""}`}
                      style={{ color: accent }}
                    />
                  </button>
                </div>
              ) : (
                /* ─── Connect button ─── */
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => connect()}
                    disabled={isConnecting}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all ${
                      isConnecting
                        ? "bg-[#4274B9]/50 text-white/70 cursor-wait"
                        : "bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25"
                    }`}
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    <span className="text-xs sm:text-sm font-semibold hidden sm:inline" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </span>
                    <span className="text-[0.65rem] font-semibold sm:hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {isConnecting ? "..." : "Connect"}
                    </span>
                  </button>
                  {error && (
                    <span className="text-[0.6rem] text-red-400 max-w-[120px] sm:max-w-[200px] truncate" title={error}>
                      {error}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ===== DESKTOP WALLET DROPDOWN — hidden on mobile (bottom nav handles it) ===== */}
      {walletDropdown && (
        <div
          ref={dropdownRef}
          onMouseEnter={openDropdown}
          onMouseLeave={scheduleClose}
          className={`fixed hidden sm:block w-80 max-w-80 rounded-xl p-4 shadow-2xl transition-all duration-200 ${
            vipActive ? "border border-[#D4A843]/20" : "border border-[#4274B9]/20"
          }`}
          style={{
            zIndex: 99999,
            top: dropdownPos.top,
            right: dropdownPos.right,
            background: vipActive ? "rgba(17, 24, 39, 0.97)" : "rgba(17, 24, 39, 0.98)",
            backdropFilter: "blur(30px)",
            animation: "walletDropIn 0.2s ease-out",
          }}
        >
          <style>{`
            @keyframes walletDropIn {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="space-y-3">
            {/* VIP tier banner */}
            {vipActive && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg vip-glass-card vip-shimmer-overlay mb-1">
                <Crown className="w-4 h-4 vip-crown" style={{ color: "#D4A843" }} />
                <span
                  className="vip-gold-text text-xs font-bold tracking-wider"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
                >
                  {tierName.toUpperCase()}
                </span>
                <span className="ml-auto text-[0.55rem] text-[#D4A843]/60">
                  x{governorNftsOwned} NFT{governorNftsOwned !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Network badge + refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${network === "mainnet" ? "bg-[#10b981]" : "bg-[#f59e0b]"}`} />
                <span
                  className="text-xs text-[#8494A7] uppercase tracking-wider"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {network ?? "testnet"}
                </span>
              </div>
              <button
                onClick={refreshBalances}
                className={`p-1 transition-colors ${
                  vipActive ? "text-[#8494A7] hover:text-[#D4A843]" : "text-[#8494A7] hover:text-[#4274B9]"
                }`}
                title="Refresh balances"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Governor badge (non-VIP fallback) */}
            {hasGovernorNFT && !vipActive && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span
                  className="text-xs text-[#f59e0b] font-semibold"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
                >
                  WCO GOVERNOR
                </span>
              </div>
            )}

            {/* HBAR Balance */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#8494A7]">HBAR</span>
              {isLoadingBalances ? (
                <BalanceSkeleton gold={vipActive} />
              ) : (
                <span
                  className={vipActive ? "vip-gold-text" : "text-white"}
                  style={{ fontFamily: "Orbitron, monospace", fontSize: "0.8rem" }}
                >
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              )}
            </div>

            {/* WCO Token Balance */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#8494A7]">WCO</span>
              {isLoadingBalances ? (
                <BalanceSkeleton gold={vipActive} />
              ) : (
                <span style={{ fontFamily: "Orbitron, monospace", fontSize: "0.8rem", color: accent }}>
                  {botbBalance > 0 ? (
                    botbBalance.toLocaleString()
                  ) : (
                    <span
                      className="text-[#8494A7]/50 text-xs italic"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Launching Summer 2026
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* NFTs */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#8494A7]">NFTs</span>
              {isLoadingBalances ? (
                <BalanceSkeleton gold={vipActive} />
              ) : (
                <span style={{ fontFamily: "Orbitron, monospace", fontSize: "0.8rem", color: accentLight }}>
                  {nftsOwned}
                </span>
              )}
            </div>

            <div className={`h-px ${vipActive ? "bg-[#D4A843]/15" : "bg-[#4274B9]/10"}`} />

            {/* HashScan link */}
            <a
              href={`https://hashscan.io/${network ?? "testnet"}/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-center py-1.5 text-xs transition-colors ${
                vipActive ? "text-[#8494A7] hover:text-[#D4A843]" : "text-[#8494A7] hover:text-[#4274B9]"
              }`}
            >
              View on HashScan ↗
            </a>

            <button
              onClick={() => {
                disconnect();
                setWalletDropdown(false);
              }}
              className="w-full py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </>
  );
}