import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const seoData = JSON.parse(fs.readFileSync(path.join(root, "src/app/lib/seo-data.json"), "utf8"));
const outDir = path.join(root, "public/og");

const shieldPath = path.join(root, "src/assets/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png");
const logoPath = path.join(root, "src/assets/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png");

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

async function drawOg(filename, headline, width = 1200, height = 630) {
  const img = new Jimp({ width, height, color: colorInt("#0B1120") });

  const shield = await Jimp.read(shieldPath);
  shield.resize({ w: Math.round(width * 0.22), h: Math.round(width * 0.22) });
  img.composite(shield, Math.round(width * 0.18), Math.round(height * 0.28));

  const logo = await Jimp.read(logoPath);
  logo.resize({ w: Math.round(width * 0.42), h: Math.round(width * 0.12) });
  img.composite(logo, Math.round(width * 0.38), Math.round(height * 0.36));

  const watermark = await Jimp.read(logoPath);
  watermark.resize({ w: Math.round(width * 0.3), h: Math.round(width * 0.085) });
  watermark.opacity(0.35);
  img.composite(watermark, Math.round(width * 0.35), Math.round(height * 0.78));

  await img.write(path.join(outDir, filename));
  console.log(`  og/${filename} — ${headline}`);
}

fs.mkdirSync(outDir, { recursive: true });

console.log("Generating OG images...");
for (const [filename, headline] of uniqueImages) {
  const w = filename === "github-social-preview.png" ? 1280 : 1200;
  const h = filename === "github-social-preview.png" ? 640 : 630;
  await drawOg(filename, headline, w, h);
}
console.log("Done.");