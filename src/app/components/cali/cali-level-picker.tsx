/**
 * Level picker — pill group for L1/L2/L3 with one-line descriptions.
 * Used by the dashboard inline and by the settings screen.
 */

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const LEVELS = [
  { value: 1, title: "L1 · Beginner", sub: "Build foundation, ~25 min" },
  { value: 2, title: "L2 · Intermediate", sub: "Push harder, ~35 min" },
  { value: 3, title: "L3 · Expert", sub: "Max hypertrophy, ~45 min" },
] as const;

export function LevelPicker({
  value,
  onChange,
  disabled,
}: {
  value: 1 | 2 | 3;
  onChange: (n: 1 | 2 | 3) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {LEVELS.map((lv) => {
        const active = lv.value === value;
        return (
          <button
            key={lv.value}
            onClick={() => onChange(lv.value)}
            disabled={disabled}
            className="text-left rounded-xl px-3.5 py-3 border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: active
                ? "linear-gradient(135deg, rgba(66,116,185,0.25), rgba(53,99,160,0.15))"
                : "rgba(255,255,255,0.02)",
              borderColor: active ? "#4274B9" : "rgba(66,116,185,0.15)",
              boxShadow: active ? "0 0 0 1px #4274B9 inset, 0 4px 16px rgba(66,116,185,0.18)" : undefined,
            }}
          >
            <p
              className="text-xs font-bold tracking-wider"
              style={{ ...orbitron, color: active ? "#E8ECF0" : "#A3B0C2" }}
            >
              {lv.title}
            </p>
            <p
              className="text-[0.65rem] mt-1"
              style={{ ...dmSans, color: active ? "#6AA3E0" : "#8494A7" }}
            >
              {lv.sub}
            </p>
          </button>
        );
      })}
    </div>
  );
}
