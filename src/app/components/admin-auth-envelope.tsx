/**
 * Admin Auth Envelope — USA Army 250th Anniversary themed unlock gate.
 * Pure aesthetic: WCO-branded giant envelope, fingerprint-only sign-in.
 * Underlying auth flow unchanged (challenge-sign via parent onAuthenticate).
 */

import { motion } from "motion/react";
import { Fingerprint } from "lucide-react";
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
          <div
            className="relative px-6 py-3 rounded-xl border-2"
            style={{
              borderColor: `${ARMY.brass}88`,
              background: `linear-gradient(180deg, ${ARMY.oliveDark}ee, ${ARMY.navy})`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${ARMY.brass}22`,
            }}
          >
            <img
              src={wcoLogoWhite}
              alt="WCO"
              className="h-10 sm:h-12 w-auto object-contain mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            />
            <ArmyStars className="w-full mt-2 opacity-70" />
            <p
              className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-center"
              style={{ color: ARMY.brass, fontFamily: "'Oswald', sans-serif" }}
            >
              Command Center
            </p>
          </div>
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

            {/* Brass anniversary seal ring */}
            <motion.div
              className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 z-30"
              animate={
                isAuthenticating
                  ? { rotate: 360, scale: [1, 1.08, 1] }
                  : { scale: [1, 1.03, 1] }
              }
              transition={
                isAuthenticating
                  ? { rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity } }
                  : { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <div
                className="w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(from 0deg, ${ARMY.brass}, ${ARMY.brassLight}, ${ARMY.olive}, ${ARMY.brass})`,
                  boxShadow: `0 0 30px ${ARMY.brass}66, inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -4px 12px rgba(0,0,0,0.35)`,
                }}
              >
                <div
                  className="w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${ARMY.parchment}, ${ARMY.khaki} 55%, #8B7355)`,
                    border: `2px solid ${ARMY.brass}`,
                  }}
                >
                  {/* Fingerprint — sole sign-in control */}
                  <motion.button
                    type="button"
                    onClick={onAuthenticate}
                    disabled={isAuthenticating}
                    aria-label="Sign in with wallet fingerprint"
                    className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full cursor-pointer disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    whileHover={!isAuthenticating ? { scale: 1.12 } : {}}
                    whileTap={!isAuthenticating ? { scale: 0.92 } : {}}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: `radial-gradient(circle, ${ARMY.brass}44, transparent 70%)` }}
                      animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.25, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <Fingerprint
                      className="relative z-10 w-9 h-9 sm:w-10 sm:h-10"
                      style={{
                        color: isAuthenticating ? ARMY.oliveDark : ARMY.olive,
                        filter: `drop-shadow(0 2px 4px ${ARMY.brass}88)`,
                      }}
                      strokeWidth={isAuthenticating ? 1.5 : 2.2}
                    />
                    {isAuthenticating && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[#C9A227]"
                        animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

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
      `}</style>
    </motion.div>
  );
}