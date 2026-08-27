/**
 * Server-side chat media URL validation (YouTube + Instagram).
 * Keep in sync with src/app/lib/chat-media.ts parsers.
 */

export interface ServerChatMedia {
  type: "youtube" | "instagram";
  url: string;
  id: string;
  thumbUrl?: string;
  title?: string;
}

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);

function safeHttpsUrl(raw: string): URL | null {
  try {
    const u = new URL(String(raw || "").trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.protocol === "http:") u.protocol = "https:";
    return u;
  } catch {
    return null;
  }
}

function parseYouTube(raw: string): ServerChatMedia | null {
  const u = safeHttpsUrl(raw);
  if (!u || !YT_HOSTS.has(u.hostname.toLowerCase())) return null;
  let id = "";
  const host = u.hostname.toLowerCase();
  if (host.includes("youtu.be")) {
    id = u.pathname.replace(/^\//, "").split("/")[0] || "";
  } else if (u.pathname.startsWith("/shorts/")) {
    id = u.pathname.split("/")[2] || "";
  } else if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/live/")) {
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

function parseInstagram(raw: string): ServerChatMedia | null {
  const u = safeHttpsUrl(raw);
  if (!u || !IG_HOSTS.has(u.hostname.toLowerCase())) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  let pathKind = "p";
  let shortcode = "";
  if (parts[0] === "reel" || parts[0] === "reels") {
    pathKind = "reel";
    shortcode = parts[1] || "";
  } else if (parts[0] === "p") {
    pathKind = "p";
    shortcode = parts[1] || "";
  } else if (parts[0] === "tv") {
    pathKind = "tv";
    shortcode = parts[1] || "";
  } else {
    return null;
  }
  shortcode = shortcode.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (shortcode.length < 5) return null;
  return {
    type: "instagram",
    id: shortcode,
    url: `https://www.instagram.com/${pathKind}/${shortcode}/`,
    thumbUrl: `https://www.instagram.com/${pathKind}/${shortcode}/media/?size=m`,
    title: pathKind === "reel" ? "Instagram Reel" : "Instagram Post",
  };
}

/**
 * Validate client-supplied media. Returns sanitized attachment or null + error.
 */
export function validateChatMedia(input: unknown): {
  media: ServerChatMedia | null;
  error?: string;
} {
  if (input == null) return { media: null };
  if (typeof input !== "object") return { media: null, error: "Invalid media payload" };
  const raw = input as Record<string, unknown>;
  const url = typeof raw.url === "string" ? raw.url.slice(0, 500) : "";
  if (!url) return { media: null, error: "Media URL required" };

  const parsed = parseYouTube(url) || parseInstagram(url);
  if (!parsed) {
    return {
      media: null,
      error: "Only YouTube and Instagram Reel/post links are allowed",
    };
  }

  // If client sent type, it must match
  if (typeof raw.type === "string" && raw.type !== parsed.type) {
    return { media: null, error: "Media type mismatch" };
  }

  return { media: parsed };
}
