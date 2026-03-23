# 645.live Web App (`pages/www`)

SvelteKit 기반 메인 웹 애플리케이션입니다.

## 스택

- SvelteKit + Svelte 5 (runes)
- TailwindCSS + DaisyUI
- Drizzle ORM
- Cloudflare Pages 배포 (`@sveltejs/adapter-cloudflare`)

## 로컬 실행

루트에서:

```bash
bun install
cp pages/www/.env.example pages/www/.env

# Postgres 18 (localhost:50101)
bun run www db:start

# TrailBase 백엔드
bun run trail

# 웹 앱 개발 서버
bun run www dev
```

## 자주 쓰는 스크립트

루트에서 실행:

- `bun run www dev`: 개발 서버
- `bun run www build`: 프로덕션 빌드
- `bun run www preview`: 빌드 후 Wrangler Pages 로컬 프리뷰
- `bun run www deploy`: Cloudflare Pages 배포
- `bun run www check`: Svelte 타입체크
- `bun run www tail`: Cloudflare Pages 로그 tail

DB 관련:

- `bun run www db:start`
- `bun run www db:push`
- `bun run www db:generate`
- `bun run www db:migrate`
- `bun run www db:studio`

## 환경 변수

기본 샘플은 `pages/www/.env.example`:

- `DATABASE_URL`: 로컬 Drizzle 연결 문자열
- 기본 로컬 DB는 `postgres://root:mysecretpassword@localhost:50101/local`
- `HYPERDRIVE_PROXY`: 원격/프록시 DB 연결 문자열
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- `TRAILBASE_URL`: 서버 측 TrailBase URL
- `PUBLIC_TRAILBASE_URL`: 클라이언트 측 TrailBase URL
- `TRAILBASE_BASIC_AUTH` (선택)

## 디렉터리 포인트

- `src/routes`: 페이지/엔드포인트
- `src/lib/trailbase`: TrailBase 연동
- `src/lib/db`: DB 스키마/클라이언트
- `src/content/news`: MDX 뉴스 콘텐츠

## 문법/품질 규칙

- Svelte 5 runes 문법 사용 (`$state`, `$derived`, `$effect`, `$props`)
- 포맷/린트는 Biome 기준 (루트에서 `bun run format`, `bun run lint`)

## 관련 문서

- `pages/www/TRAILBASE_ARCHITECTURE.md`: TrailBase 클라이언트 구조 설명
- 루트 `README.md`: 모노레포 실행 순서
- 루트 `AGENTS.md`: Codex 작업 가이드
