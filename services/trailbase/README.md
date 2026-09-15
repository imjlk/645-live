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
- `lotto_generation_weekly_archives`에는 회차별 총 생성 수, 1~45번 누적 횟수(JSON 배열), 마감·집계·상세 삭제 완료 시각을 **회차당 한 행**으로 남깁니다. 마감 시 공개 집계를 보관하며, 마감 전 이용자가 공개에서 삭제한 내역은 제외됩니다. 이 주간 행에는 개인 식별자·별칭·개별 조합을 보관하지 않습니다.
- 한 트랜잭션에서 집계를 보관하고 해당 회차의 실시간 카운터를 제거한 뒤, 다음 회차의 카운터를 준비합니다. 상세 행은 매번 최대 1,000개씩 삭제합니다. 완료되지 않은 삭제는 다음 분에 이어가며, 이미 보관한 집계를 덮어쓰거나 삭제 트리거로 실시간 카운터를 다시 생성하지 않습니다. 집계가 불일치하면 상세 삭제 전에 실패합니다.
- 개인 요청 기록은 생성 후 24시간이 지나고 공개 내역 삭제가 끝난 경우에만 건별 최대 1,000개씩 정리합니다. 출석과 24시간 생성 제한에 필요한 당일 기록을 보존하며, 기기 보관함·QR 스캔·출석 원장·프로모션 지급/예산 원장·결과 알림은 건드리지 않습니다.
- `GET /api/app/v1/lotto/feed?round=회차`는 보관된 회차에도 기존 `totalGenerations`와 `numberCounts`를 반환합니다. 이때 `archived: true`, `generations: []`, `nextCursor: null`이며, 상세 삭제 진행 중에도 같은 집계를 조회할 수 있습니다. 원본 보관 테이블은 Record API로 노출하지 않습니다.
- 삭제된 SQLite 페이지는 이후 쓰기에 재사용됩니다. DB 파일의 바이트 크기가 즉시 줄어드는 방식은 아니며, 서비스 쓰기를 오래 막는 전체 `VACUUM`을 이 잡에서 실행하지 않습니다.

`U1789452000__weekly_generation_archive.sql`은 기존 데이터를 보존하는 추가 마이그레이션입니다. 서버 이미지를 배포하면 마이그레이션과 Rust 잡이 함께 반영됩니다. Sampo는 기존 설정대로 미니앱만 버전 관리하므로, `weekly-generation-archive.md` 변경 기록으로 보관기간 안내를 앱 릴리즈에 포함합니다. 서버 배포는 기존 TrailBase 배포 경로를 사용하며 앱 제출만으로 서버가 갱신되지는 않습니다.


## 회차별 생성 결과 통계

- `U1789460000__generation_result_statistics.sql`은 주간 보관 행에 비교 진행 상태와 0~5등 건수 배열을 추가합니다. 배열의 0번은 3개 미만 일치, 1~5번은 해당 등수의 번호 일치 건수입니다. **실제 구매 인증이나 당첨금 지급 통계가 아닙니다.** 같은 조합이 여러 번 생성되면 생성된 건수만큼 셉니다.
- 마감 후 공개 상세 삭제 시 `lotto_generation_result_combinations`에 45비트 번호 조합과 중복 건수만 임시 보관합니다. 이용자·별명·요청 ID·생성 시각은 저장하지 않습니다. 이미 상세 삭제가 시작되거나 완료된 과거 회차는 원본이 온전히 남은 경우에만 복구하며, 복구 불가능한 회차를 0건으로 추정하지 않습니다.
- `lotto_generation_result_statistics` 잡은 매분 20초에 실제 추첨 결과가 있는 회차를 최대 2,000개 고유 조합씩 비교합니다. 전체 생성 건수와 비교 건수가 일치해야 결과를 공개합니다. 중간 실패는 트랜잭션으로 되돌리며, 커서로 이어 처리합니다. 주간 마감·실시간 카운터 초기화는 추첨 결과를 기다리지 않습니다.
- 비교 완료 후 7일이 지나거나, 미완료 상태로 마감 후 14일이 지나면 주간 정리 잡이 임시 조합을 최대 1,000개씩 삭제합니다. 완료된 등수별 집계는 주간 행에 남습니다. 보관기간 내 추첨 번호 정정은 자동 재비교하고, 임시 조합 삭제 후 정정되어 다시 검증할 수 없는 경우 `unavailable`로 표시합니다.
- 공개 조회: `GET /api/app/v1/lotto/generation-results` → `{ rounds, nextBeforeRound, currentRound, serverTime }`. 처음에는 진행 중인 회차와 최신 26개 보관 회차, `?before=회차`는 이전 26개, `?round=회차`는 특정 회차를 반환합니다. 두 쿼리는 함께 사용하지 않습니다.
- 각 행은 `round`, `totalGenerations`, `status`, `rankCounts`, `comparedGenerations`, `closesAt`, `draw`, `updatedAt`을 반환합니다. `status`는 `open`, `waiting`, `processing`, `ready`, `unavailable`이며 **`ready` 이외에는 `rankCounts: null`**입니다. 원본 두 테이블은 Record API로 노출하지 않습니다.
- 웹 `/generator/results`는 빌드 시 통계를 정적으로 포함하고 진입·포그라운드 복귀·60초마다 갱신합니다. 미니앱 실시간 화면에서 `/results` 상세 화면으로 이동하며, 보이는 동안 60초마다 갱신합니다. 조회 회차는 갱신·목록 추가 시 유지합니다.
- 배포 순서는 TrailBase 이미지(마이그레이션·두 잡·공개 API), 웹, Sampo 미니앱 릴리즈입니다. API가 아직 없는 경우 웹 빌드는 계속되며 화면에서 재시도할 수 있습니다. 기존 데이터베이스를 초기화하지 않습니다.
