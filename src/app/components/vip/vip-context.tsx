/**
 * VIP Governor Context — The Gold Standard
 * ==========================================
 * Detects Governor NFT holders and provides VIP state site-wide.
 * When active, the entire site transforms: gold, glass, iridescence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "../wallet-context";

// ---------------------------------------------------------------------------
// Sound System
// ---------------------------------------------------------------------------

/** Programmatic audio using Web Audio API — no external files needed */
class VIPSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }

  /** Triumphant welcome chime — major chord arpeggio */
  playWelcome() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.8);
    });
  }

  /** Subtle gold hover shimmer */
  playHover() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Satisfying click */
  playClick() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Achievement unlock tone */
  playAchievement() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [783.99, 987.77, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.15 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.6);
    });
  }

  /** Vote cast confirmation */
  playVote() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  }
}

const soundEngine = new VIPSoundEngine();

// ---------------------------------------------------------------------------
// VIP Context
// ---------------------------------------------------------------------------

export interface VIPState {
  /** Whether the user is a Governor NFT holder */
  isGovernor: boolean;
  /** Whether VIP mode is visually active */
  vipActive: boolean;
  /** Number of Governor NFTs held */
  governorCount: number;
  /** VIP tier name */
  tierName: string;
  /** Whether the welcome ceremony has been shown this session */
  welcomeShown: boolean;
  /** Set welcome as shown */
  markWelcomeShown: () => void;
  /** Sound system */
  sound: VIPSoundEngine;
  /** Sound enabled toggle */
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}

const VIPContext = createContext<VIPState>({
  isGovernor: false,
  vipActive: false,
  governorCount: 0,
  tierName: "Standard",
  welcomeShown: false,
  markWelcomeShown: () => {},
  sound: soundEngine,
  soundEnabled: true,
  setSoundEnabled: () => {},
});

function getTierName(count: number): string {
  if (count >= 10) return "Diamond Governor";
  if (count >= 5) return "Platinum Governor";
  if (count >= 3) return "Gold Governor";
  if (count >= 1) return "Governor";
  return "Standard";
}

export function VIPProvider({ children }: { children: React.ReactNode }) {
  const { connected, hasGovernorNFT, governorNftsOwned } = useWallet();
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevGovernorRef = useRef(false);

  const isGovernor = connected && hasGovernorNFT;
  const vipActive = isGovernor;

  // Play welcome sound when Governor status first detected
  useEffect(() => {
    if (isGovernor && !prevGovernorRef.current) {
      soundEngine.playWelcome();
    }
    prevGovernorRef.current = isGovernor;
  }, [isGovernor]);

  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Apply VIP class to document body for global CSS hooks
  useEffect(() => {
    if (vipActive) {
      document.documentElement.classList.add("vip-governor");
    } else {
      document.documentElement.classList.remove("vip-governor");
    }
    return () => { document.documentElement.classList.remove("vip-governor"); };
  }, [vipActive]);

  const markWelcomeShown = useCallback(() => setWelcomeShown(true), []);

  const value: VIPState = {
    isGovernor,
    vipActive,
    governorCount: governorNftsOwned,
    tierName: getTierName(governorNftsOwned),
    welcomeShown,
    markWelcomeShown,
    sound: soundEngine,
    soundEnabled,
    setSoundEnabled,
  };

  return <VIPContext.Provider value={value}>{children}</VIPContext.Provider>;
}

export const useVIP = () => useContext(VIPContext);
