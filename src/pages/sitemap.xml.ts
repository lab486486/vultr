import type { APIRoute } from 'astro';
import { getPublishedPosts, postSlug } from '../lib/posts';
import { site } from '../site.config';

const staticPaths = ['/', '/about/', '/compare/', '/guides/', '/start/'];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const base = site.baseUrl.replace(/\/$/, '');

  const urls: { loc: string; lastmod?: string }[] = staticPaths.map((path) => ({
    loc: `${base}${path}`,
  }));

  for (const post of posts) {
    urls.push({
      loc: `${base}/guides/${postSlug(post)}/`,
      lastmod: post.data.date.toISOString().slice(0, 10),
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => {
    const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
