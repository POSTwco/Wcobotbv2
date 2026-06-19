/**
 * BOTB Frontend API Client
 * ========================
 * Typed fetch wrapper for all server API calls.
 * Handles auth headers, error parsing, admin wallet injection,
 * and session token threading for secure admin write operations.
 *
 * Security model:
 *   - Public routes: Authorization header with Supabase anon key
 *   - Admin read routes: + X-Admin-Wallet header
 *   - Admin write routes: + X-Admin-Session header (signed session token)
 *
 * Usage:
 *   import { api } from '../lib/api';
 *   const athletes = await api.getAthletes();
 *   const result = await api.admin.createAthlete(data, adminWallet, sessionToken);
 */

import { projectId, publicAnonKey } from "/utils/supabase/info";
import type {
  Athlete, Battle, BattleEvent, BattleVote, Proposal, ProposalVote,
  SiteConfig, RewardSnapshot, AthleteFormData, Sponsor, ApiResponse,
  ChatMessage, VerifiedAthleteChatInfo, EventFormData, BattleFormData,
} from "./types";

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57fcb0ee`;

// ---------------------------------------------------------------------------
// Request Timeout (20 seconds default — Web3 calls can be slow)
// ---------------------------------------------------------------------------
const DEFAULT_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Crypto-safe nonce generator (replaces weak Math.random)
// ---------------------------------------------------------------------------
export function generateSecureNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${Date.now()}-${hex}`;
}

// ---------------------------------------------------------------------------
// Error sanitizer — strips sensitive info from user-facing messages
// ---------------------------------------------------------------------------
const SENSITIVE_RE = [
  /supabase/i, /postgres/i, /kv_store/i, /ECONNREFUSED/i, /ETIMEDOUT/i,
  /at\s+\w+\s+\(/i, /node_modules/i, /\.tsx?:\d+/i, /Bearer\s+ey/i,
  /secret/i, /password/i, /key\s*[=:]/i, /webpack/i,
];

function sanitizeApiError(raw: string): string {
  if (!raw || typeof raw !== "string") return "An unexpected error occurred.";
  for (const re of SENSITIVE_RE) {
    if (re.test(raw)) return "Something went wrong. Please try again.";
  }
  if (raw.length > 200) return "An error occurred while processing your request.";
  return raw;
}

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    adminWallet?: string;
    /** Session token for admin write operations (X-Admin-Session header) */
    sessionToken?: string;
    /** Wallet session token for vote/chat operations (X-Wallet-Session header) */
    walletSessionToken?: string;
    /** Calisthenics-tab session token (X-Cali-Session header) */
    caliSessionToken?: string;
    /** Override default request timeout in ms */
    timeoutMs?: number;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, adminWallet, sessionToken, walletSessionToken, caliSessionToken, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${publicAnonKey}`,
    "Content-Type": "application/json",
  };

  if (adminWallet) {
    headers["X-Admin-Wallet"] = adminWallet;
  }

  if (sessionToken) {
    headers["X-Admin-Session"] = sessionToken;
  }

  if (walletSessionToken) {
    headers["X-Wallet-Session"] = walletSessionToken;
  }

  if (caliSessionToken) {
    headers["X-Cali-Session"] = caliSessionToken;
  }

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let json: any;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response (e.g. HTML error page)
      console.error(`[API] ${method} ${path} returned non-JSON response (${res.status})`);
      return { success: false, error: `Server returned an unexpected response (HTTP ${res.status})` };
    }

    if (!res.ok) {
      const rawError = json.error || `HTTP ${res.status}`;
      console.error(`[API] ${method} ${path} failed (${res.status}):`, json);
      return {
        success: false,
        error: sanitizeApiError(rawError),
        code: json.code,
        // Pass through rate-limit metadata for chat cooldown
        ...(json.retryAfter !== undefined && { retryAfter: json.retryAfter }),
        ...(json.cooldownMs !== undefined && { cooldownMs: json.cooldownMs }),
      };
    }

    return json as ApiResponse<T>;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === "AbortError") {
      console.error(`[API] ${method} ${path} timed out after ${timeoutMs}ms`);
      return { success: false, error: "Request timed out. Please check your connection and try again." };
    }

    const rawMsg = error?.message || "Network error";
    console.error(`[API] ${method} ${path} network error:`, rawMsg);

    // Provide user-friendly message for network failures
    if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError") || rawMsg.includes("Load failed")) {
      return { success: false, error: "Unable to reach the server. Please check your connection and try again." };
    }

    return { success: false, error: sanitizeApiError(rawMsg) };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const api = {
  // ---------------------------------------------------------------------------
  // Wallet Session — Server-side proof of WalletConnect ownership
  // ---------------------------------------------------------------------------
  registerWalletSession: (wallet: string, wcTopic: string) =>
    request<{ token: string; expiresAt: number; ttlMs: number }>("/wallet/register", {
      method: "POST",
      body: { wallet, wcTopic },
    }),

  disconnectWalletSession: (wallet: string, walletSessionToken?: string) =>
    request<{ message: string }>("/wallet/disconnect", {
      method: "POST",
      body: { wallet },
      walletSessionToken: walletSessionToken || undefined,
    }),

  // Config
  getConfig: (adminWallet?: string) =>
    request<SiteConfig & { isAdmin: boolean }>("/config", { adminWallet }),

  // Visit ping — fire-and-forget, server hashes IP, never logs raw addr.
  // Errors are swallowed so a tracking failure never breaks the page.
  trackVisit: () =>
    request<{ ok: boolean }>("/track-visit", { method: "POST" }).catch(() => ({
      success: true,
      data: { ok: true },
    })),

  // Athletes
  getAthletes: () => request<Athlete[]>("/athletes"),
  getAthlete: (id: string) => request<Athlete>(`/athletes/${id}`),

  // Events
  getEvents: () => request<BattleEvent[]>("/events"),
  getEvent: (id: string) => request<BattleEvent>(`/events/${id}`),

  // Battles
  getBattles: (filters?: { eventId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.eventId) params.set("eventId", filters.eventId);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    return request<Battle[]>(`/battles${qs ? `?${qs}` : ""}`);
  },
  getBattle: (id: string) => request<Battle>(`/battles/${id}`),

  // Proposals
  getProposals: () => request<Proposal[]>("/proposals"),
  getProposal: (id: string) => request<Proposal>(`/proposals/${id}`),

  getMyProposalVotes: (wallet: string) =>
    request<ProposalVote[]>(`/votes/proposals/${wallet}`),

  // Leaderboards
  getAthleteLeaderboard: () => request<any[]>("/leaderboard/athletes"),
  getVoterLeaderboard: () => request<any[]>("/leaderboard/voters"),

  // Voting
  voteBattle: (vote: {
    battleId: string;
    wallet: string;
    athleteId: string;
    stakeAmount: number;
    signature: string;
    signedMessage: string;
    nonce: string;
  }, walletSessionToken?: string) => request<BattleVote & {
    battleTallies?: {
      votes1Count: number;
      votes2Count: number;
      votes1Weighted: number;
      votes2Weighted: number;
    };
  }>("/vote/battle", { method: "POST", body: vote, walletSessionToken }),

  /** Batch vote on multiple battles in one event — single ED25519 signature */
  voteBattlesBatch: (payload: {
    wallet: string;
    eventId: string;
    votes: { battleId: string; athleteId: string; stakeAmount: number }[];
    signature: string;
    signedMessage: string;
    nonce: string;
  }, walletSessionToken?: string) => request<{
    wallet: string;
    eventId: string;
    votingPower: number;
    hasGovernorNFT: boolean;
    hasSigmaNFT: boolean;
    totalStaked: number;
    totalWeighted: number;
    votesProcessed: number;
    votes: {
      battleId: string;
      athleteId: string;
      stakeAmount: number;
      weightedVote: number;
      isUpdate: boolean;
      battleTallies: {
        votes1Count: number;
        votes2Count: number;
        votes1Weighted: number;
        votes2Weighted: number;
      };
    }[];
  }>("/vote/battles/batch", { method: "POST", body: payload, walletSessionToken }),

  getMyVotes: (wallet: string) =>
    request<BattleVote[]>(`/votes/mine/${wallet}`),

  // NOTE: getBattleVotes() and getVoteAllocations() are available server-side
  // but not yet wired to frontend UI. Add consumers when building live tally views.
  getBattleVotes: (battleId: string) =>
    request<{
      battleId: string;
      votes1Count: number;
      votes2Count: number;
      votes1Weighted: number;
      votes2Weighted: number;
      totalVoters: number;
      totalPool: number;
    }>(`/votes/battle/${battleId}`),

  getVoteAllocations: (wallet: string) =>
    request<{
      wallet: string;
      botbBalance: number;
      tokenLaunched: boolean;
      allocations: Record<string, { eventId: string; totalAllocated: number; battles: any[] }>;
    }>(`/vote/allocations/${wallet}`),

  voteProposal: (vote: {
    proposalId: string;
    wallet: string;
    direction: "for" | "against";
    signature: string;
    signedMessage: string;
    nonce: string;
  }, walletSessionToken?: string) => request<ProposalVote>("/vote/proposal", { method: "POST", body: vote, walletSessionToken }),

  // NOTE: voteSkill() was REMOVED. Athlete skills are now admin-only.
  // Governors may propose skill changes via governance proposals.

  // Admin check
  checkAdmin: (wallet: string) =>
    request<{ isAdmin: boolean; wallet: string }>("/admin/check", { adminWallet: wallet }),

  // Admin session auth
  requestChallenge: (wallet: string) =>
    request<{ challenge: string; nonce: string }>("/admin/challenge", {
      method: "POST",
      body: { wallet },
    }),

  verifyChallenge: (wallet: string, nonce: string, signature: string) =>
    request<{ sessionToken: string; expiresAt: number; wallet: string; ttlMinutes: number }>(
      "/admin/verify",
      { method: "POST", body: { wallet, nonce, signature } }
    ),

  adminLogout: (sessionToken: string) =>
    request<{ message: string }>("/admin/logout", {
      method: "POST",
      sessionToken,
    }),

  checkSession: (sessionToken: string) =>
    request<{ valid: boolean; remaining: number; remainingMinutes: number }>(
      "/admin/session",
      { sessionToken },
    ),

  // ---------------------------------------------------------------------------
  // Admin API (all write operations require sessionToken for security)
  // ---------------------------------------------------------------------------
  admin: {
    /** One-glance CEO dashboard summary — counts, statuses, and operational alerts */
    getDashboard: (adminWallet: string, sessionToken?: string) =>
      request<{
        summary: {
          athletes: number; events: number; battles: number; proposals: number;
          applications: number; sponsors: number; sponsorInquiries: number; totalBattleVotes: number;
        };
        battlesByStatus: Record<string, number>;
        proposalsByStatus: Record<string, number>;
        applicationsByStatus: Record<string, number>;
        sponsorStats: { active: number; totalImpressions: number; totalClicks: number };
        alerts: { pendingApplications: number; overdueVoting: number; newInquiries: number };
        generatedAt: string;
      }>("/admin/dashboard", { adminWallet, sessionToken }),

    /** Real-time unique-IP traffic counter + all-time wallet metrics (privacy-preserving, hashed). */
    getVisitStats: (adminWallet: string, sessionToken?: string) =>
      request<{
        today: number;
        yesterday: number;
        last7d: number;
        last30d: number;
        total: number;
        walletsConnected: number;
        walletsVoted: number;
        workoutsGenerated: number;
        userWallets: number;
        breakdown: { date: string; count: number }[];
        retentionDays: number;
        privacyNote: string;
      }>("/admin/visit-stats", { adminWallet, sessionToken }),

    /** Batch-update multiple battles' status at once (e.g., open voting on all R1 battles) */
    batchBattleStatus: (battleIds: string[], status: string, adminWallet: string, sessionToken?: string) =>
      request<{ results: { id: string; success: boolean; prev?: string; error?: string }[]; updated: number; total: number }>(
        "/admin/battles/batch-status",
        { method: "POST", body: { battleIds, status }, adminWallet, sessionToken }
      ),

    createAthlete: (data: AthleteFormData, adminWallet: string, sessionToken?: string) =>
      request<Athlete>("/admin/athletes", { method: "POST", body: data, adminWallet, sessionToken }),

    updateAthlete: (id: string, data: Partial<AthleteFormData>, adminWallet: string, sessionToken?: string) =>
      request<Athlete>("/admin/athletes", { method: "POST", body: { id, ...data }, adminWallet, sessionToken }),

    deleteAthlete: (id: string, adminWallet: string, sessionToken?: string) =>
      request<{ deleted: string }>(`/admin/athletes/${id}`, { method: "DELETE", adminWallet, sessionToken }),

    createEvent: (data: EventFormData, adminWallet: string, sessionToken?: string) =>
      request<BattleEvent>("/admin/events", { method: "POST", body: data, adminWallet, sessionToken }),

    updateEvent: (id: string, data: Partial<EventFormData>, adminWallet: string, sessionToken?: string) =>
      request<BattleEvent>("/admin/events", { method: "POST", body: { id, ...data }, adminWallet, sessionToken }),

    generateBracket: (data: {
      name: string;
      description?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
      totalPrizePool?: number;
      bracket: { seat: number; athleteId: string }[];
    }, adminWallet: string, sessionToken?: string) =>
      request<{ event: BattleEvent; battles: Battle[]; message: string }>(
        "/admin/events/generate",
        { method: "POST", body: data, adminWallet, sessionToken }
      ),

    createBattle: (data: BattleFormData, adminWallet: string, sessionToken?: string) =>
      request<Battle>("/admin/battles", { method: "POST", body: data, adminWallet, sessionToken }),

    updateBattle: (id: string, data: Partial<BattleFormData>, adminWallet: string, sessionToken?: string) =>
      request<Battle>("/admin/battles", { method: "POST", body: { id, ...data }, adminWallet, sessionToken }),

    updateBattleStatus: (id: string, status: string, adminWallet: string, sessionToken?: string, extras?: {
      votingOpensAt?: string;
      votingClosesAt?: string;
      totalPool?: number;
    }) =>
      request<Battle>(`/admin/battles/${id}/status`, {
        method: "POST",
        body: { status, ...extras },
        adminWallet,
        sessionToken,
      }),

    declareWinner: (battleId: string, winnerId: string, adminWallet: string, sessionToken?: string) =>
      request<{ battle: Battle; snapshot: RewardSnapshot }>(`/admin/battles/${battleId}/winner`, {
        method: "POST",
        body: { winnerId },
        adminWallet,
        sessionToken,
      }),

    listSnapshots: (adminWallet: string, sessionToken?: string) =>
      request<any[]>("/admin/snapshots", { adminWallet, sessionToken }),

    getSnapshot: (battleId: string, adminWallet: string, sessionToken?: string) =>
      request<RewardSnapshot>(`/admin/snapshots/${battleId}`, { adminWallet, sessionToken }),

    exportSnapshot: (battleId: string, format: "csv" | "json", adminWallet: string, sessionToken?: string) => {
      // Returns a direct download URL — frontend triggers via fetch+blob with session auth
      const url = `${BASE_URL}/admin/snapshots/${battleId}/export?format=${format}`;
      const headers: Record<string, string> = { Authorization: `Bearer ${publicAnonKey}`, "X-Admin-Wallet": adminWallet };
      if (sessionToken) headers["X-Admin-Session"] = sessionToken;
      return { url, headers };
    },

    batchExportSnapshots: (format: "csv" | "json", adminWallet: string, sessionToken?: string) => {
      const url = `${BASE_URL}/admin/snapshots/batch-export?format=${format}`;
      const headers: Record<string, string> = { Authorization: `Bearer ${publicAnonKey}`, "X-Admin-Wallet": adminWallet };
      if (sessionToken) headers["X-Admin-Session"] = sessionToken;
      return { url, headers };
    },

    confirmAirdrop: (battleId: string, airdropTxId: string, adminWallet: string, sessionToken?: string) =>
      request<{ battle: Battle; snapshot: RewardSnapshot }>(`/admin/battles/${battleId}/confirm-airdrop`, {
        method: "POST",
        body: { airdropTxId },
        adminWallet,
        sessionToken,
      }),

    clearCancelledBattle: (battleId: string, adminWallet: string, sessionToken?: string) =>
      request<{ id: string; title: string; votesRemoved: number }>(`/admin/battles/${battleId}/clear`, {
        method: "POST",
        body: {},
        adminWallet,
        sessionToken,
      }),

    createProposal: (data: Partial<Proposal>, adminWallet: string, sessionToken?: string) =>
      request<Proposal>("/admin/proposals", { method: "POST", body: data, adminWallet, sessionToken }),

    updateProposal: (id: string, data: Partial<Proposal>, adminWallet: string, sessionToken?: string) =>
      request<Proposal>("/admin/proposals", { method: "POST", body: { id, ...data }, adminWallet, sessionToken }),

    updateProposalStatus: (id: string, status: string, adminWallet: string, sessionToken?: string) =>
      request<Proposal>(`/admin/proposals/${id}/status`, {
        method: "POST",
        body: { status },
        adminWallet,
        sessionToken,
      }),

    updateConfig: (data: Partial<SiteConfig>, adminWallet: string, sessionToken?: string) =>
      request<SiteConfig>("/admin/config", { method: "POST", body: data, adminWallet, sessionToken }),

    seedInitialData: (adminWallet: string, sessionToken?: string) =>
      request<{ message: string; seeded: boolean; athletes?: { id: string; name: string }[] }>(
        "/admin/seed",
        { method: "POST", body: {}, adminWallet, sessionToken }
      ),

    // Applications
    getApplications: (adminWallet: string, sessionToken?: string) =>
      request<any[]>("/admin/applications", { adminWallet, sessionToken }),

    approveApplication: (id: string, adminWallet: string, sessionToken: string) =>
      request<{ application: any; athlete: any }>(`/admin/applications/${id}/approve`, {
        method: "POST", body: {}, adminWallet, sessionToken,
      }),

    rejectApplication: (id: string, adminWallet: string, sessionToken: string) =>
      request<{ id: string; message: string }>(`/admin/applications/${id}/reject`, {
        method: "POST", body: {}, adminWallet, sessionToken,
      }),

    // Sponsors
    getSponsors: (adminWallet: string, sessionToken: string) =>
      request<Sponsor[]>("/admin/sponsors", { adminWallet, sessionToken }),

    saveSponsor: (data: Partial<Sponsor>, adminWallet: string, sessionToken: string) =>
      request<Sponsor>("/admin/sponsors", { method: "POST", body: data, adminWallet, sessionToken }),

    deleteSponsor: (id: string, adminWallet: string, sessionToken: string) =>
      request<{ id: string; name: string }>(`/admin/sponsors/${id}`, { method: "DELETE", adminWallet, sessionToken }),

    toggleSponsor: (id: string, adminWallet: string, sessionToken: string) =>
      request<Sponsor>(`/admin/sponsors/${id}/toggle`, { method: "POST", body: {}, adminWallet, sessionToken }),

    getSponsorInquiries: (adminWallet: string, sessionToken: string) =>
      request<any[]>("/admin/sponsor-inquiries", { adminWallet, sessionToken }),

    deleteSponsorInquiry: (id: string, adminWallet: string, sessionToken: string) =>
      request<{ id: string }>(`/admin/sponsor-inquiries/${id}`, { method: "DELETE", adminWallet, sessionToken }),

    clearSponsorInquiries: (adminWallet: string, sessionToken: string) =>
      request<{ deleted: number }>("/admin/sponsor-inquiries", { method: "DELETE", adminWallet, sessionToken }),

    updateSponsorInquiryStatus: (id: string, status: string, adminWallet: string, sessionToken: string) =>
      request<any>(`/admin/sponsor-inquiries/${id}`, { method: "PATCH", body: { status }, adminWallet, sessionToken }),
  },

  // Public application submission
  submitApplication: (data: any) =>
    request<{ id: string; message: string }>("/applications", { method: "POST", body: data }),

  // Upload athlete application profile picture (multipart/form-data)
  uploadApplicationPfp: async (file: File, wallet: string): Promise<ApiResponse<{ path: string; previewUrl: string }>> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("wallet", wallet);
    try {
      const res = await fetch(`${BASE_URL}/applications/upload-pfp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: sanitizeApiError(json.error || `Upload failed (${res.status})`) };
      }
      return { success: true, data: json.data };
    } catch (e) {
      return { success: false, error: sanitizeApiError(String(e)) };
    }
  },

  // Sponsors (public)
  getSponsors: () => request<Sponsor[]>("/sponsors"),
  trackSponsorImpression: (id: string) =>
    request<{ success: boolean }>(`/sponsors/${id}/impression`, { method: "POST", body: {} }),
  trackSponsorClick: (id: string) =>
    request<{ success: boolean }>(`/sponsors/${id}/click`, { method: "POST", body: {} }),
  submitSponsorInquiry: (data: {
    companyName: string; contactName?: string; contactEmail: string;
    message?: string; budget?: string;
    logoUrl?: string; productImageUrl?: string; websiteUrl?: string;
  }) =>
    request<{ id: string }>("/sponsor-inquiry", { method: "POST", body: data }),

  // Notifications (all require X-Wallet-Session — prevents cross-wallet manipulation)
  getNotifications: (wallet: string, walletSessionToken?: string) =>
    request<any[]>(`/notifications/${wallet}`, {
      walletSessionToken: walletSessionToken || undefined,
    }),

  markNotificationRead: (wallet: string, notificationId: string, walletSessionToken?: string) =>
    request<{ id: string; read: boolean }>(`/notifications/${wallet}/read`, {
      method: "POST", body: { notificationId },
      walletSessionToken: walletSessionToken || undefined,
    }),

  markAllNotificationsRead: (wallet: string, walletSessionToken?: string) =>
    request<{ markedRead: number }>(`/notifications/${wallet}/read-all`, {
      method: "POST", body: {},
      walletSessionToken: walletSessionToken || undefined,
    }),

  dismissNotification: (wallet: string, notificationId: string, walletSessionToken?: string) =>
    request<{ dismissed: string }>(`/notifications/${wallet}/dismiss/${notificationId}`, {
      method: "POST", body: {},
      walletSessionToken: walletSessionToken || undefined,
    }),

  // ---------------------------------------------------------------------------
  // Arena Chat
  // ---------------------------------------------------------------------------
  chat: {
    getMessages: (wallet: string) =>
      request<ChatMessage[]>(`/chat/messages?wallet=${encodeURIComponent(wallet)}`),

    sendMessage: (wallet: string, text: string, walletSessionToken?: string) =>
      request<ChatMessage>("/chat/messages", { method: "POST", body: { wallet, text }, walletSessionToken }),

    toggleReaction: (messageId: string, wallet: string, emoji: string, walletSessionToken?: string) =>
      request<ChatMessage>(`/chat/messages/${messageId}/react`, {
        method: "POST", body: { wallet, emoji }, walletSessionToken,
      }),

    getVerifiedAthletes: () =>
      request<Record<string, VerifiedAthleteChatInfo>>("/chat/verified-athletes"),

    checkGovernor: (wallet: string) =>
      request<{ wallet: string; isGovernor: boolean }>(`/chat/check-governor?wallet=${encodeURIComponent(wallet)}`),

    sendEmote: (wallet: string, emoji: string, walletSessionToken?: string) =>
      request<{ id: string; wallet: string; emoji: string; timestamp: number; x: number }>(
        "/chat/emotes", { method: "POST", body: { wallet, emoji }, walletSessionToken }
      ),

    getEmotes: () =>
      request<Array<{ id: string; wallet: string; emoji: string; timestamp: number; x: number }>>("/chat/emotes"),
  },

  // ---------------------------------------------------------------------------
  // Phase 2 Test Tools — Admin-only, removable pre-launch
  // ---------------------------------------------------------------------------
  testTools: {
    /** Count of all KV data by prefix */
    getDataInventory: (adminWallet: string, sessionToken: string) =>
      request<Record<string, number>>("/admin/test/data-inventory", { adminWallet, sessionToken }),

    /** Purge all votes for a specific battle, reset tallies, delete snapshot */
    purgeBattleVotes: (battleId: string, adminWallet: string, sessionToken: string) =>
      request<{ battleId: string; votesRemoved: number; snapshotRemoved: boolean }>(
        `/admin/test/purge-battle-votes/${battleId}`, { method: "POST", body: {}, adminWallet, sessionToken }),

    /** Purge all votes for a specific proposal, reset counters */
    purgeProposalVotes: (proposalId: string, adminWallet: string, sessionToken: string) =>
      request<{ proposalId: string; votesRemoved: number }>(
        `/admin/test/purge-proposal-votes/${proposalId}`, { method: "POST", body: {}, adminWallet, sessionToken }),

    // NOTE: purgeSkillVotes() was REMOVED. Skill votes no longer exist.

    /** Un-declare winner: revert to voting_closed, undo W/L, delete snapshot */
    revertWinner: (battleId: string, adminWallet: string, sessionToken: string) =>
      request<{ battleId: string; previousWinnerId: string; revertedTo: string }>(
        `/admin/test/revert-winner/${battleId}`, { method: "POST", body: {}, adminWallet, sessionToken }),

    /** Force-delete any battle regardless of status + all data */
    forceDeleteBattle: (battleId: string, adminWallet: string, sessionToken: string) =>
      request<{ battleId: string; status: string; votesRemoved: number }>(
        `/admin/test/battle/${battleId}`, { method: "DELETE", adminWallet, sessionToken }),

    /** Delete event + all battles + all votes in that event */
    deleteEvent: (eventId: string, adminWallet: string, sessionToken: string) =>
      request<{ eventId: string; battlesRemoved: number; votesRemoved: number }>(
        `/admin/test/event/${eventId}`, { method: "DELETE", adminWallet, sessionToken }),

    /** Delete proposal + all votes */
    deleteProposal: (proposalId: string, adminWallet: string, sessionToken: string) =>
      request<{ proposalId: string; title: string; votesRemoved: number }>(
        `/admin/test/proposal/${proposalId}`, { method: "DELETE", adminWallet, sessionToken }),

    /** Wipe arena chat history */
    clearChat: (adminWallet: string, sessionToken: string) =>
      request<{ messagesCleared: number }>(
        "/admin/test/clear-chat", { method: "POST", body: {}, adminWallet, sessionToken }),

    /** Delete a reward snapshot without touching battle */
    deleteSnapshot: (battleId: string, adminWallet: string, sessionToken: string) =>
      request<{ battleId: string }>(
        `/admin/test/snapshot/${battleId}`, { method: "DELETE", adminWallet, sessionToken }),

    /** Flush all in-memory leaderboard caches */
    flushCaches: (adminWallet: string, sessionToken: string) =>
      request<{ flushed: string[] }>(
        "/admin/test/flush-caches", { method: "POST", body: {}, adminWallet, sessionToken }),

    /** Reset all athlete W/L/streak records to 0 */
    resetAthleteRecords: (adminWallet: string, sessionToken: string) =>
      request<{ athletesReset: number }>(
        "/admin/test/reset-athlete-records", { method: "POST", body: {}, adminWallet, sessionToken }),

    /** NUCLEAR: purge ALL votes (battle + proposal + skill) + snapshots */
    purgeAllVotes: (adminWallet: string, sessionToken: string) =>
      request<{ battleVotesRemoved: number; proposalVotesRemoved: number; skillVotesRemoved: number; snapshotsRemoved: number; totalKeysDeleted: number }>(
        "/admin/test/purge-all-votes", { method: "POST", body: { confirm: "PURGE_ALL_VOTES" }, adminWallet, sessionToken }),

    /** NUCLEAR: delete ALL data platform-wide (full fresh start) */
    nuclearReset: (adminWallet: string, sessionToken: string) =>
      request<{ totalKeysDeleted: number; counts: Record<string, number> }>(
        "/admin/test/nuclear-reset", { method: "POST", body: { confirm: "NUCLEAR_RESET" }, adminWallet, sessionToken }),

    /** Get all flagged IP anomalies */
    getIpFlags: (adminWallet: string, sessionToken: string) =>
      request<any[]>(
        "/admin/test/ip-flags", { adminWallet, sessionToken }),

    /** Clear all IP anomaly flags */
    clearIpFlags: (adminWallet: string, sessionToken: string) =>
      request<{ flagsCleared: number }>(
        "/admin/test/clear-ip-flags", { method: "POST", body: {}, adminWallet, sessionToken }),
  },

  /** Calisthenics command-center stats */
  getCaliStats: (adminWallet: string, sessionToken: string) =>
    request<{
      totalProfiles: number;
      totalWorkouts: number;
      totalLogs: number;
      totalSetsLogged: number;
      totalPRs: number;
      totalAnchored: number;
      workoutsLast24h: number;
      activeWallets: number;
      topExercises: Array<{ exerciseId: string; name: string; count: number }>;
      libraryVersion: string;
      // Live ops numbers for sign-ins + generated (new zone + dedicated admin page)
      caliSignInsToday?: number;
      caliSignInsTotal?: number;
      workoutsGeneratedTotal?: number;
    }>("/admin/cali/stats", { adminWallet, sessionToken }),

  // --- Full manual control for workouts + photos (ops console) ---
  getCaliLibrary: (adminWallet: string, sessionToken: string) =>
    request<{ libraryVersion: string; exercises: any[]; overrides: any; photoMap: any; count: number; addedCount?: number; totalCount?: number; maxTotal?: number }>(
      "/admin/cali/library", { adminWallet, sessionToken }),

  saveCaliOverride: (adminWallet: string, sessionToken: string, payload: { override?: any; overrides?: Record<string, any> }) =>
    request<{ saved: number }>(
      "/admin/cali/override", { method: "POST", body: payload, adminWallet, sessionToken }),

  getCaliPhotos: (adminWallet: string, sessionToken: string) =>
    request<{ photoMap: Record<string, string>; knownRefs: string[] }>(
      "/admin/cali/photos", { adminWallet, sessionToken }),

  saveCaliPhotos: (adminWallet: string, sessionToken: string, photoMap: Record<string, string>) =>
    request<{ assigned: number }>(
      "/admin/cali/photos", { method: "POST", body: { photoMap }, adminWallet, sessionToken }),

  saveCaliCustomRoutine: (adminWallet: string, sessionToken: string, routine: any) =>
    request<{ id: string }>(
      "/admin/cali/custom-routine", { method: "POST", body: routine, adminWallet, sessionToken }),

  getCaliCustomRoutines: (adminWallet: string, sessionToken: string) =>
    request<{ routines: any[] }>(
      "/admin/cali/custom-routines", { adminWallet, sessionToken }),

  // Add a completely new exercise to the engine
  addCaliExercise: (adminWallet: string, sessionToken: string, payload: { exercise: any }) =>
    request<{ id: string; total: number }>(
      "/admin/cali/exercise", { method: "POST", body: payload, adminWallet, sessionToken }),

  // ---------------------------------------------------------------------------
  // Calisthenics (HBAR-gated workout tab)
  // ---------------------------------------------------------------------------
  //
  // Auth shape:
  //   1. cali.challenge(accountId) → { challenge, nonce, expiresAt }
  //   2. wallet signs `challenge` via wcSignMessage(...)
  //   3. cali.verify(accountId, nonce, signature) → { sessionToken, expiresAt, eligibility }
  //   4. All other routes take the sessionToken (X-Cali-Session header)
  cali: {
    challenge: (accountId: string) =>
      request<{ challenge: string; nonce: string; expiresAt: number }>(
        "/cali/challenge", { method: "POST", body: { accountId } }),

    verify: (accountId: string, nonce: string, signature: string) =>
      request<{
        sessionToken: string;
        expiresAt: number;
        eligibility: { accountId: string; tinybars: number; checkedAt: number; expiresAt: number };
      }>("/cali/verify", { method: "POST", body: { accountId, nonce, signature } }),

    me: (caliSessionToken: string) =>
      request<{
        accountId: string;
        eligibility: { accountId: string; tinybars: number; checkedAt: number; expiresAt: number };
      }>("/cali/session/me", { caliSessionToken }),

    refresh: (caliSessionToken: string) =>
      request<{
        sessionToken: string;
        expiresAt: number;
        eligibility: { accountId: string; tinybars: number; checkedAt: number; expiresAt: number };
      }>("/cali/session/refresh", { method: "POST", caliSessionToken }),

    getProfile: (caliSessionToken: string) =>
      request<{ profile: any }>("/cali/profile", { caliSessionToken }),

    updateProfile: (caliSessionToken: string, patch: { level?: 1 | 2 | 3; equipment?: string[]; displayName?: string }) =>
      request<{ profile: any }>("/cali/profile", { method: "PUT", body: patch, caliSessionToken }),

    generate: (caliSessionToken: string, overrides?: { level?: 1 | 2 | 3; equipment?: string[] }) =>
      request<{ workout: any }>("/cali/workout/generate", { method: "POST", body: overrides ?? {}, caliSessionToken }),

    regenerate: (caliSessionToken: string, previousWorkoutId?: string, overrides?: { level?: 1 | 2 | 3; equipment?: string[] }) =>
      request<{ workout: any }>("/cali/workout/regenerate", {
        method: "POST",
        body: { previousWorkoutId, ...(overrides ?? {}) },
        caliSessionToken,
      }),

    getWorkout: (caliSessionToken: string, workoutId: string) =>
      request<{ workout: any }>(`/cali/workout/${encodeURIComponent(workoutId)}`, { caliSessionToken }),

    logSets: (
      caliSessionToken: string,
      workoutId: string,
      sets: Array<{
        blockIndex: number;
        itemIndex: number;
        setIndex: number;
        value: number;
        rpe?: number;
        note?: string;
      }>,
      opts?: { completed?: boolean; completedAt?: string },
    ) =>
      request<{ log: any; prChanges: any[]; streak: any }>(
        `/cali/workout/${encodeURIComponent(workoutId)}/log`,
        { method: "POST", body: { sets, ...(opts ?? {}) }, caliSessionToken },
      ),

    history: (caliSessionToken: string, params?: { limit?: number; before?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.before) qs.set("before", params.before);
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ items: any[]; nextCursor: string | null; total: number }>(
        `/cali/history${suffix}`, { caliSessionToken });
    },

    prs: (caliSessionToken: string) =>
      request<{ prs: any[]; count: number }>("/cali/prs", { caliSessionToken }),

    streak: (caliSessionToken: string) =>
      request<{ streak: { current: number; longest: number; lastDate: string; updatedAt: number } }>(
        "/cali/streak", { caliSessionToken }),

    anchor: (caliSessionToken: string, workoutId: string) =>
      request<{ txId: string; sequenceNumber: number; consensusTs: string }>(
        `/cali/workout/${encodeURIComponent(workoutId)}/anchor`,
        { method: "POST", caliSessionToken },
      ),

    verifyAnchor: (caliSessionToken: string, workoutId: string) =>
      request<{ ok: boolean; consensusTs: string; hashMatches: boolean }>(
        `/cali/verify-anchor/${encodeURIComponent(workoutId)}`, { caliSessionToken }),
  },
};

// Runtime bridge: ensure cali admin methods are directly on api.admin
// This is the reliable "big guns" fix — we explicitly attach them after the object literal
// in case the source placement during edits put them on root or inside testTools.
try {
  if (typeof api !== 'undefined' && api && api.admin) {
    const a: any = api.admin;
    const root = api;
    const tt = a.testTools || {};
    const caliMethodNames = ['getCaliStats', 'getCaliLibrary', 'saveCaliOverride', 'getCaliPhotos', 'saveCaliPhotos', 'saveCaliCustomRoutine', 'getCaliCustomRoutines', 'addCaliExercise'];
    caliMethodNames.forEach(name => {
      if (!a[name]) {
        if (root[name]) {
          a[name] = root[name];
        } else if (tt[name]) {
          a[name] = tt[name];
        }
      }
    });
  }
} catch (e) { /* ignore */ }

// Debug aid — run after the bridge so we report the final state.
if (typeof window !== 'undefined') {
  try {
    const adminObj: any = (api as any).admin || {};
    const caliKeys = Object.keys(adminObj).filter((k: string) => /cali/i.test(k));
    const rootCaliKeys = Object.keys(api || {}).filter((k: string) => /cali/i.test(k));
    console.log('[API] cali admin methods registered on load (after bridge):', caliKeys.length ? caliKeys : 'NONE', 'root cali keys:', rootCaliKeys);
    (window as any).__WCO_API = api;
  } catch (e) { /* ignore */ }
}
