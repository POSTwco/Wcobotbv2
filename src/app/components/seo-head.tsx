import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router";
import {
  SITE,
  absoluteOgImage,
  buildJsonLd,
  resolvePageSeo,
} from "../lib/seo-config";

function twitterDomain(canonical: string) {
  try {
    return new URL(canonical).hostname.replace(/^www\./, "");
  } catch {
    return "wcorg.io";
  }
}

export function SeoHead() {
  const { pathname } = useLocation();
  const seo = resolvePageSeo(pathname);
  const ogImage = absoluteOgImage(seo.ogImage);
  const jsonLd = buildJsonLd(pathname);
  const domain = twitterDomain(seo.canonical);

  return (
    <Helmet>
      <html lang="en" />
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={SITE.keywords} />
      <meta name="author" content={SITE.org} />
      <meta name="theme-color" content={SITE.themeColor} />
      <link rel="canonical" href={seo.canonical} />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="icon" href="/favicon.ico" sizes="any" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${seo.headline} — ${SITE.org}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:creator" content={SITE.twitter} />
      <meta property="twitter:site" content={SITE.twitter} />
      <meta property="twitter:creator" content={SITE.twitter} />
      <meta name="twitter:title" content={seo.title} />
      <meta property="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta property="twitter:description" content={seo.description} />
      <meta name="twitter:url" content={seo.canonical} />
      <meta property="twitter:url" content={seo.canonical} />
      <meta property="twitter:domain" content={domain} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:src" content={ogImage} />
      <meta property="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${seo.headline} — ${SITE.org}`} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}