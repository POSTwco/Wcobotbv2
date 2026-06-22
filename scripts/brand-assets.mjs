import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(__dirname, "..");

/** Official WCO brand files (only these two). */
export const BRAND = {
  fist: path.join(root, "src/assets/brand/fist-wco.jpg"),
  wordmark: path.join(root, "src/assets/brand/wco-clear.png"),
};

export const BRAND_URLS = {
  fist: "https://www.wcorg.io/android-chrome-512x512.png",
  wordmark: "https://www.wcorg.io/og/home.png",
};

export const ROUTE_ACCENT = {
  home: "#D4A843",
  battles: "#E85D4C",
  athletes: "#6AA3E0",
  nfts: "#9B59B6",
  governance: "#D4A843",
  leaderboard: "#4274B9",
  apply: "#2ECC71",
  calisthenics: "#4274B9",
  default: "#4274B9",
};

export function accentForOg(filename) {
  const key = filename.replace(".png", "").replace(".jpg", "");
  return ROUTE_ACCENT[key] ?? ROUTE_ACCENT.default;
}

/** Platform output specs for social / SEO images. */
export const SOCIAL_SPECS = {
  /** Facebook, LinkedIn, Discord, Google link previews */
  openGraph: { width: 1200, height: 630, dir: "og", ext: "png" },
  /** X/Twitter summary_large_image (2:1 safe area) */
  twitter: { width: 1200, height: 600, dir: "social/twitter", ext: "png" },
  /** GitHub repo social preview */
  github: { width: 1280, height: 640, dir: "social/github", ext: "png" },
  /** Square fallback (some scrapers) */
  square: { width: 1200, height: 1200, dir: "social/square", ext: "png" },
};