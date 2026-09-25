/**
 * Athlete dossier — short Web Audio tones.
 * Independent of Arena Chat mute. No audio files.
 */

const STORAGE_KEY = "wco-athlete-sfx";
const MASTER = 0.1;

let audioCtx: AudioContext | null = null;

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Session preference. Reduced-motion stays quiet until the user unmutes. */
export function athleteSfxEnabled(): boolean {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "0") return false;
    if (stored === "1") return true;
  } catch {
    /* private mode */
  }
  return !reducedMotion();
}

export function setAthleteSfxEnabled(on: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  vol = MASTER,
  delay = 0,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function play(run: () => void) {
  if (!athleteSfxEnabled()) return;
  try {
    run();
  } catch {
    /* autoplay or missing AudioContext */
  }
}

/** Profile opened, or the next athlete stepped into view. */
export function playAthleteOpen() {
  play(() => {
    tone(392, 0.07, "triangle", MASTER * 0.85);
    tone(523, 0.08, "triangle", MASTER * 0.7, 0.06);
    tone(659, 0.12, "sine", MASTER * 0.55, 0.12);
  });
}

/** Dialog dismissed. */
export function playAthleteClose() {
  play(() => {
    tone(523, 0.07, "sine", MASTER * 0.4);
    tone(349, 0.11, "sine", MASTER * 0.32, 0.05);
  });
}

/** Prev / next hover. */
export function playAthleteTick() {
  play(() => {
    tone(740, 0.028, "sine", MASTER * 0.32);
  });
}

/** Social link pressed. */
export function playAthletePop() {
  play(() => {
    tone(880, 0.04, "sine", MASTER * 0.45);
    tone(1175, 0.05, "sine", MASTER * 0.28, 0.03);
  });
}
