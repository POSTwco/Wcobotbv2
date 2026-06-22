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

function accentBar(base, accent, height = 6) {
  const barColor = colorInt(accent);
  const barY = base.height - 4;
  for (let x = 0; x < base.width; x++) {
    for (let dy = 0; dy < height; dy++) {
      base.setPixelColor(barColor, x, barY - dy);
    }
  }
}

/** Browser tab + PWA icons — official FIST_WCO.jpg */
export async function iconFromFist(fistPath, size, { bg = "#FFFFFF", pad = 0.06 } = {}) {
  const base = await canvas(size, size, bg);
  const inner = Math.round(size * (1 - pad * 2));
  const { img } = await fitContain(fistPath, inner, inner);
  compositeCentered(base, img, 0.5, 0.5);
  return base;
}

/** Share card — centered BOTB logo on white (OG / Facebook / Google). */
export async function botbShareBanner({
  botbPath,
  fistPath,
  width,
  height,
  accent = "#D4A843",
  bg = "#FFFFFF",
}) {
  const base = await canvas(width, height, bg);

  const logoMaxW = Math.round(width * 0.86);
  const logoMaxH = Math.round(height * 0.72);
  const { img: botb } = await fitContain(botbPath, logoMaxW, logoMaxH);
  compositeCentered(base, botb, 0.5, 0.5);

  if (fistPath) {
    const badgeSize = Math.round(Math.min(width, height) * 0.14);
    const { img: badge } = await fitContain(fistPath, badgeSize, badgeSize);
    base.composite(badge, Math.round(width * 0.04), Math.round(height * 0.05));
  }

  accentBar(base, accent);
  return base;
}

/** Square — Instagram / YouTube link fallback */
export async function squareShare({ botbPath, fistPath, size, bg = "#FFFFFF" }) {
  const base = await canvas(size, size, bg);
  const { img: botb } = await fitContain(botbPath, Math.round(size * 0.82), Math.round(size * 0.62));
  compositeCentered(base, botb, 0.5, 0.52);
  if (fistPath) {
    const { img: fist } = await fitContain(fistPath, Math.round(size * 0.18), Math.round(size * 0.18));
    base.composite(fist, Math.round(size * 0.06), Math.round(size * 0.06));
  }
  return base;
}