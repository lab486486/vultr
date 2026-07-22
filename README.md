# V-press (vultr.seoul.kr)

워드프레스·호스팅 가이드. Astro 정적 사이트 + **Cloudflare Pages + R2 + Decap CMS**  
(`blogincome` / `plusetf`와 같은 패턴)

Vultr 공식/파트너 사이트가 아닙니다. 초보 단계 추천은 저비용 공유호스팅입니다.

## 로컬 실행

```bash
npm install
cp .env.example .env
npm run dev
```

```bash
npm run build   # → dist/
npm run preview
```

## Decap CMS

관리자: `https://vultr.seoul.kr/admin/`

글을 쓰거나 ads.txt·애드센스 설정을 저장하면 **GitHub `main`에 커밋**되고, Cloudflare Pages가 **자동으로 빌드·배포**합니다. 별도 수동 배포는 필요 없습니다.

1. [GitHub OAuth App](https://github.com/settings/developers)
   - Homepage URL: `https://vultr.seoul.kr`
   - Authorization callback URL: `https://vultr.seoul.kr/api/oauth/callback`
2. Cloudflare Pages project `vultr` secrets
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
3. `/admin`에서 Login with GitHub

## Cloudflare Pages + R2

- Pages project: `vultr` (GitHub `lab486486/vultr` 연결, push 시 자동 배포)
- R2 bucket: `vultr-media` / binding `MEDIA_BUCKET`
- Public URL (세 곳 동일):
  - `wrangler.toml` → `R2_PUBLIC_BASE_URL`
  - `public/admin/config.yml` → `media_library.config.public_base_url`
  - `src/site.config.ts` → `mediaBaseUrl`

## 구조

| 경로 | 역할 |
|------|------|
| `public/admin/` | Decap CMS + R2 미디어 라이브러리 |
| `functions/api/oauth/` | GitHub OAuth |
| `functions/api/upload/` | R2 이미지 PUT |
| `src/content/blog/` | 가이드 글 (CMS 편집) |
| `src/data/` | 사이트/애드센스 JSON (CMS 편집) |
