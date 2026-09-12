# OG Image Worker

`645.live/og`와 `645.live/og/news/:slug`에서 쓰는 1200×630 공유 이미지를 생성합니다. Pages는 `OG_645_LIVE` 서비스 바인딩으로 이 워커를 호출하며, 실제 이미지 구성은 `packages/og-image-core`에 있습니다.

## 디자인

- 사이트의 라이트·다크 바탕색, 글자색, 파란 브랜드 색상을 사용합니다.
- 모든 이미지에 645.live 브랜드와 제목, 짧은 설명을 표시합니다.
- 로또 1–10 / 11–20 / 21–30 / 31–40 / 41–45 구간을 사이트와 같은 색의 원형 볼로 표현합니다. 일반 이미지에는 구간 범위를 표시하므로 당첨번호와 혼동하지 않습니다.
- 뉴스에는 회차와 날짜를 함께 표시합니다. 명시적인 `numbers` 6개와 선택적인 `bonus`가 있으면 해당 번호를 볼로 표시합니다. 번호가 없으면 구간 범위를 사용하며, 워커가 추첨 결과를 추정하지 않습니다.
- 한글 제목·설명은 최대 두 줄로 배치하고, 긴 단어와 부가 정보는 이미지 밖으로 넘치지 않도록 줄이거나 말줄임합니다.
- Pretendard Regular/Bold 폰트를 번들에 포함합니다. 폰트 출처와 라이선스는 `src/assets/README.md`를 참고하세요. 렌더링 중 폰트·이모지를 외부 서버에서 받지 않습니다.

## 요청

일반: `GET /?title=...&description=...&theme=light`

뉴스: `GET /news/lotto-1240?title=...&date=2026-09-05&numbers=11,13,19,20,31,44&bonus=27`

공통 옵션은 `theme=light|dark`, `format=png|svg`, `width`, `height`입니다. 크기는 800–2400 × 418–1260 범위로 제한하고, 표준 캔버스 비율을 유지해 가운데 배치합니다. 기존 `layout` 이름은 호환을 위해 허용하며 같은 브랜드 템플릿을 사용합니다. 원격 배경 이미지·로고와 임의 스타일은 이 템플릿에 반영하지 않습니다.

`POST /generate`는 같은 기본 옵션의 JSON을 받으며 `title`이 필요합니다. 추가로 `badgeText`, `metaText`, `highlightText`, `numbers`, `bonusNumber`를 지원합니다. 본문은 16 KiB로 제한하며 잘못된 JSON은 400을 반환합니다.

쿼리는 `URLSearchParams`로 한 번 인코딩합니다. 과거 웹사이트가 생성한 `rev=2026-03-25-1` 링크의 이중 인코딩도 지원합니다.

## 캐시와 변경 반영

GET PNG는 일반·뉴스 모두 Cache API로 3시간 재사용합니다. SVG와 POST 응답은 저장하지 않습니다. 캐시 키에는 경로와 정렬한 전체 쿼리가 포함되며, 중복 쿼리와 리터럴 `%`도 구별합니다.

디자인 버전은 `config/og.mjs` 한 곳에서 관리하며 웹·워커·사이트맵·뉴스 생성·예열 스크립트가 함께 사용합니다. 새 디자인 배포 시 이 버전과 `CACHE_KEY_PREFIX`를 갱신하세요. Pages 프록시는 디자인 버전 헤더를 전달합니다. 공유 서비스가 이미 저장한 미리보기의 재수집 시점은 해당 서비스에 따라 다릅니다.

## 개발과 검증

렌더러는 `@cf-wasm/satori 0.4.0`(Satori 0.29.0)과 `@cf-wasm/resvg 0.4.0`(resvg WASM 2.6.2)의 명시적인 `/workerd` 진입점을 사용합니다. `@cf-wasm/og 0.5.0`도 내부적으로 구형 `/legacy/workerd`(WASM 2.4.1)를 사용하므로, 최신 PNG 엔진을 사용하기 위해 Satori의 SVG 출력을 resvg로 직접 전달합니다. 폰트는 SVG 경로로 포함하며, PNG 생성 뒤 WASM 객체를 해제합니다.

저장소 루트에서 실행합니다.

```sh
bun run og dev --port 8896
bun run og check
bun run og test
bun --cwd packages/og-image-core check
bun --cwd packages/og-image-core build
bun scripts/og/smoke.mjs http://127.0.0.1:8896 /tmp/645-og-previews
```

스모크 검사는 로컬 워커에서만 실행하며 일반·뉴스·다크·긴 제목·번호 볼의 PNG를 저장합니다. PNG 규격, 일반 이미지 캐시 HIT, SVG, 잘못된 JSON, 요청 본문 제한, POST 크기 제한도 확인합니다.

호환 날짜 `2026-09-12`를 검증하려면 이를 지원하는 Wrangler/workerd를 사용하세요. 오래된 Wrangler는 더 이전 런타임으로 폴백할 수 있습니다.

이 워크스페이스는 Wrangler 4.131.1을 별도로 고정합니다. 공용 catalog는 기존 Pages 빌드에 검증된 4.74.0을 유지합니다. 4.131.1이 Pages 어댑터에도 공유되면 병렬 prerender의 로컬 저장소에서 SQLite 잠금 오류가 재현되므로, 두 도구 버전을 함께 올릴 때는 웹 빌드까지 확인해야 합니다.

```sh
bun run og cf-typegen
bun run og deploy
```

Pages의 메인 푸시는 웹을 자동 배포합니다. OG 워커는 별도로 배포해야 하며, 워커를 먼저 배포한 뒤 새 OG 버전이 포함된 Pages를 배포하면 새 링크가 준비되지 않은 렌더러를 참조하지 않습니다.
