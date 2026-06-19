import { Youtube } from "lucide-react";
import { buildYouTubeSearchUrl } from "../../lib/youtube-search";
import { CaliHintWrap } from "./cali-hint-wrap";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  name: string;
}

export function ExerciseYouTubeLink({ name }: Props) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const href = buildYouTubeSearchUrl(trimmed);

  return (
    <CaliHintWrap
      title="YouTube Demo"
      hint={`Opens a YouTube search for "${trimmed}" so you can watch form tutorials and progressions.`}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D4A843]/35 text-[#D4A843] bg-[#D4A843]/8 hover:bg-[#D4A843]/18 hover:border-[#D4A843]/55 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
        style={dmSans}
        aria-label={`Search YouTube for ${trimmed}`}
      >
        <Youtube className="w-4 h-4 text-red-400" />
      </a>
    </CaliHintWrap>
  );
}