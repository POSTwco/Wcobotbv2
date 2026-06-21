import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router";
import {
  SITE,
  absoluteOgImage,
  buildJsonLd,
  resolvePageSeo,
} from "../lib/seo-config";

export function SeoHead() {
  const { pathname } = useLocation();
  const seo = resolvePageSeo(pathname);
  const ogImage = absoluteOgImage(seo.ogImage);
  const jsonLd = buildJsonLd(pathname);

  return (
    <Helmet>
      <html lang="en" />
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={SITE.keywords} />
      <meta name="author" content={SITE.org} />
      <meta name="theme-color" content={SITE.themeColor} />
      <link rel="canonical" href={seo.canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${seo.headline} — ${SITE.org}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${seo.headline} — ${SITE.org}`} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}