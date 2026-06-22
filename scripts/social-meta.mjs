export function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildSocialMetaTags({ site, page, canonical, ogImage, twitterImage }) {
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const og = escapeAttr(ogImage);
  const twitter = escapeAttr(twitterImage ?? ogImage);
  const imageAlt = escapeAttr(`${page.headline} — ${site.org}`);
  const url = escapeAttr(canonical);
  const domain = escapeAttr(new URL(canonical).hostname.replace(/^www\./, ""));

  return `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${escapeAttr(site.keywords)}" />
    <meta name="author" content="${escapeAttr(site.org)}" />
    <meta name="theme-color" content="${site.themeColor}" />
    <link rel="canonical" href="${url}" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeAttr(site.name)}" />
    <meta property="og:locale" content="${site.locale}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${og}" />
    <meta property="og:image:secure_url" content="${og}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${site.twitter}" />
    <meta name="twitter:creator" content="${site.twitter}" />
    <meta property="twitter:site" content="${site.twitter}" />
    <meta property="twitter:creator" content="${site.twitter}" />
    <meta name="twitter:title" content="${title}" />
    <meta property="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta property="twitter:description" content="${description}" />
    <meta name="twitter:url" content="${url}" />
    <meta property="twitter:url" content="${url}" />
    <meta property="twitter:domain" content="${domain}" />
    <meta name="twitter:image" content="${twitter}" />
    <meta name="twitter:image:src" content="${twitter}" />
    <meta property="twitter:image" content="${twitter}" />
    <meta name="twitter:image:alt" content="${imageAlt}" />`;
}