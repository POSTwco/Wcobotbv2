import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(__dirname, "..");

export const BRAND = {
  fist: path.join(root, "src/assets/fist-wco-clear.png"),
  letters: path.join(root, "src/assets/wco-white-letters.png"),
  fistUrl:
    "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/fistWCOClear.png",
  lettersUrl:
    "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCOWHITELETTERSONLY%20CLEAR%20BACKGROUND.png",
  wcoWhiteUrl:
    "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCO%20white%20on%20trans.png",
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
  const key = filename.replace(".png", "");
  return ROUTE_ACCENT[key] ?? ROUTE_ACCENT.default;
}