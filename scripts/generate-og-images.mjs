import fs from "fs";
import path from "path";
import { accentForOg, BRAND, root, SOCIAL_SPECS } from "./brand-assets.mjs";
import { shareBanner, squareShare, twitterBanner } from "./image-utils.mjs";

const seoData = JSON.parse(
  fs.readFileSync(path.join(root, "src/app/lib/seo-data.json"), "utf8"),
);

const uniqueImages = new Map();
for (const [, page] of Object.entries(seoData.pages)) {
  const filename = path.basename(page.ogImage);
  if (!uniqueImages.has(filename)) uniqueImages.set(filename, page.headline);
}
uniqueImages.set("github-social-preview.png", "WCO Platform");

async function writeShareSet(filename, headline) {
  const accent = accentForOg(filename);
  const baseName = filename.replace(/\.[^.]+$/, "");

  const ogDir = path.join(root, "public", SOCIAL_SPECS.openGraph.dir);
  const twDir = path.join(root, "public", SOCIAL_SPECS.twitter.dir);
  const ghDir = path.join(root, "public", SOCIAL_SPECS.github.dir);
  const sqDir = path.join(root, "public", SOCIAL_SPECS.square.dir);
  for (const d of [ogDir, twDir, ghDir, sqDir]) fs.mkdirSync(d, { recursive: true });

  const shared = {
    fistPath: BRAND.fist,
    wordmarkPath: BRAND.wordmark,
    accent,
    bg: "#FFFFFF",
  };

  const og = await shareBanner({
    ...shared,
    width: SOCIAL_SPECS.openGraph.width,
    height: SOCIAL_SPECS.openGraph.height,
  });
  await og.write(path.join(ogDir, `${baseName}.png`));

  const twitter = await twitterBanner({
    ...shared,
    width: SOCIAL_SPECS.twitter.width,
    height: SOCIAL_SPECS.twitter.height,
  });
  await twitter.write(path.join(twDir, `${baseName}.png`));

  const github = await shareBanner({
    ...shared,
    width: SOCIAL_SPECS.github.width,
    height: SOCIAL_SPECS.github.height,
  });
  await github.write(path.join(ghDir, `${baseName}.png`));

  const square = await squareShare({
    fistPath: BRAND.fist,
    wordmarkPath: BRAND.wordmark,
    size: SOCIAL_SPECS.square.width,
  });
  await square.write(path.join(sqDir, `${baseName}.png`));

  console.log(`  og/${baseName}.png + social/twitter/${baseName}.png - ${headline}`);
}

console.log("Generating share images from official WCO brand files...");
for (const [filename, headline] of uniqueImages) {
  await writeShareSet(filename, headline);
}
console.log("Done.");