/**
 * BOTB Arena Chat — Sound System (Web Audio API)
 * ================================================
 * Synthesized audio feedback for chat interactions.
 * No external files — pure oscillator-based tones.
 * Governor-tier users get enhanced premium sound variants.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Master volume (0-1)
const MASTER = 0.12;

// --- Helper: play a tone burst ------------------------------------------------
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
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// --- Public sounds -----------------------------------------------------------

/** Sent a message — ascending two-note chirp */
export function playSendSound(isGovernor = false) {
  if (isGovernor) {
    // Governor: richer three-note ascending chord
    tone(523, 0.08, "triangle", MASTER * 0.9);       // C5
    tone(659, 0.08, "triangle", MASTER * 0.8, 0.06);  // E5
    tone(784, 0.12, "sine", MASTER * 0.7, 0.12);      // G5
  } else {
    tone(440, 0.06, "sine", MASTER * 0.7);
    tone(587, 0.1, "sine", MASTER * 0.5, 0.05);
  }
}

/** Received new messages — soft low notification */
export function playReceiveSound(isGovernor = false) {
  if (isGovernor) {
    tone(392, 0.1, "sine", MASTER * 0.4);            // G4
    tone(494, 0.1, "sine", MASTER * 0.3, 0.08);      // B4
  } else {
    tone(349, 0.08, "sine", MASTER * 0.3);
  }
}

/** Reaction toggled — bubbly pop */
export function playReactionSound() {
  tone(880, 0.04, "sine", MASTER * 0.5);
  tone(1175, 0.06, "sine", MASTER * 0.4, 0.03);
}

/** Floating emotion sent — whoosh up */
export function playEmotionSound() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(MASTER * 0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

/** Governor entrance — regal fanfare */
export function playGovernorEntrance() {
  tone(523, 0.15, "triangle", MASTER * 0.6);       // C5
  tone(659, 0.15, "triangle", MASTER * 0.5, 0.12); // E5
  tone(784, 0.15, "triangle", MASTER * 0.5, 0.24); // G5
  tone(1047, 0.25, "sine", MASTER * 0.4, 0.36);    // C6
}

/** Error sound — descending buzz */
export function playErrorSound() {
  tone(330, 0.08, "sawtooth", MASTER * 0.3);
  tone(220, 0.12, "sawtooth", MASTER * 0.3, 0.06);
}
