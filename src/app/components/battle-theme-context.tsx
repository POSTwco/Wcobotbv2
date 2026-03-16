/**
 * BOTB Dynamic Theme Engine — Battle-Contextual Color System
 * ============================================================
 * Shifts accent colors based on the current battle context.
 *
 * Each athlete gets `primaryColor` and `secondaryColor` (hex values),
 * falling back to `nftCardBorderColor`, then to the default BOTB palette.
 *
 * When a battle is "active" (most prominent in the viewport), CSS custom
 * properties are set on `<html>` to enable smooth 300ms color transitions
 * across the entire battle UI — progress bars, vote buttons, ambient glows,
 * and chat borders all react to the athletes' brand colors.
 *
 * Outside battle views, the default blue/gold palette is used.
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Athlete } from "../lib/types";

// ── Default BOTB palette ─────────────────────────────────────────────────────
const DEFAULT_A1 = "#4274B9"; // Left athlete default (BOTB blue)
const DEFAULT_A2 = "#6AA3E0"; // Right athlete default (BOTB accent)
const DEFAULT_A1_SEC = "#3563A0";
const DEFAULT_A2_SEC = "#5B8CC4";

// ── Color utilities ──────────────────────────────────────────────────────────

/** Parse hex color to RGB object */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6 && cleaned.length !== 3) return null;
  const full = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned;
  const num = parseInt(full, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Convert hex to rgba string with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(66,116,185,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/** Lighten a hex color by a percentage (0-1) */
function lightenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Darken a hex color by a percentage (0-1) */
function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ── Resolve athlete brand colors ─────────────────────────────────────────────

export interface AthleteColors {
  primary: string;
  secondary: string;
  glow: string;        // rgba at 0.15 opacity
  glowStrong: string;  // rgba at 0.30 opacity
  bg: string;          // rgba at 0.05 opacity (for card backgrounds)
  border: string;      // rgba at 0.25 opacity
  light: string;       // Lightened version for text
}

/** Resolve an athlete's full color set, with cascading fallbacks */
export function resolveAthleteColors(
  athlete: Athlete | null | undefined,
  side: "left" | "right",
): AthleteColors {
  const defaultPrimary = side === "left" ? DEFAULT_A1 : DEFAULT_A2;
  const defaultSecondary = side === "left" ? DEFAULT_A1_SEC : DEFAULT_A2_SEC;

  const primary =
    athlete?.primaryColor ||
    athlete?.nftCardBorderColor ||
    defaultPrimary;

  const secondary =
    athlete?.secondaryColor ||
    (athlete?.primaryColor ? darkenHex(athlete.primaryColor, 0.2) : null) ||
    (athlete?.nftCardBorderColor ? darkenHex(athlete.nftCardBorderColor, 0.2) : null) ||
    defaultSecondary;

  return {
    primary,
    secondary,
    glow: hexToRgba(primary, 0.15),
    glowStrong: hexToRgba(primary, 0.30),
    bg: hexToRgba(primary, 0.05),
    border: hexToRgba(primary, 0.25),
    light: lightenHex(primary, 0.3),
  };
}

// ── CSS Custom Property Management ───────────────────────────────────────────

interface ThemeVars {
  a1Primary: string;
  a1Secondary: string;
  a2Primary: string;
  a2Secondary: string;
}

const DEFAULT_VARS: ThemeVars = {
  a1Primary: DEFAULT_A1,
  a1Secondary: DEFAULT_A1_SEC,
  a2Primary: DEFAULT_A2,
  a2Secondary: DEFAULT_A2_SEC,
};

function applyThemeVars(vars: ThemeVars) {
  const root = document.documentElement;
  root.style.setProperty("--botb-a1", vars.a1Primary);
  root.style.setProperty("--botb-a1-sec", vars.a1Secondary);
  root.style.setProperty("--botb-a1-glow", hexToRgba(vars.a1Primary, 0.15));
  root.style.setProperty("--botb-a1-glow-strong", hexToRgba(vars.a1Primary, 0.3));
  root.style.setProperty("--botb-a1-bg", hexToRgba(vars.a1Primary, 0.05));
  root.style.setProperty("--botb-a2", vars.a2Primary);
  root.style.setProperty("--botb-a2-sec", vars.a2Secondary);
  root.style.setProperty("--botb-a2-glow", hexToRgba(vars.a2Primary, 0.15));
  root.style.setProperty("--botb-a2-glow-strong", hexToRgba(vars.a2Primary, 0.3));
  root.style.setProperty("--botb-a2-bg", hexToRgba(vars.a2Primary, 0.05));
}

// ── Context ──────────────────────────────────────────────────────────────────

interface BattleThemeContextValue {
  /** Set the active battle context — drives ambient background + CSS vars */
  setBattleTheme: (
    battleId: string,
    athlete1: Athlete | null,
    athlete2: Athlete | null,
  ) => void;
  /** Clear battle context — revert to default BOTB palette */
  clearBattleTheme: () => void;
  /** Currently active battle ID (if any) */
  activeBattleId: string | null;
  /** Current theme colors */
  a1: AthleteColors;
  a2: AthleteColors;
  /** Whether a battle theme is active */
  isThemed: boolean;
  /** Utility: resolve any athlete's colors by side */
  getColors: (athlete: Athlete | null | undefined, side: "left" | "right") => AthleteColors;
}

const BattleThemeContext = createContext<BattleThemeContextValue>({
  setBattleTheme: () => {},
  clearBattleTheme: () => {},
  activeBattleId: null,
  a1: resolveAthleteColors(null, "left"),
  a2: resolveAthleteColors(null, "right"),
  isThemed: false,
  getColors: resolveAthleteColors,
});

export function useBattleTheme() {
  return useContext(BattleThemeContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function BattleThemeProvider({ children }: { children: ReactNode }) {
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [a1, setA1] = useState<AthleteColors>(resolveAthleteColors(null, "left"));
  const [a2, setA2] = useState<AthleteColors>(resolveAthleteColors(null, "right"));
  const currentIdRef = useRef<string | null>(null);

  // Apply default CSS vars on mount
  useEffect(() => {
    applyThemeVars(DEFAULT_VARS);
  }, []);

  const setBattleTheme = useCallback(
    (battleId: string, athlete1: Athlete | null, athlete2: Athlete | null) => {
      // Avoid redundant updates
      if (currentIdRef.current === battleId) return;
      currentIdRef.current = battleId;

      const colors1 = resolveAthleteColors(athlete1, "left");
      const colors2 = resolveAthleteColors(athlete2, "right");

      setActiveBattleId(battleId);
      setA1(colors1);
      setA2(colors2);

      applyThemeVars({
        a1Primary: colors1.primary,
        a1Secondary: colors1.secondary,
        a2Primary: colors2.primary,
        a2Secondary: colors2.secondary,
      });
    },
    [],
  );

  const clearBattleTheme = useCallback(() => {
    if (currentIdRef.current === null) return;
    currentIdRef.current = null;

    setActiveBattleId(null);
    setA1(resolveAthleteColors(null, "left"));
    setA2(resolveAthleteColors(null, "right"));
    applyThemeVars(DEFAULT_VARS);
  }, []);

  return (
    <BattleThemeContext.Provider
      value={{
        setBattleTheme,
        clearBattleTheme,
        activeBattleId,
        a1,
        a2,
        isThemed: activeBattleId !== null,
        getColors: resolveAthleteColors,
      }}
    >
      {children}
    </BattleThemeContext.Provider>
  );
}