import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router";
import {
  SITE,
  absoluteOgImage,
  absoluteTwitterImage,
  buildJsonLd,
  resolvePageSeo,
} from "../lib/seo-config";

export function SeoHead() {
  const { pathname } = useLocation();
  const seo = resolvePageSeo(pathname);
  const ogImage = absoluteOgImage(seo.ogImage);
  const twitterImage = absoluteTwitterImage(seo.ogImage);
  const jsonLd = buildJsonLd(pathname);
  const imageAlt = `${seo.headline} - ${SITE.org}`;

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
      <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

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
      <meta property="og:image:alt" content={imageAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:creator" content={SITE.twitter} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={twitterImage} />
      <meta name="twitter:image:width" content="1200" />
      <meta name="twitter:image:height" content="600" />
      <meta name="twitter:image:alt" content={imageAlt} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}