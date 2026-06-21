import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const seoData = JSON.parse(fs.readFileSync(path.join(root, "src/app/lib/seo-data.json"), "utf8"));

const { site, pages } = seoData;
const lastmod = new Date().toISOString().slice(0, 10);

const urls = Object.entries(pages)
  .filter(([, page]) => page.index)
  .map(([routePath, page]) => {
    const loc = routePath === "/" ? `${site.url}/` : `${site.url}${routePath}`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${routePath === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${page.priority.toFixed(2)}</priority>
  </url>`;
  })
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const distPath = path.join(root, "dist/sitemap.xml");
const publicPath = path.join(root, "public/sitemap.xml");

fs.writeFileSync(distPath, sitemap);
fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.writeFileSync(publicPath, sitemap);

console.log(`Sitemap written (${Object.keys(pages).length} routes)`);