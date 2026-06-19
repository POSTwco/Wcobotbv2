export function buildYouTubeSearchUrl(exerciseName: string): string {
  const q = exerciseName.trim();
  if (!q) return "https://www.youtube.com/results";
  const params = new URLSearchParams({ search_query: q });
  return `https://www.youtube.com/results?${params.toString()}`;
}