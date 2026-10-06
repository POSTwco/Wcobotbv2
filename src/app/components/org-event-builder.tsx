/**
 * Organization event setup. Same board as the admin Event Console:
 * format, battle or field size, and seated athletes.
 * Saving a partial board stays a private draft. A full board can be submitted for review.
 */

import { useMemo, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Link } from "react-router";
import { AlertTriangle, Coins, MapPin, RotateCcw, Trash2, User, Zap } from "lucide-react";
import type { Athlete } from "../lib/types";
import type { OrgEventFormat } from "../lib/org-sign";
import { ORG_FORMATS, orgFormatLabel } from "../lib/org-sign";
import { OrgDisciplineChecks } from "./org-discipline-checks";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { InlineFlag } from "./country-flag";
import { nextPowerOfTwo } from "../lib/event-admin";

const DND_TYPE = "ORG_EVENT_ATHLETE";
const PVP_BATTLE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export type OrgEventDraft = {
  draftId: string;
  name: string;
  eventDate: string;
  endDate: string;
  location: string;
  livestream: string;
  registrationUrl: string;
  website: string;
  discipline: string;
  format: OrgEventFormat;
  note: string;
  description: string;
  prizePool: number;
  performanceRounds: 1 | 2;
  boardSize: number;
  athleteIds: string[];
  seatIds: string[];
};

export const blankOrgEvent = (): OrgEventDraft => ({
  draftId: "",
  name: "",
  eventDate: "",
  endDate: "",
  location: "",
  livestream: "",
  registrationUrl: "",
  website: "",
  discipline: "freestyle",
  format: "pvp",
  note: "",
  description: "",
  prizePool: 0,
  performanceRounds: 1,
  boardSize: 2,
  athleteIds: [],
  seatIds: [],
});

export function orgEventFromRecord(draft: any): OrgEventDraft {
  const format: OrgEventFormat = draft.format === "tournament" || draft.format === "field" ? draft.format : "pvp";
  const seatIds: string[] = Array.isArray(draft.seatIds) && draft.seatIds.length
    ? draft.seatIds.map((id: unknown) => String(id || ""))
    : (draft.athleteIds || []).map((id: unknown) => String(id || ""));
  const boardSize = Number(draft.boardSize) || seatIds.length || (format === "pvp" ? 2 : 8);
  return {
    draftId: draft.id || "",
    name: draft.name || "",
    eventDate: draft.eventDate || "",
    endDate: draft.endDate || "",
    location: draft.location || "",
    livestream: draft.livestream || "",
    registrationUrl: draft.registrationUrl || "",
    website: draft.website || "",
    discipline: draft.discipline || "freestyle",
    format,
    note: draft.note || "",
    description: draft.description || "",
    prizePool: Number(draft.prizePool) || 0,
    performanceRounds: draft.performanceRounds === 2 ? 2 : 1,
    boardSize,
    athleteIds: seatIds.filter(Boolean),
    seatIds,
  };
}

type Seat = { seat: number; athleteId: string | null };

function seatsFrom(size: number, ids: string[]): Seat[] {
  return Array.from({ length: size }, (_, i) => ({ seat: i + 1, athleteId: ids[i] || null }));
}

export function OrgEventBuilder({
  initial,
  athletes,
  orgId,
  busy,
  onSave,
  onSubmit,
}: {
  initial: OrgEventDraft;
  athletes: Athlete[];
  orgId: string;
  busy: boolean;
  onSave: (draft: OrgEventDraft) => void;
  onSubmit: (draft: OrgEventDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [seats, setSeats] = useState<Seat[]>(() => seatsFrom(
    initial.boardSize || (initial.format === "pvp" ? 2 : 8),
    initial.seatIds.length ? initial.seatIds : initial.athleteIds,
  ));
  const [picked, setPicked] = useState<string | null>(null);

  const isPvp = draft.format === "pvp";
  const isField = draft.format === "field";
  const boardSize = seats.length;
  const battles = Math.max(1, Math.round(boardSize / 2));
  const athleteMap = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);
  const assigned = new Set(seats.map((s) => s.athleteId).filter(Boolean));
  const openRoster = athletes.filter((a) => !assigned.has(a.id));
  const filled = seats.filter((s) => s.athleteId).length;
  const complete = !!draft.name.trim() && seats.every((s) => s.athleteId) && (
    isPvp ? boardSize >= 2 && boardSize <= 32 && boardSize % 2 === 0 : boardSize >= 3 && boardSize <= 12
  );

  function payload(): OrgEventDraft {
    const seatIds = seats.map((s) => s.athleteId || "");
    return {
      ...draft,
      boardSize: seats.length,
      seatIds,
      athleteIds: seatIds.filter(Boolean),
    };
  }

  function setFormat(format: OrgEventFormat) {
    const size = format === "pvp" ? 2 : 8;
    setDraft({ ...draft, format, performanceRounds: format === "field" ? draft.performanceRounds : 1 });
    setSeats(seatsFrom(size, []));
    setPicked(null);
  }

  function setBoard(size: number) {
    setSeats((prev) => seatsFrom(size, prev.map((s) => s.athleteId || "")));
  }

  function assign(seatNum: number, athleteId: string) {
    setSeats((prev) => prev
      .map((s) => (s.athleteId === athleteId ? { ...s, athleteId: null } : s))
      .map((s) => (s.seat === seatNum ? { ...s, athleteId } : s)));
    setPicked(null);
  }

  function remove(seatNum: number) {
    setSeats((prev) => prev.map((s) => (s.seat === seatNum ? { ...s, athleteId: null } : s)));
  }

  function autoFill() {
    const sorted = [...athletes].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    setSeats((prev) => prev.map((s, i) => ({ ...s, athleteId: sorted[i]?.id || null })));
    setPicked(null);
  }

  const pairs = isPvp
    ? Array.from({ length: battles }, (_, i) => ({
        n: i + 1,
        a: seats[i * 2],
        b: seats[i * 2 + 1],
      }))
    : [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-5">
        <div>
          <p className="text-[0.65rem] text-[#6AA3E0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>COMPETITION FORMAT</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {ORG_FORMATS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFormat(id)}
                className={`px-3 py-2 rounded-lg text-[0.65rem] font-bold border ${
                  draft.format === id ? "bg-[#4274B9] text-white border-[#4274B9]" : "bg-[#0B1120] text-[#8494A7] border-[#4274B9]/25"
                }`}
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                {id === "pvp" ? "1v1 DUALS" : id === "tournament" ? "TOURNAMENT" : "BEST IN FIELD"}
              </button>
            ))}
          </div>
          <p className="text-[0.7rem] text-[#8494A7] mt-2 leading-relaxed">
            {isPvp
              ? "Pick how many 1v1 battles (1–16). Each battle needs 2 athletes. Pairs fill Battle 1, Battle 2, and so on. Fans vote each dual after WCO publishes it."
              : isField
                ? "A flat pool of 3 to 12 athletes. They are never paired. Fans later pick exactly one athlete."
                : "3 to 12 athletes. Fans later pick one champion. The bracket is for display."}
          </p>
          {draft.format === "tournament" && (
            <p className="text-[0.65rem] text-[#10b981] mt-2">Single elimination. Double elimination is not available yet.</p>
          )}
          {isField && (
            <div className="flex gap-2 mt-2">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraft({ ...draft, performanceRounds: n as 1 | 2 })}
                  className={`px-2.5 py-1.5 rounded-lg text-[0.65rem] border ${
                    draft.performanceRounds === n ? "border-[#10b981] text-[#10b981]" : "border-[#4274B9]/25 text-[#8494A7]"
                  }`}
                >
                  {n} judged round{n > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[0.65rem] text-[#6AA3E0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>EVENT DETAILS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <label className="sm:col-span-2 text-xs text-[#8494A7]">Event name
              <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Event name fans will read" />
            </label>
            <label className="text-xs text-[#8494A7]">Location
              <span className="mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <input className={inputCls} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="City or venue" />
              </span>
            </label>
            <label className="text-xs text-[#8494A7]">Prize pool
              <span className="mt-1 flex items-center gap-1">
                <Coins className="w-3 h-3 text-[#D4A843]" />
                <input className={inputCls} type="number" min={0} value={draft.prizePool || ""} onChange={(e) => setDraft({ ...draft, prizePool: Number(e.target.value) || 0 })} placeholder="0" />
              </span>
            </label>
            <label className="text-xs text-[#8494A7]">Opens
              <input className={inputCls} type="datetime-local" value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} />
            </label>
            <label className="text-xs text-[#8494A7]">Closes
              <input className={inputCls} type="datetime-local" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </label>
            <label className="sm:col-span-2 text-xs text-[#8494A7]">Public description
              <textarea className={inputCls} rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What fans and the Event Console should show" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#8494A7]">Discipline</p>
            <div className="mt-1"><OrgDisciplineChecks value={draft.discipline} onChange={(discipline) => setDraft({ ...draft, discipline })} /></div>
          </div>
          <label className="text-xs text-[#8494A7]">Livestream
            <input className={inputCls} placeholder="https://" value={draft.livestream} onChange={(e) => setDraft({ ...draft, livestream: e.target.value })} />
          </label>
          <label className="text-xs text-[#8494A7]">Registration link
            <input className={inputCls} placeholder="https://" value={draft.registrationUrl} onChange={(e) => setDraft({ ...draft, registrationUrl: e.target.value })} />
          </label>
          <label className="text-xs text-[#8494A7]">Event website
            <input className={inputCls} placeholder="https://" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
          </label>
        </div>
        <label className="block text-xs text-[#8494A7]">Note to WCO
          <textarea className={inputCls} rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Private. Fans do not see this." />
        </label>

        <div>
          <p className="text-[0.65rem] text-[#6AA3E0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {isPvp ? "EVENT BATTLES" : isField ? "FIELD SIZE" : "BRACKET SIZE"}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(isPvp ? PVP_BATTLE_COUNTS : BOARD_SIZES).map((n) => {
              const size = isPvp ? n * 2 : n;
              const active = boardSize === size;
              const disabled = athletes.length < size;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => setBoard(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    active ? "bg-[#D4A843] text-[#0B1120] border-[#D4A843]" : disabled ? "text-[#8494A7]/30 border-[#4274B9]/10" : "text-[#8494A7] border-[#4274B9]/25"
                  }`}
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-[0.65rem] text-[#8494A7] mt-1">
            {isPvp ? `${battles} battle${battles === 1 ? "" : "s"} · ${boardSize} athletes` : `${boardSize} athletes · ${orgFormatLabel(draft.format)}`}
            {athletes.length < boardSize ? ` · need ${boardSize - athletes.length} more on the roster` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.65rem] text-[#6AA3E0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {isPvp ? `BATTLE PAIRING (${filled}/${boardSize})` : isField ? `FIELD POOL (${filled}/${boardSize})` : `SEATS (${filled}/${boardSize})`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={autoFill} className="text-[0.6rem] px-2 py-1 rounded border border-[#4274B9]/30 text-[#6AA3E0]"><Zap className="w-3 h-3 inline" /> AUTO-FILL</button>
            <button type="button" onClick={() => { setSeats((prev) => prev.map((s) => ({ ...s, athleteId: null }))); setPicked(null); }} className="text-[0.6rem] px-2 py-1 rounded border border-red-500/30 text-red-300"><RotateCcw className="w-3 h-3 inline" /> CLEAR</button>
          </div>
        </div>
        {picked && (
          <p className="text-xs text-[#D4A843]">Tap an open seat for {athleteMap.get(picked)?.name || "this athlete"}.</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[0.6rem] text-[#8494A7] mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>AVAILABLE ROSTER ({openRoster.length})</p>
            <div className="max-h-[360px] overflow-y-auto space-y-1 rounded-lg border border-[#4274B9]/15 bg-[#080D17] p-2">
              {openRoster.length === 0 && <p className="text-xs text-[#8494A7] text-center py-4">{filled === boardSize ? "All slots filled." : "No athletes available."}</p>}
              {openRoster.map((athlete) => (
                <RosterChip key={athlete.id} athlete={athlete} picked={picked === athlete.id} onPick={() => setPicked(picked === athlete.id ? null : athlete.id)} />
              ))}
            </div>
            <Link to={`/apply?orgId=${encodeURIComponent(orgId)}`} className="inline-block mt-2 text-xs text-[#6AA3E0]">Add an athlete with a Pro Card application</Link>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-2">
            {isPvp ? pairs.map((pair) => (
              <div key={pair.n} className="rounded-lg border border-[#4274B9]/20 bg-[#080D17] p-2">
                <p className="text-[0.6rem] text-[#D4A843] font-bold mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>BATTLE {pair.n}</p>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
                  {pair.a && <SeatSlot seat={pair.a} athlete={pair.a.athleteId ? athleteMap.get(pair.a.athleteId) || null : null} label="A" picked={picked} onAssign={assign} onRemove={remove} />}
                  <span className="text-[0.6rem] text-[#D4A843]">VS</span>
                  {pair.b && <SeatSlot seat={pair.b} athlete={pair.b.athleteId ? athleteMap.get(pair.b.athleteId) || null : null} label="B" picked={picked} onAssign={assign} onRemove={remove} />}
                </div>
              </div>
            )) : seats.map((seat) => (
              <SeatSlot key={seat.seat} seat={seat} athlete={seat.athleteId ? athleteMap.get(seat.athleteId) || null : null} label={String(seat.seat)} picked={picked} onAssign={assign} onRemove={remove} wide />
            ))}
          </div>
        </div>

        {draft.format === "tournament" && filled > 0 && (
          <div>
            <p className="text-[0.65rem] text-[#6AA3E0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
              ROUND 1 PREVIEW · PADDED TO {nextPowerOfTwo(boardSize)}
            </p>
            <div className="mt-2 space-y-1">
              {Array.from({ length: nextPowerOfTwo(boardSize) / 2 }, (_, i) => {
                const pad = nextPowerOfTwo(boardSize);
                const slots = Array.from({ length: pad }, (__, n) => seats[n]?.athleteId || "");
                const left = slots[i] ? athleteMap.get(slots[i])?.name || slots[i] : "BYE";
                const rightId = slots[pad - 1 - i];
                const right = rightId ? athleteMap.get(rightId)?.name || rightId : "BYE";
                return <p key={i} className="text-xs text-[#C5D0DC]">M{i + 1}: {left} vs {right}</p>;
              })}
            </div>
          </div>
        )}
        {isPvp && filled > 0 && (
          <p className="text-[0.65rem] text-[#8494A7]">This requests {battles} independent 1v1 battle{battles === 1 ? "" : "s"}. WCO creates them only after approval. Voting stays closed.</p>
        )}
        {!complete && (
          <p className="text-[0.7rem] text-[#f59e0b] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Fill every seat before sending this to WCO. A partial board can still be saved as a draft.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !draft.name.trim()} onClick={() => onSave(payload())} className="px-4 py-2 rounded-xl bg-[#4274B9] text-white text-sm disabled:opacity-50" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {busy ? "Waiting for wallet…" : "Sign and save draft"}
          </button>
          <button type="button" disabled={busy || !complete} onClick={() => onSubmit(payload())} className="px-4 py-2 rounded-xl border border-[#D4A843]/50 text-[#D4A843] text-sm disabled:opacity-40" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Sign and submit for review
          </button>
        </div>
        <p className="text-[0.65rem] text-[#8494A7]">A draft stays private. A full board goes to WCO for approval. Signing confirms the form and does not send HBAR. This organization cannot open voting.</p>
      </div>
    </DndProvider>
  );
}

function RosterChip({ athlete, picked, onPick }: { athlete: Athlete; picked: boolean; onPick: () => void }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: DND_TYPE,
    item: { athleteId: athlete.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  return (
    <button
      type="button"
      ref={dragRef as any}
      onClick={onPick}
      className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left ${
        picked ? "border-[#D4A843] bg-[#D4A843]/10" : "border-[#4274B9]/15 bg-[#0B1120]"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <AthleteFace athlete={athlete} />
      <span className="min-w-0">
        <span className="block text-xs text-[#E8ECF0] truncate">{athlete.name}</span>
        <span className="block text-[0.6rem] text-[#8494A7] truncate"><InlineFlag country={athlete.country} /> {athlete.country}</span>
      </span>
    </button>
  );
}

function SeatSlot({
  seat,
  athlete,
  label,
  picked,
  wide,
  onAssign,
  onRemove,
}: {
  seat: Seat;
  athlete: Athlete | null;
  label: string;
  picked: string | null;
  wide?: boolean;
  onAssign: (seat: number, athleteId: string) => void;
  onRemove: (seat: number) => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DND_TYPE,
    drop: (item: { athleteId: string }) => onAssign(seat.seat, item.athleteId),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });
  return (
    <div
      ref={dropRef as any}
      className={`flex items-center gap-2 rounded-md border min-h-[44px] p-1.5 ${wide ? "" : ""} ${
        isOver && canDrop ? "border-[#D4A843] bg-[#D4A843]/10" : athlete ? "border-[#4274B9]/25 bg-[#0B1120]" : "border-dashed border-[#4274B9]/25"
      }`}
    >
      <span className="text-[0.55rem] text-[#6AA3E0] w-4 text-center" style={{ fontFamily: "Orbitron, sans-serif" }}>{label}</span>
      {athlete ? (
        <>
          <AthleteFace athlete={athlete} />
          <span className="text-xs text-[#E8ECF0] truncate flex-1">{athlete.name}</span>
          <button type="button" onClick={() => onRemove(seat.seat)} className="text-[#8494A7] hover:text-red-300" aria-label={`Remove ${athlete.name}`}><Trash2 className="w-3 h-3" /></button>
        </>
      ) : (
        <button type="button" className="text-[0.65rem] text-[#8494A7] text-left flex-1" onClick={() => { if (picked) onAssign(seat.seat, picked); }}>
          {isOver ? "Drop here" : picked ? "Tap to seat" : "Drag or tap an athlete"}
        </button>
      )}
    </div>
  );
}

function AthleteFace({ athlete }: { athlete: Athlete }) {
  const hasPfp = athlete.pfpUrl && athlete.pfpUrl !== "placeholder";
  return (
    <span className="w-6 h-6 rounded-full overflow-hidden bg-[#162033] border border-[#4274B9]/20 shrink-0 flex items-center justify-center">
      {hasPfp ? <ImageWithFallback src={athlete.pfpUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-[#8494A7]" />}
    </span>
  );
}

const inputCls = "mt-1 w-full rounded-lg bg-[#0B1120] border border-[#4274B9]/25 px-3 py-2 text-sm text-[#E8ECF0] outline-none focus:border-[#6AA3E0]/60";
