# News and Draw Backfill Runbook

뉴스/회차 데이터 백필은 운영 데이터가 공개 URL에 반영되는지까지 확인합니다.

## News Backfill

특정 회차 뉴스만 생성:

```bash
ROUND=1220 FORCE=false USE_AI=true node scripts/news/generate-news-content.mjs
```

최근 N개 회차 누락분 확인:

```bash
LOOKBACK_ROUNDS=10 FORCE=false USE_AI=true node scripts/news/generate-news-content.mjs
```

AI 없이 fallback 템플릿으로 생성:

```bash
LOOKBACK_ROUNDS=10 FORCE=false USE_AI=false node scripts/news/generate-news-content.mjs
```

생성 후 확인:

- `pages/www/src/content/news/*.mdx` 변경 범위 확인
- `bun run www build`
- `CHANGED_NEWS_FILES`를 지정해 prewarm dry run 범위를 좁혀 실행

## Prewarm and Search Submission

변경된 뉴스 파일만 prewarm:

```bash
CHANGED_NEWS_FILES=pages/www/src/content/news/lotto-1220.mdx \
SITE_BASE_URL=https://645.live \
node scripts/seo/prewarm-news-assets.mjs
```

검색엔진 제출은 운영 키가 있을 때만 실행합니다.

```bash
CHANGED_NEWS_FILES=pages/www/src/content/news/lotto-1220.mdx \
SITE_BASE_URL=https://645.live \
INDEXNOW_HOST=645.live \
node scripts/seo/submit-indexnow.mjs
```

## Acceptance Checks

- `/news`, 최신 기사, `/feed.xml`, `/sitemap.xml`이 200 응답
- 기사 HTML에 canonical, `og:image`, `NewsArticle` JSON-LD 존재
- OG 이미지가 `image/png`로 응답
- sitemap과 feed에 최신 기사 항목 반영
- prewarm 실패 URL이 있으면 `docs/operations/news-discover-checklist.md` 순서로 재확인
