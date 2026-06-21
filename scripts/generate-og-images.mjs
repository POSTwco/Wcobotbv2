import fs from "fs";
import path from "path";
import { Jimp } from "jimp";
import { accentForOg, BRAND, root } from "./brand-assets.mjs";

const seoData = JSON.parse(
  fs.readFileSync(path.join(root, "src/app/lib/seo-data.json"), "utf8"),
);
const outDir = path.join(root, "public/og");

const uniqueImages = new Map();
for (const [, page] of Object.entries(seoData.pages)) {
  const filename = path.basename(page.ogImage);
  if (!uniqueImages.has(filename)) uniqueImages.set(filename, page.headline);
}
uniqueImages.set("github-social-preview.png", "WCO Platform");

function colorInt(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

function drawAccentBar(img, width, y, hex, barHeight = 6) {
  const color = colorInt(hex);
  for (let x = Math.round(width * 0.2); x < Math.round(width * 0.8); x++) {
    for (let dy = 0; dy < barHeight; dy++) {
      img.setPixelColor(color, x, y + dy);
    }
  }
}

async function drawOg(filename, headline, width = 1200, height = 630) {
  const img = new Jimp({ width, height, color: colorInt("#0B1120") });
  const accent = accentForOg(filename);

  drawAccentBar(img, width, Math.round(height * 0.18), accent, 5);
  drawAccentBar(img, width, Math.round(height * 0.82), "#4274B9", 4);

  const fist = await Jimp.read(BRAND.fist);
  const fistSize = Math.round(width * 0.34);
  fist.resize({ w: fistSize, h: fistSize });
  img.composite(fist, Math.round((width - fistSize) / 2), Math.round(height * 0.2));

  const letters = await Jimp.read(BRAND.letters);
  const letterW = Math.round(width * 0.52);
  const letterH = Math.round(letterW * 0.22);
  letters.resize({ w: letterW, h: letterH });
  img.composite(letters, Math.round((width - letterW) / 2), Math.round(height * 0.66));

  const mark = await Jimp.read(BRAND.fist);
  mark.resize({ w: Math.round(width * 0.08), h: Math.round(width * 0.08) });
  mark.opacity(0.55);
  img.composite(mark, Math.round(width * 0.08), Math.round(height * 0.08));

  await img.write(path.join(outDir, filename));
  console.log(`  og/${filename} — ${headline}`);
}

fs.mkdirSync(outDir, { recursive: true });

console.log("Generating fist OG images...");
for (const [filename, headline] of uniqueImages) {
  const w = filename === "github-social-preview.png" ? 1280 : 1200;
  const h = filename === "github-social-preview.png" ? 640 : 630;
  await drawOg(filename, headline, w, h);
}
console.log("Done.");