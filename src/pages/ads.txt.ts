import type { APIRoute } from 'astro';
import adsTxt from '../data/adsense/ads-txt.json';

export const GET: APIRoute = () => {
  const body = (adsTxt.content || '').trim() + '\n';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
