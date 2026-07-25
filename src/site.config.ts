import siteData from './data/site.json';

/**
 * Site + media config.
 * Production images: mediaBaseUrl → R2 public URL (wrangler.toml R2_PUBLIC_BASE_URL)
 */
export const site = {
  name: '호스팅가이드',
  title: siteData.title,
  description:
    '워드프레스 호스팅 비용과 웹호스팅 선택을 비교합니다. 무료 웹호스팅만 찾기보다, 월 수천 원대 공유호스팅으로 블로그를 시작하는 방법을 정리합니다.',
  baseUrl: siteData.site_url || 'https://vultr.seoul.kr',
  copyrightName: siteData.copyright_name || '호스팅가이드',
  chemicloudUrl:
    siteData.chemicloud_url ||
    'https://chemicloud.com/wordpress-hosting#a_aid=6818d638aa861&chan=code3',
  cloudwaysUrl: siteData.cloudways_url || 'https://www.cloudways.com/en/?id=1234986',
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
