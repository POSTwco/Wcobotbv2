/**
 * Desktop: hover tooltip.
 * Mobile / coarse pointer: sticky popover (tap ℹ to open, tap outside or ✕ to close).
 * Fixes flash-and-dismiss on touch devices where Radix Tooltip cannot stay open.
 */

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };

const PANEL =
  "max-w-[min(300px,calc(100vw-2rem))] w-[min(300px,calc(100vw-2rem))] bg-[#0F1729] border border-[#D4A843]/45 text-[#C8D0DC] px-3 py-2.5 shadow-xl shadow-black/50 z-[200]";

interface Props {
  title: string;
  hint: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  showIcon?: boolean;
  block?: boolean;
  className?: string;
  delayMs?: number;
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(hover: none), (pointer: coarse)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    mq.addListener?.(apply);
    return () => {
      mq.removeEventListener?.("change", apply);
      mq.removeListener?.(apply);
    };
  }, []);

  return coarse;
}

function HintBody({
  title,
  hint,
  onClose,
  showClose,
}: {
  title: string;
  hint: string;
  onClose?: () => void;
  showClose?: boolean;
}) {
  return (
    <div className="relative">
      {showClose && onClose && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-0.5 -right-0.5 p-1.5 rounded-md text-[#8494A7] hover:text-white active:bg-white/10 touch-manipulation"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <p
        className={`text-[0.65rem] font-bold text-[#D4A843] tracking-wide mb-1 ${showClose ? "pr-6" : ""}`}
        style={orbitron}
      >
        {title}
      </p>
      <p className="text-[0.7rem] leading-relaxed text-[#C8D0DC]" style={dmSans}>
        {hint}
      </p>
      {showClose && (
        <p className="text-[0.55rem] text-[#8494A7] mt-2" style={dmSans}>
          Tap ✕ or outside to close
        </p>
      )}
    </div>
  );
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
  const isTouchUi = useCoarsePointer();
  const [open, setOpen] = useState(false);

  const rowClass = `${block ? "flex w-full" : "inline-flex"} items-start gap-0.5 ${className}`;

  // ── Mobile / touch: Popover stays open until dismissed ──────────────
  if (isTouchUi) {
    return (
      <div className={rowClass}>
        <div className={block ? "min-w-0 flex-1 w-full" : "min-w-0"}>{children}</div>
        {showIcon && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 self-start mt-0.5 p-1.5 -mr-0.5 rounded-md text-[#8494A7]/55 hover:text-[#8494A7] active:text-[#D4A843]/80 active:bg-white/[0.04] touch-manipulation flex items-center justify-center border-0 bg-transparent"
                aria-label={`About ${title}`}
                aria-expanded={open}
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-2.5 h-2.5 stroke-[1.5]" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side={side}
              sideOffset={10}
              align="end"
              collisionPadding={12}
              className={`${PANEL} !w-[min(300px,calc(100vw-1.5rem))] p-3`}
              style={{ width: "min(300px, calc(100vw - 1.5rem))" }}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={() => setOpen(false)}
              onEscapeKeyDown={() => setOpen(false)}
            >
              <HintBody title={title} hint={hint} showClose onClose={() => setOpen(false)} />
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  // ── Desktop: hover tooltip ─────────────────────────────────────────
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
              className="w-2.5 h-2.5 text-[#8494A7]/45 flex-shrink-0 opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70 transition-opacity duration-200 stroke-[1.5]"
              aria-hidden
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8} className={PANEL}>
        <HintBody title={title} hint={hint} />
      </TooltipContent>
    </Tooltip>
  );
}
