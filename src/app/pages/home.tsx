import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Swords, Mail } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { RateAthletesSection } from "../components/rate-athletes";
import { SponsorShowcase, TitleSponsorBanner } from "../components/sponsor-showcase";
import { SiteMapExploratorium } from "../components/site-map-exploratorium";
import { useConfig } from "../lib/hooks";
import { resolveHeroVideoUrl } from "../lib/site-media";
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

const ATHLETE_BG = "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/athlete1.jpg";

export function HomePage() {
  const { connected, isConnecting, openMagicEmailSignIn } = useWallet();
  const { data: config } = useConfig();
  const heroVideoSrc = resolveHeroVideoUrl(config.heroVideoUrl);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section — items-start so tall contest column doesn't collide with absolute title sponsor */}
      <section className="relative min-h-[70vh] sm:min-h-[90vh] flex items-start sm:items-center overflow-hidden">
        {/* Background - athlete image, very subtle */}
        <div className="absolute inset-0">
          <img
            src={ATHLETE_BG}
            alt="Calisthenics athlete training background"
            className="w-full h-full object-cover opacity-[0.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120] via-[#0B1120]/60 to-[#0B1120]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120] via-transparent to-[#0B1120]" />
        </div>

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(#4274B9 1px, transparent 1px), linear-gradient(90deg, #4274B9 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Title Sponsor Banner — absolutely positioned in the gap between header and hero content */}
        <TitleSponsorBanner />

        {/* Top padding clears absolute title-sponsor strip (mobile full ad row ~80px + breathing room) */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 lg:pt-40 pb-10 sm:pb-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4274B9]/10 border border-[#4274B9]/20 mb-6">
                <img src={wcoLogoWhite} alt="WCO" className="h-4 w-auto" />
                <span className="text-[#4274B9] text-xs tracking-wider font-semibold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  LIVE ON HEDERA HASHGRAPH
                </span>
              </div>

              <h1
                className="text-2xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6"
                style={{ fontFamily: "Orbitron, sans-serif", lineHeight: 1.1 }}
              >
                <span className="text-white">BATTLE</span>
                <br />
                <span className="text-white">OF THE</span>
                <br />
                <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">BARS</span>
              </h1>

              <p className="text-[#8494A7] text-sm sm:text-lg mb-5 sm:mb-6 max-w-xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                The next card. The athletes. One call per bout. No stake.
              </p>

              <div className="flex flex-row gap-2 sm:gap-3 max-w-xl">
                {!connected ? (
                  <button
                    type="button"
                    onClick={() => openMagicEmailSignIn("signin")}
                    disabled={isConnecting}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 rounded-xl transition-all ${
                      isConnecting
                        ? "bg-[#4274B9]/50 text-white/70 cursor-wait"
                        : "bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25"
                    }`}
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)" }}
                  >
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">{isConnecting ? "SIGNING IN..." : "SIGN IN"}</span>
                  </button>
                ) : (
                  <Link
                    to="/battles"
                    className="relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all"
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)" }}
                  >
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">ENTER BATTLES</span>
                  </Link>
                )}
                <Link
                  to="/athletes"
                  className="relative flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(0.6rem, 2.5vw, 0.8rem)" }}
                >
                  <span className="truncate">THE ATHLETES</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                </Link>
              </div>
            </motion.div>

            {/* Video Player with Glowing Frame */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative group"
            >
              {/* Outer glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#4274B9] via-[#6AA3E0] to-[#4274B9] rounded-2xl opacity-40 blur-md group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
              
              {/* Inner glow border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#4274B9] via-[#6AA3E0] to-[#4274B9] rounded-2xl opacity-70" />
              
              {/* Video container — links to WCO YouTube */}
              <a
                href="https://www.youtube.com/@WorldCalisthenicsOrg"
                target="_blank"
                rel="noopener noreferrer"
                className="block relative bg-[#0B1120] rounded-2xl overflow-hidden cursor-pointer"
              >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6AA3E0] to-transparent z-10" />
                
                <video
                  key={heroVideoSrc}
                  src={heroVideoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-video object-cover"
                />

                {/* YouTube CTA overlay — visible on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center z-20">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                      <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                    <span className="text-white text-xs font-bold tracking-wider px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      WATCH ON YOUTUBE
                    </span>
                  </div>
                </div>

                {/* Bottom overlay with badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/80 to-transparent p-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-400 text-xs tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>LIVE</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1120]/60 backdrop-blur-sm border border-[#4274B9]/30">
                      <img src={wcoLogoWhite} alt="WCO" className="h-3 w-auto" />
                      <span className="text-[#8494A7] text-[0.6rem] tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                        BATTLE OF THE BARS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#6AA3E0]/60 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#6AA3E0]/60 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#4274B9]/60 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#4274B9]/60 rounded-br-2xl" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sponsor Showcase — between hero and site map */}
      <SponsorShowcase />

      <SiteMapExploratorium />

      <section className="py-12 sm:py-20 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#4274B9]/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl mb-4" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">ONE CALL</span>
            </h2>
            <p className="text-[#8494A7] text-sm sm:text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              The next card. The athletes. One call per bout. No stake.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Rate Our Athletes - Centerpiece */}
      <RateAthletesSection />

      {/* CTA */}
      <section className="py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4274B9]/5 to-[#6AA3E0]/5" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* BOTB Shield — real image from Supabase bucket */}
            <div className="h-20 sm:h-28 w-auto mx-auto mb-6 flex items-center justify-center drop-shadow-2xl">
              <img src={botbShield} alt="BOTB Shield" className="h-full w-auto object-contain" />
            </div>
            <h2 className="text-2xl sm:text-4xl mb-4 sm:mb-6" style={{ fontFamily: "Orbitron, sans-serif" }}>
              <span className="text-white">JOIN THE </span>
              <span className="bg-gradient-to-r from-[#4274B9] to-[#6AA3E0] bg-clip-text text-transparent">COMPETITION</span>
            </h2>
            <div
              className="text-[#8494A7] text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed space-y-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <p className="text-[#E8ECF0] font-semibold sm:text-lg">
                Apply for your Calisthenics Athlete Pro Card.
              </p>
              <p>
                Recognized national and international competitors enter the official WCO roster,
                unlock Battle of the Bars® selection potential, and build rankings across Pro/Elite
                Comps Like Battle of the Bars®, SWUB, WSWCF Worlds, and other recognized competitions.
                Wins, losses, and power levels update automatically on Hashgraph when each event
                concludes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                to="/apply"
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#4274B9] text-white rounded-xl hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
              >
                <Swords className="w-5 h-5" /> APPLY FOR ATHLETE PRO CARD
              </Link>
              <Link
                to="/battles"
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-[#4274B9]/30 text-[#4274B9] rounded-xl hover:bg-[#4274B9]/10 transition-all"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}
              >
                VIEW BATTLES <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}