import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";
import { BRAND, root } from "./brand-assets.mjs";

const publicDir = path.join(root, "public");

function colorInt(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

async function makeIcon(size) {
  const canvas = new Jimp({ width: size, height: size, color: colorInt("#0B1120") });
  const fist = await Jimp.read(BRAND.fist);
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  fist.resize({ w: inner, h: inner });
  canvas.composite(fist, pad, pad);
  return canvas;
}

fs.mkdirSync(publicDir, { recursive: true });

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

console.log("Generating fist favicons...");
for (const { name, size } of sizes) {
  const icon = await makeIcon(size);
  await icon.write(path.join(publicDir, name));
  console.log(`  ${name}`);
}

fs.copyFileSync(path.join(publicDir, "favicon-32x32.png"), path.join(publicDir, "favicon.ico"));
console.log("  favicon.ico");
console.log("Done.");