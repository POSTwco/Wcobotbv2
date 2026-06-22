import { Jimp } from "jimp";

export function colorInt(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

export async function fitContain(source, maxW, maxH) {
  const img = await Jimp.read(source);
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  if (w !== img.width || h !== img.height) {
    img.resize({ w, h });
  }
  return { img, w, h };
}

export async function canvas(width, height, hex = "#FFFFFF") {
  return new Jimp({ width, height, color: colorInt(hex) });
}

export function compositeCentered(base, overlay, xAlign = 0.5, yAlign = 0.5) {
  const x = Math.round((base.width - overlay.width) * xAlign);
  const y = Math.round((base.height - overlay.height) * yAlign);
  base.composite(overlay, x, y);
}

/** Browser tab + PWA icons — official FIST_WCO.jpg */
export async function iconFromFist(fistPath, size, { bg = "#FFFFFF", pad = 0.06 } = {}) {
  const base = await canvas(size, size, bg);
  const inner = Math.round(size * (1 - pad * 2));
  const { img } = await fitContain(fistPath, inner, inner);
  compositeCentered(base, img, 0.5, 0.5);
  return base;
}

/** Facebook / LinkedIn / Discord / Google — 1200×630 PNG */
export async function shareBanner({
  fistPath,
  wordmarkPath,
  width,
  height,
  accent = "#D4A843",
  bg = "#FFFFFF",
}) {
  const base = await canvas(width, height, bg);

  const wordMaxW = Math.round(width * 0.82);
  const wordMaxH = Math.round(height * 0.48);
  const { img: wordmark } = await fitContain(wordmarkPath, wordMaxW, wordMaxH);
  compositeCentered(base, wordmark, 0.5, 0.5);

  const badgeSize = Math.round(Math.min(width, height) * 0.2);
  const { img: badge } = await fitContain(fistPath, badgeSize, badgeSize);
  base.composite(badge, Math.round(width * 0.05), Math.round(height * 0.06));

  const barColor = colorInt(accent);
  const barY = height - 8;
  for (let x = 0; x < width; x++) {
    for (let dy = 0; dy < 6; dy++) {
      base.setPixelColor(barColor, x, barY - dy);
    }
  }

  return base;
}

/** X/Twitter — 1200×600 JPG on white */
export async function twitterBanner(opts) {
  return shareBanner({ ...opts, height: opts.height ?? 600 });
}

/** Square — Instagram / YouTube link fallback */
export async function squareShare({ fistPath, wordmarkPath, size, bg = "#FFFFFF" }) {
  const base = await canvas(size, size, bg);
  const { img: fist } = await fitContain(fistPath, Math.round(size * 0.42), Math.round(size * 0.42));
  compositeCentered(base, fist, 0.5, 0.38);
  const { img: word } = await fitContain(wordmarkPath, Math.round(size * 0.78), Math.round(size * 0.22));
  compositeCentered(base, word, 0.5, 0.78);
  return base;
}