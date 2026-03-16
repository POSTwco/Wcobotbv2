/**
 * VIP Welcome Ceremony
 * Dramatic entrance when Governor NFT is first detected.
 * Gold burst, crown animation, tier announcement.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Shield, Star, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useVIP } from "./vip-context";

export function VIPWelcome() {
  const { isGovernor, vipActive, welcomeShown, markWelcomeShown, tierName, governorCount, sound, soundEnabled, setSoundEnabled } = useVIP();
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState(0); // 0=burst, 1=crown, 2=text, 3=fade

  useEffect(() => {
    if (isGovernor && !welcomeShown) {
      setShow(true);
      setPhase(0);
      const t1 = setTimeout(() => setPhase(1), 400);
      const t2 = setTimeout(() => setPhase(2), 1000);
      const t3 = setTimeout(() => {
        setPhase(3);
        setTimeout(() => {
          setShow(false);
          markWelcomeShown();
        }, 800);
      }, 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isGovernor, welcomeShown, markWelcomeShown]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100000 }}
          onClick={() => { setShow(false); markWelcomeShown(); }}
        >
          {/* Backdrop with gold radial gradient */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: "radial-gradient(ellipse at center, rgba(212,168,67,0.15) 0%, rgba(11,17,32,0.95) 70%)",
            }}
          />

          {/* Radiant burst rings */}
          {phase >= 0 && (
            <>
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute rounded-full"
                  initial={{ width: 0, height: 0, opacity: 0.8 }}
                  animate={{
                    width: 400 + ring * 200,
                    height: 400 + ring * 200,
                    opacity: 0,
                  }}
                  transition={{ duration: 2, delay: ring * 0.2, ease: "easeOut" }}
                  style={{
                    border: "2px solid rgba(212,168,67,0.4)",
                    boxShadow: "0 0 40px rgba(212,168,67,0.2)",
                  }}
                />
              ))}
            </>
          )}

          {/* Center content */}
          <div className="relative flex flex-col items-center">
            {/* Crown */}
            {phase >= 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-4"
              >
                <div className="relative">
                  <Crown
                    className="w-20 h-20"
                    style={{
                      color: "#D4A843",
                      filter: "drop-shadow(0 0 20px rgba(212,168,67,0.6)) drop-shadow(0 0 40px rgba(212,168,67,0.3))",
                    }}
                  />
                  {/* Sparkles around crown */}
                  {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <motion.div
                      key={deg}
                      className="absolute"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                      transition={{ duration: 1.5, delay: 0.5 + deg / 600, repeat: Infinity, repeatDelay: 1 }}
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${deg}deg) translateY(-50px)`,
                      }}
                    >
                      <Sparkles className="w-3 h-3 text-[#F0D078]" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Welcome text */}
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <motion.p
                  className="text-sm tracking-[0.3em] mb-2"
                  style={{ color: "#D4A843", fontFamily: "Orbitron, sans-serif" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  WELCOME BACK
                </motion.p>

                <motion.h1
                  className="text-4xl md:text-5xl font-black mb-3 vip-gold-text"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  {tierName.toUpperCase()}
                </motion.h1>

                <motion.div
                  className="flex items-center gap-2 justify-center mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Shield className="w-4 h-4 text-[#D4A843]" />
                  <span className="text-[#D4A843]/80 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {governorCount} Governor NFT{governorCount !== 1 ? "s" : ""} Detected
                  </span>
                  <Shield className="w-4 h-4 text-[#D4A843]" />
                </motion.div>

                <motion.div
                  className="flex items-center gap-3 justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {["Priority Voting", "VIP Access", "Gold Theme"].map((perk, i) => (
                    <div
                      key={perk}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full vip-glass-card text-xs"
                      style={{ color: "#D4A843", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <Star className="w-3 h-3" />
                      {perk}
                    </div>
                  ))}
                </motion.div>

                <motion.p
                  className="text-[#8494A7] text-xs mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 1.2 }}
                >
                  Click anywhere to continue
                </motion.p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
