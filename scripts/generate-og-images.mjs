import fs from "fs";
import path from "path";
import { accentForOg, BRAND, root, SOCIAL_SPECS } from "./brand-assets.mjs";
import { botbShareBanner, squareShare } from "./image-utils.mjs";

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
  const ghDir = path.join(root, "public", SOCIAL_SPECS.github.dir);
  const sqDir = path.join(root, "public", SOCIAL_SPECS.square.dir);
  for (const d of [ogDir, ghDir, sqDir]) fs.mkdirSync(d, { recursive: true });

  const shared = {
    botbPath: BRAND.botb,
    fistPath: BRAND.fist,
    accent,
    bg: "#FFFFFF",
  };

  const banner = await botbShareBanner({
    ...shared,
    width: SOCIAL_SPECS.openGraph.width,
    height: SOCIAL_SPECS.openGraph.height,
  });

  const pngPath = path.join(ogDir, `${baseName}.png`);
  const jpgPath = path.join(ogDir, `${baseName}.jpg`);
  await banner.write(pngPath);
  await banner.write(jpgPath, { quality: 92 });

  const github = await botbShareBanner({
    ...shared,
    width: SOCIAL_SPECS.github.width,
    height: SOCIAL_SPECS.github.height,
  });
  await github.write(path.join(ghDir, `${baseName}.png`));

  const square = await squareShare({
    botbPath: BRAND.botb,
    fistPath: BRAND.fist,
    size: SOCIAL_SPECS.square.width,
  });
  await square.write(path.join(sqDir, `${baseName}.png`));

  console.log(`  og/${baseName}.png + og/${baseName}.jpg - ${headline}`);
}

console.log("Generating share images from BOTB + FIST brand files...");
for (const [filename, headline] of uniqueImages) {
  await writeShareSet(filename, headline);
}
console.log("Done.");