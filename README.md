# 645.live Monorepo

한국 로또 645 통계/분석 서비스의 모노레포입니다.

## 문서 우선순위

문서가 충돌하면 아래 순서로 신뢰합니다.

1. 이 파일 (`/README.md`)
2. 작업 가이드 (`/AGENTS.md`)
3. 패키지별 README (`/pages/www/README.md`, `/workers/og-645-live/README.md`, `/services/trailbase/README.md`)
4. 레거시 문서 (`/_docs/**`, `/TODO`)

## 워크스페이스 구조

- `pages/www`: SvelteKit 웹 앱 (Cloudflare Pages 배포 대상)
- `workers/og-645-live`: OG 이미지 생성 Worker
- `packages/og-image-core`: OG 이미지 공용 렌더링 로직
- `packages/trailbase-adapter`: TrailBase 어댑터 패키지
- `services/trailbase`: TrailBase depot/wasm/runtime 파일

## 빠른 시작

사전 요구사항:

- Bun
- Docker
- Node.js (일부 서브패키지 스크립트에서 사용)

실행 순서:

```bash
bun install
cp pages/www/.env.example pages/www/.env
cp workers/og-645-live/.env.example workers/og-645-live/.env

# PostgreSQL
bun run www db:start

# TrailBase 서버
bun run trail

# 웹 앱
bun run www dev

# (선택) OG Worker 단독 실행
bun run og dev
```

## 자주 쓰는 명령어

루트:

- `bun run format`: Biome 포맷/체크
- `bun run lint`: Biome 린트

웹 앱 (`pages/www`):

- `bun run www dev`
- `bun run www build`
- `bun run www check`
- `bun run www deploy`
- `bun run www db:push`

OG Worker (`workers/og-645-live`):

- `bun run og dev`
- `bun run og deploy`

TrailBase WASM guest (`services/trailbase/wasm-guest`):

- `npm --prefix services/trailbase/wasm-guest run dev`
- `npm --prefix services/trailbase/wasm-guest run build`

## Codex 작업 루프

1. `git status --short`로 현재 변경사항 확인
2. 변경 대상 워크스페이스 하나를 먼저 고정
3. 해당 워크스페이스 검증 명령만 우선 실행
4. 필요 시 루트 린트/포맷 실행
5. 결과를 파일 경로 기준으로 요약

## 레거시 문서 안내

`/_docs/README.md`를 먼저 읽고 레거시 문서의 목적을 확인하세요.  
`/_docs/articles/*`와 `/TODO`는 운영 히스토리/아이디어 성격이며, 현재 구현의 단일 기준 문서가 아닙니다.
