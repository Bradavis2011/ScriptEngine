import { Job } from 'bullmq';
import { prisma } from '../../lib/prisma';
import { generateSeoPageContent, SeoPageInput } from '../../lib/seoGenerator';

const NICHES = [
  'Real Estate',
  'Fitness',
  'Finance',
  'Food',
  'Beauty',
  'Fashion',
  'Tech',
  'Business',
  'Travel',
  'Education',
];

const CITIES = [
  'Austin TX',
  'Miami FL',
  'Los Angeles CA',
  'New York NY',
  'Dallas TX',
];

const HOWTO_TOPICS = [
  { topic: 'write tiktok scripts', keyword: 'how to write tiktok scripts' },
  { topic: 'use a teleprompter for tiktok', keyword: 'how to use a teleprompter for tiktok' },
  { topic: 'write short form video scripts', keyword: 'how to write short form video scripts' },
  { topic: 'start a real estate tiktok', keyword: 'how to start a real estate tiktok' },
  { topic: 'write instagram reels scripts', keyword: 'how to write instagram reels scripts' },
  { topic: 'write youtube shorts scripts', keyword: 'how to write youtube shorts scripts' },
  { topic: 'write viral video hooks', keyword: 'how to write viral video hooks' },
  { topic: 'film tiktok videos faster', keyword: 'how to film tiktok videos faster' },
  { topic: 'script a property tour video', keyword: 'how to script a property tour video' },
  { topic: 'batch create video content', keyword: 'how to batch create video content' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function buildPageDefinitions(): SeoPageInput[] {
  const pages: SeoPageInput[] = [];

  // 10 niche pages
  for (const niche of NICHES) {
    pages.push({
      pageType: 'niche',
      niche,
      targetKeyword: `tiktok scripts for ${niche.toLowerCase()}`,
    });
  }

  // 50 niche×city pages
  for (const niche of NICHES) {
    for (const city of CITIES) {
      pages.push({
        pageType: 'niche_city',
        niche,
        city,
        targetKeyword: `tiktok scripts for ${niche.toLowerCase()} ${city.toLowerCase()}`,
      });
    }
  }

  // 10 how-to pages
  for (const { topic, keyword } of HOWTO_TOPICS) {
    pages.push({
      pageType: 'howto',
      niche: 'General',
      howtoTopic: topic,
      targetKeyword: keyword,
    });
  }

  return pages;
}

function pageSlug(def: SeoPageInput): string {
  if (def.pageType === 'howto') {
    return slugify(def.targetKeyword);
  }
  if (def.pageType === 'niche_city') {
    return `tiktok-scripts-for-${slugify(def.niche)}-${slugify(def.city!)}`;
  }
  return `tiktok-scripts-for-${slugify(def.niche)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSeoContent(job: Job): Promise<void> {
  const regenerate = job.data?.regenerate === true;
  const pages = buildPageDefinitions();

  console.log(`[seo-content] Starting generation of up to ${pages.length} pages (regenerate=${regenerate})`);

  // Fetch existing published slugs
  const existing = await prisma.seoPage.findMany({
    where: regenerate ? {} : { status: { in: ['published', 'queued'] } },
    select: { slug: true, status: true },
  });
  const publishedSlugs = new Set(
    existing.filter((p) => p.status === 'published').map((p) => p.slug),
  );

  const toGenerate = regenerate
    ? pages
    : pages.filter((def) => !publishedSlugs.has(pageSlug(def)));

  const skipped = pages.length - toGenerate.length;
  console.log(`[seo-content] ${toGenerate.length} standard pages to generate, ${skipped} already published (skipped)`);

  let generated = 0;
  let failed = 0;

  for (const def of toGenerate) {
    const slug = pageSlug(def);
    try {
      console.log(`[seo-content] Generating: ${slug}`);
      const content = await generateSeoPageContent(def);

      await prisma.seoPage.upsert({
        where: { slug },
        create: {
          slug,
          pageType: def.pageType,
          targetKeyword: def.targetKeyword,
          niche: def.niche,
          city: def.city ?? null,
          pageTitle: content.pageTitle,
          metaDescription: content.metaDescription,
          h1: content.h1,
          contentJson: content as any,
          status: 'published',
          publishedAt: new Date(),
        },
        update: {
          pageTitle: content.pageTitle,
          metaDescription: content.metaDescription,
          h1: content.h1,
          contentJson: content as any,
          status: 'published',
          publishedAt: new Date(),
        },
      });

      generated++;
      console.log(`[seo-content] Done: ${slug} (${generated}/${toGenerate.length})`);
    } catch (err) {
      failed++;
      console.error(`[seo-content] Failed: ${slug}`, err);
    }

    await sleep(2000);
  }

  // ── Process pain-point / GSC-opportunity pages with status 'queued' ──
  const queuedPages = await prisma.seoPage.findMany({
    where: { status: 'queued' },
  });

  console.log(`[seo-content] ${queuedPages.length} queued pain-point/opportunity pages to generate`);

  for (const qp of queuedPages) {
    try {
      console.log(`[seo-content] Generating queued page: ${qp.slug} ("${qp.targetKeyword}")`);

      const content = await generateSeoPageContent({
        pageType: (qp.pageType as any) === 'pain_point' ? 'howto' : (qp.pageType as any),
        niche: qp.niche,
        city: qp.city ?? undefined,
        targetKeyword: qp.targetKeyword,
      });

      await prisma.seoPage.update({
        where: { id: qp.id },
        data: {
          pageTitle: content.pageTitle,
          metaDescription: content.metaDescription,
          h1: content.h1,
          contentJson: content as any,
          status: 'published',
          publishedAt: new Date(),
        },
      });

      generated++;
      console.log(`[seo-content] Queued page done: ${qp.slug}`);
    } catch (err) {
      failed++;
      console.error(`[seo-content] Failed queued page: ${qp.slug}`, err);
    }

    await sleep(2000);
  }

  const totalPublishedNow = await prisma.seoPage.count({ where: { status: 'published' } });
  console.log(`[seo-content] Complete. Generated: ${generated}, Failed: ${failed}, Skipped: ${skipped}, Total published in DB: ${totalPublishedNow}/70`);

  // Trigger Vercel deploy hook if any pages were generated
  if (generated > 0 && process.env.VERCEL_DEPLOY_HOOK_URL) {
    try {
      const resp = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
      if (resp.ok) {
        console.log('[seo-content] Triggered Vercel deploy hook');
      } else {
        console.error(`[seo-content] Deploy hook returned ${resp.status}`);
      }
    } catch (err) {
      console.error('[seo-content] Failed to trigger deploy hook', err);
    }
  }
}
