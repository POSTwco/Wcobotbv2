/**
 * Admin Auth Envelope — USA Army 250th Anniversary themed unlock gate.
 * Pure aesthetic: WCO-branded giant envelope, fingerprint-only sign-in.
 * Underlying auth flow unchanged (challenge-sign via parent onAuthenticate).
 */

import { useState } from "react";
import { motion } from "motion/react";
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";

const ARMY = {
  olive: "#4B5320",
  oliveDark: "#2F3A1A",
  khaki: "#C4B998",
  parchment: "#E8DCC4",
  brass: "#C9A227",
  brassLight: "#E8C547",
  navy: "#1B2838",
  stripeWhite: "#F0EDE4",
};

/** NWU Type I–inspired Navy digital camo palette */
const NAVY_CAMO = {
  ink: "#0B1620",
  deep: "#152A38",
  mid: "#2A4A5E",
  slate: "#3D6278",
  fog: "#5A7F94",
};

const NAVY_CAMO_TILE = `url("data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
  <rect width='120' height='120' fill='${NAVY_CAMO.ink}'/>
  <rect x='0' y='0' width='24' height='24' fill='${NAVY_CAMO.deep}'/>
  <rect x='48' y='0' width='24' height='24' fill='${NAVY_CAMO.mid}'/>
  <rect x='72' y='24' width='24' height='24' fill='${NAVY_CAMO.slate}'/>
  <rect x='24' y='24' width='24' height='24' fill='${NAVY_CAMO.fog}' opacity='0.45'/>
  <rect x='96' y='48' width='24' height='24' fill='${NAVY_CAMO.deep}'/>
  <rect x='0' y='48' width='24' height='24' fill='${NAVY_CAMO.slate}'/>
  <rect x='48' y='48' width='24' height='24' fill='${NAVY_CAMO.ink}'/>
  <rect x='24' y='72' width='24' height='24' fill='${NAVY_CAMO.mid}'/>
  <rect x='72' y='72' width='24' height='24' fill='${NAVY_CAMO.fog}' opacity='0.35'/>
  <rect x='96' y='96' width='24' height='24' fill='${NAVY_CAMO.mid}'/>
  <rect x='0' y='96' width='24' height='24' fill='${NAVY_CAMO.slate}' opacity='0.6'/>
  <rect x='48' y='96' width='24' height='24' fill='${NAVY_CAMO.deep}'/>
</svg>
`)}")`;

/** Ink-on-parchment fingerprint ridges — no badge, no ring */
function RealisticFingerprint({
  className = "",
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  const ink = active ? "#2a221c" : "#3d3228";
  const mid = active ? "#4a3d32" : "#524438";
  const light = active ? "#5e4f42" : "#6a5a4c";

  const ridge = (d: string, w = 0.42, color = ink, o = 0.92) => (
    <path
      d={d}
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={o}
    />
  );

  return (
    <svg viewBox="0 0 72 88" className={className} fill="none" aria-hidden>
      {ridge("M36 4 C24 4 14 10 10 20 C7 28 8 38 12 46")}
      {ridge("M36 8 C26 8 18 13 15 21 C12.5 28 13 36 16.5 43")}
      {ridge("M36 12 C28 12 21.5 16 19 23 C17 29 17.5 35.5 20.5 41")}
      {ridge("M36 16 C30 16 25 19 23 25 C21.5 30 21.8 35.5 24 40", 0.38, mid)}
      {ridge("M36 20 C32 20 28.5 22 27 26.5 C25.8 30.5 26 34.5 27.8 38", 0.36, light, 0.85)}
      {ridge("M36 24 C33.5 24 31.5 25.5 30.8 28.5 C30.2 31 30.5 33.5 31.6 35.8", 0.34, light, 0.78)}
      {ridge("M50 6 C58 8 64 14 66 22 C67.5 30 65 38 60 44")}
      {ridge("M47 10 C54 12 59 17 60.5 24 C61.5 30 59.5 36 55.5 41")}
      {ridge("M44 14 C50 16 54 20 55 26 C55.8 31 54.2 36 51 40", 0.38, mid)}
      {ridge("M41 18 C46 20 49 23.5 49.5 28.5 C50 32.5 48.8 36 46.5 39", 0.36, light, 0.84)}
      {ridge("M22 6 C14 8 8 14 6 22 C4.5 30 7 38 12 44")}
      {ridge("M25 10 C18 12 13 17 11.5 24 C10.5 30 12.5 36 16.5 41")}
      {ridge("M28 14 C22 16 18 20 17 26 C16.2 31 17.8 36 21 40", 0.38, mid)}
      {ridge("M31 18 C26 20 23 23.5 22.5 28.5 C22 32.5 23.2 36 25.5 39", 0.36, light, 0.84)}
      {ridge("M36 30 C34 30 32.8 31.2 32.5 33 C32.2 34.5 32.8 35.8 34 36.5", 0.32, light, 0.72)}
      {ridge("M36 34 C35 34 34.3 34.8 34.2 36", 0.3, light, 0.65)}
      {ridge("M36 38 C33 38 30.5 39.5 29 42 C27.5 44.5 27.5 47.5 28.8 50")}
      {ridge("M36 42 C34 42 32.5 43.2 31.5 45.5 C30.8 47.2 31 49 32 50.5", 0.38, mid, 0.88)}
      {ridge("M36 46 C34.5 46 33.5 47 33 48.5 C32.6 49.8 33 51 33.8 52", 0.34, light, 0.8)}
      {ridge("M44 38 C46.5 38 48.5 39.5 49.5 42 C50.5 44.5 50.2 47.5 49 50")}
      {ridge("M41 42 C43 42 44.5 43.2 45.2 45 C45.8 46.5 45.5 48.2 44.5 49.5", 0.36, mid, 0.86)}
      {ridge("M28 38 C25.5 38 23.5 39.5 22.5 42 C21.5 44.5 21.8 47.5 23 50")}
      {ridge("M31 42 C29 42 27.5 43.2 26.8 45 C26.2 46.5 26.5 48.2 27.5 49.5", 0.36, mid, 0.86)}
      {ridge("M36 54 C30 54 25 56.5 22 60 C19 63.5 18.5 68 20 72")}
      {ridge("M36 58 C31.5 58 28 59.8 26 62.5 C24 65 24 68 25.5 71", 0.38, mid)}
      {ridge("M36 62 C33 62 30.5 63.5 29.2 65.8 C28 68 28.2 70.2 29.5 72", 0.36, light, 0.82)}
      {ridge("M36 66 C34.5 66 33.5 67 33 68.5 C32.6 69.8 33 71 33.8 72", 0.32, light, 0.7)}
      {ridge("M48 54 C53 54 57.5 56.5 60 60 C62.5 63.5 63 68 61.5 72")}
      {ridge("M45 58 C49 58 52 59.8 54 62.5 C56 65 56 68 54.5 71", 0.38, mid)}
      {ridge("M24 54 C19 54 14.5 56.5 12 60 C9.5 63.5 9 68 10.5 72")}
      {ridge("M27 58 C23 58 20 59.8 18 62.5 C16 65 16 68 17.5 71", 0.38, mid)}
      {ridge("M36 74 C34 74 32.5 75 32 76.5 C31.6 77.8 32 79 33 79.8", 0.3, light, 0.62)}
      {ridge("M36 78 C35.2 78 34.6 78.6 34.5 79.5", 0.28, light, 0.55)}
    </svg>
  );
}

function ArmyStars({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 24" className={className} aria-hidden>
      {Array.from({ length: 13 }, (_, i) => (
        <text
          key={i}
          x={4 + i * 9}
          y={14}
          fill={ARMY.stripeWhite}
          fontSize="7"
          opacity="0.55"
        >
          ★
        </text>
      ))}
    </svg>
  );
}

export function AdminAuthEnvelope({
  onAuthenticate,
  isAuthenticating,
  hasError = false,
}: {
  onAuthenticate: () => void;
  isAuthenticating: boolean;
  hasError?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 mb-6 flex flex-col items-center justify-center py-6 sm:py-10"
    >
      {/* Ambient patriotic glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden max-h-[520px]">
        <motion.div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[480px] h-[320px] rounded-full blur-[90px]"
          style={{ background: `radial-gradient(ellipse, ${ARMY.olive}55 0%, transparent 70%)` }}
          animate={{ opacity: [0.35, 0.55, 0.35], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-[20%] top-[25%] w-2 h-2 rounded-full"
          style={{ background: ARMY.brass, boxShadow: `0 0 12px ${ARMY.brass}` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="absolute right-[22%] top-[40%] w-1.5 h-1.5 rounded-full"
          style={{ background: ARMY.stripeWhite, boxShadow: "0 0 8px rgba(255,255,255,0.4)" }}
          animate={{ y: [0, -24, 0], opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: 1.2 }}
        />
        <motion.div
          className="absolute left-[35%] bottom-[30%] w-1 h-1 rounded-full bg-[#B22234]"
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3.8, repeat: Infinity, delay: 0.6 }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[520px] px-4">
        {/* WCO logo crest */}
        <motion.div
          className="mb-5 sm:mb-6 relative"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="absolute -inset-4 rounded-full blur-xl opacity-40"
            style={{ background: `radial-gradient(circle, ${ARMY.brass}66, transparent)` }}
          />
          <motion.div
            className="relative overflow-hidden rounded-xl border-2 px-6 py-3"
            style={{
              borderColor: `${ARMY.brass}66`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 28px ${ARMY.brass}28, inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
            animate={{
              boxShadow: [
                `0 8px 32px rgba(0,0,0,0.55), 0 0 28px ${ARMY.brass}28, inset 0 1px 0 rgba(255,255,255,0.12)`,
                `0 10px 40px rgba(0,0,0,0.6), 0 0 42px rgba(168,216,234,0.22), 0 0 56px ${ARMY.brass}33, inset 0 1px 0 rgba(255,255,255,0.18)`,
                `0 8px 32px rgba(0,0,0,0.55), 0 0 28px ${ARMY.brass}28, inset 0 1px 0 rgba(255,255,255,0.12)`,
              ],
            }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Navy NWU digital camo base */}
            <motion.div
              className="absolute inset-0 opacity-95"
              style={{
                backgroundImage: NAVY_CAMO_TILE,
                backgroundSize: "96px 96px",
              }}
              animate={{ backgroundPosition: ["0px 0px", "48px 24px", "0px 0px"] }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              aria-hidden
            />

            {/* Depth wash — keeps logo legible over camo */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${ARMY.oliveDark}cc 0%, ${NAVY_CAMO.deep}dd 45%, ${NAVY_CAMO.ink}ee 100%)`,
              }}
              aria-hidden
            />

            {/* Glass frost layer */}
            <div
              className="absolute inset-0 backdrop-blur-[3px] bg-white/[0.04]"
              style={{
                boxShadow: "inset 0 0 24px rgba(255,255,255,0.06), inset 0 -12px 28px rgba(0,0,0,0.25)",
              }}
              aria-hidden
            />

            {/* Iridescent glass shimmer */}
            <motion.div
              className="absolute inset-0 mix-blend-screen pointer-events-none"
              style={{
                background: `linear-gradient(
                  125deg,
                  transparent 0%,
                  rgba(201,162,39,0.08) 18%,
                  rgba(168,216,234,0.14) 38%,
                  rgba(196,181,253,0.12) 52%,
                  rgba(232,180,184,0.1) 68%,
                  transparent 88%
                )`,
                backgroundSize: "220% 220%",
              }}
              animate={{ backgroundPosition: ["0% 40%", "100% 60%", "0% 40%"] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />

            {/* Rotating conic iridescent halo */}
            <motion.div
              className="absolute -inset-8 opacity-[0.28] mix-blend-color-dodge pointer-events-none command-sign-iridescent"
              style={{
                background: `conic-gradient(
                  from 0deg,
                  ${ARMY.brass}55,
                  rgba(168,216,234,0.45),
                  rgba(196,181,253,0.4),
                  rgba(232,180,184,0.35),
                  ${ARMY.brassLight}55,
                  ${ARMY.brass}55
                )`,
                filter: "blur(18px)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              aria-hidden
            />

            {/* Glass edge highlight sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 46%, rgba(201,162,39,0.18) 50%, transparent 64%)",
              }}
              animate={{ x: ["-130%", "230%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.2 }}
              aria-hidden
            />

            <div className="relative z-10">
              <img
                src={wcoLogoWhite}
                alt="WCO"
                className="h-10 sm:h-12 w-auto object-contain mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
              />
              <ArmyStars className="w-full mt-2 opacity-80" />
              <p
                className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-center drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)]"
                style={{ color: ARMY.brass, fontFamily: "'Oswald', sans-serif" }}
              >
                Command Center
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Giant army envelope */}
        <motion.div
          className="relative w-full"
          animate={
            hasError
              ? { x: [0, -6, 6, -4, 4, 0] }
              : isAuthenticating
                ? { scale: [1, 1.02, 1] }
                : {}
          }
          transition={{ duration: hasError ? 0.45 : 2, repeat: isAuthenticating && !hasError ? Infinity : 0 }}
        >
          <motion.div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              height: "clamp(260px, 42vw, 340px)",
              border: `3px solid ${hasError ? "#ef4444" : ARMY.brass}`,
              boxShadow: hasError
                ? "0 0 40px rgba(239,68,68,0.35), 0 20px 60px rgba(0,0,0,0.55)"
                : `0 0 50px ${ARMY.brass}33, 0 24px 70px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.25)`,
              background: `linear-gradient(165deg, ${ARMY.parchment} 0%, ${ARMY.khaki} 28%, ${ARMY.olive}88 55%, ${ARMY.oliveDark} 100%)`,
            }}
            animate={
              hasError
                ? { borderColor: ["#ef4444", "#b91c1c", "#ef4444"] }
                : {}
            }
            transition={{ duration: 1.2, repeat: hasError ? Infinity : 0 }}
          >
            {/* Camo texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 40% 30% at 20% 40%, ${ARMY.oliveDark} 0%, transparent 100%),
                  radial-gradient(ellipse 35% 25% at 75% 60%, ${ARMY.olive} 0%, transparent 100%),
                  radial-gradient(ellipse 30% 20% at 50% 80%, #1a2e0a 0%, transparent 100%)
                `,
              }}
            />

            {/* Parchment grain */}
            <div
              className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 2px,
                  rgba(0,0,0,0.03) 2px,
                  rgba(0,0,0,0.03) 4px
                )`,
              }}
            />

            {/* Animated flap */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-20 origin-top"
              animate={{
                rotateX: isAuthenticating ? [0, -18, -8, -18, 0] : [0, -6, 0],
              }}
              transition={{
                duration: isAuthenticating ? 2 : 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ perspective: 800, transformStyle: "preserve-3d" }}
            >
              <svg viewBox="0 0 520 100" className="w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="armyFlap" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={ARMY.khaki} />
                    <stop offset="45%" stopColor={ARMY.parchment} />
                    <stop offset="100%" stopColor={ARMY.olive} stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <polygon points="0,0 520,0 260,92" fill="url(#armyFlap)" />
                <polygon
                  points="0,0 520,0 260,92"
                  fill="none"
                  stroke={ARMY.brass}
                  strokeWidth="2"
                  strokeOpacity="0.65"
                />
              </svg>
            </motion.div>

            {/* Fold creases */}
            <svg
              viewBox="0 0 520 340"
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="340" x2="260" y2="92" stroke={ARMY.brass} strokeWidth="1" strokeOpacity="0.25" />
              <line x1="520" y1="340" x2="260" y2="92" stroke={ARMY.brass} strokeWidth="1" strokeOpacity="0.25" />
            </svg>

            {/* Fingerprint pressed on envelope — sole sign-in control */}
            <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 z-30">
              <motion.button
                type="button"
                onClick={onAuthenticate}
                disabled={isAuthenticating}
                aria-label="Sign in with wallet fingerprint"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onFocus={() => setHovered(true)}
                onBlur={() => setHovered(false)}
                className="group relative flex flex-col items-center bg-transparent border-0 p-0 cursor-pointer disabled:cursor-wait focus:outline-none"
                whileTap={!isAuthenticating ? { scale: 0.97 } : {}}
              >
                <motion.div
                  animate={
                    isAuthenticating
                      ? { opacity: [0.55, 0.85, 0.55], y: [0, -1, 0] }
                      : hovered
                        ? { opacity: 1, y: -2 }
                        : { opacity: 0.82, y: 0 }
                  }
                  transition={{
                    duration: isAuthenticating ? 1.4 : 0.35,
                    repeat: isAuthenticating ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  style={{
                    filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.12)) drop-shadow(0 3px 6px rgba(58,47,38,0.18))",
                  }}
                >
                  <RealisticFingerprint
                    className="w-[72px] h-[88px] sm:w-[80px] sm:h-[96px]"
                    active={isAuthenticating || hovered}
                  />
                </motion.div>

                <motion.span
                  className="mt-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.28em] pointer-events-none"
                  style={{ color: ARMY.brass, fontFamily: "'Oswald', sans-serif" }}
                  initial={false}
                  animate={{
                    opacity: hovered && !isAuthenticating ? 1 : 0,
                    y: hovered && !isAuthenticating ? 0 : 6,
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  Sign in
                </motion.span>
              </motion.button>
            </div>

            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 48%, rgba(201,162,39,0.15) 52%, transparent 65%)",
              }}
              animate={{ x: ["-120%", "220%"] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
            />
          </motion.div>

          {/* Corner insignia accents */}
          <div
            className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg pointer-events-none"
            style={{ borderColor: ARMY.brass }}
          />
          <div
            className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg pointer-events-none"
            style={{ borderColor: ARMY.brass }}
          />
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg pointer-events-none"
            style={{ borderColor: ARMY.brass }}
          />
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 rounded-br-lg pointer-events-none"
            style={{ borderColor: ARMY.brass }}
          />
        </motion.div>
      </div>

      <style>{`
        @keyframes armyEnvelopeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .command-sign-iridescent {
          animation: commandSignIridescent 8s ease-in-out infinite;
        }
        @keyframes commandSignIridescent {
          0%, 100% { filter: blur(18px) hue-rotate(0deg) saturate(1); }
          33% { filter: blur(18px) hue-rotate(12deg) saturate(1.08); }
          66% { filter: blur(18px) hue-rotate(-8deg) saturate(1.05); }
        }
      `}</style>
    </motion.div>
  );
}