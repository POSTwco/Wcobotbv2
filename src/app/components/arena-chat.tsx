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
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Send, X, ChevronDown, Loader2,
  Shield, Flame, Zap, Crown, Sparkles, Volume2, VolumeX,
} from "lucide-react";
import { useWallet } from "./wallet-context";
import { useVIP } from "./vip/vip-context";
import { api } from "../lib/api";
import type { ChatMessage, VerifiedAthleteChatInfo } from "../lib/types";
import {
  playSendSound, playReceiveSound, playReactionSound,
  playEmotionSound, playGovernorEntrance, playErrorSound,
} from "../lib/chat-sounds";

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
      <div className={getBubbleClasses()} style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {message.text}

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
  const { connected, accountId, walletSessionToken } = useWallet();
  const { vipActive } = useVIP();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [athleteMap, setAthleteMap] = useState<Record<string, VerifiedAthleteChatInfo>>({});
  const [input, setInput] = useState("");
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

  const wallet = accountId || "";

  // ── Restore persisted cooldown on mount / wallet change ─────────────
  useEffect(() => {
    if (!wallet) return;
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

  // ── Auto-scroll (within the chat container only — never the page) ───
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    // Only auto-scroll if the user is already near the bottom (within 150px)
    // or this is the initial message load. This prevents hijacking the page
    // scroll position when the component mounts or polls for new messages.
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 150) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  // ── Scroll detection ────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distFromBottom > 100);
  }, []);

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !wallet || sending || cooldownSeconds > 0) return;
    if (text.length > MAX_CHARS) return;

    setSending(true);
    setError(null);
    try {
      const res = await api.chat.sendMessage(wallet, text, walletSessionToken || undefined) as any;
      if (res.success && res.data) {
        setInput("");
        setMessages((prev) => [...prev, res.data!]);
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
  }, [input, wallet, sending, soundEnabled, isGovernor, cooldownSeconds]);

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

  // ── Gate: wallet required ───────────────────────────────────────────
  if (!connected) return null;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <section className="py-12 sm:py-16 relative">
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
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
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
              <div className="flex items-center gap-2 mb-2">
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
                </span>
              </div>

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
                    onKeyDown={handleKeyDown}
                    placeholder={isGovernor ? "Speak with authority, Governor..." : "Drop a message in the arena..."}
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
                  disabled={sending || !input.trim() || charOver || cooldownSeconds > 0}
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    sending || !input.trim() || charOver || cooldownSeconds > 0
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