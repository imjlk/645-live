# indexnow-645-live

`645.live`의 공개 콘텐츠 변경을 모아 GitHub Actions relay에 전달하는 Cloudflare
Worker입니다. IndexNow POST는 Cloudflare 공유 egress의 429를 피하기 위해 relay가
수행합니다.

- 15분 Cron이 `/api/indexnow-manifest.json`을 조회합니다.
- 단일 Durable Object가 마지막 성공 버전과 재시도 상태를 보관합니다.
- 최초 manifest는 기존 콘텐츠 baseline으로 저장하고 제출하지 않습니다.
- 보호된 `/relay/claim`과 `/relay/settle`이 한 번에 하나의 batch lease를 관리합니다.
- 뉴스 생성/수정/삭제, 최신 추첨 및 당첨점, 통계 갱신을 감지합니다.
- 스캔 데이터는 모든 쓰기 대신 의미 있는 카운트 milestone에서만 제출합니다.
- 200/202는 성공, 400/403/422는 새 버전이 생길 때까지 차단,
  429/5xx/네트워크 오류는 alarm으로 재시도하며 429는 최소 10분을 기다립니다.

## Commands

```bash
bun run indexnow cf-typegen
bun run indexnow check
bun run indexnow test
bun run indexnow deploy:dry-run
bun run indexnow deploy
```

배포 시 `INDEXNOW_KEY`와 `INDEXNOW_RUN_TOKEN`은 Wrangler secret으로 설정해야
합니다. 공개 상태는 Worker의 `/health`, 보호된 즉시 실행은 `POST /run`으로
확인할 수 있습니다.
