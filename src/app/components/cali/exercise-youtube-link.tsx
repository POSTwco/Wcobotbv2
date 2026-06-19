import { Youtube } from "lucide-react";
import { buildYouTubeSearchUrl } from "../../lib/youtube-search";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  name: string;
}

export function ExerciseYouTubeLink({ name }: Props) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const href = buildYouTubeSearchUrl(trimmed);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Search YouTube for "${trimmed}"`}
      className="flex items-center px-2 py-1 rounded-lg border border-white/10 text-red-400/80 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition-colors"
      style={dmSans}
      aria-label={`Search YouTube for ${trimmed}`}
    >
      <Youtube className="w-3 h-3" />
    </a>
  );
}