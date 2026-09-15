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

기본 startup backfill 동작:

- 추첨 결과 backfill은 DB 최신 회차 이후의 신규 회차만 가져옵니다.
- 당첨점 backfill은 최근 범위를 확인하되, 이미 데이터가 있는 회차는 건너뜁니다.
- 당첨점을 강제로 다시 수집하려면 `bun services/trailbase/traildepot/import-top-store.ts latest-range 10 --refresh` 같은 방식으로 실행합니다.

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
- 로또 크론 작업 등록: UTC 기준 cron 표현식 사용
  - `"Lotto Weekly Updater"`: `0 40 11 * * 7` (토 20:40 KST)
  - `"Lotto Weekly Catch-up 1/2/3"`: 토 21:10 / 22:00 / 23:00 KST
  - `"Lotto Daily Reconcile"`: 매일 09:05 KST
  - `"Lotto Store Weekly Updater"`: `0 0 12 * * 7` (토 21:00 KST)
  - `"Lotto Store Catch-up 1/2/3"`: 토 21:20 / 22:10 / 23:10 KST
  - `"Lotto Store Daily Reconcile"`: 매일 09:15 KST

## 주의사항

- `traildepot/data/*.db` 파일은 런타임 데이터입니다.
- 수동 편집보다 마이그레이션/스크립트 방식 변경을 우선합니다.

## 번호 생성 기록의 주간 보관과 정리

- Rust `miniapp-guest`의 `lotto_generation_weekly_archive` 잡은 매분 0초에 실행됩니다. 기존 `lotto::target_round`의 토요일 20:00 KST 마감을 기준으로 닫힌 회차만 처리하므로, 서버가 마감 때 중단되어도 다음 실행에서 이어갑니다. 웹/미니앱 참여 기능의 활성화 여부와 무관하게 동작합니다.
- `lotto_generation_weekly_archives`에는 회차별 총 생성 수, 1~45번 누적 횟수(JSON 배열), 마감·집계·상세 삭제 완료 시각을 **회차당 한 행**으로 남깁니다. 마감 시 공개 집계를 보관하며, 마감 전 이용자가 공개에서 삭제한 내역은 제외됩니다. 개인 식별자·별칭·개별 조합은 보관하지 않습니다.
- 한 트랜잭션에서 집계를 보관하고 해당 회차의 실시간 카운터를 제거한 뒤, 다음 회차의 카운터를 준비합니다. 상세 행은 매번 최대 1,000개씩 삭제합니다. 완료되지 않은 삭제는 다음 분에 이어가며, 이미 보관한 집계를 덮어쓰거나 삭제 트리거로 실시간 카운터를 다시 생성하지 않습니다. 집계가 불일치하면 상세 삭제 전에 실패합니다.
- 개인 요청 기록은 생성 후 24시간이 지나고 공개 내역 삭제가 끝난 경우에만 건별 최대 1,000개씩 정리합니다. 출석과 24시간 생성 제한에 필요한 당일 기록을 보존하며, 기기 보관함·QR 스캔·출석 원장·프로모션 지급/예산 원장·결과 알림은 건드리지 않습니다.
- `GET /api/app/v1/lotto/feed?round=회차`는 보관된 회차에도 기존 `totalGenerations`와 `numberCounts`를 반환합니다. 이때 `archived: true`, `generations: []`, `nextCursor: null`이며, 상세 삭제 진행 중에도 같은 집계를 조회할 수 있습니다. 원본 보관 테이블은 Record API로 노출하지 않습니다.
- 삭제된 SQLite 페이지는 이후 쓰기에 재사용됩니다. DB 파일의 바이트 크기가 즉시 줄어드는 방식은 아니며, 서비스 쓰기를 오래 막는 전체 `VACUUM`을 이 잡에서 실행하지 않습니다.

`U1789452000__weekly_generation_archive.sql`은 기존 데이터를 보존하는 추가 마이그레이션입니다. 서버 이미지를 배포하면 마이그레이션과 Rust 잡이 함께 반영됩니다. Sampo는 기존 설정대로 미니앱만 버전 관리하므로, `weekly-generation-archive.md` 변경 기록으로 보관기간 안내를 앱 릴리즈에 포함합니다. 서버 배포는 기존 TrailBase 배포 경로를 사용하며 앱 제출만으로 서버가 갱신되지는 않습니다.
