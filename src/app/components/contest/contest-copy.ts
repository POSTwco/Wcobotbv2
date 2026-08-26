/**
 * Connect-to-Enter — centralized marketing + legal short copy
 */

export const CONTEST_TERMS_VERSION = "1.1.0";

export const CONTEST_TITLE = "Connect to Enter — $250 Giveaway";

export const CONTEST_HERO_LINE =
  "Connect to Enter. First 5,000 wallets auto-join a $250 giveaway. Share a workout on X for a shot at +$100. No loss. Only gains.";

export const CONTEST_BANNER_HEADLINE = "$250 CONNECT-TO-ENTER";

export const CONTEST_BANNER_SUB =
  "First 5,000 wallets · auto-enter on connect · share on X for +$100";

export const CONTEST_SOCIAL_PROMO =
  "We're running a Connect-to-Enter giveaway on WCO — first 5,000 unique Hedera wallets that connect are in for $250. Crush a workout, share your proof, and you could take the $100 social prize. Connect at wcorg.io — winners announced without publishing wallet addresses. #Hedera #Calisthenics #WCO #ConnectToEnter";

/** Core brand tags (always safe on posts) */
export const CONTEST_SHARE_HASHTAGS = "#WCO #BattleOfTheBars #HederaWeb3";

/**
 * Unique campaign tracking hashtag for Connect-to-Enter social monitoring.
 * Use this to find contest-related shares on X / social search.
 */
export const CONTEST_TRACKING_HASHTAG = "#WCOCTE250";

/** Short contest blurb for workout share captions */
export const CONTEST_SHARE_SENTENCE =
  "Also in for the WCO $250 Connect-to-Enter giveaway — first 5,000 wallets auto-enter on connect, plus a $100 share prize lane.";

/**
 * Full default workout-share caption (proof stats + contest + tracking tag).
 */
export function buildWorkoutShareCaption(args: {
  level: number;
  totalSets: number;
  uniqueExercises: number;
  topMoves?: string[];
  prCount: number;
  streak: number;
  entryNumber?: number | null;
}): string {
  const moves = (args.topMoves || []).slice(0, 3).join(", ");
  const workoutLine = `Just crushed my WCO Level ${args.level} workout — ${args.totalSets} sets across ${args.uniqueExercises} moves${moves ? ` (${moves})` : ""}. ${args.prCount} PRs. ${args.streak}-day streak. Real proof on Hedera.`;
  const entryLine =
    args.entryNumber && args.entryNumber > 0
      ? ` Contest entry #${args.entryNumber} — ${CONTEST_SHARE_SENTENCE}`
      : ` ${CONTEST_SHARE_SENTENCE}`;
  const tags = `${CONTEST_TRACKING_HASHTAG} #ConnectToEnter ${CONTEST_SHARE_HASHTAGS} #Cali`;
  return `${workoutLine}${entryLine} Connect at wcorg.io ${tags}`;
}

export function contestEnteredToast(entryNumber: number): string {
  return `You're entry #${entryNumber}. You're in the Connect-to-Enter giveaway — share a workout proof on X for the $100 bonus lane.`;
}

export function contestSpotsLabel(entryCount: number, entryCap: number): string {
  const n = Math.max(0, Math.min(entryCount, entryCap));
  return `${n.toLocaleString()} / ${entryCap.toLocaleString()} spots filled`;
}

export const CONTEST_DETAILS_SECTIONS = [
  {
    title: "How to enter",
    body:
      "Connect your Hedera wallet (e.g. HashPack) on wcorg.io. If the contest is open, you are automatically entered when your wallet connects — first 5,000 unique wallets only. One entry per account ID. No HBAR balance is required for contest entry.",
  },
  {
    title: "Prizes",
    body:
      "Main draw: $150 (1st), $75 (2nd), and $25 (3rd) — $250 total. Bonus lane: $100 for one winner who shares a workout proof on X using the in-app social media post tool. Total prize pool: $350 USD. Payment method (USDC, HBAR, or other) is at WCO's discretion after winner verification.",
  },
  {
    title: "Eligibility",
    body:
      "You must be of legal age of majority in your jurisdiction. A valid Hedera wallet connection is required. Contest entry, free workouts, and battle votes do not require holding HBAR. Void where prohibited. WCO may disqualify bots, multi-accounting abuse, or fraudulent activity.",
  },
  {
    title: "How winners are chosen",
    body:
      "After the contest closes (cap reached, deadline, or admin close), winners are selected fairly using an admin export + external random picker (or equivalent documented method). Main prizes require winners to log in with the winning wallet during the claim window. Social prize is drawn from wallets that used Share-to-X (or native share) from the workout proof tool.",
  },
  {
    title: "Privacy",
    body:
      "Full wallet addresses are never published on the public site or in marketing. Entrant lists are available only to authenticated admins for prize administration. Public announcements describe prizes and that winners were selected — not full wallet IDs.",
  },
  {
    title: "Official rules",
    body:
      "By using the platform you accept the Beta Platform Notice (including the Connect-to-Enter section), Terms of Service, and Privacy Policy. Taxes on prizes are the winner's responsibility. WCO may require reasonable identity or ownership verification before payout. Platform decisions are final to the fullest extent permitted by law. This is not financial advice and does not constitute an offer of securities.",
  },
] as const;
