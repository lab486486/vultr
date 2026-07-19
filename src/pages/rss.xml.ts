import type { APIRoute } from 'astro';
import { getPublishedPosts, postSlug } from '../lib/posts';
import { site } from '../site.config';

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
  const buildDate = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const link = `${base}/guides/${postSlug(post)}/`;
      const pubDate = post.data.date.toUTCString();
      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.data.description)}</description>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(base)}/</link>
    <description>${escapeXml(site.description)}</description>
    <language>ko</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
