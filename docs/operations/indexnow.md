# IndexNow 운영

## 구성

- 소유권 키 파일: `https://645.live/{INDEXNOW_KEY}.txt`
- 공개 변경 manifest: `https://645.live/api/indexnow-manifest.json`
- 배치 Worker: `indexnow-645-live`
- 주기: 15분
- 제출 endpoint: `https://api.indexnow.org/indexnow`

IndexNow global endpoint의 성공 응답은 200 또는 202입니다. 한 endpoint로 보낸
요청은 참여 검색 엔진에 공유되므로 Bing/Naver별 중복 IndexNow 요청은 만들지
않습니다. Sitemap은 전체 URL inventory 역할을 계속 담당하고, IndexNow에는
실제 변경된 canonical page URL만 보냅니다.

## 변경 감지 정책

- 뉴스: 글별 metadata 버전과 뉴스 목록 버전을 비교합니다. 사라진 글 URL도
  한 번 제출해 404/410/redirect 상태를 다시 확인하도록 합니다.
- 추첨: 최신 회차 및 당첨점 데이터가 바뀌면 홈, 이력, 당첨점 페이지를
  제출합니다.
- 통계: 통계 테이블별 `updated_at`이 바뀔 때 해당 통계와 번호 상세 페이지를
  제출합니다.
- 스캔: 현재 회차와 번호별 스캔 수를 milestone으로 변환합니다. 0~20은 매
  변화, 21~100은 5 단위, 101~1,000은 10 단위, 이후는 100 단위로 묶습니다.

## 배포 및 점검

```bash
mise exec -- bun run indexnow cf-typegen
mise exec -- bun run indexnow check
mise exec -- bun run indexnow test
mise exec -- bun run indexnow deploy:dry-run
mise exec -- bun run indexnow deploy
```

배포 전 `INDEXNOW_KEY`, `INDEXNOW_RUN_TOKEN` secret을 Worker에 등록합니다. 키나
URL 목록은 로그에 기록하지 않습니다. `/health`에는 성공 시각, 대기 URL 수,
마지막 오류 코드만 공개됩니다.

영구 실패(400/403/422)는 같은 버전의 반복 제출을 차단합니다. 5xx와 네트워크
오류는 5분/15분/1시간/6시간 간격에 jitter를 더해 재시도합니다. 429는 최소
10분을 기다리며, `Retry-After`가 더 늦으면 그 값을 우선합니다.
재시도 중 manifest에 새 변경이 들어와도 host 전체 retry deadline과 attempt
count를 유지해 Cron이 backoff를 우회하는 중복 요청을 만들지 않습니다.
