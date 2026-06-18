/**
 * Sticky right-side coaching rail — avatar loop, gender toggle, exercise label.
 */

import type { AvatarGender } from "../../lib/cali-avatar-prefs";
import { CATEGORY_COLORS, type WorkoutExerciseItem } from "../../lib/cali-exercise-guide";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface BlockItem extends WorkoutExerciseItem {
  sets: number;
  target: { metric: "reps" | "time_sec"; low: number; high: number };
}

interface Props {
  item: BlockItem;
  gender: AvatarGender;
  onGenderChange: (g: AvatarGender) => void;
}

export function CaliMotionRail({ item, gender, onGenderChange }: Props) {
  const accent = CATEGORY_COLORS[item.category] ?? "#4274B9";

  const getGenderPreview = (g: AvatarGender) => {
    if (g === 'female') return (item as any).previewImageRefFemale || (item as any).previewImageRef;
    return (item as any).previewImageRefMale || (item as any).previewImageRef;
  };
  const previewRef = getGenderPreview(gender);
  const useCustomImage = previewRef && (String(previewRef).startsWith('http') || String(previewRef).startsWith('data:'));

  return (
    <aside className="hidden lg:block w-[180px] flex-shrink-0">
      <div className="sticky top-[88px] space-y-3">
        <p className="text-[0.55rem] font-bold tracking-widest text-[#8494A7] uppercase" style={orbitron}>
          Movement Preview
        </p>

        {useCustomImage ? (
          <img
            src={previewRef}
            className="w-full aspect-square object-contain rounded-lg border border-white/10 bg-black/20"
            alt={item.name}
          />
        ) : (
          <div className="w-full aspect-square rounded-lg border border-white/10 bg-[#0B1120]/60 flex flex-col items-center justify-center text-center p-3">
            <div className="text-[#8494A7] text-[10px] font-medium">No custom image set</div>
            <div className="text-[#6AA3E0] text-[9px] mt-1 leading-tight">Upload via the Admin panel<br />to display here</div>
          </div>
        )}

        <p className="text-[0.6rem] text-[#8494A7] text-center" style={dmSans}>
          Hover for coaching tips
        </p>

        <div className="flex gap-1.5 justify-center">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGenderChange(g)}
              className="flex-1 py-1.5 rounded-lg text-[0.6rem] font-bold tracking-wider transition-all"
              style={{
                ...orbitron,
                background: gender === g ? `${accent}25` : "rgba(255,255,255,0.04)",
                color: gender === g ? accent : "#8494A7",
                border: gender === g ? `1px solid ${accent}50` : "1px solid transparent",
              }}
            >
              {g === "male" ? "♂ Male" : "♀ Female"}
            </button>
          ))}
        </div>

        <div className="pt-1 border-t border-[#4274B9]/15">
          <p className="text-xs font-bold text-white leading-snug" style={dmSans}>{item.name}</p>
          <p className="text-[0.6rem] text-[#8494A7] mt-1" style={dmSans}>
            {item.sets} × {item.target.low}–{item.target.high}
            {item.target.metric === "reps" ? " reps" : "s"}
          </p>
        </div>
      </div>
    </aside>
  );
}