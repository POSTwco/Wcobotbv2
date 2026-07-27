/**
 * Site media constants — hero title video defaults + URL allowlist helpers.
 * Server enforces the same allowlist independently (do not trust client-only checks).
 */

export const DEFAULT_HERO_VIDEO_URL =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCOVID.M4V";

export const ALLOWED_STORAGE_HOST = "wotsoauebnoyvegcvouo.supabase.co";

export const ALLOWED_STORAGE_PATH_PREFIX = "/storage/v1/object/public/";

/**
 * Client-side pre-check (UX only). Server re-validates on write.
 */
export function isAllowedHeroVideoUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    if (u.hostname !== ALLOWED_STORAGE_HOST) return false;
    if (!u.pathname.startsWith(ALLOWED_STORAGE_PATH_PREFIX)) return false;
    // Block obvious junk
    if (u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function resolveHeroVideoUrl(configured?: string | null): string {
  const v = (configured || "").trim();
  if (v && isAllowedHeroVideoUrl(v)) return v;
  return DEFAULT_HERO_VIDEO_URL;
}
