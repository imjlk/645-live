# Quality Stabilization Runbook

품질 안정화 작업은 작은 검증 단위로 나눠서 진행합니다.

## Required Checks

로컬 변경 후 기본 검증:

```bash
bun run lint
bun run www check
bun run www build
```

패키지 변경이 포함된 경우:

```bash
bun run sdk check
bun run sdk build
bun --cwd packages/trailbase-adapter -- type-check
bun --cwd packages/trailbase-adapter -- test --run
```

## CI Coverage

PR과 `main` push에서는 `.github/workflows/ci.yml`이 아래 순서로 검증합니다.

- `bun run lint`
- `bun run www check`
- `bun run www build`
- SDK check/build
- TrailBase adapter type-check/test

## Service Worker Build Warning

`bun run www build`에서 보이는 `inlineDynamicImports option is deprecated` 경고는 현재 설치된 `@sveltejs/kit`의 service worker 빌드 경로가 직접 `inlineDynamicImports: true`를 넘기기 때문에 발생합니다.

대응 방향:

- 서비스 워커 기능은 유지합니다.
- 앱 코드에서 우회 설정을 추가하지 않습니다. SvelteKit이 service worker를 별도 `vite.build({ configFile: false })`로 빌드하기 때문입니다.
- 다음 SvelteKit 업그레이드 때 `node_modules/@sveltejs/kit/src/exports/vite/build/build_service_worker.js`의 해당 설정이 `codeSplitting: false`로 바뀌었는지 확인합니다.
- 업그레이드로 해결되지 않으면 Bun `patchedDependencies`로 SvelteKit 패치를 고정합니다.

## Manual QA Focus

QR 스캔 리팩터링 후에는 아래 시나리오를 우선 확인합니다.

- 카메라 권한 거부
- 카메라 목록이 비어 있는 환경
- 중복 QR 스캔 방지
- 미발표 회차 스캔 저장
- 로컬 히스토리 7일 TTL
- iOS Safari, Android Chrome, 네이버/카카오 인앱 브라우저
