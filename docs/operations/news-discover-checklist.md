# News Discover Checklist

신규 로또 뉴스가 발행된 직후 아래 순서로 점검합니다.

## 1. 발행 직후 기본 확인

- GitHub Actions `Generate Lotto News Content` 실행이 성공했는지 확인
- 변경 기사 URL이 `main`에 푸시됐는지 확인
- prewarm 로그에서 아래를 확인
  - target URL 개수
  - success / failed 개수
  - 실패 URL 목록

## 2. 공개 URL 점검

- `/news`
- 최신 기사 1건
- `/feed.xml`
- `/sitemap.xml`
- 최신 기사 OG URL `/og/news/:slug?v=...`

확인할 것:

- 최신 기사와 `/news`가 200 응답
- 기사 HTML에 canonical, `og:image`, `article:published_time`, `NewsArticle` JSON-LD 존재
- `og:image`가 canonical `/og/news/:slug?v=...` 형태인지 확인
- OG 이미지 응답 `content-type`이 `image/png`인지 확인
- sitemap에 최신 기사 `lastmod`와 `image:image` 노드가 있는지 확인
- feed에 최신 기사 항목이 있는지 확인

## 3. Search Console 점검

- URL Inspection 대상
  - `/news`
  - 최신 기사 1건
- 검사 시 확인
  - 페이지가 canonical 기준으로 인식되는지
  - 크롤 가능 상태인지
  - 대표 이미지가 정상적으로 읽히는지

## 4. 대표 이미지 확인 방법

- 브라우저 또는 `curl -I`로 기사 `og:image` URL 확인
- 기대값
  - `200`
  - `content-type: image/png`
  - 캐시 헤더 존재

## 5. prewarm 실패 시 수동 재확인

- 실패한 URL을 브라우저형 UA로 다시 `GET` 요청
- 기사 URL과 `/og/news/:slug?v=...`를 먼저 재확인
- 필요하면 `/news`, `/feed.xml`, `/sitemap.xml` 순서로 다시 확인
- 이미지가 503 또는 비정상 content-type이면 OG worker / 프록시 경로부터 점검
