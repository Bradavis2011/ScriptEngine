/**
 * generate-seo-pages.mjs
 * Runs after `vite build`. Fetches published SeoPage records from the Railway API,
 * renders static HTML for each, and generates a complete sitemap.xml.
 *
 * Env vars:
 *   SEO_API_URL — Railway API base URL (default: https://scriptengine-production.up.railway.app)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const SEO_API_URL = process.env.SEO_API_URL ?? 'https://scriptengine-production.up.railway.app';
const SITE_URL = 'https://clipscriptai.com';

// ── Internal link helpers ────────────────────────────────────────────────────

const NICHES = ['real-estate', 'fitness', 'finance', 'food', 'beauty', 'fashion', 'tech', 'business', 'travel', 'education'];
const NICHE_LABELS = {
  'real-estate': 'Real Estate', 'fitness': 'Fitness', 'finance': 'Finance',
  'food': 'Food', 'beauty': 'Beauty', 'fashion': 'Fashion', 'tech': 'Tech',
  'business': 'Business', 'travel': 'Travel', 'education': 'Education',
};

function getRelatedSlugs(page) {
  const related = [];
  if (page.pageType === 'niche') {
    // Link to city pages for this niche
    const cities = ['austin-tx', 'miami-fl', 'los-angeles-ca', 'new-york-ny', 'dallas-tx'];
    for (const city of cities) {
      related.push({
        slug: `tiktok-scripts-for-${page.niche.toLowerCase().replace(/\s+/g, '-')}-${city}`,
        label: `${page.niche} scripts — ${city.replace('-', ' ').toUpperCase().replace(/\b([A-Z]{2})\b/, '$1')}`,
      });
    }
    // Link to other niche pages
    for (const n of NICHES.filter(n => n !== page.niche.toLowerCase().replace(/\s+/g, '-')).slice(0, 4)) {
      related.push({ slug: `tiktok-scripts-for-${n}`, label: `${NICHE_LABELS[n] ?? n} scripts` });
    }
  } else if (page.pageType === 'niche_city') {
    // Link to parent niche page
    const nicheSlug = page.niche.toLowerCase().replace(/\s+/g, '-');
    related.push({ slug: `tiktok-scripts-for-${nicheSlug}`, label: `All ${page.niche} scripts` });
    // Link to sibling city pages
    const cities = [
      { slug: 'austin-tx', label: 'Austin TX' }, { slug: 'miami-fl', label: 'Miami FL' },
      { slug: 'los-angeles-ca', label: 'Los Angeles CA' }, { slug: 'new-york-ny', label: 'New York NY' },
      { slug: 'dallas-tx', label: 'Dallas TX' },
    ];
    for (const c of cities.filter(c => !page.slug.endsWith(c.slug)).slice(0, 3)) {
      related.push({ slug: `tiktok-scripts-for-${nicheSlug}-${c.slug}`, label: `${page.niche} scripts — ${c.label}` });
    }
    // Other niches in same city
    const citySlug = page.slug.split(`tiktok-scripts-for-${nicheSlug}-`)[1];
    for (const n of NICHES.filter(n => n !== nicheSlug).slice(0, 3)) {
      related.push({ slug: `tiktok-scripts-for-${n}-${citySlug}`, label: `${NICHE_LABELS[n] ?? n} scripts — ${citySlug.replace('-', ' ')}` });
    }
  } else {
    // how-to: link to relevant niche pages
    for (const n of NICHES.slice(0, 5)) {
      related.push({ slug: `tiktok-scripts-for-${n}`, label: `${NICHE_LABELS[n] ?? n} scripts` });
    }
  }
  return related.slice(0, 8);
}

function breadcrumb(page) {
  const parts = [{ href: SITE_URL, label: 'Home' }];
  if (page.pageType === 'niche_city' && page.niche) {
    const nicheSlug = page.niche.toLowerCase().replace(/\s+/g, '-');
    parts.push({ href: `${SITE_URL}/s/tiktok-scripts-for-${nicheSlug}`, label: `${page.niche} Scripts` });
  }
  parts.push({ href: null, label: page.h1 });
  return parts;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── HTML renderer ────────────────────────────────────────────────────────────

function renderPage(page) {
  const content = page.contentJson;
  const canonical = `${SITE_URL}/s/${page.slug}`;
  const lastmod = (page.publishedAt ?? page.updatedAt ?? new Date().toISOString()).split('T')[0];
  const crumbs = breadcrumb(page);
  const related = getRelatedSlugs(page);

  // JSON-LD schemas
  const articleSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: escapeHtml(page.h1),
    description: escapeHtml(page.metaDescription),
    url: canonical,
    publisher: {
      '@type': 'Organization',
      name: 'ClipScript',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` },
    },
    datePublished: lastmod,
    dateModified: lastmod,
  });

  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (content.faqs ?? []).map(faq => ({
      '@type': 'Question',
      name: escapeHtml(faq.question),
      acceptedAnswer: { '@type': 'Answer', text: escapeHtml(faq.answer) },
    })),
  });

  // Breadcrumb list schema
  const breadcrumbSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: escapeHtml(c.label),
      ...(c.href ? { item: c.href } : {}),
    })),
  });

  const breadcrumbHtml = crumbs.map((c, i) =>
    `<li>${c.href && i < crumbs.length - 1
      ? `<a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`
      : `<span>${escapeHtml(c.label)}</span>`
    }</li>`
  ).join('');

  const scriptsHtml = (content.scripts ?? []).map((s, i) => `
    <section class="script-section">
      <p class="script-number">Script ${i + 1}</p>
      <div class="script-card">
        <p class="script-hook">${escapeHtml(s.hookLine)}</p>
        <p class="field-label">Teleprompter text <span class="duration-badge">~${s.durationSeconds}s</span></p>
        <div class="teleprompter-text">${escapeHtml(s.teleprompterText)}</div>
        <p class="field-label">Caption</p>
        <p class="caption-text">${escapeHtml(s.caption)}</p>
        <p class="field-label">Hashtags</p>
        <div class="hashtags">${(s.hashtags ?? []).map(h => `<span class="hashtag">#${escapeHtml(h)}</span>`).join('')}</div>
        <p class="field-label">B-Roll</p>
        <p class="broll-text">${escapeHtml(s.bRollNotes)}</p>
      </div>
    </section>
  `).join('');

  const tipsHtml = (content.tips ?? []).map(tip =>
    `<li>${escapeHtml(tip)}</li>`
  ).join('');

  const faqsHtml = (content.faqs ?? []).map(faq => `
    <div class="faq-item">
      <details>
        <summary>${escapeHtml(faq.question)}</summary>
        <p class="faq-answer">${escapeHtml(faq.answer)}</p>
      </details>
    </div>
  `).join('');

  const relatedHtml = related.map(r =>
    `<a class="related-link" href="/s/${escapeHtml(r.slug)}">${escapeHtml(r.label)}</a>`
  ).join('');

  const introHtml = (content.introHtml ?? '')
    .replace(/<(?!\/?(p|strong|em|br)\b)[^>]+>/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.pageTitle)}</title>
  <meta name="description" content="${escapeHtml(page.metaDescription)}">
  <link rel="canonical" href="${canonical}">

  <meta property="og:title" content="${escapeHtml(page.pageTitle)}">
  <meta property="og:description" content="${escapeHtml(page.metaDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta property="og:site_name" content="ClipScript">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(page.pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(page.metaDescription)}">

  <link rel="icon" type="image/png" href="/icon.png">
  <link rel="stylesheet" href="/seo.css">

  <script type="application/ld+json">${articleSchema}</script>
  <script type="application/ld+json">${faqSchema}</script>
  <script type="application/ld+json">${breadcrumbSchema}</script>
</head>
<body>

<nav class="site-nav">
  <div class="container">
    <a class="nav-logo" href="/">
      <img src="/icon.png" alt="ClipScript icon" width="32" height="32">
      <span class="nav-logo-text">ClipScript</span>
    </a>
    <a class="btn btn-primary" href="/#products">Get Scripts</a>
  </div>
</nav>

<main>
  <div class="container">

    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>${breadcrumbHtml}</ol>
    </nav>

    <header class="page-header">
      <p class="kicker">Free Scripts</p>
      <h1>${escapeHtml(page.h1)}</h1>
      <div class="intro">${introHtml}</div>
    </header>

    <hr class="section-divider">

    ${scriptsHtml.split('</section>').map((chunk, i) => {
      if (i === 0) return chunk + '</section>';
      if (i === 1) return `
    <section class="cta-inline" aria-label="Get more scripts">
      <div class="cta-inline-text">
        <strong>Want 5 more scripts like these?</strong>
        <span>Teleprompter-ready, delivered in minutes. Pick your niche and topic.</span>
      </div>
      <a class="btn btn-primary" href="/#products?ref=seo-inline">Get 5 Scripts — $25</a>
    </section>
    ${chunk}</section>`;
      if (i === 2) return `
    <section class="tips-section">
      <h2>Tips for ${escapeHtml(page.niche !== 'General' ? page.niche + ' creators' : 'video creators')}${page.city ? ` in ${escapeHtml(page.city)}` : ''}</h2>
      <ul class="tips-list">${tipsHtml}</ul>
    </section>
    ${chunk}</section>`;
      return chunk + (i < (content.scripts ?? []).length ? '</section>' : '');
    }).join('')}

    <hr class="section-divider">

    <section class="faq-section">
      <h2>Frequently asked questions</h2>
      ${faqsHtml}
    </section>

    <section class="cta-full" aria-label="Get scripts">
      <h2>Start filming today</h2>
      <p>ClipScript generates teleprompter-ready scripts for ${escapeHtml(page.niche !== 'General' ? page.niche.toLowerCase() + ' creators' : 'video creators')}. Hook, sections, B-roll cues, caption, hashtags — delivered in minutes.</p>
      <div class="cta-buttons">
        <div class="cta-offer">
          <p class="cta-offer-price">$25</p>
          <p class="cta-offer-title">Script Pack</p>
          <p class="cta-offer-desc">5 teleprompter-ready scripts on your topic. Instant delivery.</p>
          <a class="btn btn-primary" href="/#products?ref=seo-cta-pack" style="width:100%;text-align:center;display:block;">Get 5 Scripts — $25</a>
        </div>
        <div class="cta-offer">
          <p class="cta-offer-price">$50</p>
          <p class="cta-offer-title">Concierge Brief</p>
          <p class="cta-offer-desc">Full strategy: YouTube research, series plan, hook library, 2 full scripts.</p>
          <a class="btn btn-secondary" href="/#products?ref=seo-cta-concierge" style="width:100%;text-align:center;display:block;">Order Concierge — $50</a>
        </div>
      </div>
    </section>

    ${related.length > 0 ? `
    <section class="related-section">
      <h2>Related script libraries</h2>
      <div class="related-grid">${relatedHtml}</div>
    </section>
    ` : ''}

  </div>
</main>

<footer class="site-footer">
  <div class="container">
    <p>Questions? Email <a href="mailto:hello@clipscriptai.com">hello@clipscriptai.com</a></p>
    <p style="margin-top:0.375rem;">ClipScript — scripts built for filming, not for reading</p>
    <nav class="footer-links" aria-label="Footer">
      <a href="/faq">FAQ</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/">Home</a>
    </nav>
  </div>
</footer>

</body>
</html>`;
}

// ── Sitemap generator ────────────────────────────────────────────────────────

function generateSitemap(pages) {
  const today = new Date().toISOString().split('T')[0];
  const coreUrls = [
    `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>`,
    `  <url><loc>${SITE_URL}/thank-you</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>`,
    `  <url><loc>${SITE_URL}/faq</loc><lastmod>${today}</lastmod><priority>0.5</priority></url>`,
    `  <url><loc>${SITE_URL}/privacy</loc><lastmod>${today}</lastmod><priority>0.4</priority></url>`,
    `  <url><loc>${SITE_URL}/terms</loc><lastmod>${today}</lastmod><priority>0.4</priority></url>`,
  ];
  const seoUrls = pages.map(p => {
    const lastmod = (p.publishedAt ?? p.updatedAt ?? new Date().toISOString()).split('T')[0];
    const priority = p.pageType === 'niche' ? '0.8' : p.pageType === 'niche_city' ? '0.7' : '0.6';
    return `  <url><loc>${SITE_URL}/s/${p.slug}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...coreUrls, ...seoUrls].join('\n')}\n</urlset>\n`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[generate-seo-pages] Fetching published pages from', SEO_API_URL);

  let pages;
  try {
    const res = await fetch(`${SEO_API_URL}/api/seo/pages`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`[generate-seo-pages] API returned ${res.status} — skipping SEO page generation`);
      process.exit(0);
    }
    pages = await res.json();
  } catch (err) {
    console.warn('[generate-seo-pages] API unreachable — skipping SEO page generation:', err.message);
    process.exit(0);
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    console.warn('[generate-seo-pages] 0 published pages returned — skipping');
    process.exit(0);
  }

  console.log(`[generate-seo-pages] Rendering ${pages.length} pages`);

  let written = 0;
  let errors = 0;

  for (const page of pages) {
    try {
      const outDir = join(DIST_DIR, 's', page.slug);
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      const html = renderPage(page);
      writeFileSync(join(outDir, 'index.html'), html, 'utf8');
      written++;
    } catch (err) {
      console.error(`[generate-seo-pages] Failed to render ${page.slug}:`, err.message);
      errors++;
    }
  }

  // Generate sitemap
  try {
    const sitemap = generateSitemap(pages);
    writeFileSync(join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
    console.log('[generate-seo-pages] Sitemap written');
  } catch (err) {
    console.error('[generate-seo-pages] Failed to write sitemap:', err.message);
  }

  console.log(`[generate-seo-pages] Done. Written: ${written}, Errors: ${errors}`);
}

main();
