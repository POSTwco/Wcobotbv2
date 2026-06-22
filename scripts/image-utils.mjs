import sharp from "sharp";
import { Jimp } from "jimp";

function hexRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

async function loadResized(input, maxW, maxH) {
  const meta = await sharp(input).metadata();
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));
  const buf = await sharp(input).resize(w, h, { fit: "inside" }).png().toBuffer();
  return { buf, w, h };
}

/** X/Twitter + OG share card — exact 2:1 JPEG via sharp (baseline mozjpeg). */
export async function botbShareCard({
  botbPath,
  fistPath,
  width,
  height,
  accent = "#D4A843",
  jpegPath,
  pngPath,
}) {
  const logoMaxW = Math.round(width * 0.86);
  const logoMaxH = Math.round(height * 0.72);
  const { buf: botb, w: botbW, h: botbH } = await loadResized(botbPath, logoMaxW, logoMaxH);

  const composites = [
    {
      input: botb,
      left: Math.round((width - botbW) / 2),
      top: Math.round((height - botbH) / 2),
    },
  ];

  if (fistPath) {
    const badge = Math.round(Math.min(width, height) * 0.14);
    const { buf: fist, w: fistW, h: fistH } = await loadResized(fistPath, badge, badge);
    composites.push({
      input: fist,
      left: Math.round(width * 0.04),
      top: Math.round(height * 0.05),
    });
    void fistW;
    void fistH;
  }

  const accentRgb = hexRgb(accent);
  const barH = 6;
  const bar = await sharp({
    create: {
      width,
      height: barH,
      channels: 3,
      background: accentRgb,
    },
  })
    .png()
    .toBuffer();

  composites.push({ input: bar, left: 0, top: height - barH });

  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).composite(composites);

  await base
    .clone()
    .jpeg({
      quality: 90,
      mozjpeg: true,
      chromaSubsampling: "4:4:4",
      force: true,
    })
    .toFile(jpegPath);

  if (pngPath) {
    await base.clone().png({ compressionLevel: 9 }).toFile(pngPath);
  }
}

/** Browser tab + PWA icons — official FIST_WCO.jpg (Jimp is fine for small icons). */
export async function iconFromFist(fistPath, size, { bg = "#FFFFFF", pad = 0.06 } = {}) {
  const colorInt = (hex) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
  };
  const base = new Jimp({ width: size, height: size, color: colorInt(bg) });
  const inner = Math.round(size * (1 - pad * 2));
  const fist = await Jimp.read(fistPath);
  const scale = Math.min(inner / fist.width, inner / fist.height);
  fist.resize({ w: Math.max(1, Math.round(fist.width * scale)), h: Math.max(1, Math.round(fist.height * scale)) });
  base.composite(fist, Math.round((size - fist.width) / 2), Math.round((size - fist.height) / 2));
  return base;
}

/** Square — Instagram / YouTube */
export async function squareShare({ botbPath, fistPath, size, outputPath }) {
  await botbShareCard({
    botbPath,
    fistPath,
    width: size,
    height: size,
    accent: "#D4A843",
    jpegPath: outputPath.replace(/\.png$/, ".jpg"),
    pngPath: outputPath,
  });
}