/**
 * Pro Judge Card — wallet application, commander approval, public roster.
 *
 * KV (no underscore, so LIKE scans stay exact):
 *   judge:{id}
 *   judge-by-wallet:{wallet}   { wallet, judgeId }
 *   judge-application:{id}
 *
 * Public JSON is an allowlist. Email, phone, legal name, wallet, and
 * the commander who reviewed stay off public and owner responses.
 * Arena Chat reads approved judge names from the judge records.
 */

import type { Context } from "npm:hono";
import type { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import {
  isValidHederaAccountId,
  checkRateLimit,
  sanitizeString,
  requireAdminSession,
  validateWalletSessionToken,
} from "./admin-auth.tsx";

const DISCIPLINES = new Set(["freestyle", "statics", "freestyle_statics"]);
const DISCLAIMER_VERSION = "judge-1.0.0";
const PFP_BUCKET = "make-57fcb0ee-pfps";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

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

function text(input: unknown, maxLength: number): string {
  return sanitizeString(input, maxLength).replace(/[\r\n]+/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

function httpsUrl(input: unknown, maxLength = 300): string {
  const s = text(input, maxLength);
  if (!s) return "";
  try {
    const url = new URL(s);
    if (url.protocol !== "https:") return "";
    return s;
  } catch {
    return "";
  }
}

function handle(input: unknown, maxLength = 200): string {
  const s = text(input, maxLength);
  if (!s) return "";
  if (s.startsWith("https://")) return httpsUrl(s, maxLength);
  if (/[\s<>]/.test(s)) return "";
  return s.replace(/^@/, "");
}

function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
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

function photoPathFor(wallet: string, input: unknown): string {
  const s = text(input, 300);
  if (!s || s.includes("..") || s.includes("\\") || s.includes("/../")) return "";
  const prefix = `pfps/judge-${wallet}-`;
  if (!s.startsWith(prefix)) return "";
  return s;
}

function publicJudge(row: any) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    country: String(row.country || ""),
    discipline: String(row.discipline || ""),
    bio: String(row.bio || ""),
    hasPhoto: !!row.photoPath,
  };
}

function ownerApplication(row: any) {
  return {
    id: row.id,
    status: row.status,
    name: row.name,
    fullName: row.fullName,
    country: row.country,
    discipline: row.discipline,
    bio: row.bio,
    email: row.email || "",
    phone: row.phone || "",
    instagram: row.instagram || "",
    youtube: row.youtube || "",
    website: row.website || "",
    submittedAt: row.submittedAt,
    hasPhoto: !!row.photoPath,
  };
}

async function notify(wallet: string, type: string, title: string, message: string, extra: Record<string, string> = {}) {
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

async function signedPhoto(path: string): Promise<string> {
  if (!path || !path.startsWith("pfps/judge-") || path.includes("..")) return "";
  try {
    const { data, error } = await supabaseAdmin.storage.from(PFP_BUCKET).createSignedUrl(path, 900);
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  } catch {
    return "";
  }
}

async function streamPhoto(path: string): Promise<Response | null> {
  if (!path || !path.startsWith("pfps/judge-") || path.includes("..")) return null;
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

async function removePhoto(path: string) {
  if (!path || !path.startsWith("pfps/judge-") || path.includes("..")) return;
  try {
    const { error } = await supabaseAdmin.storage.from(PFP_BUCKET).remove([path]);
    if (error) console.log(`[JUDGE] photo delete failed: ${error.message}`);
  } catch (error) {
    console.log(`[JUDGE] photo delete failed: ${error}`);
  }
}

let judgeNameCache: { at: number; map: Record<string, string> } | null = null;

function clearJudgeNameCache() {
  judgeNameCache = null;
}

/** Approved judge display name keyed by wallet. Server-side chat use only. */
export async function approvedJudgeNameByWallet(): Promise<Record<string, string>> {
  if (judgeNameCache && Date.now() - judgeNameCache.at < 10_000) return judgeNameCache.map;
  const rows = await kv.getByPrefix("judge:");
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!row || row.status !== "approved") continue;
    const wallet = String(row.wallet || "");
    if (!isValidHederaAccountId(wallet)) continue;
    map[wallet] = text(row.name, 100) || "Judge";
  }
  judgeNameCache = { at: Date.now(), map };
  return map;
}

export async function judgeNameForWallet(wallet: string): Promise<string> {
  const link = await kv.get(`judge-by-wallet:${wallet}`);
  if (!link?.judgeId) return "";
  const row: any = await kv.get(`judge:${link.judgeId}`);
  if (!row || row.status !== "approved" || row.wallet !== wallet) return "";
  return text(row.name, 100) || "Judge";
}

/** Refresh isJudge from the live roster so revoke and new approvals show on the next poll. */
export async function applyJudgeChatFlags(messages: any[]): Promise<any[]> {
  const map = await approvedJudgeNameByWallet();
  return (Array.isArray(messages) ? messages : []).map((message) => {
    if (!message || typeof message !== "object") return message;
    const name = map[String(message.wallet || "")];
    if (name) return { ...message, isJudge: true, judgeName: name };
    if (message.isJudge || message.judgeName) {
      const next = { ...message, isJudge: false };
      delete next.judgeName;
      return next;
    }
    return message;
  });
}

export function mountJudgeRoutes(app: Hono, PREFIX: string) {
  app.get(`${PREFIX}/judges`, async (c) => {
    try {
      const rows = await kv.getByPrefix("judge:");
      const data = rows
        .filter((row: any) => row && row.status === "approved" && row.id)
        .map(publicJudge)
        .sort((a, b) => a.name.localeCompare(b.name));
      return c.json({ success: true, data });
    } catch (error) {
      console.log(`[JUDGE] list error: ${error}`);
      return c.json({ success: false, error: "Failed to load judges" }, 500);
    }
  });

  app.get(`${PREFIX}/judges/me`, async (c) => {
    try {
      const wallet = String(c.req.query("wallet") || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const link = await kv.get(`judge-by-wallet:${wallet}`);
      if (link?.judgeId) {
        const row: any = await kv.get(`judge:${link.judgeId}`);
        if (row && row.status === "approved" && row.wallet === wallet) {
          return c.json({ success: true, data: { status: "approved", judge: publicJudge(row) } });
        }
      }
      const apps = await kv.getByPrefix("judge-application:");
      const pending = apps.find((row: any) => row && row.wallet === wallet && row.status === "pending");
      if (pending) {
        return c.json({ success: true, data: { status: "pending", application: ownerApplication(pending) } });
      }
      const revoked = (await kv.getByPrefix("judge:")).find((row: any) => row && row.wallet === wallet && row.status === "revoked");
      if (revoked) return c.json({ success: true, data: { status: "revoked" } });
      return c.json({ success: true, data: { status: "none" } });
    } catch (error) {
      console.log(`[JUDGE] me error: ${error}`);
      return c.json({ success: false, error: "Failed to load judge account" }, 500);
    }
  });

  app.get(`${PREFIX}/judges/:id/photo`, async (c) => {
    try {
      const id = c.req.param("id");
      const row: any = await kv.get(`judge:${id}`);
      if (!row || row.status !== "approved" || !row.photoPath) {
        return c.json({ success: false, error: "Photo not found" }, 404);
      }
      const res = await streamPhoto(row.photoPath);
      if (!res) return c.json({ success: false, error: "Photo not found" }, 404);
      return res;
    } catch (error) {
      console.log(`[JUDGE] photo error: ${error}`);
      return c.json({ success: false, error: "Failed to load photo" }, 500);
    }
  });

  app.post(`${PREFIX}/judges/photo`, async (c) => {
    try {
      const form = await c.req.formData();
      const wallet = String(form.get("wallet") || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const ip = (c.req.header("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
      const walletRl = await checkRateLimit(`jdgpho:${wallet}`, 8, 60 * 60 * 1000);
      const ipRl = await checkRateLimit(`jdgphoip:${ip}`, 30, 60 * 60 * 1000);
      if (walletRl.limited || ipRl.limited) {
        return c.json({ success: false, error: "Too many photo uploads. Wait and try again." }, 429);
      }
      const file = form.get("file");
      if (!(file instanceof File)) return c.json({ success: false, error: "No file provided" }, 400);
      if (file.size <= 0 || file.size > PHOTO_MAX_BYTES) {
        return c.json({ success: false, error: "Photo must be a PNG, JPEG, or WEBP under 5 MB" }, 400);
      }
      if (!PHOTO_MIME.has(file.type)) {
        return c.json({ success: false, error: "Only PNG, JPEG, or WEBP images are allowed" }, 400);
      }
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `pfps/judge-${wallet}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage.from(PFP_BUCKET).upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        console.log(`[JUDGE] photo upload failed: ${upErr.message}`);
        return c.json({ success: false, error: "Upload failed. Please try again." }, 500);
      }
      return c.json({ success: true, data: { path } });
    } catch (error) {
      console.log(`[JUDGE] photo upload error: ${error}`);
      return c.json({ success: false, error: "Failed to upload photo" }, 500);
    }
  });

  app.post(`${PREFIX}/judges/apply`, async (c) => {
    try {
      const body = await c.req.json();
      const wallet = String(body.wallet || "");
      const sessionErr = await assertWalletSession(c, wallet);
      if (sessionErr) return c.json({ success: false, error: sessionErr }, 401);
      const rl = await checkRateLimit(`jdgapp:${wallet}`, 3, 60 * 60 * 1000);
      if (rl.limited) return c.json({ success: false, error: "Too many applications. Please wait." }, 429);

      const name = text(body.name, 100);
      const fullName = text(body.fullName, 150);
      const country = text(body.country, 80);
      const discipline = text(body.discipline, 40);
      const bio = text(body.bio, 2000);
      const email = text(body.email, 200);
      const phone = text(body.phone, 50);
      const instagram = handle(body.instagram);
      const youtube = handle(body.youtube);
      const website = httpsUrl(body.website);
      const photoPath = photoPathFor(wallet, body.photoPath);

      if (name.length < 2) return c.json({ success: false, error: "Display name is required" }, 400);
      if (fullName.length < 2) return c.json({ success: false, error: "Legal name is required" }, 400);
      if (!country) return c.json({ success: false, error: "Country is required" }, 400);
      if (!DISCIPLINES.has(discipline)) {
        return c.json({ success: false, error: "Choose FreeStyle, Statics, or Both" }, 400);
      }
      if (bio.length < 20) return c.json({ success: false, error: "Judging experience must be at least 20 characters" }, 400);
      if (!photoPath) return c.json({ success: false, error: "Upload a profile photo with this wallet first" }, 400);
      if (!instagram && !youtube && !website) {
        return c.json({ success: false, error: "Add Instagram, YouTube, or a website" }, 400);
      }
      if (email && !looksLikeEmail(email)) return c.json({ success: false, error: "Email address is not valid" }, 400);
      if (body.disclaimerAccepted !== true || text(body.disclaimerVersion, 20) !== DISCLAIMER_VERSION) {
        return c.json({ success: false, error: "Accept the judge disclaimer to apply" }, 400);
      }

      const link = await kv.get(`judge-by-wallet:${wallet}`);
      if (link?.judgeId) {
        const current: any = await kv.get(`judge:${link.judgeId}`);
        if (current?.status === "approved") {
          return c.json({ success: false, error: "This wallet is already an approved judge" }, 409);
        }
      }
      const existing = await kv.getByPrefix("judge-application:");
      if (existing.some((row: any) => row && row.wallet === wallet && row.status === "pending")) {
        return c.json({ success: false, error: "You already have a pending judge application" }, 409);
      }

      const id = generateId("japp");
      const application = {
        id,
        wallet,
        name,
        fullName,
        country,
        discipline,
        bio,
        photoPath,
        email,
        phone,
        instagram,
        youtube,
        website,
        disclaimerAccepted: true,
        disclaimerVersion: DISCLAIMER_VERSION,
        disclaimerAcceptedAt: nowIso(),
        status: "pending",
        submittedAt: nowIso(),
        reviewedAt: null,
        reviewedBy: null,
        judgeId: "",
      };
      await kv.set(`judge-application:${id}`, application);
      console.log(`[JUDGE] Application ${id} from ${wallet} (${name})`);
      return c.json({ success: true, data: { id, status: "pending" } });
    } catch (error) {
      console.log(`[JUDGE] apply error: ${error}`);
      return c.json({ success: false, error: "Failed to submit application" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/judges`, requireAdminSession, async (c) => {
    try {
      const applications = await kv.getByPrefix("judge-application:");
      const judges = await kv.getByPrefix("judge:");
      applications.sort((a: any, b: any) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
      judges.sort((a: any, b: any) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
      const withPhotos = async (row: any) => (
        row?.photoPath ? { ...row, photoSignedUrl: await signedPhoto(row.photoPath) } : row
      );
      return c.json({
        success: true,
        data: {
          applications: await Promise.all(applications.map(withPhotos)),
          judges: await Promise.all(judges.map(withPhotos)),
        },
      });
    } catch (error) {
      console.log(`[JUDGE] admin list error: ${error}`);
      return c.json({ success: false, error: "Failed to load judge queue" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/judges/applications/:id/photo`, requireAdminSession, async (c) => {
    try {
      const application: any = await kv.get(`judge-application:${c.req.param("id")}`);
      if (!application?.photoPath) return c.json({ success: false, error: "No photo on file" }, 404);
      const res = await streamPhoto(application.photoPath);
      if (!res) return c.json({ success: false, error: "No photo on file" }, 404);
      const headers = new Headers(res.headers);
      const ext = application.photoPath.split(".").pop() || "jpg";
      const filename = `${application.name || "judge"}-${application.id}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      headers.set("Cache-Control", "private, no-store");
      return new Response(res.body, { headers });
    } catch (error) {
      console.log(`[JUDGE] admin photo error: ${error}`);
      return c.json({ success: false, error: "Failed to download photo" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/judges/applications/:id/approve`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      const adminWallet = c.get("adminWallet");
      const application: any = await kv.get(`judge-application:${id}`);
      if (!application) return c.json({ success: false, error: "Application not found" }, 404);
      if (application.status !== "pending") {
        return c.json({ success: false, error: `Application already ${application.status}` }, 400);
      }
      const wallet = String(application.wallet || "");
      if (!isValidHederaAccountId(wallet)) {
        return c.json({ success: false, error: "Application wallet is not valid" }, 400);
      }
      const link = await kv.get(`judge-by-wallet:${wallet}`);
      if (link?.judgeId) {
        const current: any = await kv.get(`judge:${link.judgeId}`);
        if (current?.status === "approved") {
          return c.json({ success: false, error: "This wallet is already an approved judge" }, 409);
        }
      }
      const judgeId = generateId("jdg");
      const judge = {
        id: judgeId,
        wallet,
        name: application.name,
        fullName: application.fullName,
        country: application.country,
        discipline: application.discipline,
        bio: application.bio,
        photoPath: application.photoPath || "",
        email: application.email || "",
        phone: application.phone || "",
        instagram: application.instagram || "",
        youtube: application.youtube || "",
        website: application.website || "",
        status: "approved",
        applicationId: id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        approvedBy: adminWallet,
      };
      await kv.set(`judge:${judgeId}`, judge);
      await kv.set(`judge-by-wallet:${wallet}`, { wallet, judgeId });
      const updated = { ...application, status: "approved", reviewedAt: nowIso(), reviewedBy: adminWallet, judgeId };
      await kv.set(`judge-application:${id}`, updated);
      clearJudgeNameCache();
      await notify(
        wallet,
        "judge_approved",
        "Pro Judge Card Approved",
        `${application.name}, your Official Pro Calisthenics Judge Card is approved. You are on the WCO staff list, and Arena Chat shows your Judge badge.`,
        { applicationId: id, judgeId },
      );
      console.log(`[JUDGE] Approved ${id} → ${judgeId} by ${adminWallet}`);
      return c.json({ success: true, data: { id: judgeId, status: "approved" } });
    } catch (error) {
      console.log(`[JUDGE] approve error: ${error}`);
      return c.json({ success: false, error: "Failed to approve application" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/judges/applications/:id/reject`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      const adminWallet = c.get("adminWallet");
      const application: any = await kv.get(`judge-application:${id}`);
      if (!application) return c.json({ success: false, error: "Application not found" }, 404);
      if (application.status !== "pending") {
        return c.json({ success: false, error: `Application already ${application.status}` }, 400);
      }
      await notify(
        application.wallet,
        "judge_rejected",
        "Pro Judge Card Not Accepted",
        `Thank you for applying, ${application.name}. Your Pro Judge Card was not accepted this time. You may apply again.`,
        { applicationId: id },
      );
      await removePhoto(application.photoPath || "");
      await kv.del(`judge-application:${id}`);
      console.log(`[JUDGE] Rejected ${id} by ${adminWallet}`);
      return c.json({ success: true, data: { id, message: "Application rejected and data deleted." } });
    } catch (error) {
      console.log(`[JUDGE] reject error: ${error}`);
      return c.json({ success: false, error: "Failed to reject application" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/judges/:id/revoke`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      const adminWallet = c.get("adminWallet");
      const row: any = await kv.get(`judge:${id}`);
      if (!row) return c.json({ success: false, error: "Judge not found" }, 404);
      if (row.status !== "approved") return c.json({ success: false, error: "Only an approved judge can be removed" }, 400);
      const updated = { ...row, status: "revoked", updatedAt: nowIso(), revokedBy: adminWallet };
      await kv.set(`judge:${id}`, updated);
      const link = await kv.get(`judge-by-wallet:${row.wallet}`);
      if (link?.judgeId === id) await kv.del(`judge-by-wallet:${row.wallet}`);
      clearJudgeNameCache();
      await notify(
        row.wallet,
        "judge_revoked",
        "Pro Judge Card Removed",
        `${row.name}, your Official Pro Judge Card has been removed. The public listing and Arena Chat badge are no longer active. You may apply again.`,
        { judgeId: id },
      );
      console.log(`[JUDGE] Revoked ${id} by ${adminWallet}`);
      return c.json({ success: true, data: { id, status: "revoked" } });
    } catch (error) {
      console.log(`[JUDGE] revoke error: ${error}`);
      return c.json({ success: false, error: "Failed to remove judge" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/judges/:id`, requireAdminSession, async (c) => {
    try {
      const id = c.req.param("id");
      if (id === "applications") return c.json({ success: false, error: "Not found" }, 404);
      const row: any = await kv.get(`judge:${id}`);
      if (!row || row.status !== "approved") return c.json({ success: false, error: "Approved judge not found" }, 404);
      const body = await c.req.json();
      const name = text(body.name, 100);
      const country = text(body.country, 80);
      const discipline = text(body.discipline, 40);
      const bio = text(body.bio, 2000);
      if (name.length < 2) return c.json({ success: false, error: "Display name is required" }, 400);
      if (!country) return c.json({ success: false, error: "Country is required" }, 400);
      if (!DISCIPLINES.has(discipline)) return c.json({ success: false, error: "Choose FreeStyle, Statics, or Both" }, 400);
      if (bio.length < 20) return c.json({ success: false, error: "Judging experience must be at least 20 characters" }, 400);
      const updated = { ...row, name, country, discipline, bio, updatedAt: nowIso() };
      await kv.set(`judge:${id}`, updated);
      clearJudgeNameCache();
      return c.json({ success: true, data: publicJudge(updated) });
    } catch (error) {
      console.log(`[JUDGE] edit error: ${error}`);
      return c.json({ success: false, error: "Failed to update judge" }, 500);
    }
  });
}
