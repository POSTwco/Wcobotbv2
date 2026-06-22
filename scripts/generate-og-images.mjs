import fs from "fs";
import path from "path";
import { accentForOg, BRAND, root, SOCIAL_SPECS } from "./brand-assets.mjs";
import { botbShareCard } from "./image-utils.mjs";

const seoData = JSON.parse(
  fs.readFileSync(path.join(root, "src/app/lib/seo-data.json"), "utf8"),
);

const uniqueImages = new Map();
for (const [, page] of Object.entries(seoData.pages)) {
  const filename = path.basename(page.ogImage);
  if (!uniqueImages.has(filename)) uniqueImages.set(filename, page.headline);
}
uniqueImages.set("github-social-preview.png", "WCO Platform");

/** X requires 2:1 (1200x600). Facebook tolerates 1.91:1 (1200x630) — we ship both. */
const TWITTER_W = 1200;
const TWITTER_H = 600;
const OG_W = 1200;
const OG_H = 630;

async function writeShareSet(filename, headline) {
  const accent = accentForOg(filename);
  const baseName = filename.replace(/\.[^.]+$/, "");

  const ogDir = path.join(root, "public", SOCIAL_SPECS.openGraph.dir);
  const ghDir = path.join(root, "public", SOCIAL_SPECS.github.dir);
  const sqDir = path.join(root, "public", SOCIAL_SPECS.square.dir);
  for (const d of [ogDir, ghDir, sqDir]) fs.mkdirSync(d, { recursive: true });

  const shared = {
    botbPath: BRAND.botb,
    fistPath: BRAND.fist,
    accent,
  };

  await botbShareCard({
    ...shared,
    width: TWITTER_W,
    height: TWITTER_H,
    jpegPath: path.join(ogDir, `${baseName}.jpg`),
    pngPath: null,
  });

  await botbShareCard({
    ...shared,
    width: OG_W,
    height: OG_H,
    jpegPath: path.join(ogDir, `${baseName}-fb.jpg`),
    pngPath: path.join(ogDir, `${baseName}.png`),
  });

  await botbShareCard({
    ...shared,
    width: SOCIAL_SPECS.github.width,
    height: SOCIAL_SPECS.github.height,
    jpegPath: path.join(ghDir, `${baseName}.jpg`),
    pngPath: path.join(ghDir, `${baseName}.png`),
  });

  await botbShareCard({
    ...shared,
    width: SOCIAL_SPECS.square.width,
    height: SOCIAL_SPECS.square.width,
    jpegPath: path.join(sqDir, `${baseName}.jpg`),
    pngPath: path.join(sqDir, `${baseName}.png`),
  });

  if (baseName === "home") {
    await botbShareCard({
      ...shared,
      width: TWITTER_W,
      height: TWITTER_H,
      jpegPath: path.join(root, "public", "twitter-card.jpg"),
      pngPath: null,
    });
  }

  console.log(`  og/${baseName}.jpg (1200x600) + twitter-card.jpg - ${headline}`);
}

console.log("Generating share images (sharp JPEG, 2:1 for X)...");
for (const [filename, headline] of uniqueImages) {
  await writeShareSet(filename, headline);
}
console.log("Done.");