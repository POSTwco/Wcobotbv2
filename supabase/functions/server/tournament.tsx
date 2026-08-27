/**
 * BOTB Tournament Mode — Champion-pick voting (additive to 1v1 battles)
 * =====================================================================
 * Fans pick ONE overall champion for a multi-athlete single-elim event.
 * Does NOT create public 1v1 Battle vote targets. Battle wins/losses untouched.
 *
 * KV:
 *   event:{id}                          — BattleEvent with format:"tournament"
 *   vote:tournament:{eventId}:{wallet}  — champion pick
 *   vote-nonce:{nonce}                  — replay protection (shared namespace style)
 *   snapshot:tournament:{eventId}       — correct pickers after champion declare
 */

import type { Context } from "npm:hono";
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { acquireLock } from "./scaling.tsx";
import {
  isValidHederaAccountId,
  checkRateLimit,
  sanitizeString,
  sanitizeNumber,
  requireAdminSession,
  verifyWalletOnMirrorNode,
  verifyVoteSignature,
  validateWalletSessionToken,
  hasGovernorNFT,
} from "./admin-auth.tsx";

const BOTB_TOKEN_ID: string | null = null; // Keep in sync with index.tsx until shared config
const MIRROR_BASE = "https://mainnet.mirrornode.hedera.com";
const MIRROR_NODE_TIMEOUT_MS = 10_000;

const TOURNAMENT_MIN = 3;
const TOURNAMENT_MAX = 12;
const DOUBLE_ELIM_ENABLED = false; // Phase 2

type TournamentVotingStatus =
  | "draft"
  | "upcoming"
  | "voting_open"
  | "voting_closed"
  | "champion_declared"
  | "rewards_distributed";

export interface TournamentMatch {
  id: string;
  round: number;
  roundName: string;
  bracketSide: "winners" | "losers";
  position: number;
  athlete1Id: string | null;
  athlete2Id: string | null;
  winnerId?: string | null;
  isBye?: boolean;
  nextMatchId?: string | null;
  nextSlot?: 1 | 2 | null;
}

function now(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundNameFor(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finals";
  if (fromEnd === 1) return "Semi-Finals";
  if (fromEnd === 2) return "Quarter-Finals";
  return `Round ${round}`;
}

/**
 * Build a single-elimination winners bracket with byes.
 * Seats are 1..N (1 = top seed). Pad to next power of 2 with null bye slots.
 * R1 pairing: seed i vs seed (bracketSize+1-i) style after padding.
 */
export function buildSingleElimMatches(
  seats: { seat: number; athleteId: string }[],
): TournamentMatch[] {
  const sorted = [...seats].sort((a, b) => a.seat - b.seat);
  const n = sorted.length;
  const bracketSize = nextPowerOfTwo(n);
  const slots: (string | null)[] = Array.from({ length: bracketSize }, () => null);

  // Place real athletes in order; trailing slots are byes
  for (let i = 0; i < n; i++) {
    slots[i] = sorted[i].athleteId;
  }

  const totalRounds = Math.log2(bracketSize);
  const matches: TournamentMatch[] = [];
  const matchByKey = new Map<string, TournamentMatch>();

  // Create all match shells first (round-major, position-major)
  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    for (let p = 0; p < matchesInRound; p++) {
      const id = `tm-r${r}-p${p + 1}`;
      const m: TournamentMatch = {
        id,
        round: r,
        roundName: roundNameFor(r, totalRounds),
        bracketSide: "winners",
        position: p + 1,
        athlete1Id: null,
        athlete2Id: null,
        winnerId: null,
        isBye: false,
        nextMatchId: null,
        nextSlot: null,
      };
      matches.push(m);
      matchByKey.set(`${r}:${p}`, m);
    }
  }

  // Wire next pointers
  for (let r = 1; r < totalRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    for (let p = 0; p < matchesInRound; p++) {
      const m = matchByKey.get(`${r}:${p}`)!;
      const nextP = Math.floor(p / 2);
      const next = matchByKey.get(`${r + 1}:${nextP}`)!;
      m.nextMatchId = next.id;
      m.nextSlot = (p % 2 === 0 ? 1 : 2) as 1 | 2;
    }
  }

  // Seed R1 with snake-ish pairing: 0 vs last, 1 vs last-1, ...
  const r1Count = bracketSize / 2;
  for (let i = 0; i < r1Count; i++) {
    const m = matchByKey.get(`1:${i}`)!;
    const a = slots[i];
    const b = slots[bracketSize - 1 - i];
    m.athlete1Id = a;
    m.athlete2Id = b;

    if (a && !b) {
      m.isBye = true;
      m.winnerId = a;
    } else if (b && !a) {
      m.isBye = true;
      m.winnerId = b;
    } else if (!a && !b) {
      m.isBye = true;
      m.winnerId = null;
    }
  }

  // Propagate bye winners into next rounds where possible
  for (let r = 1; r < totalRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    for (let p = 0; p < matchesInRound; p++) {
      const m = matchByKey.get(`${r}:${p}`)!;
      if (!m.winnerId || !m.nextMatchId) continue;
      const next = matches.find((x) => x.id === m.nextMatchId);
      if (!next) continue;
      if (m.nextSlot === 1) next.athlete1Id = m.winnerId;
      else if (m.nextSlot === 2) next.athlete2Id = m.winnerId;
    }

    // Auto-resolve byes created by propagation
    const nextRound = r + 1;
    const nextCount = bracketSize / Math.pow(2, nextRound);
    for (let p = 0; p < nextCount; p++) {
      const nm = matchByKey.get(`${nextRound}:${p}`)!;
      if (nm.athlete1Id && !nm.athlete2Id) {
        nm.isBye = true;
        nm.winnerId = nm.athlete1Id;
      } else if (nm.athlete2Id && !nm.athlete1Id) {
        nm.isBye = true;
        nm.winnerId = nm.athlete2Id;
      }
    }
  }

  return matches;
}

function emptyTallies(athleteIds: string[]): Record<string, { count: number; weighted: number }> {
  const t: Record<string, { count: number; weighted: number }> = {};
  for (const id of athleteIds) t[id] = { count: 0, weighted: 0 };
  return t;
}

async function fetchNFTHoldings(wallet: string): Promise<{ hasGovernor: boolean; hasSigma: boolean }> {
  try {
    const hasGovernor = await hasGovernorNFT(wallet);
    return { hasGovernor, hasSigma: false };
  } catch {
    return { hasGovernor: false, hasSigma: false };
  }
}

function computeServerVotingPower(hasGov: boolean, hasSig: boolean): number {
  if (hasGov && hasSig) return 3;
  if (hasGov) return 2;
  if (hasSig) return 1.5;
  return 1;
}

async function validateWalletSession(c: Context, wallet: string): Promise<boolean> {
  const token = (c.req.header("X-Wallet-Session") || "").trim();
  if (!token) return false;
  return validateWalletSessionToken(token, wallet);
}

function isChampPickFormat(format: unknown): boolean {
  return format === "tournament" || format === "field";
}

/**
 * Create a tournament (bracket) or field (no matchups) event — no public 1v1 battles.
 * Caller must already have validated athletes exist.
 */
export async function createTournamentEvent(body: {
  name: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  totalPrizePool?: number;
  bracket: { seat: number; athleteId: string }[];
  elimination?: string;
  format?: string;
  performanceRounds?: number;
}): Promise<{ event: any; message: string }> {
  const format = body.format === "field" ? "field" : "tournament";
  const bracket = [...body.bracket].sort((a, b) => a.seat - b.seat);
  const size = bracket.length;
  if (size < TOURNAMENT_MIN || size > TOURNAMENT_MAX) {
    throw Object.assign(
      new Error(`${format === "field" ? "Field" : "Tournament"} size must be ${TOURNAMENT_MIN}–${TOURNAMENT_MAX}`),
      { status: 400 },
    );
  }

  const athleteIds = bracket.map((s) => s.athleteId);
  const eventId = generateId("evt");

  if (format === "field") {
    const rounds = body.performanceRounds === 2 ? 2 : 1;
    const event = {
      id: eventId,
      name: sanitizeString(body.name, 200),
      description: sanitizeString(body.description || "", 2000),
      location: sanitizeString(body.location || "", 200),
      startDate: body.startDate || "",
      endDate: body.endDate || "",
      totalPrizePool: sanitizeNumber(body.totalPrizePool, 0, 1e12, 0),
      status: "draft",
      format: "field",
      performanceRounds: rounds,
      fieldScores: {},
      bracketSize: size,
      bracket,
      athleteIds,
      rounds: [],
      tournamentMatches: [],
      votingStatus: "draft" as TournamentVotingStatus,
      championId: "",
      voteTallies: emptyTallies(athleteIds),
      totalVotes: 0,
      totalWeighted: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await kv.set(`event:${eventId}`, event);
    return {
      event,
      message: `Created Field / Best in Field "${event.name}" with ${size} athletes (${rounds} judged round${rounds > 1 ? "s" : ""}, no matchups). Fans pick one winner.`,
    };
  }

  const elimination = body.elimination === "double" ? "double" : "single";
  if (elimination === "double" && !DOUBLE_ELIM_ENABLED) {
    throw Object.assign(
      new Error("Double elimination is coming soon. Use single elimination for trial games."),
      { status: 400, code: "DOUBLE_ELIM_DISABLED" },
    );
  }

  const matches = buildSingleElimMatches(bracket);

  const event = {
    id: eventId,
    name: sanitizeString(body.name, 200),
    description: sanitizeString(body.description || "", 2000),
    location: sanitizeString(body.location || "", 200),
    startDate: body.startDate || "",
    endDate: body.endDate || "",
    totalPrizePool: sanitizeNumber(body.totalPrizePool, 0, 1e12, 0),
    status: "draft",
    format: "tournament",
    elimination,
    bracketSize: size,
    bracket,
    athleteIds,
    rounds: [],
    tournamentMatches: matches,
    votingStatus: "draft" as TournamentVotingStatus,
    championId: "",
    voteTallies: emptyTallies(athleteIds),
    totalVotes: 0,
    totalWeighted: 0,
    createdAt: now(),
    updatedAt: now(),
  };

  await kv.set(`event:${eventId}`, event);

  return {
    event,
    message: `Created tournament "${event.name}" with ${size} athletes (single-elim, champion-pick voting). No 1v1 battles created.`,
  };
}

function recomputeTallies(
  votes: any[],
  athleteIds: string[],
): { tallies: Record<string, { count: number; weighted: number }>; totalVotes: number; totalWeighted: number } {
  const tallies = emptyTallies(athleteIds);
  let totalVotes = 0;
  let totalWeighted = 0;
  for (const v of votes) {
    if (!v?.athleteId || !tallies[v.athleteId]) continue;
    tallies[v.athleteId].count += 1;
    tallies[v.athleteId].weighted += Number(v.weightedVote) || 0;
    totalVotes += 1;
    totalWeighted += Number(v.weightedVote) || 0;
  }
  return { tallies, totalVotes, totalWeighted };
}

export function mountTournamentRoutes(app: Hono, PREFIX: string) {
  // ── Public: list tournament events (thin filter helper via /events already) ──

  // GET /votes/tournament/:eventId
  app.get(`${PREFIX}/votes/tournament/:eventId`, async (c) => {
    try {
      const eventId = sanitizeString(c.req.param("eventId"), 64);
      const event: any = await kv.get(`event:${eventId}`);
      if (!event || !isChampPickFormat(event.format)) {
        return c.json({ success: false, error: "Tournament not found" }, 404);
      }
      return c.json({
        success: true,
        data: {
          eventId,
          votingStatus: event.votingStatus || "draft",
          championId: event.championId || null,
          athleteIds: event.athleteIds || [],
          voteTallies: event.voteTallies || {},
          totalVotes: event.totalVotes || 0,
          totalWeighted: event.totalWeighted || 0,
          tournamentMatches: event.tournamentMatches || [],
        },
      });
    } catch (error) {
      console.log(`[TOURNAMENT] votes fetch error: ${error}`);
      return c.json({ success: false, error: "Failed to load tournament votes" }, 500);
    }
  });

  // GET /votes/tournament/mine/:wallet
  app.get(`${PREFIX}/votes/tournament/mine/:wallet`, async (c) => {
    try {
      const wallet = sanitizeString(c.req.param("wallet"), 40);
      if (!isValidHederaAccountId(wallet)) {
        return c.json({ success: false, error: "Invalid wallet" }, 400);
      }
      const all = await kv.getByPrefix(`vote:tournament:`);
      const mine = (all || []).filter((v: any) => v?.wallet === wallet);
      return c.json({ success: true, data: mine });
    } catch (error) {
      console.log(`[TOURNAMENT] mine votes error: ${error}`);
      return c.json({ success: false, error: "Failed to load votes" }, 500);
    }
  });

  // POST /vote/tournament — champion pick
  app.post(`${PREFIX}/vote/tournament`, async (c) => {
    try {
      const body = await c.req.json();
      const { eventId, wallet, athleteId, stakeAmount, signature, signedMessage, nonce } = body;

      if (!eventId || !wallet || !athleteId) {
        return c.json({ success: false, error: "eventId, wallet, and athleteId are required" }, 400);
      }
      if (!signature || !signedMessage || !nonce) {
        return c.json({
          success: false,
          error: "Digital signature, signed message, and nonce are required to cast a vote",
        }, 400);
      }
      if (!isValidHederaAccountId(wallet)) {
        return c.json({ success: false, error: "Invalid Hedera wallet address format" }, 400);
      }

      const hasValidSession = await validateWalletSession(c, wallet);
      if (!hasValidSession) {
        return c.json({
          success: false,
          error: "Wallet session required. Please connect your wallet and try again.",
          code: "SESSION_REQUIRED",
        }, 401);
      }

      const rl = await checkRateLimit(`vote:tournament:${wallet}`, 10, 60 * 1000);
      if (rl.limited) {
        return c.json({
          success: false,
          error: "Too many vote attempts. Please wait a moment.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } });
      }

      const walletExists = await verifyWalletOnMirrorNode(wallet);
      if (!walletExists) {
        return c.json({ success: false, error: "Wallet not found on Hedera mainnet." }, 403);
      }

      if (!signedMessage.includes(eventId) || !signedMessage.includes(athleteId) || !signedMessage.includes(nonce)) {
        return c.json({ success: false, error: "Signed message does not match vote parameters." }, 400);
      }

      const sigVerification = await verifyVoteSignature(wallet, signedMessage, signature);
      if (!sigVerification.valid) {
        if (BOTB_TOKEN_ID) {
          return c.json({
            success: false,
            error: `Signature verification failed: ${sigVerification.error}`,
            code: "SIGNATURE_INVALID",
          }, 403);
        }
        console.log(`[TOURNAMENT-VOTE] Sig WARN (headcount) for ${wallet} on ${eventId}`);
      }

      const nonceKey = `vote-nonce:${nonce}`;
      if (await kv.get(nonceKey)) {
        return c.json({ success: false, error: "Vote nonce already used. Generate a new vote." }, 409);
      }

      const release = await acquireLock(`tournament:${eventId}`);
      try {
        const event: any = await kv.get(`event:${eventId}`);
        if (!event || !isChampPickFormat(event.format)) {
          return c.json({ success: false, error: "Tournament not found" }, 404);
        }
        if (event.votingStatus !== "voting_open") {
          return c.json({
            success: false,
            error: `Tournament not open for voting. Status: ${event.votingStatus}`,
          }, 400);
        }
        if (event.endDate && Date.now() >= new Date(event.endDate).getTime()) {
          return c.json({ success: false, error: `Voting closed at ${event.endDate}.` }, 400);
        }

        const entrants: string[] = event.athleteIds || event.bracket?.map((s: any) => s.athleteId) || [];
        if (!entrants.includes(athleteId)) {
          return c.json({ success: false, error: "athleteId is not in this tournament" }, 400);
        }

        const nftHoldings = await fetchNFTHoldings(wallet);
        const power = computeServerVotingPower(nftHoldings.hasGovernor, nftHoldings.hasSigma);
        let requestedStake = typeof stakeAmount === "number" ? Math.max(0, Math.floor(stakeAmount)) : 0;
        if (!BOTB_TOKEN_ID) requestedStake = 0;
        const weighted = BOTB_TOKEN_ID ? requestedStake * power : power;

        const voteKey = `vote:tournament:${eventId}:${wallet}`;
        const existing = await kv.get(voteKey);
        const isUpdate = !!existing;

        const vote = {
          eventId,
          wallet,
          athleteId,
          stakeAmount: requestedStake,
          votingPower: power,
          weightedVote: weighted,
          hasGovernorNFT: nftHoldings.hasGovernor,
          hasSigmaNFT: nftHoldings.hasSigma,
          signature: sanitizeString(signature, 500),
          signedMessage: sanitizeString(signedMessage, 1000),
          nonce: sanitizeString(nonce, 100),
          isUpdate,
          timestamp: now(),
        };

        await kv.set(voteKey, vote);
        await kv.set(nonceKey, { wallet, eventId, usedAt: now() });

        const allVotes = await kv.getByPrefix(`vote:tournament:${eventId}:`);
        const { tallies, totalVotes, totalWeighted } = recomputeTallies(allVotes || [], entrants);
        event.voteTallies = tallies;
        event.totalVotes = totalVotes;
        event.totalWeighted = totalWeighted;
        event.updatedAt = now();
        await kv.set(`event:${eventId}`, event);

        console.log(
          `[TOURNAMENT-VOTE] ${wallet} → ${athleteId} on ${eventId} (${isUpdate ? "update" : "new"}, w=${weighted})`,
        );

        return c.json({
          success: true,
          data: {
            vote,
            tallies,
            totalVotes,
            totalWeighted,
            votingStatus: event.votingStatus,
          },
        });
      } finally {
        release();
      }
    } catch (error) {
      console.log(`[TOURNAMENT-VOTE] error: ${error}`);
      return c.json({ success: false, error: "Failed to cast tournament vote" }, 500);
    }
  });

  // POST /admin/tournaments/:eventId/status
  app.post(`${PREFIX}/admin/tournaments/:eventId/status`, requireAdminSession, async (c) => {
    try {
      const eventId = sanitizeString(c.req.param("eventId"), 64);
      const body = await c.req.json();
      const status = sanitizeString(body.status, 40) as TournamentVotingStatus;
      const allowed: TournamentVotingStatus[] = [
        "draft",
        "upcoming",
        "voting_open",
        "voting_closed",
      ];
      if (!allowed.includes(status)) {
        return c.json({
          success: false,
          error: `status must be one of: ${allowed.join(", ")}`,
        }, 400);
      }

      const event: any = await kv.get(`event:${eventId}`);
      if (!event || !isChampPickFormat(event.format)) {
        return c.json({ success: false, error: "Tournament not found" }, 404);
      }
      if (
        event.votingStatus === "champion_declared" ||
        event.votingStatus === "rewards_distributed"
      ) {
        return c.json({
          success: false,
          error: `Cannot change status after ${event.votingStatus}`,
        }, 409);
      }

      event.votingStatus = status;
      if (status === "voting_open" && event.status === "draft") event.status = "active";
      event.updatedAt = now();
      if (body.startDate) event.startDate = body.startDate;
      if (body.endDate) event.endDate = body.endDate;
      await kv.set(`event:${eventId}`, event);

      return c.json({ success: true, data: event });
    } catch (error) {
      console.log(`[TOURNAMENT-STATUS] error: ${error}`);
      return c.json({ success: false, error: "Failed to update tournament status" }, 500);
    }
  });

  // POST /admin/tournaments/:eventId/advance — set match winner (spectacle only)
  app.post(`${PREFIX}/admin/tournaments/:eventId/advance`, requireAdminSession, async (c) => {
    try {
      const eventId = sanitizeString(c.req.param("eventId"), 64);
      const body = await c.req.json();
      const matchId = sanitizeString(body.matchId, 64);
      const winnerId = sanitizeString(body.winnerId, 64);

      const event: any = await kv.get(`event:${eventId}`);
      if (!event || !isChampPickFormat(event.format)) {
        return c.json({ success: false, error: "Tournament not found" }, 404);
      }
      if (event.format === "field") {
        return c.json({
          success: false,
          error: "Field / Best in Field events have no matchups to advance.",
          code: "FIELD_NO_MATCHUPS",
        }, 400);
      }

      const matches: TournamentMatch[] = event.tournamentMatches || [];
      const match = matches.find((m) => m.id === matchId);
      if (!match) return c.json({ success: false, error: "Match not found" }, 404);
      if (winnerId !== match.athlete1Id && winnerId !== match.athlete2Id) {
        return c.json({ success: false, error: "winnerId must be an athlete in this match" }, 400);
      }

      match.winnerId = winnerId;
      match.isBye = false;

      if (match.nextMatchId) {
        const next = matches.find((m) => m.id === match.nextMatchId);
        if (next) {
          if (match.nextSlot === 1) next.athlete1Id = winnerId;
          else if (match.nextSlot === 2) next.athlete2Id = winnerId;
        }
      }

      event.tournamentMatches = matches;
      event.updatedAt = now();
      await kv.set(`event:${eventId}`, event);

      return c.json({ success: true, data: { event, match } });
    } catch (error) {
      console.log(`[TOURNAMENT-ADVANCE] error: ${error}`);
      return c.json({ success: false, error: "Failed to advance match" }, 500);
    }
  });

  // POST /admin/tournaments/:eventId/champion
  app.post(`${PREFIX}/admin/tournaments/:eventId/champion`, requireAdminSession, async (c) => {
    try {
      const eventId = sanitizeString(c.req.param("eventId"), 64);
      const body = await c.req.json();
      const championId = sanitizeString(body.championId, 64);
      if (!championId) {
        return c.json({ success: false, error: "championId is required" }, 400);
      }

      const release = await acquireLock(`tournament:${eventId}`);
      try {
        const event: any = await kv.get(`event:${eventId}`);
        if (!event || !isChampPickFormat(event.format)) {
          return c.json({ success: false, error: "Tournament not found" }, 404);
        }
        if (
          event.votingStatus === "champion_declared" ||
          event.votingStatus === "rewards_distributed"
        ) {
          return c.json({
            success: false,
            error: `Tournament already has a champion (status: ${event.votingStatus})`,
            code: "ALREADY_DECLARED",
          }, 409);
        }

        const entrants: string[] = event.athleteIds || event.bracket?.map((s: any) => s.athleteId) || [];
        if (!entrants.includes(championId)) {
          return c.json({ success: false, error: "championId must be a tournament entrant" }, 400);
        }

        // Freeze voting first
        event.championId = championId;
        event.votingStatus = "champion_declared";
        event.status = "completed";
        event.updatedAt = now();
        await kv.set(`event:${eventId}`, event);

        // Tournament W/L only — never touch battle wins/losses
        const champ: any = await kv.get(`athlete:${championId}`);
        if (champ) {
          champ.tournamentWins = (champ.tournamentWins || 0) + 1;
          champ.updatedAt = now();
          await kv.set(`athlete:${championId}`, champ);
        }
        for (const aid of entrants) {
          if (aid === championId) continue;
          const ath: any = await kv.get(`athlete:${aid}`);
          if (!ath) continue;
          ath.tournamentLosses = (ath.tournamentLosses || 0) + 1;
          ath.updatedAt = now();
          await kv.set(`athlete:${aid}`, ath);
        }

        const allVotes: any[] = (await kv.getByPrefix(`vote:tournament:${eventId}:`)) || [];
        const walletMap = new Map<string, any>();
        for (const v of allVotes) {
          const existing = walletMap.get(v.wallet);
          if (!existing || new Date(v.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            walletMap.set(v.wallet, v);
          }
        }
        const deduped = Array.from(walletMap.values());
        const winners = deduped.filter((v) => v.athleteId === championId);

        let totalWinningWeighted = 0;
        for (const v of winners) {
          const w = BOTB_TOKEN_ID
            ? (v.stakeAmount || 0) * (v.votingPower || 1)
            : (v.votingPower || 1);
          totalWinningWeighted += w;
        }

        const pool = event.totalPrizePool || 0;
        const recipients = winners.map((v) => {
          const weightedVote = BOTB_TOKEN_ID
            ? (v.stakeAmount || 0) * (v.votingPower || 1)
            : (v.votingPower || 1);
          const sharePercent = totalWinningWeighted > 0
            ? (weightedVote / totalWinningWeighted) * 100
            : 0;
          const rewardAmount = totalWinningWeighted > 0
            ? (weightedVote / totalWinningWeighted) * pool
            : 0;
          return {
            wallet: v.wallet,
            stakeAmount: v.stakeAmount || 0,
            votingPower: v.votingPower || 1,
            weightedVote,
            sharePercent,
            rewardAmount,
            hasGovernorNFT: !!v.hasGovernorNFT,
            hasSigmaNFT: !!v.hasSigmaNFT,
            pickedAthleteId: v.athleteId,
          };
        });

        const snapshot = {
          type: event.format === "field" ? "field" : "tournament",
          eventId,
          championId,
          championName: champ?.name || championId,
          generatedAt: now(),
          totalPool: pool,
          totalVotes: deduped.length,
          correctPicks: winners.length,
          totalWinningWeighted,
          headcountMode: !BOTB_TOKEN_ID,
          recipients,
          airdropTxId: "",
          airdropConfirmedAt: "",
        };
        await kv.set(`snapshot:tournament:${eventId}`, snapshot);

        console.log(
          `[TOURNAMENT] Champion ${championId} for ${eventId}. ` +
            `Correct picks: ${winners.length}/${deduped.length}. Admin: ${c.get("adminWallet")}`,
        );

        return c.json({
          success: true,
          data: {
            event,
            snapshot,
            message: `Champion declared. Tournament W/L updated. ${winners.length} correct pick(s) in snapshot.`,
          },
        });
      } finally {
        release();
      }
    } catch (error) {
      console.log(`[TOURNAMENT-CHAMPION] error: ${error}`);
      return c.json({ success: false, error: "Failed to declare tournament champion" }, 500);
    }
  });

  // GET /admin/snapshots/tournament/:eventId
  app.get(`${PREFIX}/admin/snapshots/tournament/:eventId`, requireAdminSession, async (c) => {
    try {
      const eventId = sanitizeString(c.req.param("eventId"), 64);
      const snap = await kv.get(`snapshot:tournament:${eventId}`);
      if (!snap) return c.json({ success: false, error: "Snapshot not found" }, 404);
      return c.json({ success: true, data: snap });
    } catch (error) {
      return c.json({ success: false, error: "Failed to load snapshot" }, 500);
    }
  });
}
