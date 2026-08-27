/**
 * BOTB Arena Chat — Governor-Enhanced Premium Experience
 * ======================================================
 * 5-Phase UI/UX Upgrade:
 *   Phase 1: Server-side Governor NFT verification via Hedera mirror node
 *   Phase 2: isGovernor flag on messages + API method
 *   Phase 3: Web Audio API sound system (send/receive/react/governor tones)
 *   Phase 4: Glassmorphism + animated glow borders + particle effects
 *   Phase 5: Floating live emotions (💪🔥⚡🏆🚀) with physics
 *
 * Governor-exclusive features (mirror-node verified):
 *   - Frosted glass UI with animated gold/blue glow borders
 *   - Premium sound effects (richer tones, entrance fanfare)
 *   - Gold Governor crown badge with pulse glow
 *   - Floating live emotion system with arm pump
 *   - Enhanced message styling with glass morphism
 *   - Particle background effects
 *
 * All features are gated behind real Governor NFT (0.0.9338241) ownership
 * verified on Hedera mainnet mirror node. Non-governors see standard chat.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Send, X, ChevronDown, Loader2,
  Shield, Flame, Zap, Crown, Sparkles, Volume2, VolumeX,
  Youtube, Instagram, Play, ExternalLink, Link2, Maximize2,
} from "lucide-react";
import { useWallet } from "./wallet-context";
import { useVIP } from "./vip/vip-context";
import { api } from "../lib/api";
import type { ChatMessage, ChatMediaAttachment, VerifiedAthleteChatInfo } from "../lib/types";
import {
  playSendSound, playReceiveSound, playReactionSound,
  playEmotionSound, playGovernorEntrance, playErrorSound,
} from "../lib/chat-sounds";
import {
  parseChatMediaUrl,
  extractFirstMediaUrl,
  youtubeEmbedUrl,
  type ParsedChatMedia,
} from "../lib/chat-media";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHARS = 250;
const POLL_INTERVAL = 8_000;
const REACTIONS = [
  { key: "fire", emoji: "\uD83D\uDD25", label: "Fire" },
  { key: "muscle", emoji: "\uD83D\uDCAA", label: "Arm Pump" },
  { key: "rock", emoji: "\uD83E\uDD18", label: "Rock" },
  { key: "check", emoji: "\u2705", label: "Check" },
  { key: "bullseye", emoji: "\uD83C\uDFAF", label: "Bullseye" },
  { key: "lightning", emoji: "\u26A1", label: "Lightning" },
  { key: "clap", emoji: "\uD83D\uDC4F", label: "Clap" },
  { key: "trophy", emoji: "\uD83C\uDFC6", label: "Trophy" },
  { key: "diamond", emoji: "\uD83D\uDC8E", label: "Diamond" },
  { key: "rocket", emoji: "\uD83D\uDE80", label: "Rocket" },
] as const;

// Quick-fire floating emotions
const QUICK_EMOTIONS = [
  { emoji: "\uD83D\uDCAA", label: "Arm Pump" },
  { emoji: "\uD83D\uDD25", label: "Fire" },
  { emoji: "\u26A1", label: "Lightning" },
  { emoji: "\uD83C\uDFC6", label: "Trophy" },
  { emoji: "\uD83D\uDE80", label: "Rocket" },
  { emoji: "\uD83D\uDC8E", label: "Diamond" },
] as const;

function shortWallet(wallet: string): string {
  if (!wallet) return "Unknown";
  return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// SessionStorage-persisted cooldown (survives page refresh)
// ---------------------------------------------------------------------------
const COOLDOWN_STORAGE_PREFIX = "botb_chat_cd_";

function getPersistedCooldown(wallet: string): number {
  try {
    const raw = sessionStorage.getItem(`${COOLDOWN_STORAGE_PREFIX}${wallet}`);
    if (!raw) return 0;
    const ts = parseInt(raw, 10);
    return ts > Date.now() ? ts : 0;
  } catch { return 0; }
}

function persistCooldown(wallet: string, endTs: number) {
  try {
    if (endTs > Date.now()) {
      sessionStorage.setItem(`${COOLDOWN_STORAGE_PREFIX}${wallet}`, String(endTs));
    } else {
      sessionStorage.removeItem(`${COOLDOWN_STORAGE_PREFIX}${wallet}`);
    }
  } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------
// Floating Emotion Particle
// ---------------------------------------------------------------------------

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // percent 0-100
  startTime: number;
}

function FloatingEmotions({ emojis, onComplete }: {
  emojis: FloatingEmoji[];
  onComplete: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {emojis.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 1, y: 0, x: `${e.x}%`, scale: 0.5 }}
            animate={{
              opacity: [1, 1, 0],
              y: [0, -120, -280],
              scale: [0.5, 1.3, 0.8],
              rotate: [0, Math.random() > 0.5 ? 15 : -15, 0],
            }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            onAnimationComplete={() => onComplete(e.id)}
            className="absolute bottom-8 text-2xl sm:text-3xl"
            style={{ left: `${e.x}%` }}
          >
            {e.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Background Particles (Governor-only)
// ---------------------------------------------------------------------------

function GovParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "radial-gradient(circle, #D4A84380 0%, transparent 70%)",
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -20, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated Glow Border (Governor-only)
// ---------------------------------------------------------------------------

function GlowBorder({ children, isGovernor }: { children: React.ReactNode; isGovernor: boolean }) {
  if (!isGovernor) return <>{children}</>;

  return (
    <div className="relative">
      {/* Outer animated glow */}
      <motion.div
        className="absolute -inset-[1px] rounded-2xl z-0"
        style={{
          background: "linear-gradient(135deg, #D4A84340, #4274B940, #D4A84340, #6AA3E040)",
          backgroundSize: "300% 300%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      {/* Soft outer glow pulse */}
      <motion.div
        className="absolute -inset-1 rounded-2xl blur-md z-0"
        animate={{
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "linear-gradient(135deg, #D4A84330, #4274B930)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Governor Badge
// ---------------------------------------------------------------------------

function GovernorBadge({ small = false }: { small?: boolean }) {
  return (
    <motion.div
      className={`inline-flex items-center gap-0.5 ${small ? "px-1 py-0.5" : "px-1.5 py-0.5"} rounded-full border`}
      style={{
        background: "linear-gradient(135deg, #D4A84320, #B8902E10)",
        borderColor: "#D4A84340",
      }}
      animate={{
        boxShadow: [
          "0 0 4px #D4A84320",
          "0 0 10px #D4A84340",
          "0 0 4px #D4A84320",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Crown className={`${small ? "w-2 h-2" : "w-2.5 h-2.5"} text-[#D4A843]`} />
      <span
        className={`${small ? "text-[0.4rem]" : "text-[0.5rem]"} font-bold text-[#D4A843] tracking-wider`}
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        GOVERNOR
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Media card — clean thumb; click opens lightbox with NO text over the media
// ---------------------------------------------------------------------------

function ChatMediaLightbox({
  media,
  thumbFailed,
  onClose,
  onThumbFail,
}: {
  media: ChatMediaAttachment;
  thumbFailed: boolean;
  onClose: () => void;
  onThumbFail: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded clip"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Media only — no captions / titles overlaid on the frame */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-3xl max-h-[min(80vh,720px)] rounded-xl overflow-hidden shadow-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === "youtube" ? (
          <div className="relative w-full aspect-video bg-black">
            <iframe
              title="YouTube"
              src={youtubeEmbedUrl(media.id)}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative w-full max-h-[min(75vh,680px)] bg-black flex items-center justify-center min-h-[240px]">
            {!thumbFailed && media.thumbUrl ? (
              <img
                src={media.thumbUrl}
                alt=""
                className="max-w-full max-h-[min(75vh,680px)] w-auto h-auto object-contain"
                referrerPolicy="no-referrer"
                onError={onThumbFail}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 bg-gradient-to-br from-[#833ab4]/50 via-[#fd1d1d]/40 to-[#fcb045]/30 w-full aspect-[4/5] max-h-[min(75vh,680px)]">
                <Instagram className="w-14 h-14 text-white/90" />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Actions sit BELOW the media — never covering it */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        {media.type === "instagram" && (
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-xs font-bold shadow-lg"
          >
            <Instagram className="w-4 h-4" /> Watch on Instagram
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {media.type === "youtube" && (
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20"
          >
            <Youtube className="w-4 h-4 text-red-400" /> Open on YouTube
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 text-xs font-bold border border-white/15"
        >
          Close
        </button>
      </div>
    </motion.div>,
    document.body,
  );
}

function ChatMediaCard({ media }: { media: ChatMediaAttachment; accent?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const isYt = media.type === "youtube";

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2 block w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 max-w-full text-left group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6AA3E0]/50"
        aria-label={isYt ? "Enlarge YouTube clip" : "Enlarge Instagram clip"}
      >
        <div
          className={`relative bg-[#0B1120] overflow-hidden ${
            isYt ? "aspect-video" : "aspect-[4/5] max-h-52"
          }`}
        >
          {!thumbFailed && media.thumbUrl ? (
            <img
              src={media.thumbUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${
                isYt
                  ? "bg-gradient-to-br from-[#1a1030] to-[#0B1120]"
                  : "bg-gradient-to-br from-[#833ab4]/40 via-[#fd1d1d]/30 to-[#fcb045]/20"
              }`}
            >
              {isYt ? (
                <Youtube className="w-10 h-10 text-red-500/80" />
              ) : (
                <Instagram className="w-10 h-10 text-white/90" />
              )}
            </div>
          )}

          {/* Hover: dim + enlarge cue only — no text labels over the image */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 duration-200">
              {isYt ? (
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-red-600/95">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-white/20 backdrop-blur-md border border-white/30">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <ChatMediaLightbox
            media={media}
            thumbFailed={thumbFailed}
            onClose={() => setExpanded(false)}
            onThumbFail={() => setThumbFailed(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Message Bubble (Governor-enhanced)
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage;
  myWallet: string;
  athleteMap: Record<string, VerifiedAthleteChatInfo>;
  onReact: (msgId: string, emoji: string) => void;
  isGovernorViewer: boolean;
  soundEnabled: boolean;
}

function MessageBubble({ message, myWallet, athleteMap, onReact, isGovernorViewer, soundEnabled }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const isMine = message.wallet === myWallet;
  const isAthlete = message.isAthlete || !!athleteMap[message.wallet];
  const athleteInfo = athleteMap[message.wallet];
  const isMsgGovernor = !!message.isGovernor;
  const displayName = isAthlete
    ? (athleteInfo?.name || message.athleteName || "Athlete")
    : shortWallet(message.wallet);

  const isAdminWallet = !!message.isAdmin;

  // Prefer structured media; fall back to parsing YT/IG URLs in the text
  // (covers Edge versions that stored the link but dropped the media field).
  const displayMedia: ChatMediaAttachment | null = useMemo(() => {
    if (message.media?.type && message.media?.url && message.media?.id) {
      return message.media;
    }
    const parsed = extractFirstMediaUrl(message.text || "");
    if (!parsed) return null;
    return {
      type: parsed.type,
      url: parsed.url,
      id: parsed.id,
      thumbUrl: parsed.thumbUrl,
      title: parsed.title,
    };
  }, [message.media, message.text]);

  const captionText = useMemo(() => {
    const raw = (message.text || "").trim();
    if (!displayMedia) return raw;
    // Hide the raw URL from caption when we're already showing a media card
    const cleaned = raw
      .replace(displayMedia.url, "")
      .replace(/https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s]+|youtu\.be\/[^\s]+|instagram\.com\/[^\s]+)/gi, "")
      .trim();
    return cleaned;
  }, [message.text, displayMedia]);

  const reactionEntries = useMemo(() => {
    return Object.entries(message.reactions || {})
      .filter(([_, wallets]) => wallets.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
  }, [message.reactions]);

  // Glassmorphism classes for Governor viewers
  const glassBase = isGovernorViewer
    ? "backdrop-blur-sm"
    : "";

  // Message bubble styles based on sender type + viewer tier
  const getBubbleClasses = () => {
    const base = `relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${glassBase}`;

    if (isMine) {
      if (isMsgGovernor && isGovernorViewer) {
        return `${base} bg-gradient-to-br from-[#D4A843]/15 to-[#4274B9]/15 text-[#E8ECF0] border border-[#D4A843]/25 rounded-br-md shadow-[0_0_15px_#D4A84315]`;
      }
      if (isAthlete) {
        return `${base} bg-gradient-to-br from-[#4274B9]/25 to-[#6AA3E0]/15 text-[#E8ECF0] border border-[#4274B9]/30 rounded-br-md`;
      }
      return `${base} bg-[#4274B9]/15 text-[#E8ECF0] border border-[#4274B9]/20 rounded-br-md ${isGovernorViewer ? "bg-[#4274B9]/10" : ""}`;
    }

    if (isMsgGovernor && isGovernorViewer) {
      return `${base} bg-gradient-to-br from-[#D4A843]/8 to-[#1a1505]/80 text-[#E8ECF0] border border-[#D4A843]/20 rounded-bl-md shadow-[0_0_12px_#D4A84310]`;
    }
    if (isAthlete) {
      return `${base} bg-gradient-to-br from-[#162033]/80 to-[#1a2a44]/60 text-[#E8ECF0] border border-[#4274B9]/25 rounded-bl-md`;
    }
    if (isAdminWallet) {
      return `${base} bg-gradient-to-br from-[#1a1505]/80 to-[#162033]/60 text-[#E8ECF0] border border-[#D4A843]/20 rounded-bl-md`;
    }
    return `${base} ${isGovernorViewer ? "bg-[#0d1525]/60 backdrop-blur-sm" : "bg-[#162033]"} text-[#E8ECF0] border border-[#4274B9]/10 rounded-bl-md`;
  };

  const handleReactClick = (msgId: string, emoji: string) => {
    onReact(msgId, emoji);
    if (soundEnabled) playReactionSound();
    setShowReactions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group relative flex flex-col ${isMine ? "items-end" : "items-start"} mb-3`}
    >
      {/* Sender info */}
      <div className={`flex items-center gap-1.5 mb-0.5 ${isMine ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        {isAthlete && athleteInfo?.pfpUrl ? (
          <img
            src={athleteInfo.pfpUrl}
            alt={displayName}
            className={`w-5 h-5 rounded-full object-cover border ${
              isMsgGovernor ? "border-[#D4A843]/50 shadow-[0_0_6px_#D4A84330]" : "border-[#4274B9]/50"
            }`}
          />
        ) : (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
            isAdminWallet
              ? "bg-gradient-to-br from-[#D4A843] to-[#B8902E] text-[#0B1120]"
              : isMsgGovernor
                ? "bg-gradient-to-br from-[#D4A843]/60 to-[#B8902E]/40 text-[#D4A843] border border-[#D4A843]/30"
                : isAthlete
                  ? "bg-gradient-to-br from-[#4274B9] to-[#6AA3E0] text-white"
                  : "bg-[#162033] text-[#8494A7] border border-[#4274B9]/20"
          }`}>
            {message.wallet.split(".").pop()?.substring(0, 2)}
          </div>
        )}

        <span className={`text-[0.6rem] font-bold tracking-wide ${
          isAdminWallet ? "text-[#D4A843]"
            : isMsgGovernor ? "text-[#D4A843]/90"
              : isAthlete ? "text-[#6AA3E0]"
                : "text-[#8494A7]"
        }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
          {isAdminWallet ? "WCO ADMIN" : displayName}
        </span>

        {/* Badges */}
        {isMsgGovernor && isGovernorViewer && <GovernorBadge small />}
        {isAthlete && (
          <div className="flex items-center gap-0.5" title="Verified Athlete">
            <Shield className="w-3 h-3 text-[#4274B9]" />
            <span className="text-[0.45rem] text-[#4274B9] font-bold">VERIFIED</span>
          </div>
        )}
        {isAdminWallet && (
          <Shield className="w-3 h-3 text-[#D4A843]" />
        )}
        <span className="text-[0.45rem] text-[#8494A7]/40">{timeAgo(message.timestamp)}</span>
      </div>

      {/* Message body */}
      <div
        className={`${getBubbleClasses()} ${displayMedia ? "min-w-[min(100%,240px)] sm:min-w-[260px]" : ""}`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {displayMedia && (
          <div className="mb-1.5 flex items-center gap-1 text-[0.45rem] font-bold tracking-wider opacity-80" style={{ color: isAdminWallet ? "#D4A843" : "#6AA3E0" }}>
            {displayMedia.type === "youtube" ? <Youtube className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
            SHARED CLIP
          </div>
        )}
        {captionText ? <p className="whitespace-pre-wrap break-words">{captionText}</p> : null}
        {displayMedia && (
          <ChatMediaCard
            media={displayMedia}
            accent={isAdminWallet ? "#D4A843" : "#4274B9"}
          />
        )}

        {/* Reaction trigger */}
        <button
          onClick={() => setShowReactions(!showReactions)}
          className={`absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center text-[#8494A7] hover:text-[#6AA3E0] ${
            isGovernorViewer
              ? "bg-[#0B1120]/80 backdrop-blur-sm border border-[#4274B9]/20 hover:border-[#6AA3E0]/40"
              : "bg-[#0B1120] border border-[#4274B9]/30 hover:border-[#6AA3E0]/50"
          }`}
        >
          <span className="text-[10px]">+</span>
        </button>
      </div>

      {/* Reaction picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`flex flex-wrap gap-1 mt-1 p-1.5 rounded-xl shadow-lg shadow-black/40 z-10 ${
              isGovernorViewer
                ? "bg-[#0B1120]/70 backdrop-blur-xl border border-[#D4A843]/15"
                : "bg-[#0B1120] border border-[#4274B9]/20"
            }`}
          >
            {REACTIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => handleReactClick(message.id, r.key)}
                title={r.label}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all text-sm ${
                  isGovernorViewer
                    ? "hover:bg-[#D4A843]/15 hover:scale-110"
                    : "hover:bg-[#4274B9]/20"
                }`}
              >
                {r.emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing reactions */}
      {reactionEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {reactionEntries.map(([emojiKey, wallets]) => {
            const reactionDef = REACTIONS.find((r) => r.key === emojiKey);
            const iReacted = wallets.includes(myWallet);
            return (
              <button
                key={emojiKey}
                onClick={() => handleReactClick(message.id, emojiKey)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all ${
                  iReacted
                    ? isGovernorViewer
                      ? "bg-[#D4A843]/15 border border-[#D4A843]/30 text-[#D4A843] shadow-[0_0_6px_#D4A84320]"
                      : "bg-[#4274B9]/25 border border-[#4274B9]/40 text-[#6AA3E0]"
                    : isGovernorViewer
                      ? "bg-[#0d1525]/50 backdrop-blur-sm border border-[#4274B9]/10 text-[#8494A7] hover:border-[#D4A843]/25"
                      : "bg-[#162033] border border-[#4274B9]/10 text-[#8494A7] hover:border-[#4274B9]/30"
                }`}
              >
                <span className="text-xs">{reactionDef?.emoji || emojiKey}</span>
                <span>{wallets.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Arena Chat Component
// ---------------------------------------------------------------------------

export function ArenaChat() {
  const { connected, accountId, walletSessionToken, isAdmin } = useWallet();
  const { vipActive } = useVIP();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [athleteMap, setAthleteMap] = useState<Record<string, VerifiedAthleteChatInfo>>({});
  const [input, setInput] = useState("");
  const [pendingMedia, setPendingMedia] = useState<ParsedChatMedia | null>(null);
  const [mediaUrlDraft, setMediaUrlDraft] = useState("");
  const [mediaTool, setMediaTool] = useState<"youtube" | "instagram" | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isGovernor, setIsGovernor] = useState(false);
  const [governorChecked, setGovernorChecked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [cooldownEnd, setCooldownEnd] = useState(0); // timestamp when cooldown expires
  const [cooldownSeconds, setCooldownSeconds] = useState(0); // live countdown

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emotePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenEmoteIdsRef = useRef<Set<string>>(new Set());
  const governorEntrancePlayed = useRef(false);
  /** First paint should land on the newest message (bottom), not the oldest (top). */
  const initialScrollDoneRef = useRef(false);
  /** Keep following new messages only while the user is near the bottom. */
  const pinnedToBottomRef = useRef(true);

  const wallet = accountId || "";
  const isVerifiedAthlete = !!(wallet && athleteMap[wallet]);
  const canShareMedia = isVerifiedAthlete || !!isAdmin;

  const attachMediaFromUrl = useCallback((raw: string, expect?: "youtube" | "instagram") => {
    const parsed = parseChatMediaUrl(raw.trim());
    if (!parsed) {
      setError("Paste a valid YouTube or Instagram Reel/post link");
      return false;
    }
    if (expect && parsed.type !== expect) {
      setError(expect === "youtube" ? "That doesn’t look like a YouTube link" : "That doesn’t look like an Instagram link");
      return false;
    }
    setPendingMedia(parsed);
    setMediaTool(null);
    setMediaUrlDraft("");
    setError(null);
    return true;
  }, []);

  // ── Restore persisted cooldown on mount / wallet change ─────────────
  useEffect(() => {
    if (!wallet) return;
    initialScrollDoneRef.current = false;
    pinnedToBottomRef.current = true;
    const persisted = getPersistedCooldown(wallet);
    if (persisted > 0) {
      setCooldownEnd(persisted);
    }
  }, [wallet]);

  // ── Persist cooldown to sessionStorage on every change ──────────────
  useEffect(() => {
    if (!wallet) return;
    persistCooldown(wallet, cooldownEnd);
  }, [cooldownEnd, wallet]);

  // ── Governor NFT check (mirror node verified) ──────────────────────
  useEffect(() => {
    if (!connected || !wallet) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.chat.checkGovernor(wallet);
        if (!cancelled && res.success && res.data) {
          setIsGovernor(res.data.isGovernor);
          // Play entrance fanfare on first Governor login
          if (res.data.isGovernor && !governorEntrancePlayed.current) {
            governorEntrancePlayed.current = true;
            setTimeout(() => {
              if (soundEnabled) playGovernorEntrance();
            }, 600);
          }
        }
      } catch (err) {
        console.error("[ArenaChat] Governor check failed:", err);
      } finally {
        if (!cancelled) setGovernorChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [connected, wallet]);

  // ── Fetch messages ──────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await api.chat.getMessages(wallet);
      if (res.success && res.data) {
        const prevCount = lastMessageCountRef.current;
        setMessages(res.data);
        lastMessageCountRef.current = res.data.length;
        // Play receive sound if new messages arrived (not on initial load)
        if (prevCount > 0 && res.data.length > prevCount && soundEnabled) {
          playReceiveSound(isGovernor);
        }
        setError(null);
      }
    } catch (err: any) {
      console.error("[ArenaChat] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [wallet, soundEnabled, isGovernor]);

  // ── Fetch athlete map ───────────────────────────────────────────────
  const fetchAthleteMap = useCallback(async () => {
    try {
      const res = await api.chat.getVerifiedAthletes();
      if (res.success && res.data) {
        setAthleteMap(res.data);
      }
    } catch (err) {
      console.error("[ArenaChat] Athlete map error:", err);
    }
  }, []);

  // ── Init + polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !wallet) return;
    fetchMessages();
    fetchAthleteMap();
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [connected, wallet, fetchMessages, fetchAthleteMap]);

  // ── Emote polling — pick up live emotes from other Governors ───────
  useEffect(() => {
    if (!connected || !wallet) return;

    const pollEmotes = async () => {
      try {
        const res = await api.chat.getEmotes();
        if (res.success && res.data && Array.isArray(res.data)) {
          const now = Date.now();
          for (const emote of res.data) {
            // Skip emotes we already displayed (our own or previously seen)
            if (seenEmoteIdsRef.current.has(emote.id)) continue;
            // Skip stale emotes older than 15s
            if (now - emote.timestamp > 15_000) continue;
            // Skip our own emotes (already shown optimistically)
            if (emote.wallet === wallet) {
              seenEmoteIdsRef.current.add(emote.id);
              continue;
            }
            // Mark as seen and spawn the floating emoji
            seenEmoteIdsRef.current.add(emote.id);
            setFloatingEmojis((prev) => [
              ...prev.slice(-15),
              { id: `remote-${emote.id}`, emoji: emote.emoji, x: emote.x, startTime: Date.now() },
            ]);
            if (soundEnabled) playEmotionSound();
          }
          // Prune seen set to prevent memory leak (keep last 200)
          if (seenEmoteIdsRef.current.size > 200) {
            const arr = [...seenEmoteIdsRef.current];
            seenEmoteIdsRef.current = new Set(arr.slice(arr.length - 100));
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    // Poll every 3 seconds for responsive emote visibility
    emotePollRef.current = setInterval(pollEmotes, 3_000);
    // Initial poll after a short delay
    const initialTimeout = setTimeout(pollEmotes, 1_000);

    return () => {
      if (emotePollRef.current) clearInterval(emotePollRef.current);
      clearTimeout(initialTimeout);
    };
  }, [connected, wallet, soundEnabled]);

  // ── Auto-scroll (chat container only — never the page) ───────────────
  // Open on the newest message (bottom). Users scroll UP for history.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || loading || messages.length === 0) return;

    const snapToBottom = (behavior: ScrollBehavior) => {
      // Prefer direct scrollTop for reliable first paint; smooth for follow-ups
      if (behavior === "auto") {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior });
      }
    };

    const run = () => {
      if (!initialScrollDoneRef.current) {
        snapToBottom("auto");
        initialScrollDoneRef.current = true;
        pinnedToBottomRef.current = true;
        setShowScrollDown(false);
        return;
      }
      if (pinnedToBottomRef.current) {
        snapToBottom("smooth");
      }
    };

    // Double rAF: wait until message bubbles have laid out height
    const id = requestAnimationFrame(() => requestAnimationFrame(run));
    return () => cancelAnimationFrame(id);
  }, [messages.length, loading]);

  // ── Scroll detection ────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distFromBottom < 120;
    pinnedToBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  }, []);

  const jumpToLatest = useCallback(() => {
    pinnedToBottomRef.current = true;
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    setShowScrollDown(false);
  }, []);

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!wallet || sending || cooldownSeconds > 0) return;
    if (!text && !pendingMedia) return;
    if (text.length > MAX_CHARS) return;

    // Auto-attach media if privileged user pasted a link and forgot to attach
    let media = pendingMedia;
    if (!media && canShareMedia && text) {
      const detected = extractFirstMediaUrl(text);
      if (detected) media = detected;
    }

    const attachment: ChatMediaAttachment | null = media
      ? {
          type: media.type,
          url: media.url,
          id: media.id,
          thumbUrl: media.thumbUrl,
          title: media.title,
        }
      : null;

    // Always keep the media URL in the text payload so even an older Edge
    // build (that ignores `media`) still stores a recoverable link.
    let textToSend = text;
    if (attachment && !textToSend.includes(attachment.url)) {
      textToSend = textToSend ? `${textToSend}\n${attachment.url}` : attachment.url;
      if (textToSend.length > MAX_CHARS) {
        textToSend = attachment.url.slice(0, MAX_CHARS);
      }
    }

    // Own messages should always land in view at the bottom
    pinnedToBottomRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await api.chat.sendMessage(
        wallet,
        textToSend,
        walletSessionToken || undefined,
        attachment,
      ) as any;
      if (res.success && res.data) {
        setInput("");
        setPendingMedia(null);
        // Merge media locally — server may omit it until Edge is redeployed
        const saved: ChatMessage = {
          ...res.data,
          media: res.data.media || attachment || undefined,
          text: res.data.text || textToSend,
        };
        setMessages((prev) => [...prev, saved]);
        lastMessageCountRef.current += 1;
        if (soundEnabled) playSendSound(isGovernor);
        // Start client-side cooldown from server response
        const cdMs = res.cooldownMs || (isGovernor ? 10_000 : 120_000);
        setCooldownEnd(Date.now() + cdMs);
      } else {
        // Handle 429 with retryAfter from server
        if (res.retryAfter && res.retryAfter > 0) {
          setCooldownEnd(Date.now() + res.retryAfter * 1000);
        }
        setError(res.error || "Failed to send message");
        if (soundEnabled) playErrorSound();
      }
    } catch (err: any) {
      setError("Unable to send message. Please check your connection and try again.");
      console.error("[ArenaChat] Send error:", err);
      if (soundEnabled) playErrorSound();
    } finally {
      setSending(false);
    }
  }, [input, wallet, sending, soundEnabled, isGovernor, cooldownSeconds, pendingMedia, canShareMedia, walletSessionToken]);

  // ── Handle reaction ─────────────────────────────────────────────────
  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    if (!wallet) return;
    try {
      const res = await api.chat.toggleReaction(msgId, wallet, emoji, walletSessionToken || undefined);
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? res.data! : m))
        );
      }
    } catch (err) {
      console.error("[ArenaChat] Reaction error:", err);
    }
  }, [wallet]);

  // ── Floating emotion handler ────────────────────────────────────────
  const spawnEmotion = useCallback(async (emoji: string) => {
    if (!isGovernor || !wallet) return; // Governor-only feature

    // Optimistic local spawn (immediate feedback for the sender)
    const localId = `emo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const x = 10 + Math.random() * 80;
    setFloatingEmojis((prev) => [...prev.slice(-15), { id: localId, emoji, x, startTime: Date.now() }]);
    if (soundEnabled) playEmotionSound();

    // Broadcast to server so other users see it
    try {
      const res = await api.chat.sendEmote(wallet, emoji, walletSessionToken || undefined);
      if (res.success && res.data) {
        // Mark the server-assigned ID as seen so we don't duplicate on poll
        seenEmoteIdsRef.current.add(res.data.id);
      }
    } catch (err) {
      console.error("[ArenaChat] Emote broadcast error:", err);
    }
  }, [isGovernor, wallet, walletSessionToken, soundEnabled]);

  const removeEmotion = useCallback((id: string) => {
    setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Keyboard handler ────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = input.length;
  const charWarning = charCount > MAX_CHARS * 0.9;
  const charOver = charCount > MAX_CHARS;

  const onlineCount = useMemo(() => {
    const recent = messages.slice(-50);
    return new Set(recent.map((m) => m.wallet)).size;
  }, [messages]);

  // ── Cooldown countdown timer ────────────────────────────────────────
  useEffect(() => {
    if (cooldownEnd <= Date.now()) {
      setCooldownSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining <= 0) setCooldownEnd(0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  // ── Gate: wallet required — keep anchor so Chat tab can scroll here ─
  if (!connected) {
    return (
      <section id="arena-chat" className="py-12 sm:py-16 relative scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-2xl border px-5 py-8 text-center"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(17,24,39,0.85) 100%)",
              borderColor: "rgba(212,168,67,0.22)",
              boxShadow: "0 0 40px rgba(212,168,67,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
            }}
          >
            <MessageSquare className="w-8 h-8 text-[#F0D078] mx-auto mb-3" />
            <h3
              className="text-white text-sm font-bold tracking-wide mb-2"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              ARENA CHAT
            </h3>
            <p className="text-[#8494A7] text-xs max-w-sm mx-auto">
              Connect your Hedera wallet to read and send messages in the community arena.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <section id="arena-chat" className="py-12 sm:py-16 relative scroll-mt-24">
      {/* Background ambient glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-[100px] pointer-events-none ${
        isGovernor ? "bg-[#D4A843]/[0.03]" : "bg-[#4274B9]/[0.02]"
      }`} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 ${
            isGovernor
              ? "bg-[#D4A843]/10 border-[#D4A843]/20"
              : "bg-[#4274B9]/10 border-[#4274B9]/20"
          }`}>
            {isGovernor ? (
              <Crown className="w-3.5 h-3.5 text-[#D4A843]" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 text-[#4274B9]" />
            )}
            <span
              className={`text-[0.6rem] tracking-wider font-semibold ${
                isGovernor ? "text-[#D4A843]" : "text-[#4274B9]"
              }`}
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {isGovernor ? "GOVERNOR-ENHANCED COMMUNITY" : "WALLET-VERIFIED COMMUNITY"}
            </span>
          </div>

          <h2
            className="text-xl sm:text-2xl md:text-3xl mb-2"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            <span className={`bg-clip-text text-transparent ${
              isGovernor
                ? "bg-gradient-to-r from-[#D4A843] via-[#6AA3E0] to-[#D4A843]"
                : "bg-gradient-to-r from-[#4274B9] to-[#6AA3E0]"
            }`}>
              ARENA CHAT
            </span>
          </h2>

          <p className="text-[#8494A7] text-sm max-w-lg mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {isGovernor ? (
              <>Governor-enhanced experience active. Premium sound, visuals & live emotions unlocked.{" "}
              <span className="text-[#D4A843]">Your NFT speaks.</span></>
            ) : (
              <>Talk directly with verified BOTB athletes and the community.{" "}
              <span className="text-[#6AA3E0]">Your wallet is your identity.</span></>
            )}
          </p>

          {/* Governor status indicator */}
          {governorChecked && isGovernor && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 inline-flex items-center gap-2"
            >
              <GovernorBadge />
              <span className="text-[0.55rem] text-[#8494A7]/60">Mirror-node verified</span>
            </motion.div>
          )}
        </motion.div>

        {/* Chat Container */}
        <GlowBorder isGovernor={isGovernor}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`rounded-2xl overflow-hidden border relative ${
              isGovernor
                ? "bg-[#0B1120]/80 backdrop-blur-xl border-[#D4A843]/15"
                : vipActive
                  ? "bg-[#0d0f14] border-[#D4A843]/20"
                  : "bg-[#0B1120] border-[#4274B9]/15"
            }`}
          >
            {/* Governor particles */}
            {isGovernor && <GovParticles />}

            {/* Floating emotions layer */}
            <FloatingEmotions emojis={floatingEmojis} onComplete={removeEmotion} />

            {/* Chat header bar */}
            <div className={`flex items-center justify-between px-4 py-3 border-b relative z-10 ${
              isGovernor
                ? "border-[#D4A843]/10 bg-[#0d1525]/60 backdrop-blur-sm"
                : vipActive
                  ? "border-[#D4A843]/10 bg-[#D4A843]/5"
                  : "border-[#4274B9]/10 bg-[#111827]/50"
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className={`w-2 h-2 rounded-full ${isGovernor ? "bg-[#D4A843]" : "bg-green-500"}`}
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span
                    className={`text-[0.65rem] font-bold tracking-wider ${isGovernor ? "text-[#D4A843]" : "text-[#E8ECF0]"}`}
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    LIVE
                  </span>
                </div>
                <span className="text-[#8494A7] text-[0.55rem]">
                  {onlineCount} active {onlineCount === 1 ? "user" : "users"} &middot; {messages.length}/200
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Sound toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1 rounded-lg transition-colors ${
                    soundEnabled
                      ? isGovernor ? "text-[#D4A843] hover:bg-[#D4A843]/10" : "text-[#6AA3E0] hover:bg-[#4274B9]/10"
                      : "text-[#8494A7]/30 hover:bg-[#162033]"
                  }`}
                  title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[0.5rem] text-[#8494A7] ${
                  isGovernor
                    ? "bg-[#0d1525]/60 backdrop-blur-sm border-[#D4A843]/10"
                    : "bg-[#162033] border-[#4274B9]/10"
                }`}>
                  <Shield className={`w-2.5 h-2.5 ${isGovernor ? "text-[#D4A843]" : "text-[#4274B9]"}`} />
                  {Object.keys(athleteMap).length} verified
                </div>
              </div>
            </div>

            {/* Quick Emotions Bar (Governor-only) */}
            {isGovernor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center justify-center gap-1 px-4 py-2 border-b border-[#D4A843]/5 bg-[#0d1525]/30 backdrop-blur-sm relative z-10"
              >
                <Sparkles className="w-3 h-3 text-[#D4A843]/40 mr-1" />
                <span className="text-[0.5rem] text-[#D4A843]/40 mr-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  LIVE EMOTES
                </span>
                {QUICK_EMOTIONS.map((e) => (
                  <motion.button
                    key={e.label}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => spawnEmotion(e.emoji)}
                    title={e.label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-[#D4A843]/10 transition-colors"
                  >
                    {e.emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Messages area */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="relative h-[400px] sm:h-[450px] overflow-y-auto px-4 py-3 space-y-1 scroll-smooth z-10"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: isGovernor ? "#D4A84320 transparent" : "#4274B920 transparent",
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-2 ${isGovernor ? "text-[#D4A843]" : "text-[#4274B9]"}`} />
                    <p className="text-[#8494A7] text-xs">Loading chat...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className={`w-8 h-8 mx-auto mb-3 ${isGovernor ? "text-[#D4A843]/20" : "text-[#4274B9]/20"}`} />
                    <p className="text-[#8494A7] text-sm mb-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                      THE ARENA IS QUIET
                    </p>
                    <p className="text-[#8494A7]/60 text-xs">Be the first to drop a message!</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.length >= 195 && (
                    <div className="text-center py-2">
                      <span className={`text-[0.55rem] px-3 py-1 rounded-full ${
                        isGovernor
                          ? "text-[#D4A843]/30 bg-[#D4A843]/5 backdrop-blur-sm"
                          : "text-[#8494A7]/40 bg-[#162033]"
                      }`}>
                        Oldest messages auto-delete at 200 cap
                      </span>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      myWallet={wallet}
                      athleteMap={athleteMap}
                      onReact={handleReact}
                      isGovernorViewer={isGovernor}
                      soundEnabled={soundEnabled}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Scroll to bottom */}
              <AnimatePresence>
                {showScrollDown && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={jumpToLatest}
                    className={`sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg transition-colors z-20 ${
                      isGovernor
                        ? "bg-[#D4A843] shadow-[#D4A843]/30 hover:bg-[#B8902E]"
                        : "bg-[#4274B9] shadow-[#4274B9]/30 hover:bg-[#3563A0]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 relative z-10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 text-xs">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div className={`px-4 py-3 border-t relative z-10 ${
              isGovernor
                ? "border-[#D4A843]/10 bg-[#080b12]/80 backdrop-blur-sm"
                : vipActive
                  ? "border-[#D4A843]/10 bg-[#0d0f14]"
                  : "border-[#4274B9]/10 bg-[#0a0e18]"
            }`}>
              {/* Identity bar */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  isGovernor
                    ? "bg-[#D4A843]/20 border border-[#D4A843]/30"
                    : "bg-[#4274B9]/20 border border-[#4274B9]/30"
                }`}>
                  <span className={`text-[6px] font-bold ${isGovernor ? "text-[#D4A843]" : "text-[#6AA3E0]"}`}>
                    {wallet.split(".").pop()?.substring(0, 2)}
                  </span>
                </div>
                <span className="text-[0.55rem] text-[#8494A7]">
                  Chatting as <span className={`font-semibold ${isGovernor ? "text-[#D4A843]" : "text-[#6AA3E0]"}`}>{shortWallet(wallet)}</span>
                  {isGovernor && (
                    <span className="ml-1.5">
                      <Crown className="w-2.5 h-2.5 inline text-[#D4A843]" />
                    </span>
                  )}
                  {athleteMap[wallet] && (
                    <span className="ml-1 text-[#4274B9]">
                      <Shield className="w-2.5 h-2.5 inline" /> {athleteMap[wallet].name}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="ml-1 text-[#D4A843] font-bold">ADMIN</span>
                  )}
                </span>
                {canShareMedia && (
                  <span className={`ml-auto text-[0.4rem] font-bold tracking-wider px-1.5 py-0.5 rounded ${
                    isAdmin ? "bg-[#D4A843]/15 text-[#D4A843]" : "bg-[#4274B9]/15 text-[#6AA3E0]"
                  }`}>
                    {isAdmin ? "ADMIN SHARE" : "ATHLETE SHARE"}
                  </span>
                )}
              </div>

              {/* Athlete / Admin media tools */}
              {canShareMedia && (
                <div className="mb-2 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMediaTool(mediaTool === "youtube" ? null : "youtube")}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold border transition-all ${
                        mediaTool === "youtube" || pendingMedia?.type === "youtube"
                          ? "bg-red-500/20 border-red-500/40 text-red-300"
                          : "bg-[#162033] border-[#4274B9]/20 text-[#8494A7] hover:border-red-500/30 hover:text-red-300"
                      }`}
                    >
                      <Youtube className="w-3.5 h-3.5" /> YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaTool(mediaTool === "instagram" ? null : "instagram")}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold border transition-all ${
                        mediaTool === "instagram" || pendingMedia?.type === "instagram"
                          ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                          : "bg-[#162033] border-[#4274B9]/20 text-[#8494A7] hover:border-pink-500/30 hover:text-pink-300"
                      }`}
                    >
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const detected = extractFirstMediaUrl(input);
                        if (detected) {
                          setPendingMedia(detected);
                          setError(null);
                        } else {
                          setError("Paste a YouTube or Instagram link in your message first");
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold border bg-[#162033] border-[#4274B9]/20 text-[#8494A7] hover:border-[#6AA3E0]/40 hover:text-[#6AA3E0]"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Detect link
                    </button>
                  </div>

                  {mediaTool && (
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={mediaUrlDraft}
                        onChange={(e) => setMediaUrlDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            attachMediaFromUrl(mediaUrlDraft, mediaTool);
                          }
                        }}
                        placeholder={
                          mediaTool === "youtube"
                            ? "Paste YouTube URL…"
                            : "Paste Instagram Reel / post URL…"
                        }
                        className="flex-1 min-w-0 rounded-lg bg-[#0B1120] border border-[#4274B9]/25 px-2.5 py-1.5 text-xs text-[#E8ECF0] outline-none focus:border-[#6AA3E0]/50"
                      />
                      <button
                        type="button"
                        onClick={() => attachMediaFromUrl(mediaUrlDraft, mediaTool)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#4274B9] text-white text-[0.55rem] font-bold"
                      >
                        Attach
                      </button>
                    </div>
                  )}

                  {pendingMedia && (
                    <div className="relative rounded-xl border border-[#4274B9]/25 overflow-hidden bg-[#0B1120]/80">
                      <div className="flex items-center gap-2 p-2">
                        <div className="w-16 h-12 rounded-md overflow-hidden bg-black/40 shrink-0">
                          {pendingMedia.thumbUrl ? (
                            <img
                              src={pendingMedia.thumbUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {pendingMedia.type === "youtube" ? (
                                <Youtube className="w-5 h-5 text-red-400" />
                              ) : (
                                <Instagram className="w-5 h-5 text-pink-400" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.55rem] font-bold text-[#E8ECF0] truncate">
                            {pendingMedia.title || pendingMedia.type}
                          </p>
                          <p className="text-[0.45rem] text-[#8494A7] truncate">{pendingMedia.url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingMedia(null)}
                          className="p-1 rounded-md text-[#8494A7] hover:text-white"
                          aria-label="Remove media"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cooldown indicator */}
              <AnimatePresence>
                {cooldownSeconds > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-[0.6rem] ${
                      isGovernor
                        ? "bg-[#D4A843]/5 border border-[#D4A843]/10 text-[#D4A843]/70"
                        : "bg-[#4274B9]/5 border border-[#4274B9]/10 text-[#8494A7]"
                    }`}
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    <div className="relative w-4 h-4">
                      <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
                        <circle
                          cx="8" cy="8" r="6" fill="none"
                          stroke="currentColor" strokeWidth="1.5"
                          strokeDasharray={`${2 * Math.PI * 6}`}
                          strokeDashoffset={`${2 * Math.PI * 6 * (1 - cooldownSeconds / (isGovernor ? 10 : 120))}`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span>COOLDOWN {cooldownSeconds}s</span>
                    <span className="opacity-40">
                      {isGovernor ? "(Governor: 10s)" : "(Standard: 2m)"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS + 10))}
                    onPaste={(e) => {
                      if (!canShareMedia) return;
                      const pasted = e.clipboardData.getData("text");
                      const detected = parseChatMediaUrl(pasted.trim()) || extractFirstMediaUrl(pasted);
                      if (detected) {
                        // Don't block paste into textarea; offer attach
                        setTimeout(() => {
                          if (!pendingMedia) setPendingMedia(detected);
                        }, 0);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      canShareMedia
                        ? "Share a tip, Reel, or fight clip…"
                        : isGovernor
                          ? "Speak with authority, Governor..."
                          : "Drop a message in the arena..."
                    }
                    rows={1}
                    maxLength={MAX_CHARS + 10}
                    className={`w-full border rounded-xl px-3 py-2.5 text-[#E8ECF0] text-sm outline-none resize-none transition-colors ${
                      charOver
                        ? "border-red-500/50 focus:border-red-500"
                        : isGovernor
                          ? "bg-[#0d1525]/60 backdrop-blur-sm border-[#D4A843]/15 focus:border-[#D4A843]/40 placeholder:text-[#D4A843]/20"
                          : "bg-[#162033] border-[#4274B9]/20 focus:border-[#4274B9]/50 placeholder:text-[#8494A7]/30"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "40px", maxHeight: "80px" }}
                  />
                  <div className={`absolute bottom-1.5 right-2 text-[0.5rem] ${
                    charOver ? "text-red-400" : charWarning ? "text-amber-400" : "text-[#8494A7]/30"
                  }`}>
                    {charCount}/{MAX_CHARS}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && !pendingMedia) || charOver || cooldownSeconds > 0}
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    sending || (!input.trim() && !pendingMedia) || charOver || cooldownSeconds > 0
                      ? "bg-[#162033] text-[#8494A7]/30 cursor-not-allowed"
                      : isGovernor
                        ? "bg-gradient-to-br from-[#D4A843] to-[#B8902E] text-[#0B1120] hover:shadow-lg hover:shadow-[#D4A843]/25"
                        : "bg-[#4274B9] text-white hover:bg-[#3563A0] hover:shadow-lg hover:shadow-[#4274B9]/25"
                  }`}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </GlowBorder>

        {/* Bottom info bar */}
        <div className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-4 text-[0.5rem] ${
          isGovernor ? "text-[#D4A843]/25" : "text-[#8494A7]/30"
        }`} style={{ fontFamily: "Orbitron, sans-serif" }}>
          <span className="flex items-center gap-1">
            {isGovernor ? <Crown className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
            {isGovernor ? "GOVERNOR TIER" : "HEDERA VERIFIED"}
          </span>
          <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> 200 MSG LIMIT</span>
          <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> 250 CHAR MAX</span>
          <span className="flex items-center gap-1"><Flame className="w-2.5 h-2.5" /> ONLY GAINS</span>
          {isGovernor && (
            <span className="flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> PREMIUM FX</span>
          )}
        </div>
      </div>
    </section>
  );
}