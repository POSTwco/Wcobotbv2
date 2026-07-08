/**
 * Hover (desktop) / tap (mobile) help — quiet for veterans, clear for first-timers.
 * Does not change underlying values; only explains real data on the page.
 */

import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };

interface Props {
  title: string;
  /** Plain explanation; may include live numbers from the parent. */
  hint: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** Desktop: icon fades in on hover. Mobile: soft always-visible affordance. */
  showIcon?: boolean;
  /** Stretch trigger to full width (tiles, panels). */
  block?: boolean;
  className?: string;
  /** Delay before show (ms). Default 280 — avoids accidental spam. */
  delayMs?: number;
}

export function CaliHintWrap({
  title,
  hint,
  children,
  side = "top",
  showIcon = true,
  block = false,
  className = "",
  delayMs = 280,
}: Props) {
  return (
    <Tooltip delayDuration={delayMs}>
      <TooltipTrigger asChild>
        <span
          className={`group ${block ? "flex w-full" : "inline-flex"} items-center gap-1 cursor-help outline-none focus-visible:ring-1 focus-visible:ring-[#D4A843]/40 rounded-lg ${className}`}
          tabIndex={0}
        >
          <span className={block ? "min-w-0 flex-1 w-full" : "min-w-0"}>{children}</span>
          {showIcon && (
            <Info
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4A843]/70 flex-shrink-0 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 transition-opacity duration-200"
              aria-hidden
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className="max-w-[min(300px,calc(100vw-2rem))] bg-[#0F1729]/98 border border-[#D4A843]/40 text-[#C8D0DC] px-3 py-2.5 shadow-xl shadow-black/50 z-[120]"
      >
        <p className="text-[0.65rem] font-bold text-[#D4A843] tracking-wide mb-1" style={orbitron}>
          {title}
        </p>
        <p className="text-[0.7rem] leading-relaxed text-[#C8D0DC]" style={dmSans}>
          {hint}
        </p>
        <p className="text-[0.55rem] text-[#8494A7] mt-1.5 sm:hidden" style={dmSans}>
          Tap outside to close
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
