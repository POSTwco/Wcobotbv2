import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const logoPath = path.join(root, "src/assets/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png");

fs.mkdirSync(publicDir, { recursive: true });

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

console.log("Generating favicons...");
const source = await Jimp.read(logoPath);

for (const { name, size } of sizes) {
  const icon = source.clone();
  icon.resize({ w: size, h: size });
  await icon.write(path.join(publicDir, name));
  console.log(`  ${name}`);
}

fs.copyFileSync(path.join(publicDir, "favicon-32x32.png"), path.join(publicDir, "favicon.ico"));
console.log("  favicon.ico");
console.log("Done.");