/**
 * Staff page API. Points only.
 * Allowlist: Edge secret STAFF_ALLOWLIST, comma or newline separated
 * emails and Hedera account ids. Empty list means nobody is staff.
 * Do not put real addresses in source.
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { checkRateLimit, sanitizeString, sanitizeUrl } from "./admin-auth.tsx";

const OPEN_STATUSES = new Set(["upcoming", "voting_open", "voting_closed"]);

export function parseStaffAllowlist(raw: string | undefined | null): Set<string> {
  const set = new Set<string>();
  if (!raw) return set;
  for (const part of raw.split(/[\s,;]+/)) {
    const value = part.trim().toLowerCase();
    if (!value || value.startsWith("#")) continue;
    set.add(value);
  }
  return set;
}

export function isStaffIdentity(allow: Set<string>, wallet: string, email?: string | null): boolean {
  if (allow.size === 0) return false;
  if (wallet && allow.has(wallet.trim().toLowerCase())) return true;
  if (email && allow.has(email.trim().toLowerCase())) return true;
  return false;
}

function allowlist(): Set<string> {
  return parseStaffAllowlist(Deno.env.get("STAFF_ALLOWLIST"));
}

function newId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function httpUrl(input: unknown): string {
  const s = sanitizeUrl(input);
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "";
}

async function readSession(c: any): Promise<{ wallet: string; email: string } | null> {
  const token = c.req.header("X-Wallet-Session");
  if (!token || typeof token !== "string" || token.length < 10) return null;
  const session: any = await kv.get(`wsession:${token}`);
  if (!session?.wallet) return null;
  if (Date.now() > (session.expiresAt || 0)) return null;

  let email = typeof session.email === "string" ? session.email.trim().toLowerCase() : "";
  if (!email && session.issuer) {
    const user: any = await kv.get(`magic-user:${session.issuer}`);
    if (typeof user?.email === "string") email = user.email.trim().toLowerCase();
  }
  if (!email) {
    const link: any = await kv.get(`magic-account:${session.wallet}`);
    if (link?.issuer) {
      const user: any = await kv.get(`magic-user:${link.issuer}`);
      if (typeof user?.email === "string") email = user.email.trim().toLowerCase();
    }
  }
  return { wallet: String(session.wallet), email };
}

async function requireStaff(c: any): Promise<{ wallet: string; email: string } | Response> {
  const who = await readSession(c);
  if (!who) {
    return c.json({ success: false, error: "Sign in required.", code: "SESSION_REQUIRED" }, 401);
  }
  if (!isStaffIdentity(allowlist(), who.wallet, who.email)) {
    return c.json({ success: false, error: "Not authorized.", code: "NOT_STAFF" }, 403);
  }
  const rl = await checkRateLimit(`staff:${who.wallet}`, 30, 60_000);
  if (rl.limited) {
    return c.json({ success: false, error: "Too many staff requests. Wait a minute.", code: "RATE_LIMITED" }, 429);
  }
  return who;
}

function denied(result: { wallet: string } | Response): result is Response {
  return result instanceof Response;
}

export function mountStaffRoutes(app: Hono, PREFIX: string) {
  app.get(`${PREFIX}/staff/me`, async (c) => {
    const who = await readSession(c);
    if (!who) {
      return c.json({ success: true, data: { staff: false } });
    }
    return c.json({
      success: true,
      data: { staff: isStaffIdentity(allowlist(), who.wallet, who.email) },
    });
  });

  app.get(`${PREFIX}/staff/cards`, async (c) => {
    const who = await requireStaff(c);
    if (denied(who)) return who;
    const battles: any[] = await kv.getByPrefix("battle:");
    const open = battles
      .filter((b) => b && OPEN_STATUSES.has(b.status))
      .map((b) => ({
        id: b.id,
        title: b.title || "",
        eventId: b.eventId || "",
        eventDate: b.eventDate || "",
        status: b.status,
        athlete1Id: b.athlete1Id || "",
        athlete2Id: b.athlete2Id || "",
      }));
    return c.json({ success: true, data: open });
  });

  app.post(`${PREFIX}/staff/cards`, async (c) => {
    const who = await requireStaff(c);
    if (denied(who)) return who;
    const body = await c.req.json().catch(() => ({}));
    const name = sanitizeString(body.name, 120);
    const date = sanitizeString(body.date, 40);
    const athlete1Id = sanitizeString(body.athlete1Id, 80);
    const athlete2Id = sanitizeString(body.athlete2Id, 80);
    if (!name) return c.json({ success: false, error: "Event name is required." }, 400);
    if (!date) return c.json({ success: false, error: "Date is required." }, 400);
    if (!athlete1Id || !athlete2Id || athlete1Id === athlete2Id) {
      return c.json({ success: false, error: "Pick two different athletes." }, 400);
    }
    const a1 = await kv.get(`athlete:${athlete1Id}`);
    const a2 = await kv.get(`athlete:${athlete2Id}`);
    if (!a1 || !a2) return c.json({ success: false, error: "One of those athletes is not on the roster." }, 400);

    const stamp = new Date().toISOString();
    const eventId = newId("evt");
    const battleId = newId("btl");
    const event = {
      id: eventId,
      name,
      description: "",
      format: "pvp",
      status: "active",
      votingStatus: "voting_open",
      eventDate: date,
      startDate: "",
      endDate: "",
      location: "",
      totalPrizePool: 0,
      source: "staff",
      createdAt: stamp,
      updatedAt: stamp,
    };
    const battle = {
      id: battleId,
      eventId,
      title: name,
      status: "voting_open",
      round: "Card",
      bracketPosition: 1,
      athlete1Id,
      athlete2Id,
      votingOpensAt: "",
      votingClosesAt: "",
      eventDate: date,
      totalPool: 0,
      votes1Count: 0,
      votes2Count: 0,
      votes1Weighted: 0,
      votes2Weighted: 0,
      winnerId: "",
      rewardDistributed: false,
      location: "",
      prize: "",
      source: "staff",
      createdAt: stamp,
      updatedAt: stamp,
    };
    await kv.mset([`event:${eventId}`, `battle:${battleId}`], [event, battle]);
    return c.json({ success: true, data: { event, battle } });
  });

  app.post(`${PREFIX}/staff/cards/:id/close`, async (c) => {
    const who = await requireStaff(c);
    if (denied(who)) return who;
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const winnerId = sanitizeString(body.winnerId, 80);
    const battle: any = await kv.get(`battle:${id}`);
    if (!battle) return c.json({ success: false, error: "Card not found." }, 404);
    if (battle.status === "winner_declared" || battle.status === "rewards_distributed") {
      return c.json({ success: false, error: "This card is already closed." }, 409);
    }
    if (!OPEN_STATUSES.has(battle.status)) {
      return c.json({ success: false, error: "This card is not open." }, 400);
    }
    if (winnerId !== battle.athlete1Id && winnerId !== battle.athlete2Id) {
      return c.json({ success: false, error: "Winner must be one of the two athletes." }, 400);
    }

    const stamp = new Date().toISOString();
    const loserId = winnerId === battle.athlete1Id ? battle.athlete2Id : battle.athlete1Id;
    battle.winnerId = winnerId;
    battle.status = "winner_declared";
    battle.rewardDistributed = false;
    battle.totalPool = 0;
    battle.updatedAt = stamp;
    await kv.set(`battle:${id}`, battle);

    const winner: any = await kv.get(`athlete:${winnerId}`);
    if (winner) {
      winner.wins = (winner.wins || 0) + 1;
      winner.streak = (winner.streak || 0) + 1;
      winner.updatedAt = stamp;
      await kv.set(`athlete:${winnerId}`, winner);
    }
    const loser: any = await kv.get(`athlete:${loserId}`);
    if (loser) {
      loser.losses = (loser.losses || 0) + 1;
      loser.streak = Math.min(0, loser.streak || 0) - 1;
      loser.updatedAt = stamp;
      await kv.set(`athlete:${loserId}`, loser);
    }

    if (battle.eventId) {
      const event: any = await kv.get(`event:${battle.eventId}`);
      if (event) {
        event.status = "completed";
        event.votingStatus = "winner_declared";
        event.updatedAt = stamp;
        await kv.set(`event:${battle.eventId}`, event);
      }
    }

    return c.json({ success: true, data: { battle } });
  });

  app.post(`${PREFIX}/staff/athletes/:id`, async (c) => {
    const who = await requireStaff(c);
    if (denied(who)) return who;
    const id = c.req.param("id");
    const existing: any = await kv.get(`athlete:${id}`);
    if (!existing) return c.json({ success: false, error: "Athlete not found." }, 404);
    const body = await c.req.json().catch(() => ({}));
    const name = sanitizeString(body.name, 100);
    if (!name) return c.json({ success: false, error: "Name is required." }, 400);
    const socials = body.socials && typeof body.socials === "object" ? body.socials : {};
    existing.name = name;
    existing.pfpUrl = httpUrl(body.pfpUrl);
    existing.socials = {
      ...(existing.socials || {}),
      instagram: sanitizeString(socials.instagram, 200),
      twitter: sanitizeString(socials.twitter, 200),
      youtube: sanitizeString(socials.youtube, 200),
      website: httpUrl(socials.website),
    };
    existing.updatedAt = new Date().toISOString();
    await kv.set(`athlete:${id}`, existing);
    const { email, phone, ...publicAthlete } = existing;
    return c.json({ success: true, data: publicAthlete });
  });
}
