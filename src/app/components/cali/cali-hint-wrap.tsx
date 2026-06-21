import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  title: string;
  hint: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  showIcon?: boolean;
}

export function CaliHintWrap({ title, hint, children, side = "top", showIcon = true }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="group inline-flex items-center gap-1.5 cursor-help">
          {children}
          {showIcon && (
            <Info
              className="w-3.5 h-3.5 text-[#D4A843] flex-shrink-0 hidden sm:inline opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
              aria-hidden
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className="max-w-[240px] bg-[#162033] border border-[#D4A843]/35 text-[#C8D0DC] px-3 py-2 shadow-lg shadow-black/40"
      >
        <p className="text-[0.7rem] font-bold text-[#D4A843] mb-1" style={dmSans}>{title}</p>
        <p className="text-[0.65rem] leading-relaxed" style={dmSans}>{hint}</p>
      </TooltipContent>
    </Tooltip>
  );
}