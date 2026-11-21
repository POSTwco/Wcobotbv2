import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import { useWallet } from "./wallet-context";
import { api } from "../lib/api";
import { NotificationBell } from "./notification-bell";
import { isMagicEnabled } from "../lib/wallet-types";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/battles", label: "Battles" },
  { to: "/athletes", label: "Athletes" },
  { to: "/events", label: "Events" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const [walletDropdown, setWalletDropdown] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletBtnRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [scrolled, setScrolled] = useState(false);

  const {
    connected,
    walletSessionToken,
    openMagicEmailSignIn,
    disconnect,
    isConnecting,
    error,
  } = useWallet();
  const [isStaff, setIsStaff] = useState(false);
  const vipActive = false;
  const location = useLocation();

  useEffect(() => {
    if (!connected || !walletSessionToken) {
      setIsStaff(false);
      return;
    }
    let cancel = false;
    api.staff.me(walletSessionToken).then((res) => {
      if (!cancel) setIsStaff(!!(res.success && res.data?.staff));
    }).catch(() => {
      if (!cancel) setIsStaff(false);
    });
    return () => { cancel = true; };
  }, [connected, walletSessionToken]);

  const accent = "#4274B9";

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
                  className="flex items-center gap-2"
                  onMouseEnter={openDropdown}
                  onMouseLeave={scheduleClose}
                >
                  {isStaff && (
                    <Link
                      to="/staff"
                      className="text-[0.65rem] sm:text-sm text-[#D4A843] hover:text-[#F0D078]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Staff
                    </Link>
                  )}
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
                    <span
                      className="text-[0.65rem] sm:text-sm truncate"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: accent }}
                    >
                      Signed in
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 shrink-0 transition-transform duration-200 hidden sm:block ${walletDropdown ? "rotate-180" : ""}`}
                      style={{ color: accent }}
                    />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <button
                    type="button"
                    onClick={() => openMagicEmailSignIn("signin")}
                    disabled={isConnecting}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all ${
                      isConnecting
                        ? "bg-[#4274B9]/50 text-white/70 cursor-wait"
                        : "bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25"
                    }`}
                  >
                    {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span className="text-xs sm:text-sm font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {isConnecting ? "Signing in..." : "Sign in"}
                    </span>
                  </button>
                  {isMagicEnabled() && (
                    <button
                      type="button"
                      onClick={() => openMagicEmailSignIn("signup")}
                      disabled={isConnecting}
                      className="text-[0.65rem] sm:text-[0.7rem] text-[#8494A7] hover:text-[#F0D078] underline-offset-2 hover:underline disabled:opacity-50"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Create account
                    </button>
                  )}
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
            <p className="text-sm text-[#E8ECF0]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Signed in
            </p>
            {isStaff && (
              <Link
                to="/staff"
                onClick={() => setWalletDropdown(false)}
                className="block w-full py-2 text-sm text-center text-[#D4A843] hover:bg-[#D4A843]/10 rounded-lg"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Staff
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                disconnect();
                setWalletDropdown(false);
              }}
              className="w-full py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}