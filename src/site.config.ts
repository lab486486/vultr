import siteData from './data/site.json';

/**
 * Site + media config.
 * Production images: mediaBaseUrl → R2 public URL (wrangler.toml R2_PUBLIC_BASE_URL)
 */
export const site = {
  name: 'V-press',
  title: siteData.title,
  description:
    '처음부터 비싼 호스팅이 필요하지 않습니다. 워드프레스·공유호스팅·VPS를 비교하고 시작하는 V-press.',
  baseUrl: siteData.site_url || 'https://vultr.seoul.kr',
  copyrightName: siteData.copyright_name || 'V-press',
  chemicloudUrl: siteData.chemicloud_url || '',
  lang: 'ko',
  mediaBaseUrl: 'https://pub-9b066cc3e4094ff8946656c10cbb9f3d.r2.dev',
} as const;

export function media(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const cleaned = path.replace(/^\//, '');
  const base = site.mediaBaseUrl.replace(/\/$/, '');
  if (base) return `${base}/${cleaned}`;
  return `/${cleaned}`;
}

export function mediaOrigin(): string | undefined {
  if (!site.mediaBaseUrl) return undefined;
  try {
    return new URL(site.mediaBaseUrl).origin;
  } catch {
    return undefined;
  }
}
