/**
 * Canonical org payloads for wallet signatures.
 * The Edge module organizations.tsx mirrors these builders. If a field
 * order or sanitizer changes, change both or signatures will not match.
 */

export const ORG_DISCIPLINES = ["freestyle", "statics", "freestyle_statics"] as const;
export type OrgDiscipline = (typeof ORG_DISCIPLINES)[number];

export const ORG_FORMATS = ["pvp", "tournament", "field"] as const;
export type OrgEventFormat = (typeof ORG_FORMATS)[number];

export type OrgEventAction = "create" | "update" | "submit";

export function orgDisciplineLabel(id?: string | null): string {
  if (id === "freestyle") return "FreeStyle";
  if (id === "statics") return "Statics";
  if (id === "freestyle_statics") return "Both";
  return "";
}

export function orgFormatLabel(id?: string | null): string {
  if (id === "pvp") return "1v1 Duals";
  if (id === "tournament") return "Tournament";
  if (id === "field") return "Best in Field";
  return "";
}

/** Same steps as server sanitizeString, then flatten newlines. */
export function orgText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  let s = input;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<[^>]*>/g, "");
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  s = s.trim().slice(0, maxLength);
  s = s.replace(/[\r\n]+/g, " ").replace(/[ \t]{2,}/g, " ").trim();
  return s;
}

export function httpsUrl(input: unknown, maxLength = 300): string {
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

/** Instagram / YouTube handle, or an https URL. */
export function orgHandle(input: unknown, maxLength = 200): string {
  const s = orgText(input, maxLength);
  if (!s) return "";
  if (s.startsWith("https://")) return httpsUrl(s, maxLength);
  if (/[\s<>]/.test(s)) return "";
  return s.replace(/^@/, "");
}

export function orgLogoPath(input: unknown): string {
  const s = orgText(input, 300);
  if (!s) return "";
  if (!s.startsWith("pfps/org-") || s.includes("..") || s.includes("\\")) return "";
  return s;
}

export function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

export interface OrgApplyFields {
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

function pad4(list: string[] | undefined): string[] {
  const src = Array.isArray(list) ? list : [];
  return [0, 1, 2, 3].map((i) => (typeof src[i] === "string" ? src[i] : ""));
}

export function normalizeApply(f: OrgApplyFields): OrgApplyFields {
  const organizers = pad4(f.organizers).map((v) => orgText(v, 80));
  const personalInstagrams = pad4(f.personalInstagrams).map((v) => orgHandle(v));
  return {
    name: orgText(f.name, 120),
    country: orgText(f.country, 80),
    email: orgText(f.email, 200).toLowerCase(),
    discipline: f.discipline,
    logoPath: orgLogoPath(f.logoPath),
    instagram: orgHandle(f.instagram),
    youtube: orgHandle(f.youtube),
    website: httpsUrl(f.website),
    bio: orgText(f.bio, 2000),
    organizers,
    personalInstagrams,
    eventName: orgText(f.eventName, 160),
    eventDate: orgText(f.eventDate, 40),
  };
}

export function applyCanonical(f: OrgApplyFields): string {
  const n = normalizeApply(f);
  return [
    `name=${n.name}`,
    `country=${n.country}`,
    `email=${n.email}`,
    `discipline=${n.discipline}`,
    `logoPath=${n.logoPath}`,
    `instagram=${n.instagram}`,
    `youtube=${n.youtube}`,
    `website=${n.website}`,
    `bio=${n.bio}`,
    `organizer1=${n.organizers[0]}`,
    `organizer2=${n.organizers[1]}`,
    `organizer3=${n.organizers[2]}`,
    `organizer4=${n.organizers[3]}`,
    `personal1=${n.personalInstagrams[0]}`,
    `personal2=${n.personalInstagrams[1]}`,
    `personal3=${n.personalInstagrams[2]}`,
    `personal4=${n.personalInstagrams[3]}`,
    `eventName=${n.eventName}`,
    `eventDate=${n.eventDate}`,
  ].join("\n");
}

export interface OrgEventFields {
  action: OrgEventAction;
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

export function normalizeEvent(f: OrgEventFields): OrgEventFields {
  return {
    action: f.action,
    draftId: orgText(f.draftId, 80),
    name: orgText(f.name, 160),
    eventDate: orgText(f.eventDate, 40),
    location: orgText(f.location, 200),
    livestream: httpsUrl(f.livestream),
    registrationUrl: httpsUrl(f.registrationUrl),
    website: httpsUrl(f.website),
    discipline: f.discipline,
    format: f.format,
    note: orgText(f.note, 2000),
    athleteIds: (f.athleteIds || []).map((id) => orgText(id, 80)).filter(Boolean),
  };
}

export function eventCanonical(f: OrgEventFields): string {
  const n = normalizeEvent(f);
  return [
    `action=${n.action}`,
    `draftId=${n.draftId}`,
    `name=${n.name}`,
    `eventDate=${n.eventDate}`,
    `location=${n.location}`,
    `livestream=${n.livestream}`,
    `registrationUrl=${n.registrationUrl}`,
    `website=${n.website}`,
    `discipline=${n.discipline}`,
    `format=${n.format}`,
    `note=${n.note}`,
    `athletes=${n.athleteIds.join(",")}`,
  ].join("\n");
}

export function decisionCanonical(decision: string, note: string, body: string): string {
  return [`decision=${orgText(decision, 40)}`, `note=${orgText(note, 2000)}`, body].join("\n");
}

export function buildSignedMessage(
  prefix: string,
  wallet: string,
  hash: string,
  nonce: string,
  expires: string,
): string {
  return [
    prefix,
    `Wallet: ${wallet}`,
    `Hash: ${hash}`,
    `Nonce: ${nonce}`,
    `Expires: ${expires}`,
  ].join("\n");
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function signatureExpiry(minutes = 10): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function orgNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const hex = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${Date.now()}-${hex}`;
}

export async function signCanonical(
  signMessage: (message: string) => Promise<string | null>,
  prefix: string,
  wallet: string,
  canonical: string,
): Promise<{ message: string; signature: string } | null> {
  const hash = await sha256Hex(canonical);
  const message = buildSignedMessage(prefix, wallet, hash, orgNonce(), signatureExpiry());
  const signature = await signMessage(message);
  if (!signature) return null;
  return { message, signature };
}
