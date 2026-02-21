# TrailBase Service (`services/trailbase`)

645.live에서 사용하는 TrailBase 실행 자산(depot, scripts, wasm guest)입니다.

## 구성

- `traildepot/`: TrailBase 런타임 디렉터리
- `traildepot/migrations/`: DB 마이그레이션 SQL
- `traildepot/scripts/index.ts`: 커스텀 API 라우트 + 크론 등록
- `traildepot/wasm/component.wasm`: 배포된 WASM 컴포넌트
- `wasm-guest/`: WASM 소스/빌드 프로젝트

## 실행

루트에서 TrailBase 컨테이너 실행:

```bash
bun run trail
```

이 명령은 `services/trailbase/traildepot`을 컨테이너에 마운트해서 실행합니다.

## WASM guest 개발

```bash
# 개발(핫리로드)
npm --prefix services/trailbase/wasm-guest run dev

# 빌드 + traildepot/wasm/component.wasm 반영
npm --prefix services/trailbase/wasm-guest run build
```

## 주요 서버 로직 위치

- 스캔 데이터 처리 라우트: `services/trailbase/traildepot/scripts/index.ts`
- 접속자 heartbeat/disconnect 라우트: `services/trailbase/traildepot/scripts/index.ts`
- 로또 크론 작업 등록:
  - `"Lotto Weekly Updater"`: `0 40 11 * * 7`
  - `"Lotto Store Weekly Updater"`: `0 0 12 * * 7`

## 주의사항

- `traildepot/data/*.db` 파일은 런타임 데이터입니다.
- 수동 편집보다 마이그레이션/스크립트 방식 변경을 우선합니다.
