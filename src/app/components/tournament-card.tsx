/**
 * Public Tournament Card — multi-athlete champion-pick voting UI.
 * Lives on /battles alongside 1v1 battle cards.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Crown, Loader2, Target, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { generateSecureNonce } from "../lib/api";
import { signatureCancelledMessage, signaturePromptMessage } from "../lib/magic-signing-guidance";
import type { Athlete, BattleEvent, TournamentMatch, TournamentVote } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { InlineFlag } from "./country-flag";

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

export function TournamentCard({
  event,
  athleteMap,
  myVote,
  connected,
  accountId,
  votingPower,
  walletSessionToken,
  walletProvider,
  signMessage,
  onVoted,
}: {
  event: BattleEvent;
  athleteMap: Map<string, Athlete>;
  myVote?: TournamentVote | null;
  connected: boolean;
  accountId: string | null;
  votingPower: number;
  walletSessionToken?: string | null;
  walletProvider?: string | null;
  signMessage: (msg: string) => Promise<string | null>;
  onVoted: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(myVote?.athleteId || null);
  const [submitting, setSubmitting] = useState(false);
  const [showBracket, setShowBracket] = useState(false);

  const entrantIds = event.athleteIds || event.bracket?.map((s) => s.athleteId) || [];
  const tallies = event.voteTallies || {};
  const totalWeighted = event.totalWeighted || 0;
  const status = event.votingStatus || "draft";
  const canVote = status === "voting_open" && connected && !!accountId;

  const champion = event.championId ? athleteMap.get(event.championId) : null;

  const statusLabel = useMemo(() => {
    switch (status) {
      case "voting_open":
        return { text: "CHAMPION PICK OPEN", color: "#EF4444" };
      case "voting_closed":
        return { text: "VOTING CLOSED", color: "#6AA3E0" };
      case "champion_declared":
      case "rewards_distributed":
        return { text: "CHAMPION DECLARED", color: "#10b981" };
      case "upcoming":
        return { text: "UPCOMING", color: "#f59e0b" };
      default:
        return { text: "DRAFT", color: "#8494A7" };
    }
  }, [status]);

  const castVote = async () => {
    if (!picked || !accountId) return;
    setSubmitting(true);
    try {
      const nonce = generateSecureNonce();
      const signedMessage = [
        "BOTB-TOURNAMENT-VOTE",
        `Event: ${event.id}`,
        `Champion Pick: ${picked}`,
        `Wallet: ${accountId}`,
        `Nonce: ${nonce}`,
        "Stake: 0 BOTB (headcount / pre-token)",
      ].join("\n");

      toast.info(signaturePromptMessage(walletProvider, "approve the tournament vote signature"), {
        duration: 12000,
      });
      const signature = await signMessage(signedMessage);
      if (!signature) {
        toast.error(signatureCancelledMessage(walletProvider));
        return;
      }

      const res = await api.voteTournament(
        {
          eventId: event.id,
          wallet: accountId,
          athleteId: picked,
          stakeAmount: 0,
          signature,
          signedMessage,
          nonce,
        },
        walletSessionToken || undefined,
      );

      if (!res.success) {
        toast.error(res.error || "Vote failed");
        return;
      }
      toast.success("Champion pick recorded — free headcount vote · no token rewards yet");
      onVoted();
    } catch (err: any) {
      toast.error(err?.message || "Vote failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#D4A843]/25 bg-gradient-to-br from-[#111d30] to-[#0B1120] overflow-hidden"
      style={{ boxShadow: "0 0 40px rgba(212,168,67,0.08)" }}
    >
      <div className="px-4 sm:px-5 py-4 border-b border-[#D4A843]/15">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-[#D4A843]" />
              <span className="text-[0.55rem] font-bold tracking-widest text-[#D4A843]" style={ORBITRON}>
                TOURNAMENT
              </span>
              <span
                className="text-[0.5rem] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${statusLabel.color}22`, color: statusLabel.color, ...ORBITRON }}
              >
                {statusLabel.text}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#E8ECF0] truncate" style={ORBITRON}>
              {event.name}
            </h3>
            <p className="text-[0.65rem] text-[#8494A7] mt-0.5">
              {entrantIds.length} athletes · single elimination · pick one champion
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <div className="text-right text-[0.55rem] text-[#8494A7]">
            <div className="flex items-center gap-1 justify-end">
              <Users className="w-3 h-3" />
              {event.totalVotes || 0} votes
            </div>
            {myVote && (
              <p className="text-[#6AA3E0] mt-1">
                Your pick: {athleteMap.get(myVote.athleteId)?.name || myVote.athleteId}
              </p>
            )}
          </div>
        </div>
        {champion && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/25">
            <Trophy className="w-4 h-4 text-[#10b981]" />
            <span className="text-xs text-[#10b981] font-bold" style={ORBITRON}>
              CHAMPION: {champion.name}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {entrantIds.map((id) => {
            const ath = athleteMap.get(id);
            if (!ath) return null;
            const t = tallies[id] || { count: 0, weighted: 0 };
            const pct = totalWeighted > 0 ? Math.round((t.weighted / totalWeighted) * 100) : 0;
            const selected = picked === id || myVote?.athleteId === id;
            const color = ath.primaryColor || ath.nftCardBorderColor || "#4274B9";
            const isChamp = event.championId === id;

            return (
              <button
                key={id}
                type="button"
                disabled={!canVote || submitting}
                onClick={() => canVote && setPicked(id)}
                className={`relative text-left rounded-xl border p-2.5 transition-all ${
                  selected
                    ? "border-[#D4A843] bg-[#D4A843]/10"
                    : "border-[#1e293b] bg-white/[0.02] hover:border-[#4274B9]/40"
                } ${!canVote ? "cursor-default" : "cursor-pointer"}`}
                style={isChamp ? { boxShadow: `0 0 20px ${color}44` } : undefined}
              >
                {isChamp && (
                  <Crown className="absolute top-1.5 right-1.5 w-3 h-3 text-[#D4A843]" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-9 h-9 rounded-lg overflow-hidden border"
                    style={{ borderColor: `${color}66` }}
                  >
                    <ImageWithFallback
                      src={ath.pfpUrl}
                      alt={ath.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-bold text-[#E8ECF0] truncate">{ath.name}</p>
                    <p className="text-[0.5rem] text-[#8494A7] flex items-center gap-1">
                      <InlineFlag country={ath.country} className="w-3 h-2" />
                      <span className="text-[#10b981]">{ath.wins}W</span>-
                      <span className="text-[#EF4444]">{ath.losses}L</span>
                      <span className="text-[#8494A7]">·</span>
                      <span className="text-[#D4A843]">
                        T {(ath.tournamentWins || 0)}-{(ath.tournamentLosses || 0)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[#162033] overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div className="flex justify-between text-[0.45rem] text-[#8494A7]">
                  <span>{t.count} votes</span>
                  <span>{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {canVote && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              disabled={!picked || submitting}
              onClick={() => void castVote()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
              style={{
                ...ORBITRON,
                background: "linear-gradient(135deg, #D4A843, #a07520)",
                color: "#0B1120",
                fontSize: "0.7rem",
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {myVote ? "UPDATE CHAMPION PICK" : "CONFIRM CHAMPION PICK"}
              {votingPower > 1 ? ` · ${votingPower}x` : ""}
            </button>
            <p className="text-[0.5rem] text-[#8494A7] text-center sm:text-left sm:max-w-[12rem]">
              Free headcount vote · no token rewards yet
            </p>
          </div>
        )}

        {!connected && status === "voting_open" && (
          <p className="text-center text-[0.65rem] text-[#8494A7]">Connect wallet to pick a champion</p>
        )}

        <button
          type="button"
          onClick={() => setShowBracket((v) => !v)}
          className="text-[0.55rem] text-[#6AA3E0] hover:underline"
        >
          {showBracket ? "Hide bracket" : "Show bracket"}
        </button>

        {showBracket && (
          <TournamentBracketView matches={event.tournamentMatches || []} athleteMap={athleteMap} />
        )}
      </div>
    </motion.div>
  );
}

function TournamentBracketView({
  matches,
  athleteMap,
}: {
  matches: TournamentMatch[];
  athleteMap: Map<string, Athlete>;
}) {
  if (!matches.length) {
    return <p className="text-[0.55rem] text-[#8494A7]">No bracket matches yet.</p>;
  }
  const byRound = new Map<number, TournamentMatch[]>();
  for (const m of matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-3 pt-2 border-t border-[#4274B9]/15">
      {rounds.map((r) => (
        <div key={r}>
          <p className="text-[0.55rem] text-[#D4A843] mb-1.5" style={ORBITRON}>
            {byRound.get(r)![0]?.roundName || `Round ${r}`}
          </p>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {byRound.get(r)!.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-[#1e293b] px-2.5 py-1.5 text-[0.55rem] text-[#8494A7]"
              >
                <span className={m.winnerId === m.athlete1Id ? "text-[#10b981] font-bold" : "text-[#E8ECF0]"}>
                  {m.athlete1Id ? athleteMap.get(m.athlete1Id)?.name || m.athlete1Id : "TBD"}
                </span>
                <span className="mx-1.5">vs</span>
                <span className={m.winnerId === m.athlete2Id ? "text-[#10b981] font-bold" : "text-[#E8ECF0]"}>
                  {m.isBye && !m.athlete2Id
                    ? "BYE"
                    : m.athlete2Id
                      ? athleteMap.get(m.athlete2Id)?.name || m.athlete2Id
                      : "TBD"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
