/**
 * Shared header for the athlete and judge Pro Card applications.
 * The toggle changes the route. The forms underneath stay separate.
 */

import { useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";

type Role = "athlete" | "judge";

const COPY: Record<Role, { title: string; line: string }> = {
  athlete: {
    title: "ATHLETE PRO CARD",
    line: "WCO reviews this application. Approval puts you on the athlete roster so you can be seated in events.",
  },
  judge: {
    title: "JUDGE PRO CARD",
    line: "WCO reviews this application. Approval lists you on Meet the Judges and shows the Judge badge in Arena Chat.",
  },
};

export function ProApplyShell({
  role,
  accountId,
  orgLocked = false,
  children,
}: {
  role: Role;
  accountId?: string | null;
  orgLocked?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("orgId") || "";
  const locked = orgLocked || !!orgId;
  const copy = COPY[role];

  useEffect(() => {
    if (role === "judge" && orgId) {
      navigate(`/apply?orgId=${encodeURIComponent(orgId)}`, { replace: true });
    }
  }, [role, orgId, navigate]);

  const choose = (next: Role) => {
    if (next === role) return;
    if (next === "judge") {
      if (locked) return;
      navigate("/judges/apply");
      return;
    }
    navigate(orgId ? `/apply?orgId=${encodeURIComponent(orgId)}` : "/apply");
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4" data-pro-apply={role}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div
            role="tablist"
            aria-label="What you are applying for"
            className="inline-flex rounded-xl border border-[#4274B9]/30 bg-[#0D1526] p-1"
          >
            <RoleTab active={role === "athlete"} onClick={() => choose("athlete")}>
              Athlete
            </RoleTab>
            <RoleTab
              active={role === "judge"}
              disabled={locked}
              title={locked ? "This link adds an athlete to an organization." : undefined}
              onClick={() => choose("judge")}
            >
              Judge
            </RoleTab>
          </div>
          <h1
            className="text-2xl sm:text-3xl text-[#E8ECF0] mt-4"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {copy.title}
          </h1>
          <p className="text-sm text-[#8494A7] mt-2 max-w-2xl leading-relaxed">{copy.line}</p>
          {accountId ? (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-[#162033] border border-[#4274B9]/20">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[#6AA3E0] text-xs font-mono">{accountId}</span>
            </div>
          ) : null}
          {locked ? (
            <p className="text-xs text-[#8494A7] mt-3">This link adds an athlete to an organization.</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function RoleTab({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-[#4274B9] text-white" : "text-[#8494A7] hover:text-[#E8ECF0]"
      }`}
      style={{ fontFamily: "Orbitron, sans-serif" }}
    >
      {children}
    </button>
  );
}
