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

글을 쓰거나 ads.txt·애드센스 설정을 저장하면 **GitHub `main`에 커밋**되고, GitHub Actions가 Cloudflare Pages로 **자동 배포**합니다.

### 최초 1회: GitHub Secrets 등록

저장소 `lab486486/vultr` → Settings → Secrets and variables → Actions

| Name | Value |
|------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | `66b716eb6832b9626c866772cf2f3e11` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare 대시보드에서 발급 (아래) |

API 토큰: [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → **Edit Cloudflare Workers** 템플릿 사용 (Pages 배포 포함)

OAuth (CMS 로그인):

1. [GitHub OAuth App](https://github.com/settings/developers)
   - Homepage: `https://vultr.seoul.kr`
   - Callback: `https://vultr.seoul.kr/api/oauth/callback`
2. Pages project `vultr-seoul` secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## 구조

| 경로 | 역할 |
|------|------|
| `public/admin/` | Decap CMS + R2 미디어 라이브러리 |
| `functions/api/oauth/` | GitHub OAuth |
| `functions/api/upload/` | R2 이미지 PUT |
| `src/content/blog/` | 가이드 글 (CMS 편집) |
| `src/data/` | 사이트/애드센스 JSON (CMS 편집) |
