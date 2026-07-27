/**
 * Connect-to-Enter Contest — shared TypeScript types (client)
 * ===========================================================
 * Server module: supabase/functions/make-server-57fcb0ee/contest.tsx
 * Public stats never include wallet IDs. Full wallets are admin-only.
 */

export type ContestStatus =
  | "draft"
  | "open"
  | "full"
  | "closed"
  | "drawing"
  | "completed";

export type ContestWinnerStatus = "pending" | "claimed" | "paid" | "forfeited";

export interface ContestPrizeMain {
  place: 1 | 2 | 3;
  amountUsd: number;
  label: string;
}

export interface ContestPrizeSocial {
  amountUsd: number;
  label: string;
}

export interface ContestConfig {
  id: string;
  status: ContestStatus;
  title: string;
  entryCap: number;
  entryCount: number;
  minHbarTinybars: number;
  requireCaliSession: boolean;
  startedAt: string | null;
  endsAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
  termsVersion: string;
  prizes: {
    main: ContestPrizeMain[];
    social: ContestPrizeSocial;
  };
  claimWindowDays: number;
  updatedAt: string;
  updatedBy: string | null;
  socialQualifiedCount?: number;
}

/** Public-safe stats — never includes wallets */
export interface ContestPublicStats {
  status: ContestStatus;
  title: string;
  entryCount: number;
  entryCap: number;
  remaining: number;
  startedAt: string | null;
  endsAt: string | null;
  prizes: {
    main: ContestPrizeMain[];
    social: ContestPrizeSocial;
  };
  progressPercent: number;
  isOpen: boolean;
  isFull: boolean;
}

export interface ContestEntry {
  accountId: string;
  entryNumber: number;
  enteredAt: string;
  hbarTinybarsAtEntry: number;
  termsVersion: string;
  source: "wallet_register" | "manual_admin" | "backfill";
  lastLoginAt?: string;
  loginCount?: number;
  socialQualified: boolean;
  socialQualifiedAt?: string;
  socialPlatform?: "x" | "native" | "other";
  socialPostUrl?: string;
  notes?: string;
}

export interface ContestMeStatus {
  entered: boolean;
  entryNumber?: number;
  enteredAt?: string;
  socialQualified?: boolean;
  socialQualifiedAt?: string;
  contestStatus: ContestStatus;
  entryCount: number;
  entryCap: number;
  remaining: number;
}

export interface ContestEnterResult {
  entered: boolean;
  alreadyEntered: boolean;
  entryNumber: number;
  entryCount: number;
  remaining: number;
  status: ContestStatus;
  message: string;
}

export interface ContestShareResult {
  socialQualified: boolean;
  alreadyQualified: boolean;
  entered: boolean;
  message: string;
}

export interface ContestAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
}

export interface ContestWinnerSlot {
  place: 1 | 2 | 3;
  accountId: string;
  amountUsd: number;
  status: ContestWinnerStatus;
  claimedAt?: string;
  paidAt?: string;
  payoutRef?: string;
}

export interface ContestSocialWinner {
  accountId: string | null;
  amountUsd: number;
  status: ContestWinnerStatus;
  claimedAt?: string;
  paidAt?: string;
  payoutRef?: string;
}

export interface ContestWinners {
  drawnAt: string | null;
  drawnBy: string | null;
  method: "external_picker" | "admin_manual" | null;
  seedNote?: string;
  main: ContestWinnerSlot[];
  social: ContestSocialWinner | null;
  publicAnnouncement?: {
    publishedAt: string;
    copy: string;
  };
}

export interface ContestAdminOverview {
  config: ContestConfig;
  metrics: {
    entryCount: number;
    entryCap: number;
    remaining: number;
    socialQualifiedCount: number;
    entriesToday: number;
    entriesLast7d: number;
    entriesSinceStart: number;
    progressPercent: number;
  };
  winners: ContestWinners | null;
  dailySeries: Array<{ date: string; count: number }>;
}

export interface ContestEntriesPage {
  items: ContestEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
