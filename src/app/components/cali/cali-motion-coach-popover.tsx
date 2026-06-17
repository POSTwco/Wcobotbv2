/**
 * Hover/tap coaching panel — advanced exercise explanation on avatar hover.
 */

import { Wind, Zap, CheckCircle2 } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { getExerciseGuide, CATEGORY_COLORS, type WorkoutExerciseItem } from "../../lib/cali-exercise-guide";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  item: WorkoutExerciseItem;
  children: React.ReactNode;
}

export function CaliMotionCoachPopover({ item, children }: Props) {
  const guide = getExerciseGuide(item);
  const accent = CATEGORY_COLORS[item.category] ?? "#4274B9";

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="block w-full cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6AA3E0] rounded-xl"
          aria-label={`Coaching guide for ${item.name}`}
        >
          {children}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="left"
        align="start"
        className="w-80 p-0 border-0 bg-transparent shadow-none"
      >
        <div
          className="rounded-xl border p-4 space-y-3 max-h-[70vh] overflow-y-auto"
          style={{
            background: "rgba(11,17,32,0.97)",
            borderColor: `${accent}40`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          }}
        >
          <div>
            <span
              className="inline-block text-[0.5rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md mb-1.5"
              style={{ ...orbitron, background: `${accent}20`, color: accent }}
            >
              {item.category}
            </span>
            <h4 className="text-sm font-bold text-white" style={dmSans}>{item.name}</h4>
          </div>

          <p className="text-xs text-[#C8D0DC] leading-relaxed" style={dmSans}>{guide.instructions}</p>

          <div>
            <p className="text-[0.55rem] font-bold tracking-wider text-[#6AA3E0] mb-1.5 flex items-center gap-1" style={orbitron}>
              <CheckCircle2 className="w-3 h-3" /> KEY CUES
            </p>
            <ul className="space-y-1">
              {guide.formCues.slice(0, 3).map((c, i) => (
                <li key={i} className="text-[0.7rem] text-[#A3B0C2] flex items-start gap-1.5" style={dmSans}>
                  <span className="text-emerald-400 mt-0.5">✓</span> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(66,116,185,0.1)" }}>
            <Wind className="w-3.5 h-3.5 text-[#6AA3E0] flex-shrink-0 mt-0.5" />
            <p className="text-[0.7rem] text-[#A3B0C2]" style={dmSans}>{guide.breathing}</p>
          </div>

          <div className="flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-[#D4A843] flex-shrink-0 mt-0.5" />
            <p className="text-[0.7rem] text-[#D4A843]/90" style={dmSans}>{guide.benefit}</p>
          </div>

          <p className="text-[0.55rem] text-[#8494A7] italic" style={dmSans}>
            Hover away to return to your workout
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}