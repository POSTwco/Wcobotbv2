import seoData from "./seo-data.json";

export const SITE = seoData.site;

export type PageSeo = {
  title: string;
  description: string;
  ogImage: string;
  headline: string;
  index: boolean;
  priority: number;
};

export const PAGE_SEO: Record<string, PageSeo> = seoData.pages;

export const SOCIAL_LINKS = seoData.socialLinks;

export function absoluteUrl(path = ""): string {
  const base = SITE.url.replace(/\/$/, "");
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function absoluteOgImage(ogPath: string): string {
  if (ogPath.startsWith("http")) return ogPath;
  return absoluteUrl(ogPath);
}

export function resolvePageSeo(pathname: string): PageSeo & { path: string; canonical: string } {
  const path = pathname === "" ? "/" : pathname.replace(/\/$/, "") || "/";
  const page = PAGE_SEO[path] ?? PAGE_SEO["/"];
  return {
    ...page,
    path,
    canonical: absoluteUrl(path === "/" ? "/" : path),
  };
}

export function buildJsonLd(pathname: string): Record<string, unknown> | null {
  const seo = resolvePageSeo(pathname);
  const sameAs = SOCIAL_LINKS.filter((l) => l.id !== "website").map((l) => l.href);

  if (seo.path === "/") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${SITE.url}/#organization`,
          name: SITE.org,
          url: SITE.orgUrl,
          logo: {
            "@type": "ImageObject",
            url: SITE.logo,
          },
          sameAs,
        },
        {
          "@type": "WebSite",
          "@id": `${SITE.url}/#website`,
          name: SITE.name,
          url: SITE.url,
          description: SITE.description,
          publisher: { "@id": `${SITE.url}/#organization` },
        },
        {
          "@type": "WebApplication",
          "@id": `${SITE.url}/#app`,
          name: SITE.name,
          url: SITE.url,
          applicationCategory: "SportsApplication",
          operatingSystem: "Web",
          description: SITE.description,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
      ],
    };
  }

  if (seo.path === "/battles") {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: seo.title,
      description: seo.description,
      url: seo.canonical,
      isPartOf: { "@id": `${SITE.url}/#website` },
    };
  }

  if (seo.path === "/calisthenics") {
    return {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "WCO Cali Engine",
      description: seo.description,
      url: seo.canonical,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: seo.title,
    description: seo.description,
    url: seo.canonical,
    isPartOf: { "@id": `${SITE.url}/#website` },
  };
}