import manifest from "../../assets/cali-motion/manifest.json";
import type { AvatarGender } from "./cali-avatar-prefs";

export type MotionSize = "compact" | "rail";

const FRAME_COUNT = manifest.frameCount;

/** Patterns with generated Imagine frame assets on disk. */
export function hasMotionAssets(pattern: string, gender: AvatarGender): boolean {
  return (manifest.ready[gender] as string[]).includes(pattern);
}

/**
 * Vite glob — only files that exist are bundled.
 * Path: src/assets/cali-motion/{gender}/{pattern}/frame-{n}.png
 */
const frameModules = import.meta.glob<{ default: string }>(
  "../../assets/cali-motion/*/*/frame-*.{jpg,png,webp}",
  { eager: true },
);

function frameUrl(gender: AvatarGender, pattern: string, index: number): string | null {
  for (const ext of ["jpg", "png", "webp"]) {
    const key = `../../assets/cali-motion/${gender}/${pattern}/frame-${index}.${ext}`;
    if (frameModules[key]) return frameModules[key].default;
  }
  return null;
}

export function getMotionFrames(pattern: string, gender: AvatarGender): string[] | null {
  if (!hasMotionAssets(pattern, gender)) return null;
  const frames: string[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const url = frameUrl(gender, pattern, i);
    if (!url) return null;
    frames.push(url);
  }
  return frames;
}