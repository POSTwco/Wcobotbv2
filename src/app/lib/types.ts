/**
 * BOTB Production Data Types
 * ==========================
 * Shared TypeScript interfaces used by both the frontend and server.
 * These replace all mock-data structures with production-ready schemas.
 *
 * KV Key Conventions:
 *   athlete:{id}                        -> Athlete
 *   event:{id}                          -> BattleEvent
 *   battle:{id}                         -> Battle
 *   proposal:{id}                       -> Proposal
 *   nft-collection:{id}                 -> NFTCollection
 *   vote:battle:{battleId}:{wallet}     -> BattleVote
 *   vote:skill:{athleteId}:{wallet}     -> SkillVote
 *   vote:proposal:{proposalId}:{wallet} -> ProposalVote
 *   snapshot:{battleId}                 -> RewardSnapshot
 *   config:site                         -> SiteConfig
 *   sponsor:{id}                        -> Sponsor
 */

// ---------------------------------------------------------------------------
// Athlete
// ---------------------------------------------------------------------------
export interface AthleteSkills {
  energy: number;       // 0-10 scale
  performance: number;  // 0-10 scale
  static: number;       // 0-10 scale
  aggression: number;   // 0-10 scale
  dynamic: number;      // 0-10 scale
}

export interface AthleteSocials {
  instagram?: string;   // Full URL or handle
  twitter?: string;     // Full URL or handle
  youtube?: string;     // Full URL or channel link
  website?: string;     // Personal website
}

/** Competition discipline shown on Pro Card / athlete profile */
export type AthleteCompetitionCategory =
  | "freestyle"
  | "statics"
  | "freestyle_statics"
  | "reps_sets";

export const ATHLETE_COMPETITION_CATEGORIES: Array<{
  id: AthleteCompetitionCategory;
  label: string;
}> = [
  { id: "freestyle", label: "FreeStyle" },
  { id: "statics", label: "Statics" },
  { id: "freestyle_statics", label: "Freestyle & Statics" },
  { id: "reps_sets", label: "Reps & Sets" },
];

export function competitionCategoryLabel(
  id?: AthleteCompetitionCategory | string | null,
): string {
  if (!id) return "";
  return (
    ATHLETE_COMPETITION_CATEGORIES.find((c) => c.id === id)?.label || String(id)
  );
}

export interface Athlete {
  id: string;                    // e.g. "ath-001" (auto-generated)
  name: string;                  // Display name e.g. "Tony Gaste"
  fullName: string;              // Legal/full name e.g. "Antonio Gastelum"
  nickname?: string;             // Ring name e.g. "The Beast"
  country: string;               // Country of origin
  bio: string;                   // Extended biography
  pfpUrl: string;                // Profile picture URL
  socials: AthleteSocials;
  email?: string;                // Contact email (admin-only, not public)
  phone?: string;                // Contact phone number (admin-only, not public)

  // Competition data — 1v1 battle record (unchanged by tournaments)
  wins: number;
  losses: number;
  /** Separate tournament ranking — champion pick events only */
  tournamentWins?: number;
  tournamentLosses?: number;
  streak: number;                // Current win/loss streak
  rank: number;                  // Overall ranking (1 = best)
  status: AthleteStatus;
  specialMove?: string;          // Signature move name

  /**
   * Competition discipline for Pro Card / battles.
   * freestyle | statics | freestyle_statics | reps_sets
   */
  competitionCategory?: AthleteCompetitionCategory;

  // Skills — initial set by admin, adjusted by Governor votes
  skills: AthleteSkills;

  // NFT data (optional until minted)
  nftTokenId?: string;           // Hedera HTS token ID e.g. "0.0.XXXXXXX"
  nftImageUrl?: string;          // High-res NFT card image URL
  nftMetadataUri?: string;       // IPFS or Hedera metadata URI
  nftSeriesName?: string;        // e.g. "Sigma Series"
  nftRarity?: string;            // "Common" | "Rare" | "Epic" | "Legendary"
  nftCardBorderColor?: string;   // Hex color for card border glow
  nftCardGlowGradient?: string;  // Tailwind gradient e.g. "from-[#FFD700] via-[#22C55E] to-[#FFD700]"

  // Brand colors — used by the Dynamic Theme Engine to tint battle UIs
  primaryColor?: string;         // Hex color e.g. "#FF6B00" — athlete's main brand color
  secondaryColor?: string;       // Hex color e.g. "#FFB347" — secondary accent

  // Weight class — official WCO divisions
  weightClass?: string;          // Official WCO division, e.g. "Lightweight (125–135 lbs)" — see WCO_WEIGHT_CLASSES

  // Verified Hedera wallet (admin-set, for Arena Chat athlete badge)
  wallet?: string;               // Hedera account ID e.g. "0.0.XXXXXXX"

  /** Admin-granted Elite Tech Vault access (wallet must match at verify) */
  eliteAccess?: boolean;

  // Bracket assignment
  bracketSeat?: number;          // 1-12, default bracket seed position

  // Aggregated stats (computed server-side)
  totalVotes: number;
  totalPowerRating: number;      // Sum of all 5 skills
  tokensStaked: number;          // Total tokens staked on this athlete

  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

export type AthleteStatus = "active" | "eliminated" | "champion" | "inactive";

// ---------------------------------------------------------------------------
// Battle Event (PvP bracket of 1v1 battles OR tournament champion-pick)
// ---------------------------------------------------------------------------
/**
 * PvP = 1v1 voting matchups.
 * Tournament = bracket + fans pick one champion.
 * Field = flat pool (no matchups), judged best-in-field; fans pick one champion.
 */
export type EventCompetitionFormat = "pvp" | "tournament" | "field";
export type EventElimination = "single" | "double";

export type TournamentVotingStatus =
  | "draft"
  | "upcoming"
  | "voting_open"
  | "voting_closed"
  | "champion_declared"
  | "rewards_distributed";

export interface BattleEvent {
  id: string;                    // e.g. "evt-001"
  name: string;                  // e.g. "BOTB World Championship 2026"
  description: string;
  location: string;              // e.g. "Los Angeles, USA"
  startDate: string;             // ISO date
  endDate: string;               // ISO date
  totalPrizePool: number;        // Total WCO/BOTB tokens in pool
  status: EventStatus;
  bracketSize: number;           // PvP: 2–12 even; Tournament: 3–12
  bracket: BracketSeat[];        // Ordered seat assignments
  rounds: BracketRound[];        // Generated matchup rounds (PvP battle IDs; tournament may be empty)

  /** Defaults to "pvp" for legacy events */
  format?: EventCompetitionFormat;
  /** Tournament only — v1 uses single; double reserved. Unused for field. */
  elimination?: EventElimination;
  /** Field / Best in Field: judged performance rounds (1 or 2) */
  performanceRounds?: 1 | 2;
  /** Optional admin scores: round key → athleteId → points */
  fieldScores?: Record<string, Record<string, number>>;
  /** Tournament/field entrant ids (denormalized from bracket seats) */
  athleteIds?: string[];
  /** Fan-vote lifecycle for tournament + field (independent of event.status) */
  votingStatus?: TournamentVotingStatus;
  championId?: string;
  voteTallies?: Record<string, { count: number; weighted: number }>;
  totalVotes?: number;
  totalWeighted?: number;
  /** Bracket match tree (tournament only; empty for field) */
  tournamentMatches?: TournamentMatch[];

  createdAt: string;
  updatedAt: string;
}

export type EventStatus = "draft" | "active" | "completed" | "cancelled";

export interface BracketSeat {
  seat: number;                  // 1-12 (1 = top seed, 12 = #2 seed)
  athleteId: string;
}

export interface BracketRound {
  roundNumber: number;           // 1, 2, 3, 4 (finals)
  roundName: string;             // "Round 1", "Quarter-Finals", "Semi-Finals", "Finals"
  battleIds: string[];           // IDs of battles in this round (PvP only)
}

/** Structural match in a tournament bracket (not a public 1v1 Battle vote target) */
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

/** Fan champion-pick vote on a tournament event */
export interface TournamentVote {
  eventId: string;
  wallet: string;
  athleteId: string;
  stakeAmount: number;
  votingPower: number;
  weightedVote: number;
  hasGovernorNFT: boolean;
  hasSigmaNFT: boolean;
  timestamp: string;
  signature: string;
  signedMessage: string;
  nonce: string;
  isUpdate?: boolean;
}

// ---------------------------------------------------------------------------
// Battle (individual matchup within an event)
// ---------------------------------------------------------------------------
export interface Battle {
  id: string;                    // e.g. "btl-001"
  eventId: string;               // Parent event
  title: string;                 // e.g. "World Championship Finals"
  status: BattleStatus;
  round: string;                 // "Round 1", "Quarter-Finals", etc.
  bracketPosition: number;       // Position in bracket (1-6 for round 1, etc.)

  athlete1Id: string;
  athlete2Id: string;

  // Voting
  votingOpensAt: string;         // ISO timestamp — when fans can start voting
  votingClosesAt: string;        // ISO timestamp — voting deadline
  totalPool: number;             // Total tokens in the community pool for this battle
  votes1Count: number;           // Raw vote count for athlete 1
  votes2Count: number;           // Raw vote count for athlete 2
  votes1Weighted: number;        // Weighted votes (includes NFT multipliers)
  votes2Weighted: number;

  // Result
  winnerId?: string;             // Athlete ID of winner (set by admin)
  rewardDistributed: boolean;    // Has the airdrop been executed?

  location: string;
  prize: string;                 // Human-readable prize description

  createdAt: string;
  updatedAt: string;
}

export type BattleStatus =
  | "draft"             // Created but not visible to public
  | "upcoming"          // Visible, voting not yet open
  | "voting_open"       // Fans can vote
  | "voting_closed"     // Voting ended, awaiting result
  | "winner_declared"   // Admin declared winner, snapshot generated
  | "rewards_distributed" // Airdrop completed
  | "cancelled";

// ---------------------------------------------------------------------------
// Voting Records
// ---------------------------------------------------------------------------
export interface BattleVote {
  battleId: string;
  wallet: string;                // Hedera account ID e.g. "0.0.12345"
  athleteId: string;             // Which athlete they voted for
  stakeAmount: number;           // Tokens staked with this vote
  votingPower: number;           // Multiplier (1x base, 1.5x NFT, 2x Governor, 3x both)
  weightedVote: number;          // stakeAmount * votingPower
  hasGovernorNFT: boolean;
  hasSigmaNFT: boolean;
  timestamp: string;             // ISO timestamp
  /** Digital signature of the vote message (base64) */
  signature: string;
  /** Human-readable message that was signed */
  signedMessage: string;
  /** Unique nonce to prevent replay */
  nonce: string;
  /** Parent event ID for cross-battle allocation tracking */
  eventId: string;
  /** Whether this is an updated/changed vote */
  isUpdate?: boolean;
}

export interface SkillVote {
  athleteId: string;
  wallet: string;
  skills: Partial<AthleteSkills>; // Governor votes ±0.5 per category
  votingPower: number;
  hasGovernorNFT?: boolean;
  hasSigmaNFT?: boolean;
  signature?: string;
  signedMessage?: string;
  nonce?: string;
  timestamp: string;
}

export interface ProposalVote {
  proposalId: string;
  wallet: string;
  direction: "for" | "against";
  votingPower: number;
  hasGovernorNFT?: boolean;
  hasSigmaNFT?: boolean;
  signature?: string;
  signedMessage?: string;
  nonce?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Governance Proposals
// ---------------------------------------------------------------------------
export interface Proposal {
  id: string;                    // e.g. "prop-001"
  title: string;
  description: string;
  category: ProposalCategory;
  status: ProposalStatus;
  proposer: string;              // Wallet address or "WCO Admin"
  votesFor: number;              // Weighted vote total
  votesAgainst: number;
  totalVoters: number;
  startsAt: string;              // ISO timestamp
  endsAt: string;                // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

export type ProposalStatus = "draft" | "active" | "passed" | "rejected" | "cancelled";
export type ProposalCategory =
  | "Economics"
  | "Governance"
  | "Partnerships"
  | "Athletes"
  | "Events"
  | "Technical"
  | "Community";

// ---------------------------------------------------------------------------
// NFT Collections
// ---------------------------------------------------------------------------
export interface NFTCollection {
  id: string;                    // e.g. "nft-001"
  name: string;                  // e.g. "Sigma Series - Tony Gaste"
  athleteId?: string;            // Associated athlete (if athlete card)
  seriesName: string;            // e.g. "Sigma Series", "Governors"
  rarity: NFTRarity;
  tokenId?: string;              // Hedera HTS token ID
  imageUrl: string;              // Card image
  metadataUri?: string;          // IPFS/Hedera metadata

  votingPower: number;           // Multiplier granted to holder
  tokenReward: number;           // Bonus tokens on win
  boosterMultiplier: number;     // After-win boost multiplier

  price: number;                 // Mint price in WCO/BOTB tokens
  minted: number;                // Current mint count
  maxSupply: number;             // Total supply cap

  createdAt: string;
  updatedAt: string;
}

export type NFTRarity = "Common" | "Rare" | "Epic" | "Legendary";

// ---------------------------------------------------------------------------
// Reward Snapshot (generated when admin declares battle winner)
// ---------------------------------------------------------------------------
export interface RewardSnapshot {
  battleId: string;
  eventId: string;
  winnerId: string;
  winnerName: string;
  totalPool: number;
  totalWinningVotes: number;     // Sum of all weighted votes for winner
  totalVoteRecords?: number;     // Total vote records (all sides)
  totalWinnerVoteRecords?: number; // Vote records for winner only
  duplicatesRemoved?: number;
  tallyDriftDetected?: boolean;
  headcountFallbackUsed?: boolean;
  balanceVerificationEnabled?: boolean;
  recipients: RewardRecipient[];
  generatedAt: string;           // ISO timestamp
  generatedBy?: string;          // Admin wallet that generated
  exportedAt?: string;           // When admin downloaded the CSV/JSON
  airdropTxId?: string;          // Hedera transaction ID if airdrop executed on-chain
  airdropConfirmedAt?: string;   // When airdrop was confirmed
}

export interface RewardRecipient {
  wallet: string;                // Hedera account ID
  stakeAmount: number;           // What they staked
  votingPower: number;           // Their multiplier
  weightedVote: number;          // stake * power
  sharePercent: number;          // % of total pool they receive
  rewardAmount: number;          // Actual tokens to airdrop
  hasGovernorNFT: boolean;
  hasSigmaNFT: boolean;
}

// ---------------------------------------------------------------------------
// Site Configuration (admin-editable)
// ---------------------------------------------------------------------------
export interface SiteConfig {
  tokenStats: {
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    totalStaked: number;
    totalVoters: number;
    totalBattles: number;
    tvl: number;
  };
  /** Hedera account IDs authorized for admin panel — NEVER sent from server */
  adminWallets?: string[];
  /** Feature flags */
  votingEnabled: boolean;
  mintingEnabled: boolean;
  stakingEnabled: boolean;
  /**
   * Homepage hero title video — public Supabase Storage URL only.
   * Writable solely via POST /admin/hero-video (requireAdminSession).
   * When null/empty, frontend falls back to DEFAULT_HERO_VIDEO_URL.
   */
  heroVideoUrl?: string | null;
  heroVideoUpdatedAt?: string | null;
  heroVideoUpdatedBy?: string | null;
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------
export type SponsorTier = "title" | "premium" | "standard" | "routine";

export interface Sponsor {
  id: string;                    // e.g. "spn-001"
  name: string;                  // Company name
  tagline: string;               // Short slogan/tagline
  description: string;           // Longer description for showcase
  logoUrl: string;               // Company logo image URL (Supabase Storage)
  productImageUrl: string;       // Product/promo image URL (Supabase Storage)
  secondaryLogoUrl?: string;     // Secondary product logo (title sponsors)
  websiteUrl: string;            // Link to sponsor website
  tier: SponsorTier;             // Legacy single tier (kept for backward compat)
  tiers: SponsorTier[];          // Multi-tier selection — sponsor appears in all selected spots
  active: boolean;               // Whether currently displayed on site
  displayOrder: number;          // Sort order (lower = first)
  impressions?: number;          // Tracked impressions
  clicks?: number;               // Tracked clicks
  contactName?: string;          // Contact person
  contactEmail?: string;         // Contact email
  customText?: string;           // Custom display text override
  ctaLabel?: string;             // CTA button label
  ctaUrl?: string;             // CTA button link (defaults to websiteUrl)
  startDate?: string;            // Campaign start date
  endDate?: string;              // Campaign end date
  fromInquiryId?: string;        // Source inquiry ID if created from approval
}

// ---------------------------------------------------------------------------
// API Request/Response types
// ---------------------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface AdminAuthPayload {
  wallet: string;               // The connected Hedera account ID
}

/** Athlete form data sent from admin panel (without computed fields) */
export interface AthleteFormData {
  name: string;
  fullName: string;
  nickname?: string;
  country: string;
  bio: string;
  pfpUrl: string;
  socials: AthleteSocials;
  email?: string;                // Contact email
  phone?: string;                // Contact phone number
  specialMove?: string;
  competitionCategory?: AthleteCompetitionCategory;
  skills: AthleteSkills;
  status: AthleteStatus;
  bracketSeat?: number;
  nftTokenId?: string;
  nftImageUrl?: string;
  nftRarity?: string;
  nftMetadataUri?: string;
  nftSeriesName?: string;
  nftCardBorderColor?: string;
  nftCardGlowGradient?: string;
  primaryColor?: string;         // Brand color
  secondaryColor?: string;       // Brand color
  weightClass?: string;          // Weight class
  wallet?: string;               // Verified Hedera wallet for chat badge
  eliteAccess?: boolean;         // Elite Tech Vault whitelist
}

/** Weekly/monthly spotlight in the Elite Tech Vault — edited via Cali admin console */
export interface EliteFeaturedAthlete {
  enabled: boolean;
  periodType: "weekly" | "monthly";
  periodLabel: string;
  athleteName: string;
  tagline: string;
  country: string;
  description: string;
  powerMoves: string[];
  accolades: string[];
  highlightVideoUrl: string;
  photoUrl: string;
  socials: AthleteSocials;
  athleteId?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ---------------------------------------------------------------------------
// Arena Chat
// ---------------------------------------------------------------------------
export type ChatMediaType = "youtube" | "instagram";

/** Athlete/admin-only media attachment on a chat message */
export interface ChatMediaAttachment {
  type: ChatMediaType;
  url: string;
  id: string;
  thumbUrl?: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  wallet: string;
  text: string;
  reactions: Record<string, string[]>; // emoji key → array of wallet addresses
  timestamp: string;
  isAthlete: boolean;
  athleteName?: string;
  isGovernor?: boolean;
  /** Server-side flag — true when the sender is a verified WCO admin wallet */
  isAdmin?: boolean;
  /** YouTube / Instagram share — only athletes & admins may attach */
  media?: ChatMediaAttachment | null;
}

export interface VerifiedAthleteChatInfo {
  name: string;
  pfpUrl?: string;
}

/** Battle form data sent from admin panel */
export interface BattleFormData {
  eventId: string;
  title: string;
  round: string;
  bracketPosition: number;
  athlete1Id: string;
  athlete2Id: string;
  votingOpensAt: string;
  votingClosesAt: string;
  totalPool: number;
  location: string;
  prize: string;
}

/** Event form data sent from admin panel */
export interface EventFormData {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  totalPrizePool: number;
  bracketSize: number;
  bracket: BracketSeat[];
  format?: EventCompetitionFormat;
  elimination?: EventElimination;
  performanceRounds?: 1 | 2;
}

// ---------------------------------------------------------------------------
// Official WCO Weight Classes — single source of truth (frontend)
// ---------------------------------------------------------------------------
// Used by admin athlete-form and public /apply so class changes are one edit.
// Server mirrors this list in make-server-57fcb0ee + server (validate applications).
// Super Middleweight has no upper limit (165+). Labels are lbs-only (no kg).
// ---------------------------------------------------------------------------
export const WCO_WEIGHT_CLASSES = [
  "Strawweight (105–115 lbs)",
  "Featherweight (115–125 lbs)",
  "Lightweight (125–135 lbs)",
  "Super Lightweight (135–145 lbs)",
  "Welterweight (145–155 lbs)",
  "Middleweight (155–165 lbs)",
  "Super Middleweight (165+ lbs)",
] as const;

export type WCOWeightClass = (typeof WCO_WEIGHT_CLASSES)[number];
