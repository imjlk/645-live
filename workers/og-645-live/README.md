# OG Image Worker (`workers/og-645-live`)

Cloudflare Worker 기반 OG 이미지 생성 서비스입니다.

## 역할

- 일반 OG 이미지 생성 (`GET /*`)
- 뉴스 전용 OG 이미지 생성 (`GET /news/*`)
- JSON payload 기반 생성 (`POST /generate`)
- 응답 헤더 기반 CDN 캐시 제어

## 로컬 실행

루트에서:

```bash
bun install
cp workers/og-645-live/.env.example workers/og-645-live/.env
bun run og dev
```

또는 워커 디렉터리에서:

```bash
bun run dev
```

## 배포

루트에서:

```bash
bun run og deploy
```

## 엔드포인트

### 1) `GET /*`

쿼리 기반 일반 OG 생성.

주요 쿼리:

- `title`
- `description`
- `theme` (`light` | `dark`)
- `layout` (`default` 등, `@645/og-image-core` 레이아웃)
- `width`, `height`
- `format` (`png` | `svg`)

예시:

```text
GET /?title=Hello&description=World&layout=hero&format=png
```

### 2) `GET /news/*`

뉴스 전용 레이아웃(`layout = news`) OG 생성.

추가 쿼리:

- `round`: 로또 회차(제목 보정에 사용)

예시:

```text
GET /news/lotto-1186?title=당첨%20결과&round=1186
```

### 3) `POST /generate`

JSON body로 생성 옵션 전달.

예시:

```json
{
	"title": "Hello World",
	"description": "OG description",
	"layout": "default",
	"theme": "light",
	"format": "png"
}
```

## 캐시 설정

Worker 내부 `Cache API`는 사용하지 않습니다.

- 최종 캐시 동작은 각 라우트가 설정하는 `Cache-Control` 헤더를 기준으로 Cloudflare CDN과 브라우저가 처리합니다.
- 뉴스 OG 이미지는 현재 `max-age=10800, stale-while-revalidate=604800` 정책을 사용합니다.
- 무효화는 URL의 `rev` 파라미터 변경과 Cloudflare 존 캐시 퍼지로 처리합니다.

## 코드 구조

- `src/index.tsx`: Hono 앱 엔트리
- `src/routes/wildcard.tsx`: 일반 GET 라우트
- `src/routes/news.tsx`: 뉴스 전용 라우트
- `src/routes/generate.tsx`: POST 라우트

공용 렌더러는 `packages/og-image-core`를 사용합니다.

## 연동

`pages/www/wrangler.jsonc`에서 서비스 바인딩 `OG_645_LIVE`로 연결되어 있습니다.
