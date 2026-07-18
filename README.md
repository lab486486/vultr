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

1. GitHub 저장소 `lab486486/vultr`에 push
2. [GitHub OAuth App](https://github.com/settings/developers) 생성
   - Homepage URL: `https://vultr.seoul.kr`
   - Authorization callback URL: `https://vultr.seoul.kr/api/oauth/callback`
3. Cloudflare Pages secrets
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
4. `/admin`에서 Login with GitHub

> Client Secret이 채팅·이슈에 노출됐다면 즉시 revoke 후 재발급하세요.

## Cloudflare Pages + R2

1. R2 버킷 생성: `vultr-media` (이름 바꾸면 `wrangler.toml`도 같이)
2. Public access → `r2.dev` URL 발급
3. 아래 세 곳에 **같은** public URL 넣기
   - `wrangler.toml` → `R2_PUBLIC_BASE_URL`
   - `public/admin/config.yml` → `media_library.config.public_base_url`
   - `src/site.config.ts` → `mediaBaseUrl`
4. Pages 프로젝트 연결
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node.js: `22` (engines) 또는 `20`
   - 커스텀 도메인: `vultr.seoul.kr`
5. Bindings → R2: `MEDIA_BUCKET` → `vultr-media`
6. `functions/` 는 Pages가 자동 인식 (OAuth + upload)

정적 이미지 시드:

```bash
BUCKET=vultr-media ./scripts/upload-r2.sh
```

## 구조

| 경로 | 역할 |
|------|------|
| `public/admin/` | Decap CMS + R2 미디어 라이브러리 |
| `functions/api/oauth/` | GitHub OAuth |
| `functions/api/upload/` | R2 이미지 PUT |
| `src/content/blog/` | 가이드 글 (CMS 편집) |
| `src/data/` | 사이트/애드센스 JSON (CMS 편집) |
