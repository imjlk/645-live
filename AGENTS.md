# AGENTS.md

이 파일은 이 저장소에서 작업하는 에이전트(Codex 포함)를 위한 프로젝트 로컬 가이드입니다.

## 1) 기본 원칙

- 패키지 매니저는 `bun`을 기본으로 사용합니다.
- 프론트엔드(`pages/www`)는 Svelte 5 runes 문법을 사용합니다.
- 포맷/린트는 Biome만 사용합니다.
- 문서/코드가 충돌하면 코드와 `package.json` 스크립트를 우선 신뢰합니다.

## 2) 작업 전 확인

```bash
git status --short
```

이미 변경된 파일이 있으면, 현재 작업 범위와 충돌 여부를 먼저 확인한 뒤 진행합니다.

## 3) 워크스페이스별 실행 규칙

### 웹 앱 (`pages/www`)

- 개발: `bun run www dev`
- 타입체크: `bun run www check`
- 배포 빌드: `bun run www build`
- DB 관련: `bun run www db:*`

환경 변수는 `pages/www/.env.example`을 기준으로 시작합니다.

### OG Worker (`workers/og-645-live`)

- 개발: `bun run og dev`
- 배포: `bun run og deploy`

공용 렌더링 로직은 `packages/og-image-core`를 함께 확인합니다.

### TrailBase (`services/trailbase`)

- 서버 실행: 루트에서 `bun run trail`
- WASM guest 개발: `npm --prefix services/trailbase/wasm-guest run dev`
- WASM 빌드/배포: `npm --prefix services/trailbase/wasm-guest run build`

`services/trailbase/traildepot/data/*.db`는 런타임 데이터 파일이므로 수동 편집을 피합니다.

## 4) 변경 후 검증 체크리스트

변경 범위에 맞춰 최소한 아래를 수행합니다.

- 프론트 변경: `bun run www check`
- 워커 변경: `bun run og dev`로 부팅 확인
- 패키지 변경: 해당 패키지의 `build/test/check` 스크립트 실행
- 필요 시 전체 린트: `bun run lint`

## 5) 레거시 문서 취급

- `/_docs/articles/*`: 마케팅/콘텐츠 기획 아카이브
- `/TODO`: 백로그 메모
- `services/trailbase/traildepot/PROMPT.md`: 운영 프롬프트 초안

위 문서들은 참고 자료이며, 구현 기준 문서는 아닙니다.
