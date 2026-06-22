import fs from "fs";
import path from "path";
import { BRAND, root } from "./brand-assets.mjs";
import { iconFromFist } from "./image-utils.mjs";

const publicDir = path.join(root, "public");

fs.mkdirSync(publicDir, { recursive: true });

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
  { name: "mstile-150x150.png", size: 150 },
];

console.log("Generating official fist favicons...");
for (const { name, size } of sizes) {
  const icon = await iconFromFist(BRAND.fist, size, { pad: 0.08 });
  await icon.write(path.join(publicDir, name));
  console.log(`  ${name}`);
}

fs.copyFileSync(path.join(publicDir, "favicon-32x32.png"), path.join(publicDir, "favicon.ico"));
console.log("  favicon.ico");
console.log("Done.");