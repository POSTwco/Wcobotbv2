/**
 * BOTB Admin: 12-Man Bracket Builder
 * ====================================
 * Visual bracket with drag-to-assign athletes, snake seeding,
 * auto matchup generation, and event metadata form.
 *
 * Snake seeding: Seat 1 = top seed vs Seat 12 = #2 seed
 * Round 1 generates 6 matches: 1v12, 2v11, 3v10, 4v9, 5v8, 6v7
 *
 * Uses react-dnd for drag-and-drop athlete assignment.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, Users, MapPin, Calendar, Coins, Swords,
  CheckCircle, Loader2, X, Zap, User,
  ChevronRight, AlertTriangle, Trash2, RotateCcw,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Athlete, BattleEvent, EventCompetitionFormat, EventElimination } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getCountryFlag } from "../lib/country-flags";
import { InlineFlag } from "./country-flag";
import { TournamentAdminPanel } from "./tournament-admin-panel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DND_TYPE = "ATHLETE";
const PVP_SIZES = [2, 4, 6, 8, 10, 12];
const TOURNAMENT_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface SeatAssignment {
  seat: number;
  athleteId: string | null;
}

interface MatchupPreview {
  position: number;
  seat1: number;
  seat2: number;
  athlete1: Athlete | null;
  athlete2: Athlete | null;
}

// ---------------------------------------------------------------------------
// Bracket Builder (exported)
// ---------------------------------------------------------------------------

export function BracketBuilder({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [bracketSize, setBracketSize] = useState(12);
  const [competitionFormat, setCompetitionFormat] = useState<EventCompetitionFormat>("pvp");
  const [elimination, setElimination] = useState<EventElimination>("single");

  // Seat assignments — array of { seat, athleteId }
  const [seats, setSeats] = useState<SeatAssignment[]>([]);

  // Event metadata
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizePool, setPrizePool] = useState(0);

  const sizeOptions = competitionFormat === "tournament" ? TOURNAMENT_SIZES : PVP_SIZES;

  // Keep size valid when switching format
  useEffect(() => {
    if (!sizeOptions.includes(bracketSize)) {
      setBracketSize(competitionFormat === "tournament" ? 8 : 12);
    }
  }, [competitionFormat, sizeOptions, bracketSize]);

  // Load athletes + existing events
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [athRes, evtRes] = await Promise.all([
        api.getAthletes(),
        api.getEvents(),
      ]);
      if (athRes.success && athRes.data) setAthletes(athRes.data);
      if (evtRes.success && evtRes.data) setEvents(evtRes.data);
    } catch (err) {
      console.error("[BracketBuilder] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Initialize seats when bracket size changes
  useEffect(() => {
    setSeats(
      Array.from({ length: bracketSize }, (_, i) => ({
        seat: i + 1,
        athleteId: null,
      }))
    );
  }, [bracketSize]);

  // Athletes NOT yet assigned to a seat
  const unassigned = useMemo(() => {
    const assignedIds = new Set(seats.filter((s) => s.athleteId).map((s) => s.athleteId));
    return athletes.filter((a) => !assignedIds.has(a.id));
  }, [athletes, seats]);

  // Athlete lookup map
  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes.forEach((a) => map.set(a.id, a));
    return map;
  }, [athletes]);

  // Generated matchups preview (snake seeding)
  const matchups: MatchupPreview[] = useMemo(() => {
    const numMatches = Math.floor(bracketSize / 2);
    return Array.from({ length: numMatches }, (_, i) => {
      const s1 = seats[i];
      const s2 = seats[bracketSize - 1 - i];
      return {
        position: i + 1,
        seat1: i + 1,
        seat2: bracketSize - i,
        athlete1: s1?.athleteId ? athleteMap.get(s1.athleteId) || null : null,
        athlete2: s2?.athleteId ? athleteMap.get(s2.athleteId) || null : null,
      };
    });
  }, [seats, bracketSize, athleteMap]);

  const allSeatsAssigned = seats.every((s) => s.athleteId !== null);
  const filledCount = seats.filter((s) => s.athleteId).length;

  // Assign athlete to seat
  const assignToSeat = useCallback((seatNum: number, athleteId: string) => {
    setSeats((prev) => {
      // Remove athlete from any existing seat
      const cleaned = prev.map((s) =>
        s.athleteId === athleteId ? { ...s, athleteId: null } : s
      );
      // Assign to target seat
      return cleaned.map((s) =>
        s.seat === seatNum ? { ...s, athleteId } : s
      );
    });
  }, []);

  // Remove athlete from seat
  const removeSeat = useCallback((seatNum: number) => {
    setSeats((prev) =>
      prev.map((s) => (s.seat === seatNum ? { ...s, athleteId: null } : s))
    );
  }, []);

  // Auto-fill by rank
  const autoFillByRank = useCallback(() => {
    const sorted = [...athletes].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    setSeats((prev) =>
      prev.map((s, i) => ({
        ...s,
        athleteId: sorted[i]?.id || null,
      }))
    );
  }, [athletes]);

  // Clear all
  const clearAll = useCallback(() => {
    setSeats((prev) => prev.map((s) => ({ ...s, athleteId: null })));
  }, []);

  // Save bracket → generate event + battles
  const saveBracket = useCallback(async () => {
    if (!eventName.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (!allSeatsAssigned) {
      toast.error("All bracket seats must be filled before generating");
      return;
    }

    setSaving(true);
    try {
      const res = await api.admin.generateBracket(
        {
          name: eventName,
          description: eventDescription,
          location: eventLocation,
          startDate,
          endDate,
          totalPrizePool: prizePool,
          format: competitionFormat,
          elimination: competitionFormat === "tournament" ? elimination : "single",
          bracket: seats.map((s) => ({
            seat: s.seat,
            athleteId: s.athleteId!,
          })),
        },
        wallet,
        sessionToken
      );

      if (res.success && res.data) {
        toast.success(res.data.message);
        setShowBuilder(false);
        loadData(); // Refresh events list
        // Reset form
        setEventName("");
        setEventDescription("");
        setEventLocation("");
        setStartDate("");
        setEndDate("");
        setPrizePool(0);
        setCompetitionFormat("pvp");
        setElimination("single");
        clearAll();
      } else {
        toast.error(res.error || "Failed to generate bracket");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setSaving(false);
    }
  }, [
    eventName, eventDescription, eventLocation, startDate, endDate,
    prizePool, seats, allSeatsAssigned, wallet, loadData, clearAll, sessionToken,
    competitionFormat, elimination,
  ]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 text-[#D4A843] animate-spin mx-auto mb-2" />
        <p className="text-[#8494A7] text-sm">Loading bracket data...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
              BRACKET BUILDER
            </h3>
            <p className="text-[#8494A7] text-xs">
              {events.length} events created · {athletes.length} athletes available
            </p>
          </div>
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] text-xs hover:bg-[#D4A843]/20 transition-all"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
          >
            <Trophy className="w-3 h-3" />
            {showBuilder ? "HIDE BUILDER" : "+ NEW BRACKET EVENT"}
          </button>
        </div>

        {/* Existing Events List */}
        {events.length > 0 && !showBuilder && (
          <div className="space-y-2 mb-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0B1120] border border-[#4274B9]/10 hover:border-[#4274B9]/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-[#4274B9]/10">
                    <Trophy className="w-4 h-4 text-[#4274B9]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#E8ECF0] text-sm font-semibold truncate">{evt.name}</p>
                    <p className="text-[#8494A7] text-[0.6rem] truncate">
                      {(evt.format === "tournament" ? "TOURNAMENT" : "1v1 PvP")} · {evt.bracketSize}-athlete
                      {evt.format === "tournament"
                        ? ` · ${evt.votingStatus || "draft"}`
                        : ` · ${evt.rounds?.length || 0} rounds`}
                      {" · "}{evt.location || "TBD"}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[0.55rem] ${
                  evt.format === "tournament"
                    ? "bg-[#D4A843]/10 text-[#D4A843]"
                    : evt.status === "active" ? "bg-[#10b981]/10 text-[#10b981]" :
                      evt.status === "completed" ? "bg-[#4274B9]/10 text-[#4274B9]" :
                      "bg-[#D4A843]/10 text-[#D4A843]"
                }`}>
                  {evt.format === "tournament"
                    ? (evt.votingStatus || evt.status || "draft").toUpperCase()
                    : (evt.status?.toUpperCase() || "DRAFT")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tournament admin controls (open voting / advance / champion) */}
        {!showBuilder && (
          <TournamentAdminPanel
            events={events.filter((e) => e.format === "tournament")}
            athletes={athletes}
            wallet={wallet}
            sessionToken={sessionToken}
            onRefresh={loadData}
          />
        )}

        {/* No events state */}
        {events.length === 0 && !showBuilder && (
          <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
            <Trophy className="w-8 h-8 text-[#4274B9]/30 mx-auto mb-2" />
            <p className="text-[#8494A7] text-sm mb-2">No bracket events yet.</p>
            <p className="text-[#8494A7] text-xs">
              Click "New Bracket Event" to create your first tournament bracket.
            </p>
          </div>
        )}

        {/* Builder */}
        <AnimatePresence>
          {showBuilder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#0B1120] rounded-xl border border-[#D4A843]/20 overflow-hidden">
                {/* Builder Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#D4A843]/10 bg-[#D4A843]/5">
                  <h4 className="text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                    NEW BRACKET EVENT
                  </h4>
                  <button onClick={() => setShowBuilder(false)} className="text-[#8494A7] hover:text-[#E8ECF0]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-5">
                  {/* Competition format */}
                  <div>
                    <SectionHeader icon={<Swords className="w-3.5 h-3.5" />} title="COMPETITION FORMAT" />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setCompetitionFormat("pvp")}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          competitionFormat === "pvp"
                            ? "bg-[#4274B9] text-white border-[#4274B9]"
                            : "bg-[#162033] text-[#8494A7] border-[#4274B9]/20 hover:border-[#4274B9]/40"
                        }`}
                        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem" }}
                      >
                        1v1 MATCHUPS
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompetitionFormat("tournament")}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          competitionFormat === "tournament"
                            ? "bg-[#D4A843] text-[#0B1120] border-[#D4A843]"
                            : "bg-[#162033] text-[#8494A7] border-[#4274B9]/20 hover:border-[#D4A843]/40"
                        }`}
                        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem" }}
                      >
                        TOURNAMENT (CHAMPION PICK)
                      </button>
                    </div>
                    <p className="text-[#8494A7] text-[0.55rem] mt-2 leading-relaxed">
                      {competitionFormat === "tournament"
                        ? "Fans pick one overall champion. Creates a single-elim bracket for display — no 1v1 voting battles. Uses tournament wins/losses only."
                        : "Existing flow: generates Round 1 1v1 battles fans vote on. Uses battle wins/losses."}
                    </p>
                    {competitionFormat === "tournament" && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setElimination("single")}
                          className={`px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold border ${
                            elimination === "single"
                              ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40"
                              : "bg-[#162033] text-[#8494A7] border-[#4274B9]/15"
                          }`}
                        >
                          Single Elimination
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          className="px-2.5 py-1.5 rounded-lg text-[0.55rem] font-bold border bg-[#162033] text-[#8494A7]/40 border-[#4274B9]/10 cursor-not-allowed"
                        >
                          Double Elimination (Phase 2)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Event Metadata */}
                  <div>
                    <SectionHeader icon={<Calendar className="w-3.5 h-3.5" />} title="EVENT DETAILS" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div className="sm:col-span-2">
                        <label className="text-[#8494A7] text-[0.6rem] block mb-1">Event Name *</label>
                        <input
                          type="text"
                          value={eventName}
                          onChange={(e) => setEventName(e.target.value)}
                          placeholder="e.g. BOTB World Championship 2026"
                          className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
                        />
                      </div>
                      <div>
                        <label className="text-[#8494A7] text-[0.6rem] block mb-1">Location</label>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#8494A7]" />
                          <input
                            type="text"
                            value={eventLocation}
                            onChange={(e) => setEventLocation(e.target.value)}
                            placeholder="Los Angeles, USA"
                            className="flex-1 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[#8494A7] text-[0.6rem] block mb-1">Total Prize Pool (BOTB)</label>
                        <div className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-[#D4A843]" />
                          <input
                            type="number"
                            value={prizePool || ""}
                            onChange={(e) => setPrizePool(Number(e.target.value) || 0)}
                            placeholder="500000"
                            className="flex-1 bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 placeholder:text-[#8494A7]/40"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[#8494A7] text-[0.6rem] block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[#8494A7] text-[0.6rem] block mb-1">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[#8494A7] text-[0.6rem] block mb-1">Description</label>
                        <textarea
                          value={eventDescription}
                          onChange={(e) => setEventDescription(e.target.value)}
                          placeholder="Tournament description..."
                          rows={2}
                          className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#D4A843]/50 resize-none placeholder:text-[#8494A7]/40"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bracket Size */}
                  <div>
                    <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="BRACKET SIZE" />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sizeOptions.map((size) => (
                        <button
                          key={size}
                          onClick={() => setBracketSize(size)}
                          disabled={athletes.length < size}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            bracketSize === size
                              ? "bg-[#D4A843] text-[#0B1120] border border-[#D4A843]"
                              : athletes.length < size
                                ? "bg-[#162033] text-[#8494A7]/30 border border-[#4274B9]/5 cursor-not-allowed"
                                : "bg-[#162033] text-[#8494A7] border border-[#4274B9]/20 hover:border-[#D4A843]/30 hover:text-[#E8ECF0]"
                          }`}
                          style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
                        >
                          {size}
                        </button>
                      ))}
                      <span className="flex items-center text-[#8494A7] text-[0.55rem]">
                        {competitionFormat === "tournament"
                          ? `athletes · single-elim (byes pad to ${Math.pow(2, Math.ceil(Math.log2(Math.max(bracketSize, 2))))})`
                          : `athletes · ${bracketSize / 2} R1 matches`}
                      </span>
                    </div>
                    {athletes.length < bracketSize && (
                      <p className="text-[#f59e0b] text-[0.55rem] mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Need {bracketSize - athletes.length} more athletes. Currently {athletes.length} registered.
                      </p>
                    )}
                  </div>

                  {/* Bracket Assignment — Two columns */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <SectionHeader icon={<Zap className="w-3.5 h-3.5" />} title={`SEAT ASSIGNMENT (${filledCount}/${bracketSize})`} />
                      <div className="flex gap-2">
                        <button
                          onClick={autoFillByRank}
                          disabled={athletes.length < bracketSize}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[0.5rem] bg-[#4274B9]/10 text-[#6AA3E0] border border-[#4274B9]/20 hover:bg-[#4274B9]/20 transition-all disabled:opacity-30"
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          AUTO-FILL
                        </button>
                        <button
                          onClick={clearAll}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[0.5rem] bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          CLEAR
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Available Athletes (drag source) */}
                      <div>
                        <p className="text-[#8494A7] text-[0.55rem] mb-1.5 font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          AVAILABLE ROSTER ({unassigned.length})
                        </p>
                        <div className="bg-[#080D17] rounded-lg border border-[#4274B9]/10 p-2 max-h-[360px] overflow-y-auto space-y-1">
                          {unassigned.length === 0 ? (
                            <p className="text-[#8494A7]/40 text-[0.55rem] text-center py-4">
                              {filledCount === bracketSize ? "All seats filled!" : "No athletes available"}
                            </p>
                          ) : (
                            unassigned.map((ath) => (
                              <DraggableAthlete key={ath.id} athlete={ath} />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right: Bracket Seats (drop targets) */}
                      <div>
                        <p className="text-[#8494A7] text-[0.55rem] mb-1.5 font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          BRACKET SEATS
                        </p>
                        <div className="space-y-1">
                          {seats.map((seat) => (
                            <SeatDropZone
                              key={seat.seat}
                              seat={seat}
                              athlete={seat.athleteId ? athleteMap.get(seat.athleteId) || null : null}
                              bracketSize={bracketSize}
                              onAssign={assignToSeat}
                              onRemove={removeSeat}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Matchup Preview */}
                  {filledCount > 0 && (
                    <div>
                      <SectionHeader icon={<Swords className="w-3.5 h-3.5" />} title="ROUND 1 MATCHUP PREVIEW (SNAKE SEEDING)" />
                      <div className="mt-2 space-y-1.5">
                        {matchups.map((m) => (
                          <div
                            key={m.position}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[#080D17] border border-[#4274B9]/10"
                          >
                            <span className="text-[#D4A843] text-[0.55rem] font-bold w-6 text-center" style={{ fontFamily: "Orbitron, sans-serif" }}>
                              M{m.position}
                            </span>

                            {/* Athlete 1 */}
                            <MatchupSlot
                              athlete={m.athlete1}
                              seatNum={m.seat1}
                              isTopSeed={m.seat1 <= bracketSize / 2}
                            />

                            <div className="flex items-center gap-1 px-1.5">
                              <span className="text-[#D4A843] text-[0.55rem] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>VS</span>
                            </div>

                            {/* Athlete 2 */}
                            <MatchupSlot
                              athlete={m.athlete2}
                              seatNum={m.seat2}
                              isTopSeed={false}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Round Structure Preview */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#4274B9]/10">
                        <span className="text-[#8494A7] text-[0.55rem]">Tournament flow:</span>
                        {getRoundNames(bracketSize).map((name, i, arr) => (
                          <span key={name} className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded bg-[#4274B9]/10 text-[#6AA3E0] text-[0.5rem] border border-[#4274B9]/20" style={{ fontFamily: "Orbitron, sans-serif" }}>
                              {name}
                            </span>
                            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[#8494A7]/40" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveBracket}
                      disabled={saving || !allSeatsAssigned || !eventName.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#D4A843] to-[#B8932B] text-[#0B1120] text-xs font-bold hover:from-[#E5B94E] hover:to-[#D4A843] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      GENERATE BRACKET & BATTLES
                    </button>
                    <button
                      onClick={() => setShowBuilder(false)}
                      className="px-4 py-2.5 rounded-lg bg-[#162033] text-[#8494A7] text-xs hover:text-[#E8ECF0] transition-all"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                    >
                      CANCEL
                    </button>
                    {!allSeatsAssigned && (
                      <span className="flex items-center text-[#f59e0b] text-[0.55rem]">
                        Assign all {bracketSize} seats to continue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}

// ---------------------------------------------------------------------------
// Draggable Athlete Card
// ---------------------------------------------------------------------------

function DraggableAthlete({ athlete }: { athlete: Athlete }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: DND_TYPE,
    item: { athleteId: athlete.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const borderColor = athlete.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete.pfpUrl && athlete.pfpUrl !== "placeholder";

  return (
    <div
      ref={dragRef as any}
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-40 border-[#D4A843]/40 bg-[#D4A843]/5"
          : "border-[#4274B9]/10 bg-[#0B1120] hover:border-[#4274B9]/30"
      }`}
    >
      <div
        className="w-7 h-7 rounded-full overflow-hidden border shrink-0 bg-[#162033] flex items-center justify-center"
        style={{ borderColor: `${borderColor}40` }}
      >
        {hasPfp ? (
          <ImageWithFallback src={athlete.pfpUrl} alt={athlete.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-3 h-3" style={{ color: `${borderColor}60` }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[#E8ECF0] text-[0.6rem] font-semibold truncate">{athlete.name}</p>
        <p className="text-[#8494A7] text-[0.45rem] truncate">
          <InlineFlag country={athlete.country} /> {athlete.country} · PWR {athlete.totalPowerRating?.toFixed(1) || "—"} · Rank #{athlete.rank}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seat Drop Zone
// ---------------------------------------------------------------------------

function SeatDropZone({
  seat,
  athlete,
  bracketSize,
  onAssign,
  onRemove,
}: {
  seat: SeatAssignment;
  athlete: Athlete | null;
  bracketSize: number;
  onAssign: (seat: number, athleteId: string) => void;
  onRemove: (seat: number) => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DND_TYPE,
    drop: (item: { athleteId: string }) => {
      onAssign(seat.seat, item.athleteId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const borderColor = athlete?.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";
  const opponentSeat = bracketSize + 1 - seat.seat;

  // Seed label
  const seedLabel = seat.seat === 1 ? "TOP SEED"
    : seat.seat === bracketSize ? "#2 SEED"
    : `#${seat.seat} SEED`;

  return (
    <div
      ref={dropRef as any}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
        isOver && canDrop
          ? "border-[#D4A843]/60 bg-[#D4A843]/10"
          : athlete
            ? "border-[#4274B9]/20 bg-[#080D17]"
            : "border-dashed border-[#4274B9]/15 bg-[#080D17]/50"
      }`}
    >
      {/* Seat number */}
      <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[#162033] border border-[#4274B9]/10">
        <span className="text-[#D4A843] text-[0.55rem] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
          {seat.seat}
        </span>
      </div>

      {/* Athlete or placeholder */}
      {athlete ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-6 h-6 rounded-full overflow-hidden border shrink-0 bg-[#162033] flex items-center justify-center"
            style={{ borderColor: `${borderColor}40` }}
          >
            {hasPfp ? (
              <ImageWithFallback src={athlete.pfpUrl} alt={athlete.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-2.5 h-2.5" style={{ color: `${borderColor}60` }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#E8ECF0] text-[0.55rem] font-semibold truncate">{athlete.name}</p>
            <p className="text-[#8494A7] text-[0.4rem]">
              {seedLabel} · vs Seat {opponentSeat}
            </p>
          </div>
          <button
            onClick={() => onRemove(seat.seat)}
            className="p-1 rounded text-[#8494A7] hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-[#8494A7]/40 text-[0.55rem]">
            {isOver ? "Drop here" : `Drag athlete · ${seedLabel} · vs Seat ${opponentSeat}`}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matchup Slot (in preview)
// ---------------------------------------------------------------------------

function MatchupSlot({
  athlete,
  seatNum,
  isTopSeed,
}: {
  athlete: Athlete | null;
  seatNum: number;
  isTopSeed: boolean;
}) {
  const borderColor = athlete?.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";

  return (
    <div className={`flex items-center gap-1.5 flex-1 min-w-0 p-1.5 rounded ${
      athlete ? "bg-[#162033]/50" : "bg-transparent"
    }`}>
      {athlete ? (
        <>
          <div
            className="w-5 h-5 rounded-full overflow-hidden border shrink-0 bg-[#162033] flex items-center justify-center"
            style={{ borderColor: `${borderColor}40` }}
          >
            {hasPfp ? (
              <ImageWithFallback src={athlete.pfpUrl} alt={athlete.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-2 h-2" style={{ color: `${borderColor}60` }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[#E8ECF0] text-[0.5rem] font-semibold truncate">{athlete.name}</p>
            <p className="text-[#8494A7] text-[0.4rem]">Seat {seatNum}</p>
          </div>
        </>
      ) : (
        <p className="text-[#8494A7]/30 text-[0.5rem]">Seat {seatNum} — empty</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#6AA3E0]">{icon}</span>
      <p className="text-[#6AA3E0] text-[0.65rem] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
        {title}
      </p>
    </div>
  );
}

function getRoundNames(bracketSize: number): string[] {
  const names: string[] = ["Round 1"];
  let remaining = Math.floor(bracketSize / 2);
  while (remaining > 1) {
    const matchesInRound = Math.floor(remaining / 2);
    const hasBye = remaining % 2 !== 0;
    const advancingToNext = matchesInRound + (hasBye ? 1 : 0);

    if (advancingToNext === 1) names.push("Finals");
    else if (advancingToNext === 2 || matchesInRound === 2) names.push("Semi-Finals");
    else if (matchesInRound === 3 || matchesInRound === 4) names.push("Quarter-Finals");
    else names.push(`Round ${names.length + 1}`);

    remaining = advancingToNext;
  }
  return names;
}