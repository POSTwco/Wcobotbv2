/**
 * Arena Chat media helpers — YouTube + Instagram URL parse & thumbnails.
 * Athletes/admins only attach media; everyone can view cards.
 */

export type ChatMediaType = "youtube" | "instagram";

export interface ParsedChatMedia {
  type: ChatMediaType;
  url: string;
  id: string;
  thumbUrl?: string;
  title?: string;
  kind?: "reel" | "p" | "tv" | "video";
}

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    // Prefer https canonical
    if (u.protocol === "http:") u.protocol = "https:";
    return u;
  } catch {
    return null;
  }
}

/** Extract YouTube video id from common URL shapes. */
export function parseYouTubeUrl(raw: string): ParsedChatMedia | null {
  const u = safeUrl(raw);
  if (!u || !YT_HOSTS.has(u.hostname.toLowerCase())) return null;

  let id = "";
  const host = u.hostname.toLowerCase();

  if (host === "youtu.be" || host === "www.youtu.be") {
    id = u.pathname.replace(/^\//, "").split("/")[0] || "";
  } else if (u.pathname.startsWith("/shorts/")) {
    id = u.pathname.split("/")[2] || "";
  } else if (u.pathname.startsWith("/embed/")) {
    id = u.pathname.split("/")[2] || "";
  } else if (u.pathname.startsWith("/live/")) {
    id = u.pathname.split("/")[2] || "";
  } else {
    id = u.searchParams.get("v") || "";
  }

  id = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
  if (id.length < 6) return null;

  return {
    type: "youtube",
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    title: "YouTube",
  };
}

/** Extract Instagram shortcode from /p/, /reel/, /reels/, /tv/ URLs. */
export function parseInstagramUrl(raw: string): ParsedChatMedia | null {
  const u = safeUrl(raw);
  if (!u || !IG_HOSTS.has(u.hostname.toLowerCase())) return null;

  const parts = u.pathname.split("/").filter(Boolean);
  // e.g. reel/SHORTCODE, p/SHORTCODE, tv/SHORTCODE, reels/SHORTCODE
  let kind: "reel" | "p" | "tv" | "video" = "p";
  let shortcode = "";

  if (parts[0] === "reel" || parts[0] === "reels") {
    kind = "reel";
    shortcode = parts[1] || "";
  } else if (parts[0] === "p") {
    kind = "p";
    shortcode = parts[1] || "";
  } else if (parts[0] === "tv") {
    kind = "tv";
    shortcode = parts[1] || "";
  } else if (parts[0] === "stories") {
    // Stories need username+id — skip in v1
    return null;
  }

  shortcode = shortcode.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (shortcode.length < 5) return null;

  const pathKind = kind === "reel" ? "reel" : kind === "tv" ? "tv" : "p";
  const canonical = `https://www.instagram.com/${pathKind}/${shortcode}/`;

  // Best-effort public media endpoint (often works for posts; may 403 for some reels)
  const thumbUrl = `https://www.instagram.com/${pathKind}/${shortcode}/media/?size=m`;

  return {
    type: "instagram",
    id: shortcode,
    url: canonical,
    thumbUrl,
    title: kind === "reel" ? "Instagram Reel" : "Instagram Post",
    kind,
  };
}

/** Parse a single URL into chat media, or null. */
export function parseChatMediaUrl(raw: string): ParsedChatMedia | null {
  return parseYouTubeUrl(raw) || parseInstagramUrl(raw);
}

const URL_IN_TEXT =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s]+|youtu\.be\/[^\s]+|instagram\.com\/[^\s]+)/gi;

/** First YT/IG URL found in free text (for paste-assist). */
export function extractFirstMediaUrl(text: string): ParsedChatMedia | null {
  const matches = text.match(URL_IN_TEXT);
  if (!matches?.length) return null;
  for (const m of matches) {
    const parsed = parseChatMediaUrl(m.replace(/[),.;]+$/, ""));
    if (parsed) return parsed;
  }
  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  const id = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
