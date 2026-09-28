/**
 * FreeStyle and Statics as two checks.
 * One, the other, or both. The stored value stays a single discipline.
 */

import { orgDisciplineChecks, orgDisciplineFromChecks } from "../lib/org-sign";

export function OrgDisciplineChecks({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = orgDisciplineChecks(value);
  const set = (freestyle: boolean, statics: boolean) => {
    onChange(orgDisciplineFromChecks(freestyle, statics));
  };

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="What you run">
      <Check
        label="FreeStyle"
        checked={selected.freestyle}
        onChange={(on) => set(on, selected.statics)}
      />
      <Check
        label="Statics"
        checked={selected.statics}
        onChange={(on) => set(selected.freestyle, on)}
      />
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer ${
        checked
          ? "border-[#6AA3E0] bg-[#4274B9]/15 text-[#E8ECF0]"
          : "border-[#4274B9]/25 text-[#8494A7]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#4274B9]"
      />
      {label}
    </label>
  );
}
