import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import { Outlet } from "react-router";
import { Navbar } from "./navbar";
import { VIPParticles } from "./vip/vip-particles";
import { VIPWelcome } from "./vip/vip-welcome";
import { VIPCursorGlow, VIPSoundToggle, VIPRadiance, VIPIndicator } from "./vip/vip-effects";
import { useVIP } from "./vip/vip-context";
import { BetaDisclaimer } from "./beta-disclaimer";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { BecomeSponsorSection } from "./become-sponsor";
import { X } from "lucide-react";
import { Toaster } from "sonner";
import { MobileBottomNav } from "./mobile-bottom-nav";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const ATHLETE_BG = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/athlete1.jpg";

export function Layout() {
  const { vipActive } = useVIP();
  const [showSponsorModal, setShowSponsorModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#E8ECF0] relative overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Beta Disclaimer Modal */}
      <BetaDisclaimer />
      <ScrollToTop />

      {/* VIP Global Effects Layer */}
      <VIPParticles />
      <VIPCursorGlow />
      <VIPRadiance />
      <VIPWelcome />
      <VIPSoundToggle />
      <VIPIndicator />

      {/* Become a Sponsor Modal Overlay */}
      {showSponsorModal && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0B1120]/85 backdrop-blur-sm"
            onClick={() => setShowSponsorModal(false)}
          />
          {/* Modal content */}
          <div className="relative w-full max-w-6xl mx-2 sm:mx-4 my-4 sm:my-12">
            {/* Close button — sticky on mobile for easy access */}
            <button
              onClick={() => setShowSponsorModal(false)}
              className="sticky top-2 sm:absolute sm:top-4 right-2 sm:right-4 z-10 w-10 h-10 ml-auto rounded-full bg-[#111827] border border-[#4274B9]/20 flex items-center justify-center text-[#8494A7] hover:text-white hover:border-[#4274B9]/50 transition-all shadow-lg shadow-black/30"
            >
              <X className="w-5 h-5" />
            </button>
            <BecomeSponsorSection />
          </div>
        </div>
      )}

      {/* Subtle athlete background across entire site */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={ATHLETE_BG} alt="" className="w-full h-full object-cover opacity-[0.06]" />
        <div className="absolute inset-0 bg-[#0B1120]/70" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="pt-14 sm:pt-16 pb-20 md:pb-0">
          <Outlet />
        </main>
        <footer className={`border-t py-8 sm:py-12 pb-24 md:pb-12 ${vipActive ? "border-[#D4A843]/15 bg-[#0A0F1A]" : "border-[#4274B9]/10 bg-[#0A0F1A]"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <img
                    src={wcoLogoWhite}
                    alt="WCO"
                    className={`h-10 w-auto object-contain ${vipActive ? "drop-shadow-[0_0_8px_rgba(212,168,67,0.3)]" : ""}`}
                  />
                  <div className="flex flex-col leading-none">
                    <span className={`font-bold tracking-wider text-sm ${vipActive ? "vip-gold-text" : "text-white"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                      BOTB
                    </span>
                    <span className="text-[#8494A7] text-[0.55rem] tracking-[0.12em]">
                      BY WCO
                    </span>
                  </div>
                </div>
                <p className="text-[#8494A7] text-sm">
                  World Calisthenics Organization. Powered by Hedera Hashgraph. Only Gains.
                </p>
              </div>
              <div>
                <h4 className={`font-bold mb-3 ${vipActive ? "vip-gold-text" : "text-[#E8ECF0]"}`} style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.1em" }}>PLATFORM</h4>
                <div className="space-y-2 text-sm text-[#8494A7]">
                  <Link to="/battles" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Battles</Link>
                  <Link to="/athletes" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Athletes</Link>
                  <Link to="/nfts" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>NFT Collection</Link>
                  <Link to="/governance" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Governors Hub</Link>
                  <button onClick={() => setShowSponsorModal(true)} className={`block cursor-pointer transition-colors text-left ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Become a Sponsor</button>
                </div>
              </div>
              <div>
                <h4 className={`font-bold mb-3 ${vipActive ? "vip-gold-text" : "text-[#E8ECF0]"}`} style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.1em" }}>TECHNOLOGY</h4>
                <div className="space-y-2 text-sm text-[#8494A7]">
                  <a href="https://hedera.com" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Hedera Hashgraph</a>
                  <a href="https://docs.hedera.com" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>HTS Tokens</a>
                  <Link to="/whitepaper" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Whitepaper</Link>
                  <Link to="/leaderboard" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Leaderboard</Link>
                </div>
              </div>
              <div>
                <h4 className={`font-bold mb-3 ${vipActive ? "vip-gold-text" : "text-[#E8ECF0]"}`} style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.1em" }}>COMMUNITY</h4>
                <div className="space-y-2 text-sm text-[#8494A7]">
                  <a href="https://discord.com/invite/Zt52bf8Ve" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Discord</a>
                  <a href="https://x.com/WCO_ORG" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Twitter / X</a>
                  <a href="https://www.instagram.com/world_calisthenics_org/" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Instagram</a>
                  <a href="https://www.youtube.com/@WorldCalisthenicsOrg" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>YouTube</a>
                  <a href="https://t.me" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>Telegram</a>
                  <a href="https://worldcalisthenics.org" target="_blank" rel="noopener noreferrer" className={`block cursor-pointer transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#4274B9]"}`}>WCO Website</a>
                </div>
              </div>
            </div>
            <div className={`mt-6 sm:mt-8 pt-6 sm:pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${vipActive ? "border-[#D4A843]/10" : "border-[#4274B9]/10"}`}>
              <p className="text-[#8494A7] text-xs">
                &copy; 2026 World Calisthenics Organization. All rights reserved. Built on Hedera.
              </p>
              <div className="flex items-center gap-4 text-xs text-[#8494A7]">
                <Link to="/privacy" className={`transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#6AA3E0]"}`}>Privacy</Link>
                <Link to="/terms" className={`transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#6AA3E0]"}`}>Terms</Link>
                <Link to="/whitepaper" className={`transition-colors ${vipActive ? "hover:text-[#D4A843]" : "hover:text-[#6AA3E0]"}`}>Whitepaper</Link>
                <span className="text-[#4274B9]/20">|</span>
                <span>Powered by</span>
                <span className={`font-semibold ${vipActive ? "vip-gold-text" : "text-[#4274B9]"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>Hedera Hashgraph</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <Toaster position="top-right" theme="dark" richColors toastOptions={{ style: { background: "#111827", border: "1px solid rgba(66,116,185,0.15)", color: "#E8ECF0" } }} />
      <MobileBottomNav />
    </div>
  );
}