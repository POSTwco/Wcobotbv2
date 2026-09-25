/**
 * WCO Organizations — signup, commander approval, and event intake.
 * =================================================================
 * Public directory: approved orgs only. Private email, organizer
 * Instagram, and wallet stay off public JSON.
 *
 * Writes:
 *   - Org wallet + X-Wallet-Session + hedera_signMessage over a hash
 *     of the sanitized payload (see src/app/lib/org-sign.ts).
 *   - Commander decisions: requireAdminSession + a second signature
 *     from that same commander wallet.
 *
 * Gamify off → public calendar card only (no event: / battle: rows).
 * Gamify on  → draft event the Event Console already publishes.
 *              Duals are sequential 1v2, 3v4… in draft.
 *              Tournament and Field use createTournamentEvent (no 1v1s).
 *
 * KV:
 *   organization:{id}
 *   org-by-wallet:{wallet}     { orgId }
 *   org-application:{id}
 *   org-edit:{orgId}
 *   org-event-draft:{id}
 *   organization-event:{id}    calendar items (gamify off)
 *   org-sig-nonce:{nonce}
 *   org-backfill:wco-v1
 */

import type { Context } from "npm:hono";
import type { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { createTournamentEvent } from "./tournament.tsx";
import {
  isValidHederaAccountId,
  checkRateLimit,
  sanitizeString,
  requireAdminSession,
  verifyGateSignature,
  validateWalletSessionToken,
} from "./admin-auth.tsx";

const WCO_ID = "org-wco";
const DISCIPLINES = new Set(["freestyle", "statics", "freestyle_statics"]);
const FORMATS = new Set(["pvp", "tournament", "field"]);
const PFP_BUCKET = "make-57fcb0ee-pfps";
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function orgText(input: unknown, maxLength: number): string {
  const s = sanitizeString(input, maxLength);
  return s.replace(/[\r\n]+/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

function httpsUrl(input: unknown, maxLength = 300): string {
  const s = orgText(input, maxLength);
  if (!s) return "";
  try {
    const url = new URL(s);
    if (url.protocol !== "https:") return "";
    return s;
  } catch {
    return "";
  }
}

function orgHandle(input: unknown, maxLength = 200): string {
  const s = orgText(input, maxLength);
  if (!s) return "";
  if (s.startsWith("https://")) return httpsUrl(s, maxLength);
  if (/[\s<>]/.test(s)) return "";
  return s.replace(/^@/, "");
}

function orgLogoPath(input: unknown): string {
  const s = orgText(input, 300);
  if (!s) return "";
  if (!s.startsWith("pfps/org-") || s.includes("..") || s.includes("\\")) return "";
  return s;
}

function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function pad4(list: unknown): string[] {
  const src = Array.isArray(list) ? list : [];
  return [0, 1, 2, 3].map((i) => (typeof src[i] === "string" ? src[i] : ""));
}

interface ApplyFields {
  name: string;
  country: string;
  email: string;
  discipline: string;
  logoPath: string;
  instagram: string;
  youtube: string;
  website: string;
  bio: string;
  organizers: string[];
  personalInstagrams: string[];
  eventName: string;
  eventDate: string;
}

function normalizeApply(raw: any): ApplyFields {
  const organizers = pad4(raw?.organizers).map((v) => orgText(v, 80));
  const personalInstagrams = pad4(raw?.personalInstagrams).map((v) => orgHandle(v));
  return {
    name: orgText(raw?.name, 120),
    country: orgText(raw?.country, 80),
    email: orgText(raw?.email, 200).toLowerCase(),
    discipline: typeof raw?.discipline === "string" ? raw.discipline : "",
    logoPath: orgLogoPath(raw?.logoPath),
    instagram: orgHandle(raw?.instagram),
    youtube: orgHandle(raw?.youtube),
    website: httpsUrl(raw?.website),
    bio: orgText(raw?.bio, 2000),
    organizers,
    personalInstagrams,
    eventName: orgText(raw?.eventName, 160),
    eventDate: orgText(raw?.eventDate, 40),
  };
}

function applyCanonical(f: ApplyFields): string {
  return [
    `name=${f.name}`,
    `country=${f.country}`,
    `email=${f.email}`,
    `discipline=${f.discipline}`,
    `logoPath=${f.logoPath}`,
    `instagram=${f.instagram}`,
    `youtube=${f.youtube}`,
    `website=${f.website}`,
    `bio=${f.bio}`,
    `organizer1=${f.organizers[0]}`,
    `organizer2=${f.organizers[1]}`,
    `organizer3=${f.organizers[2]}`,
    `organizer4=${f.organizers[3]}`,
    `personal1=${f.personalInstagrams[0]}`,
    `personal2=${f.personalInstagrams[1]}`,
    `personal3=${f.personalInstagrams[2]}`,
    `personal4=${f.personalInstagrams[3]}`,
    `eventName=${f.eventName}`,
    `eventDate=${f.eventDate}`,
  ].join("\n");
}

interface EventFields {
  action: string;
  draftId: string;
  name: string;
  eventDate: string;
  location: string;
  livestream: string;
  registrationUrl: string;
  website: string;
  discipline: string;
  format: string;
  note: string;
  athleteIds: string[];
}

function normalizeEvent(raw: any, action: string): EventFields {
  const ids = Array.isArray(raw?.athleteIds) ? raw.athleteIds : [];
  return {
    action,
    draftId: orgText(raw?.draftId, 80),
    name: orgText(raw?.name, 160),
    eventDate: orgText(raw?.eventDate, 40),
    location: orgText(raw?.location, 200),
    livestream: httpsUrl(raw?.livestream),
    registrationUrl: httpsUrl(raw?.registrationUrl),
    website: httpsUrl(raw?.website),
    discipline: typeof raw?.discipline === "string" ? raw.discipline : "",
    format: typeof raw?.format === "string" ? raw.format : "",
    note: orgText(raw?.note, 2000),
    athleteIds: ids.map((id: unknown) => orgText(id, 80)).filter(Boolean),
  };
}

function eventCanonical(f: EventFields): string {
  return [
    `action=${f.action}`,
    `draftId=${f.draftId}`,
    `name=${f.name}`,
    `eventDate=${f.eventDate}`,
    `location=${f.location}`,
    `livestream=${f.livestream}`,
    `registrationUrl=${f.registrationUrl}`,
    `website=${f.website}`,
    `discipline=${f.discipline}`,
    `format=${f.format}`,
    `note=${f.note}`,
    `athletes=${f.athleteIds.join(",")}`,
  ].join("\n");
}

function decisionCanonical(decision: string, note: string, body: string): string {
  return [`decision=${orgText(decision, 40)}`, `note=${orgText(note, 2000)}`, body].join("\n");
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function hashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function parseSignedMessage(message: unknown): {
  prefix: string; wallet: string; hash: string; nonce: string; expires: string;
} | null {
  if (typeof message !== "string") return null;
  const lines = message.split("\n");
  if (lines.length !== 5) return null;
  const wallet = lines[1]?.startsWith("Wallet: ") ? lines[1].slice("Wallet: ".length) : "";
  const hash = lines[2]?.startsWith("Hash: ") ? lines[2].slice("Hash: ".length) : "";
  const nonce = lines[3]?.startsWith("Nonce: ") ? lines[3].slice("Nonce: ".length) : "";
  const expires = lines[4]?.startsWith("Expires: ") ? lines[4].slice("Expires: ".length) : "";
  if (!lines[0] || !isValidHederaAccountId(wallet)) return null;
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(nonce)) return null;
  if (!expires) return null;
  return { prefix: lines[0], wallet, hash, nonce, expires };
}

async function consumeNonce(nonce: string, expires: string, wallet: string): Promise<string | null> {
  const exp = Date.parse(expires);
  if (!Number.isFinite(exp)) return "Signature expiry is invalid";
  const drift = exp - Date.now();
  if (drift < -30_000) return "Signature expired. Sign again.";
  if (drift > 15 * 60 * 1000) return "Signature expiry is too far ahead";
  const key = `org-sig-nonce:${nonce}`;
  const existing = await kv.get(key);
  if (existing) return "This signature was already used. Sign again.";
  await kv.set(key, { wallet, expires, usedAt: nowIso() });
  return null;
}

function sessionToken(c: Context): string {
  return (c.req.header("X-Wallet-Session") || "").trim();
}

async function assertWalletSession(c: Context, wallet: string): Promise<string | null> {
  if (!isValidHederaAccountId(wallet)) return "A connected Hedera wallet is required";
  const ok = await validateWalletSessionToken(sessionToken(c), wallet);
  if (!ok) return "Wallet session required. Reconnect your wallet and try again.";
  return null;
}

async function verifyOrgSignature(
  c: Context,
  wallet: string,
  message: unknown,
  signature: unknown,
  expectedPrefix: string,
  canonical: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const sessionErr = await assertWalletSession(c, wallet);
  if (sessionErr) return { ok: false, error: sessionErr, status: 401 };
  const parsed = parseSignedMessage(message);
  if (!parsed || parsed.prefix !== expectedPrefix) {
    return { ok: false, error: "Signed message does not match this action", status: 400 };
  }
  if (parsed.wallet !== wallet) {
    return { ok: false, error: "Signature wallet does not match the connected wallet", status: 401 };
  }
  const hash = await sha256Hex(canonical);
  if (!hashEquals(hash, parsed.hash)) {
    return { ok: false, error: "Signature does not match the submitted details. Review the fields and sign again.", status: 400 };
  }
  if (typeof signature !== "string" || signature.length < 10) {
    return { ok: false, error: "Wallet signature missing. Approve the prompt and try again.", status: 400 };
  }
  const sig = await verifyGateSignature(wallet, String(message), signature, sessionToken(c));
  if (!sig.valid) {
    return { ok: false, error: sig.error || "Signature rejected", status: 401 };
  }
  const nonceErr = await consumeNonce(parsed.nonce, parsed.expires, wallet);
  if (nonceErr) return { ok: false, error: nonceErr, status: 401 };
  return { ok: true };
}

function applyError(f: ApplyFields): string | null {
  if (!f.name) return "Organization name is required";
  if (!f.country) return "Country of operation is required";
  if (!looksLikeEmail(f.email)) return "A valid contact email is required";
  if (!DISCIPLINES.has(f.discipline)) return "Choose FreeStyle, Statics, or Both";
  if (!f.organizers.some(Boolean)) return "Add at least one organizer name";
  if (!f.instagram && !f.youtube) return "Add the organization Instagram or YouTube";
  if (f.logoPath && !f.logoPath.startsWith("pfps/org-")) return "Logo upload is invalid";
  return null;
}

async function notify(wallet: string, type: string, title: string, message: string, extra: Record<string, unknown> = {}) {
  if (!wallet || !isValidHederaAccountId(wallet)) return;
  const id = generateId("ntf");
  await kv.set(`notification:${wallet}:${id}`, {
    id,
    wallet,
    type,
    title,
    message,
    read: false,
    createdAt: nowIso(),
    ...extra,
  });
}

function reportText(decision: string, note: string, changelog: { at: string; wallet: string; fields: string[] }[]): string {
  const edits = changelog.flatMap((row) => row.fields.map((f) => `- ${f}`));
  const lines = [
    `Decision: ${decision}`,
    note ? `Note from WCO: ${note}` : "Note from WCO: (none)",
    edits.length ? "Edits before the decision:" : "No fields were edited before the decision.",
    ...edits,
  ];
  return lines.join("\n");
}

function publicOrg(org: any, events: any[]): any {
  return {
    id: org.id,
    name: org.name,
    country: org.country,
    discipline: org.discipline,
    bio: org.bio || "",
    website: org.website || "",
    instagram: org.instagram || "",
    youtube: org.youtube || "",
    featured: org.id === WCO_ID || !!org.featured,
    hasLogo: !!org.logoPath,
    status: "approved",
    events,
  };
}

function isPublicBattleEvent(e: any): boolean {
  if (!e || e.archivedAt) return false;
  if (e.status === "draft" || e.status === "cancelled") return false;
  if ((e.format === "tournament" || e.format === "field") && (!e.votingStatus || e.votingStatus === "draft")) {
    return false;
  }
  return true;
}

function battleEventToPublic(e: any): any {
  return {
    id: `linked-${e.id}`,
    orgId: e.orgId,
    name: e.name || "",
    eventDate: e.startDate || "",
    location: e.location || "",
    livestream: "",
    registrationUrl: "",
    website: "",
    discipline: "",
    format: e.format === "field" || e.format === "tournament" ? e.format : "pvp",
    gamified: true,
    battleEventId: e.id,
    status: e.status || "",
    votingStatus: e.votingStatus || "",
  };
}

async function ensureWcoRecord(): Promise<void> {
  const existing = await kv.get(`organization:${WCO_ID}`);
  if (existing) return;
  await kv.set(`organization:${WCO_ID}`, {
    id: WCO_ID,
    name: "World Calisthenics Organization",
    country: "United States",
    discipline: "freestyle_statics",
    bio: "The home organization of Battle of the Bars. WCO sanctions 1v1 duals, tournaments, and best-in-field events across calisthenics.",
    website: "https://www.wcorg.io",
    instagram: "",
    youtube: "",
    logoPath: "",
    email: "",
    organizers: ["WCO"],
    personalInstagrams: ["", "", "", ""],
    wallet: "",
    status: "approved",
    featured: true,
    changelog: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

/** Tags existing public events with WCO. Admin-only so a public read cannot rewrite events. */
async function backfillWcoEvents(): Promise<void> {
  const backfill = await kv.get("org-backfill:wco-v1");
  if (backfill?.done) return;
  const events = await kv.getByPrefix("event:");
  for (const e of events) {
    if (!e?.id || e.orgId) continue;
    if (!isPublicBattleEvent(e)) continue;
    e.orgId = WCO_ID;
    e.updatedAt = nowIso();
    await kv.set(`event:${e.id}`, e);
  }
  await kv.set("org-backfill:wco-v1", { done: true, at: nowIso() });
}

function redactChangelog(list: unknown): { at: string; fields: string[] }[] {
  if (!Array.isArray(list)) return [];
  return list.map((row: any) => ({
    at: typeof row?.at === "string" ? row.at : "",
    fields: Array.isArray(row?.fields) ? row.fields.filter((f: unknown) => typeof f === "string") : [],
  }));
}

/** Owner payloads keep contact fields and drop commander wallet ids. */
function redactForOwner(value: any): any {
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  delete copy.approvedBy;
  delete copy.reviewedBy;
  if ("changelog" in copy) copy.changelog = redactChangelog(copy.changelog);
  return copy;
}

function ownerPayload(bundle: any) {
  return {
    org: bundle.org ? redactForOwner(bundle.org) : null,
    application: bundle.application ? redactForOwner(bundle.application) : null,
    edit: bundle.edit ? redactForOwner(bundle.edit) : null,
    drafts: (bundle.drafts || []).map(redactForOwner),
  };
}

async function listPublic(): Promise<any[]> {
  await ensureWcoRecord();
  const orgs = await kv.getByPrefix("organization:");
  const calendar = await kv.getByPrefix("organization-event:");
  const battleEvents = await kv.getByPrefix("event:");
  const approved = orgs.filter((o: any) => o && o.status === "approved" && o.id);
  approved.sort((a: any, b: any) => {
    if (a.id === WCO_ID) return -1;
    if (b.id === WCO_ID) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  return approved.map((org: any) => {
    const cards = calendar
      .filter((c: any) => c && c.orgId === org.id && c.visibility === "public" && c.gamified === false)
      .map((c: any) => ({
        id: c.id,
        orgId: c.orgId,
        name: c.name,
        eventDate: c.eventDate || "",
        location: c.location || "",
        livestream: c.livestream || "",
        registrationUrl: c.registrationUrl || "",
        website: c.website || "",
        discipline: c.discipline || "",
        format: "calendar",
        gamified: false,
      }));
    const linked = battleEvents
      .filter((e: any) => e && e.orgId === org.id && isPublicBattleEvent(e))
      .map(battleEventToPublic);
    const events = [...linked, ...cards].sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate)));
    return publicOrg(org, events);
  });
}

async function streamLogo(path: string): Promise<Response | null> {
  if (!path || !path.startsWith("pfps/org-")) return null;
  const { data, error } = await supabaseAdmin.storage.from(PFP_BUCKET).download(path);
  if (error || !data) return null;
  const ext = path.split(".").pop() || "jpg";
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return new Response(data, {
    headers: {
      "Content-Type": data.type || type,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function ownerBundle(wallet: string): Promise<any> {
  const link = await kv.get(`org-by-wallet:${wallet}`);
  const orgId = link?.orgId || "";
  const org = orgId ? await kv.get(`organization:${orgId}`) : null;
  const apps = await kv.getByPrefix("org-application:");
  const mine = apps
    .filter((a: any) => a && a.wallet === wallet)
    .sort((a: any, b: any) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  const application = mine[0] || null;
  const edit = orgId ? await kv.get(`org-edit:${orgId}`) : null;
  const drafts = (await kv.getByPrefix("org-event-draft:")).filter((d: any) => d && d.wallet === wallet);
  drafts.sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return { org: org || null, application, edit: edit || null, drafts };
}

async function votingBoardFor(eventId: string): Promise<any | null> {
  const event: any = await kv.get(`event:${eventId}`);
  if (!event) return null;
  const names = new Map<string, string>();
  const ids = new Set<string>();
  for (const seat of event.bracket || []) if (seat?.athleteId) ids.add(seat.athleteId);
  for (const id of event.athleteIds || []) ids.add(id);
  for (const id of ids) {
    const ath: any = await kv.get(`athlete:${id}`);
    names.set(id, ath?.name || id);
  }
  const battles = (await kv.getByPrefix("battle:")).filter((b: any) => b && b.eventId === eventId);
  const battleRows = [];
  for (const b of battles) {
    if (b.athlete1Id && !names.has(b.athlete1Id)) {
      const ath: any = await kv.get(`athlete:${b.athlete1Id}`);
      names.set(b.athlete1Id, ath?.name || b.athlete1Id);
    }
    if (b.athlete2Id && !names.has(b.athlete2Id)) {
      const ath: any = await kv.get(`athlete:${b.athlete2Id}`);
      names.set(b.athlete2Id, ath?.name || b.athlete2Id);
    }
    const v1 = Number(b.votes1Count) || 0;
    const v2 = Number(b.votes2Count) || 0;
    const leader = v1 === v2 ? "" : v1 > v2 ? names.get(b.athlete1Id) || "" : names.get(b.athlete2Id) || "";
    battleRows.push({
      id: b.id,
      title: b.title,
      status: b.status,
      votingOpensAt: b.votingOpensAt || "",
      votingClosesAt: b.votingClosesAt || "",
      athlete1Name: names.get(b.athlete1Id) || "",
      athlete2Name: names.get(b.athlete2Id) || "",
      votes1Count: v1,
      votes2Count: v2,
      leader,
    });
  }
  const pool = Object.entries(event.voteTallies || {}).map(([athleteId, row]: [string, any]) => ({
    athleteId,
    name: names.get(athleteId) || athleteId,
    count: Number(row?.count) || 0,
  }));
  pool.sort((a, b) => b.count - a.count);
  return {
    eventId: event.id,
    name: event.name,
    status: event.status,
    votingStatus: event.votingStatus || "",
    format: event.format || "pvp",
    gamified: !!event.gamified,
    startDate: event.startDate || "",
    battles: battleRows,
    pool,
    leader: pool[0]?.count ? pool[0].name : battleRows.find((r) => r.leader)?.leader || "",
  };
}

async function athletesExist(ids: string[]): Promise<string | null> {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!/^ath-[a-zA-Z0-9-]+$/.test(id)) return "Athlete selection is invalid";
    if (seen.has(id)) return "An athlete can only be seated once";
    seen.add(id);
    const ath = await kv.get(`athlete:${id}`);
    if (!ath) return "One of the selected athletes is no longer on the roster";
  }
  return null;
}

function formatCountError(format: string, count: number): string | null {
  if (format === "pvp") {
    if (count < 2 || count > 32 || count % 2 !== 0) {
      return "1v1 Duals need an even number of athletes, from 2 to 32";
    }
  } else if (count < 3 || count > 12) {
    return "Tournament and Best in Field need 3 to 12 athletes";
  }
  return null;
}

async function createGamifiedEvent(draft: any, org: any, adminWallet: string): Promise<any> {
  const athleteIds: string[] = draft.athleteIds || [];
  const bracket = athleteIds.map((athleteId: string, i: number) => ({ seat: i + 1, athleteId }));
  const description = `Submitted by ${org?.name || "an organization"}. ${draft.note || ""}`.trim();
  if (draft.format === "tournament" || draft.format === "field") {
    const { event } = await createTournamentEvent({
      name: draft.name,
      description,
      location: draft.location || "",
      startDate: draft.eventDate || "",
      endDate: "",
      totalPrizePool: 0,
      bracket,
      format: draft.format,
      elimination: "single",
    });
    event.orgId = draft.orgId;
    event.gamified = true;
    event.source = "organization";
    event.organizationDraftId = draft.id;
    event.updatedAt = nowIso();
    await kv.set(`event:${event.id}`, event);
    return event;
  }

  const athleteNames: Record<string, string> = {};
  for (const id of athleteIds) {
    const ath: any = await kv.get(`athlete:${id}`);
    athleteNames[id] = ath?.name || id;
  }
  const eventId = generateId("evt");
  const numMatches = athleteIds.length / 2;
  const battleIds: string[] = [];
  for (let i = 0; i < numMatches; i++) {
    const a = athleteIds[i * 2];
    const b = athleteIds[i * 2 + 1];
    const battleId = generateId("btl");
    battleIds.push(battleId);
    await kv.set(`battle:${battleId}`, {
      id: battleId,
      eventId,
      title: `${athleteNames[a]} vs ${athleteNames[b]}`,
      status: "draft",
      round: "Event Battles",
      bracketPosition: i + 1,
      athlete1Id: a,
      athlete2Id: b,
      votingOpensAt: draft.eventDate || "",
      votingClosesAt: "",
      totalPool: 0,
      votes1Count: 0,
      votes2Count: 0,
      votes1Weighted: 0,
      votes2Weighted: 0,
      winnerId: "",
      rewardDistributed: false,
      location: draft.location || "",
      prize: "TBD",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  const event = {
    id: eventId,
    name: draft.name,
    description,
    location: draft.location || "",
    startDate: draft.eventDate || "",
    endDate: "",
    totalPrizePool: 0,
    status: "draft",
    format: "pvp",
    elimination: "none",
    bracketSize: athleteIds.length,
    bracket,
    rounds: [{ roundNumber: 1, roundName: "Event Battles", battleIds }],
    orgId: draft.orgId,
    gamified: true,
    source: "organization",
    organizationDraftId: draft.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await kv.set(`event:${eventId}`, event);
  console.log(`[ORG] Draft duals ${eventId} (${battleIds.length} battles) by ${adminWallet}`);
  return event;
}

export function mountOrganizationRoutes(app: Hono, PREFIX: string) {
  app.get(`${PREFIX}/organizations`, async (c) => {
    try {
      const data = await listPublic();
      return c.json({ success: true, data });
    } catch (error) {
      console.log(`[ORG] list error: ${error}`);
      return c.json({ success: false, error: "Failed to load organizations" }, 500);
    }
  });

  app.get(`${PREFIX}/organizations/me`, async (c) => {
    try {
      const wallet = String(c.req.query("wallet") || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const data = ownerPayload(await ownerBundle(wallet));
      return c.json({ success: true, data });
    } catch (error) {
      console.log(`[ORG] me error: ${error}`);
      return c.json({ success: false, error: "Failed to load organization account" }, 500);
    }
  });

  app.get(`${PREFIX}/organizations/dashboard`, async (c) => {
    try {
      const wallet = String(c.req.query("wallet") || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const bundle = await ownerBundle(wallet);
      if (!bundle.org || bundle.org.status !== "approved") {
        return c.json({ success: false, error: "An approved organization is required", code: "ORG_NOT_APPROVED" }, 403);
      }
      const boards = [];
      for (const draft of bundle.drafts) {
        if (draft.battleEventId && draft.gamified) {
          const board = await votingBoardFor(draft.battleEventId);
          if (board) boards.push({ draftId: draft.id, ...board });
        }
      }
      return c.json({ success: true, data: { ...ownerPayload(bundle), boards } });
    } catch (error) {
      console.log(`[ORG] dashboard error: ${error}`);
      return c.json({ success: false, error: "Failed to load dashboard" }, 500);
    }
  });

  app.get(`${PREFIX}/organizations/:id/logo`, async (c) => {
    try {
      const id = c.req.param("id");
      const org: any = await kv.get(`organization:${id}`);
      if (!org || org.status !== "approved" || !org.logoPath) {
        return c.json({ success: false, error: "Logo not found" }, 404);
      }
      const res = await streamLogo(org.logoPath);
      if (!res) return c.json({ success: false, error: "Logo not found" }, 404);
      return res;
    } catch (error) {
      console.log(`[ORG] logo error: ${error}`);
      return c.json({ success: false, error: "Failed to load logo" }, 500);
    }
  });

  app.get(`${PREFIX}/organizations/:id`, async (c) => {
    try {
      const id = c.req.param("id");
      if (id === "me" || id === "dashboard") {
        return c.json({ success: false, error: "Not found" }, 404);
      }
      const all = await listPublic();
      const org = all.find((o) => o.id === id);
      if (!org) return c.json({ success: false, error: "Organization not found" }, 404);
      return c.json({ success: true, data: org });
    } catch (error) {
      console.log(`[ORG] get error: ${error}`);
      return c.json({ success: false, error: "Failed to load organization" }, 500);
    }
  });

  app.post(`${PREFIX}/organizations/logo`, async (c) => {
    try {
      const form = await c.req.formData();
      const wallet = String(form.get("wallet") || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const ip = (c.req.header("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
      const walletRl = await checkRateLimit(`orglgo:${wallet}`, 8, 60 * 60 * 1000);
      const ipRl = await checkRateLimit(`orglgoip:${ip}`, 30, 60 * 60 * 1000);
      if (walletRl.limited || ipRl.limited) {
        return c.json({ success: false, error: "Too many logo uploads. Wait and try again." }, 429);
      }
      const file = form.get("file");
      if (!(file instanceof File)) return c.json({ success: false, error: "No file provided" }, 400);
      if (file.size <= 0 || file.size > LOGO_MAX_BYTES) {
        return c.json({ success: false, error: "Logo must be a PNG, JPEG, or WEBP under 5 MB" }, 400);
      }
      if (!LOGO_MIME.has(file.type)) {
        return c.json({ success: false, error: "Only PNG, JPEG, or WEBP images are allowed" }, 400);
      }
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const safeWallet = wallet.replace(/[^0-9.]/g, "_");
      const path = `pfps/org-${safeWallet}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage.from(PFP_BUCKET).upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        console.log(`[ORG] logo upload failed: ${upErr.message}`);
        return c.json({ success: false, error: "Upload failed. Please try again." }, 500);
      }
      return c.json({ success: true, data: { path } });
    } catch (error) {
      console.log(`[ORG] logo upload error: ${error}`);
      return c.json({ success: false, error: "Failed to upload logo" }, 500);
    }
  });

  app.post(`${PREFIX}/organizations/apply`, async (c) => {
    try {
      const body = await c.req.json();
      const wallet = String(body.wallet || "");
      const rl = await checkRateLimit(`orgapp:${wallet}`, 3, 60 * 60 * 1000);
      if (rl.limited) return c.json({ success: false, error: "Too many applications. Please wait." }, 429);
      const fields = normalizeApply(body);
      const invalid = applyError(fields);
      if (invalid) return c.json({ success: false, error: invalid }, 400);
      const owned = await kv.get(`org-by-wallet:${wallet}`);
      if (owned?.orgId) {
        const org = await kv.get(`organization:${owned.orgId}`);
        if (org && org.status === "approved") {
          return c.json({ success: false, error: "This wallet already runs an approved organization" }, 409);
        }
      }
      const apps = await kv.getByPrefix("org-application:");
      if (apps.some((a: any) => a.wallet === wallet && a.status === "pending")) {
        return c.json({ success: false, error: "You already have an organization waiting for WCO review" }, 409);
      }
      const canonical = applyCanonical(fields);
      const verified = await verifyOrgSignature(c, wallet, body.message, body.signature, "WCO-ORG-APPLY-v1", canonical);
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);
      const id = generateId("orgapp");
      const application = {
        id,
        wallet,
        ...fields,
        status: "pending",
        changelog: [],
        decisionNote: "",
        submittedAt: nowIso(),
        updatedAt: nowIso(),
      };
      await kv.set(`org-application:${id}`, application);
      console.log(`[ORG] Application ${id} from ${wallet}`);
      return c.json({ success: true, data: { id, status: "pending" } });
    } catch (error) {
      console.log(`[ORG] apply error: ${error}`);
      return c.json({ success: false, error: "Failed to submit organization" }, 500);
    }
  });

  app.post(`${PREFIX}/organizations/edits`, async (c) => {
    try {
      const body = await c.req.json();
      const wallet = String(body.wallet || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const link = await kv.get(`org-by-wallet:${wallet}`);
      const org: any = link?.orgId ? await kv.get(`organization:${link.orgId}`) : null;
      if (!org || org.status !== "approved") {
        return c.json({ success: false, error: "An approved organization is required" }, 403);
      }
      const pending = await kv.get(`org-edit:${org.id}`);
      if (pending?.status === "pending") {
        return c.json({ success: false, error: "A profile change is already waiting for WCO" }, 409);
      }
      const fields = normalizeApply({ ...org, ...body, organizers: body.organizers || org.organizers, personalInstagrams: body.personalInstagrams || org.personalInstagrams });
      const invalid = applyError(fields);
      if (invalid) return c.json({ success: false, error: invalid }, 400);
      const canonical = applyCanonical(fields);
      const verified = await verifyOrgSignature(c, wallet, body.message, body.signature, "WCO-ORG-EDIT-v1", canonical);
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);
      const edit = {
        orgId: org.id,
        wallet,
        ...fields,
        status: "pending",
        changelog: [],
        submittedAt: nowIso(),
      };
      await kv.set(`org-edit:${org.id}`, edit);
      return c.json({ success: true, data: { orgId: org.id, status: "pending" } });
    } catch (error) {
      console.log(`[ORG] edit error: ${error}`);
      return c.json({ success: false, error: "Failed to submit profile change" }, 500);
    }
  });

  app.post(`${PREFIX}/organizations/events`, async (c) => {
    try {
      const body = await c.req.json();
      const wallet = String(body.wallet || "");
      const rl = await checkRateLimit(`orgdrv:${wallet}`, 20, 60 * 60 * 1000);
      if (rl.limited) return c.json({ success: false, error: "Too many event saves. Please wait." }, 429);
      const link = await kv.get(`org-by-wallet:${wallet}`);
      const org: any = link?.orgId ? await kv.get(`organization:${link.orgId}`) : null;
      if (!org || org.status !== "approved") {
        return c.json({ success: false, error: "An approved organization is required" }, 403);
      }
      const action = body.draftId ? "update" : "create";
      const fields = normalizeEvent({ ...body, draftId: body.draftId || "" }, action);
      if (!fields.name) return c.json({ success: false, error: "Event name is required" }, 400);
      if (!DISCIPLINES.has(fields.discipline)) return c.json({ success: false, error: "Choose a discipline" }, 400);
      if (!FORMATS.has(fields.format)) return c.json({ success: false, error: "Choose 1v1 Duals, Tournament, or Best in Field" }, 400);
      if (fields.athleteIds.length) {
        const athErr = await athletesExist(fields.athleteIds);
        if (athErr) return c.json({ success: false, error: athErr }, 400);
      }
      let existing: any = null;
      if (action === "update") {
        existing = await kv.get(`org-event-draft:${fields.draftId}`);
        if (!existing || existing.wallet !== wallet) return c.json({ success: false, error: "Draft not found" }, 404);
        if (existing.status === "submitted" || existing.status === "approved") {
          return c.json({ success: false, error: "This event is locked while WCO is reviewing it" }, 409);
        }
      }
      const canonical = eventCanonical(fields);
      const verified = await verifyOrgSignature(c, wallet, body.message, body.signature, "WCO-ORG-EVENT-DRAFT-v1", canonical);
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);
      const id = existing?.id || generateId("orgevt");
      const draft = {
        ...(existing || {}),
        id,
        orgId: org.id,
        wallet,
        ...fields,
        draftId: id,
        action: undefined,
        status: "draft",
        gamified: false,
        battleEventId: existing?.battleEventId || "",
        calendarEventId: existing?.calendarEventId || "",
        decisionNote: "",
        changelog: existing?.changelog || [],
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      delete draft.action;
      await kv.set(`org-event-draft:${id}`, draft);
      return c.json({ success: true, data: { id, status: "draft" } });
    } catch (error) {
      console.log(`[ORG] draft error: ${error}`);
      return c.json({ success: false, error: "Failed to save event draft" }, 500);
    }
  });

  app.post(`${PREFIX}/organizations/events/:id/submit`, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const wallet = String(body.wallet || "");
      const draft: any = await kv.get(`org-event-draft:${id}`);
      if (!draft || draft.wallet !== wallet) return c.json({ success: false, error: "Draft not found" }, 404);
      if (draft.status === "submitted") return c.json({ success: false, error: "Already submitted" }, 409);
      if (draft.status === "approved") return c.json({ success: false, error: "Already approved" }, 409);
      const fields = normalizeEvent({ ...draft, draftId: id, note: draft.note }, "submit");
      if (!fields.name) return c.json({ success: false, error: "Event name is required" }, 400);
      if (!DISCIPLINES.has(fields.discipline) || !FORMATS.has(fields.format)) {
        return c.json({ success: false, error: "Discipline and format are required" }, 400);
      }
      const canonical = eventCanonical(fields);
      const verified = await verifyOrgSignature(c, wallet, body.message, body.signature, "WCO-ORG-EVENT-v1", canonical);
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);
      draft.status = "submitted";
      draft.submittedAt = nowIso();
      draft.updatedAt = nowIso();
      await kv.set(`org-event-draft:${id}`, draft);
      return c.json({ success: true, data: { id, status: "submitted" } });
    } catch (error) {
      console.log(`[ORG] submit error: ${error}`);
      return c.json({ success: false, error: "Failed to submit event" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/organizations`, requireAdminSession, async (c) => {
    try {
      await ensureWcoRecord();
      await backfillWcoEvents();
      const applications = await kv.getByPrefix("org-application:");
      const edits = (await kv.getByPrefix("org-edit:")).filter((e: any) => e && e.status === "pending");
      const drafts = await kv.getByPrefix("org-event-draft:");
      const orgs = await kv.getByPrefix("organization:");
      const sortNew = (a: any, b: any) => String(b.submittedAt || b.updatedAt || "").localeCompare(String(a.submittedAt || a.updatedAt || ""));
      applications.sort(sortNew);
      drafts.sort(sortNew);
      return c.json({ success: true, data: { applications, edits, drafts, orgs } });
    } catch (error) {
      console.log(`[ORG] admin list error: ${error}`);
      return c.json({ success: false, error: "Failed to load organization queue" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/organizations/applications/:id/logo`, requireAdminSession, async (c) => {
    try {
      const appRec: any = await kv.get(`org-application:${c.req.param("id")}`);
      const editId = c.req.query("edit");
      let path = appRec?.logoPath || "";
      if (editId) {
        const edit: any = await kv.get(`org-edit:${editId}`);
        path = edit?.logoPath || path;
      }
      const res = await streamLogo(path);
      if (!res) return c.json({ success: false, error: "Logo not found" }, 404);
      return res;
    } catch (error) {
      console.log(`[ORG] admin logo error: ${error}`);
      return c.json({ success: false, error: "Failed to load logo" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/organizations/applications/:id`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const adminWallet = c.get("adminWallet");
      const application: any = await kv.get(`org-application:${id}`);
      if (!application) return c.json({ success: false, error: "Application not found" }, 404);
      if (application.status !== "pending") return c.json({ success: false, error: "Only a pending application can be edited" }, 409);
      const next = normalizeApply({ ...application, ...body });
      const invalid = applyError(next);
      if (invalid) return c.json({ success: false, error: invalid }, 400);
      const before = applyCanonical(normalizeApply(application));
      const after = applyCanonical(next);
      const fields = before === after ? [] : [`profile updated ${nowIso()}`];
      const keys = ["name", "country", "email", "discipline", "bio", "instagram", "youtube", "website", "eventName", "eventDate", "logoPath"];
      const changes: string[] = [];
      for (const k of keys) {
        if (String((application as any)[k] || "") !== String((next as any)[k] || "")) {
          changes.push(`${k}: "${(application as any)[k] || ""}" → "${(next as any)[k] || ""}"`);
        }
      }
      application.changelog = application.changelog || [];
      if (changes.length) {
        application.changelog.push({ at: nowIso(), wallet: adminWallet, fields: changes });
      }
      Object.assign(application, next);
      application.updatedAt = nowIso();
      await kv.set(`org-application:${id}`, application);
      return c.json({ success: true, data: application });
    } catch (error) {
      console.log(`[ORG] admin edit error: ${error}`);
      return c.json({ success: false, error: "Failed to save edits" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/organizations/applications/:id/decide`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const adminWallet = c.get("adminWallet");
      const application: any = await kv.get(`org-application:${id}`);
      if (!application) return c.json({ success: false, error: "Application not found" }, 404);
      if (application.status !== "pending") return c.json({ success: false, error: "Application is no longer pending" }, 409);
      const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : "";
      if (!decision) return c.json({ success: false, error: "Decision must be approved or rejected" }, 400);
      const next = normalizeApply({ ...application, ...(body.fields || {}) });
      const invalid = decision === "approved" ? applyError(next) : null;
      if (invalid) return c.json({ success: false, error: invalid }, 400);
      const keys = ["name", "country", "email", "discipline", "bio", "instagram", "youtube", "website", "eventName", "eventDate", "logoPath"];
      const changes: string[] = [];
      for (const k of keys) {
        if (String(application[k] || "") !== String((next as any)[k] || "")) {
          changes.push(`${k}: "${application[k] || ""}" → "${(next as any)[k] || ""}"`);
        }
      }
      const changelog = [...(application.changelog || [])];
      if (changes.length) changelog.push({ at: nowIso(), wallet: adminWallet, fields: changes });
      const note = orgText(body.note, 2000);
      const canonical = decisionCanonical(decision, note, applyCanonical(next));
      const verified = await verifyOrgSignature(
        c,
        adminWallet,
        body.message,
        body.signature,
        "WCO-APPROVE-ORG-v1",
        canonical,
      );
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);

      Object.assign(application, next);
      application.status = decision;
      application.decisionNote = note;
      application.changelog = changelog;
      application.reviewedAt = nowIso();
      application.reviewedBy = adminWallet;
      application.updatedAt = nowIso();
      await kv.set(`org-application:${id}`, application);

      const report = reportText(decision, note, changelog);
      if (decision === "approved") {
        const orgId = generateId("org");
        const org = {
          id: orgId,
          name: next.name,
          country: next.country,
          discipline: next.discipline,
          bio: next.bio,
          website: next.website,
          instagram: next.instagram,
          youtube: next.youtube,
          logoPath: next.logoPath,
          email: next.email,
          organizers: next.organizers,
          personalInstagrams: next.personalInstagrams,
          wallet: application.wallet,
          status: "approved",
          featured: false,
          applicationId: id,
          approvedBy: adminWallet,
          approvedAt: nowIso(),
          changelog,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await kv.set(`organization:${orgId}`, org);
        await kv.set(`org-by-wallet:${application.wallet}`, { orgId });
        application.orgId = orgId;
        await kv.set(`org-application:${id}`, application);
        await notify(application.wallet, "org_approved", "Organization approved", report, { orgId, applicationId: id });
        console.log(`[ORG] Approved ${id} → ${orgId} by ${adminWallet}`);
        return c.json({ success: true, data: { application, org } });
      }

      await notify(application.wallet, "org_rejected", "Organization not accepted", report, { applicationId: id });
      console.log(`[ORG] Rejected ${id} by ${adminWallet}`);
      return c.json({ success: true, data: { application } });
    } catch (error) {
      console.log(`[ORG] decide org error: ${error}`);
      return c.json({ success: false, error: "Failed to decide organization" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/organizations/edits/:orgId/decide`, requireAdminSession, async (c) => {
    try {
      const orgId = c.req.param("orgId");
      const body = await c.req.json();
      const adminWallet = c.get("adminWallet");
      const org: any = await kv.get(`organization:${orgId}`);
      const edit: any = await kv.get(`org-edit:${orgId}`);
      if (!org || !edit || edit.status !== "pending") {
        return c.json({ success: false, error: "No pending profile change" }, 404);
      }
      const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : "";
      if (!decision) return c.json({ success: false, error: "Decision must be approved or rejected" }, 400);
      const next = normalizeApply({ ...edit, ...(body.fields || {}) });
      if (decision === "approved") {
        const invalid = applyError(next);
        if (invalid) return c.json({ success: false, error: invalid }, 400);
      }
      const note = orgText(body.note, 2000);
      const canonical = decisionCanonical(decision, note, applyCanonical(next));
      const verified = await verifyOrgSignature(c, adminWallet, body.message, body.signature, "WCO-APPROVE-ORG-v1", canonical);
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);
      edit.status = decision;
      edit.decisionNote = note;
      edit.reviewedBy = adminWallet;
      edit.reviewedAt = nowIso();
      if (decision === "approved") {
        org.name = next.name;
        org.country = next.country;
        org.email = next.email;
        org.discipline = next.discipline;
        org.logoPath = next.logoPath;
        org.instagram = next.instagram;
        org.youtube = next.youtube;
        org.website = next.website;
        org.bio = next.bio;
        org.organizers = next.organizers;
        org.personalInstagrams = next.personalInstagrams;
        org.updatedAt = nowIso();
        await kv.set(`organization:${orgId}`, org);
      }
      await kv.set(`org-edit:${orgId}`, edit);
      const report = reportText(decision === "approved" ? "Profile update approved" : "Profile update not accepted", note, edit.changelog || []);
      await notify(
        edit.wallet,
        decision === "approved" ? "org_approved" : "org_rejected",
        decision === "approved" ? "Profile update approved" : "Profile update not accepted",
        report,
        { orgId },
      );
      return c.json({ success: true, data: { org, edit } });
    } catch (error) {
      console.log(`[ORG] decide edit error: ${error}`);
      return c.json({ success: false, error: "Failed to decide profile change" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/organizations/events/:id/decide`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const adminWallet = c.get("adminWallet");
      const draft: any = await kv.get(`org-event-draft:${id}`);
      if (!draft) return c.json({ success: false, error: "Event draft not found" }, 404);
      if (draft.status !== "submitted") return c.json({ success: false, error: "Event is not waiting for review" }, 409);
      const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : "";
      if (!decision) return c.json({ success: false, error: "Decision must be approved or rejected" }, 400);
      const gamified = body.gamified === true;
      const fields = normalizeEvent({ ...draft, ...(body.fields || {}), draftId: id }, "submit");
      if (!fields.name || !DISCIPLINES.has(fields.discipline) || !FORMATS.has(fields.format)) {
        return c.json({ success: false, error: "Name, discipline, and format are required" }, 400);
      }
      if (decision === "approved" && gamified) {
        const athErr = await athletesExist(fields.athleteIds);
        if (athErr) return c.json({ success: false, error: athErr }, 400);
        const countErr = formatCountError(fields.format, fields.athleteIds.length);
        if (countErr) return c.json({ success: false, error: countErr }, 400);
      }
      const note = orgText(body.note, 2000);
      const eventBody = eventCanonical(fields);
      const canonical = decisionCanonical(`${decision}|gamified=${gamified ? "1" : "0"}`, note, eventBody);
      const verified = await verifyOrgSignature(
        c,
        adminWallet,
        body.message,
        body.signature,
        "WCO-APPROVE-ORG-EVENT-v1",
        canonical,
      );
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);

      const changes: string[] = [];
      for (const k of ["name", "eventDate", "location", "livestream", "registrationUrl", "website", "discipline", "format", "note"]) {
        if (String(draft[k] || "") !== String((fields as any)[k] || "")) {
          changes.push(`${k}: "${draft[k] || ""}" → "${(fields as any)[k] || ""}"`);
        }
      }
      if ((draft.athleteIds || []).join(",") !== fields.athleteIds.join(",")) {
        changes.push("athletes updated");
      }
      draft.changelog = draft.changelog || [];
      if (changes.length) draft.changelog.push({ at: nowIso(), wallet: adminWallet, fields: changes });
      Object.assign(draft, fields);
      draft.decisionNote = note;
      draft.reviewedAt = nowIso();
      draft.reviewedBy = adminWallet;
      draft.gamified = decision === "approved" && gamified;
      draft.updatedAt = nowIso();

      if (decision === "rejected") {
        draft.status = "rejected";
        await kv.set(`org-event-draft:${id}`, draft);
        const report = reportText("Event not accepted", note, draft.changelog);
        await notify(draft.wallet, "org_event_rejected", "Event not accepted", report, { draftId: id });
        return c.json({ success: true, data: { draft } });
      }

      const org: any = await kv.get(`organization:${draft.orgId}`);
      if (gamified) {
        const event = await createGamifiedEvent(draft, org, adminWallet);
        draft.status = "approved";
        draft.battleEventId = event.id;
        await kv.set(`org-event-draft:${id}`, draft);
        const report = reportText(
          "Event accepted. It is a draft in the WCO Event Console until commanders open voting.",
          note,
          draft.changelog,
        );
        await notify(draft.wallet, "org_event_approved", "Event accepted", report, { draftId: id, eventId: event.id });
        return c.json({ success: true, data: { draft, event } });
      }

      const calendarId = generateId("orgcal");
      const card = {
        id: calendarId,
        orgId: draft.orgId,
        name: draft.name,
        eventDate: draft.eventDate || "",
        location: draft.location || "",
        livestream: draft.livestream || "",
        registrationUrl: draft.registrationUrl || "",
        website: draft.website || "",
        discipline: draft.discipline,
        format: "calendar",
        gamified: false,
        visibility: "public",
        sourceDraftId: id,
        createdAt: nowIso(),
      };
      await kv.set(`organization-event:${calendarId}`, card);
      draft.status = "approved";
      draft.calendarEventId = calendarId;
      draft.gamified = false;
      await kv.set(`org-event-draft:${id}`, draft);
      const report = reportText("Event listed on your organization card. Voting is off for this one.", note, draft.changelog);
      await notify(draft.wallet, "org_event_approved", "Event listed", report, { draftId: id, calendarId });
      return c.json({ success: true, data: { draft, calendar: card } });
    } catch (error) {
      console.log(`[ORG] decide event error: ${error}`);
      const message = error instanceof Error ? error.message : "Failed to decide event";
      const status = (error as any)?.status || 500;
      return c.json({ success: false, error: status === 400 ? message : "Failed to decide event" }, status);
    }
  });

  app.post(`${PREFIX}/admin/organizations/:id/suspend`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      if (id === WCO_ID) return c.json({ success: false, error: "WCO stays on the directory" }, 400);
      const body = await c.req.json();
      const adminWallet = c.get("adminWallet");
      const org: any = await kv.get(`organization:${id}`);
      if (!org) return c.json({ success: false, error: "Organization not found" }, 404);
      const decision = body.decision === "approved" ? "approved" : "suspended";
      const note = orgText(body.note, 2000);
      const canonical = decisionCanonical(decision, note, `id=${id}`);
      const verified = await verifyOrgSignature(c, adminWallet, body.message, body.signature, "WCO-APPROVE-ORG-v1", canonical);
      if (!verified.ok) return c.json({ success: false, error: verified.error }, verified.status);
      org.status = decision === "approved" ? "approved" : "suspended";
      org.updatedAt = nowIso();
      org.changelog = org.changelog || [];
      org.changelog.push({ at: nowIso(), wallet: adminWallet, fields: [`status → ${org.status}`] });
      await kv.set(`organization:${id}`, org);
      if (org.wallet) {
        await notify(
          org.wallet,
          org.status === "suspended" ? "org_rejected" : "org_approved",
          org.status === "suspended" ? "Organization suspended" : "Organization restored",
          reportText(org.status, note, org.changelog),
          { orgId: id },
        );
      }
      return c.json({ success: true, data: { id, status: org.status } });
    } catch (error) {
      console.log(`[ORG] suspend error: ${error}`);
      return c.json({ success: false, error: "Failed to update organization" }, 500);
    }
  });
}
