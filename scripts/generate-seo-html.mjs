import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSocialMetaTags } from "./social-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const seoData = JSON.parse(fs.readFileSync(path.join(root, "src/app/lib/seo-data.json"), "utf8"));

const { site, pages } = seoData;

function absoluteUrl(routePath) {
  const base = site.url.replace(/\/$/, "");
  if (!routePath || routePath === "/") return `${base}/`;
  return `${base}${routePath}`;
}

function withVersion(url) {
  const version = site.ogVersion;
  if (!version) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

function absoluteOgImage(ogPath) {
  const base = ogPath.startsWith("http") ? ogPath : absoluteUrl(ogPath);
  return withVersion(base);
}

function absoluteTwitterImage(ogPath) {
  if (ogPath.startsWith("http")) return ogPath.split("?")[0];
  const file = ogPath.replace(/^\/og\//, "").replace(/\.png$/i, "");
  return absoluteUrl(`/social/twitter/${file}.png`);
}

function buildJsonLd(routePath, page) {
  const canonical = absoluteUrl(routePath);
  const sameAs = seoData.socialLinks.filter((l) => l.id !== "website").map((l) => l.href);

  if (routePath === "/") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${site.url}/#organization`,
          name: site.org,
          url: site.orgUrl,
          logo: { "@type": "ImageObject", url: site.logo },
          sameAs,
        },
        {
          "@type": "WebSite",
          "@id": `${site.url}/#website`,
          name: site.name,
          url: site.url,
          description: site.description,
          publisher: { "@id": `${site.url}/#organization` },
        },
        {
          "@type": "WebApplication",
          "@id": `${site.url}/#app`,
          name: site.name,
          url: site.url,
          applicationCategory: "SportsApplication",
          operatingSystem: "Web",
          description: site.description,
        },
      ],
    };
  }

  if (routePath === "/battles") {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.title,
      description: page.description,
      url: canonical,
      isPartOf: { "@id": `${site.url}/#website` },
    };
  }

  if (routePath === "/calisthenics") {
    return {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "WCO Cali Engine",
      description: page.description,
      url: canonical,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: { "@id": `${site.url}/#website` },
  };
}

function buildHeadTags(routePath, page) {
  const canonical = absoluteUrl(routePath);
  const ogImage = absoluteOgImage(page.ogImage);
  const twitterImage = absoluteTwitterImage(page.ogImage);
  const jsonLd = buildJsonLd(routePath, page);
  const social = buildSocialMetaTags({ site, page, canonical, ogImage, twitterImage });

  return `${social}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function stripSeoTags(html) {
  return html
    .replace(/<title>[^<]*<\/title>\s*/g, "")
    .replace(/<meta name="description"[^>]*>\s*/g, "")
    .replace(/<meta name="keywords"[^>]*>\s*/g, "")
    .replace(/<meta name="author"[^>]*>\s*/g, "")
    .replace(/<meta name="theme-color"[^>]*>\s*/g, "")
    .replace(/<meta name="robots"[^>]*>\s*/g, "")
    .replace(/<link rel="canonical"[^>]*>\s*/g, "")
    .replace(/<link rel="shortcut icon"[^>]*>\s*/g, "")
    .replace(/<link rel="icon"[^>]*>\s*/g, "")
    .replace(/<link rel="apple-touch-icon"[^>]*>\s*/g, "")
    .replace(/<meta property="og:[^"]*"[^>]*>\s*/g, "")
    .replace(/<meta name="twitter:[^"]*"[^>]*>\s*/g, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, "");
}

function injectMeta(html, routePath, page) {
  const cleaned = stripSeoTags(html);
  const headTags = buildHeadTags(routePath, page);
  return cleaned.replace("</head>", `${headTags}\n  </head>`);
}

const templatePath = path.join(distDir, "index.html");
if (!fs.existsSync(templatePath)) {
  console.error("dist/index.html not found — run vite build first");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf8");

console.log("Generating prerendered SEO HTML...");
for (const [routePath, page] of Object.entries(pages)) {
  if (!page.index) continue;

  const html = injectMeta(template, routePath, page);
  const outPath =
    routePath === "/"
      ? path.join(distDir, "index.html")
      : path.join(distDir, routePath.slice(1), "index.html");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`  ${routePath}`);
}

console.log("Done.");