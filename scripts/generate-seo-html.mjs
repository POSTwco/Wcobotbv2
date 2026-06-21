import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

function absoluteOgImage(ogPath) {
  if (ogPath.startsWith("http")) return ogPath;
  return absoluteUrl(ogPath);
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
  const jsonLd = buildJsonLd(routePath, page);

  return `
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <meta name="keywords" content="${site.keywords}" />
    <meta name="author" content="${site.org}" />
    <meta name="theme-color" content="${site.themeColor}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${site.name}" />
    <meta property="og:locale" content="${site.locale}" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${page.headline} — ${site.org}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${site.twitter}" />
    <meta name="twitter:title" content="${page.title}" />
    <meta name="twitter:description" content="${page.description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${page.headline} — ${site.org}" />
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