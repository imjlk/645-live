# Cloudflare Pages 정적 서빙 전환

공개 정보·도구·회원 화면의 초기 HTML을 빌드 시 생성하고, 로그인 상태와 개인 기록은 쿠키 인증 API로 조회하도록 변경했다. 공통 `+layout.server.ts` 세션 조회와 페이지별 로그인·QR 서버 액션을 제거했다. 어두운/밝은 테마와 기존 검색 본문·메타를 유지한다.

## 경로별 동작

| 범위 | 초기 응답 | 브라우저에서 갱신하는 항목 |
| --- | --- | --- |
| 홈 | 당첨번호·설명·메타를 포함한 정적 HTML | 최신 발표 결과, 펼친 스캔 집계 |
| 뉴스 기사, 안내·정책, 번호 생성기 | 정적 HTML | 테마·도구 조작 |
| `/stats`, 번호별 통계, `/n/1`~`/n/45` | 공개 집계가 포함된 정적 HTML | 현재 스캔 집계, 번호 페이지의 회차 전환 |
| 최근 10·20·50·100회 통계 | 정적 HTML | 화면 조작 |
| 그 밖의 유효한 최근 N회 통계 | 기존 서버 로더 | 화면 조작 |
| `/login`, `/my`, `/qr-scan` | 개인정보 없는 정적 화면 | `/auth/**`, 회원 RPC, `/api/qr-scan` |
| `/news?page=…`, `/history?round=…`, `/winning-stores?round=…` | 공개 서버 로더 | 기존 페이지 이동 |
| API·MCP·OG·상태 | 필요한 서버 처리 | 기존 API 계약 유지 |

`ssr=false`로 빈 화면을 내보내지 않는다. SvelteKit의 `prerender=true`/`auto`를 사용해 검색 가능한 본문을 파일로 생성한다. 일반 공개 요청에는 회원 DB/auth를 초기화하지 않는다. 쿠키가 없는 `/auth/get-session`은 DB 초기화 없이 `null`을 반환한다.

홈·문서의 기존 `Accept: text/markdown` 및 `/?mode=agent` 표현은 보존했다. 이 경로만 얇은 Pages Worker가 요청을 분기한다. 일반 HTML은 `ASSETS.fetch`로 가져오고 **SvelteKit Server를 초기화하거나 SSR하지 않는다**. 나머지 정적 경로는 `_routes.json`으로 Functions를 우회한다. 최종 산출물은 정적 HTML 190개와 서버 로드 데이터 133개이며, 라우팅은 include 55개/exclude 28개로 Cloudflare의 100개 규칙 제한 이내다. `auto` 통계의 데이터 파일은 Worker를 경유할 수 있지만 정적 자산을 읽는다.

커스텀 어댑터는 공식 Cloudflare 어댑터의 자산·환경 에뮬레이션·리다이렉트 생성을 이용하고, 공식 SvelteKit `Server.init/respond` API로 표현 분기만 구현한다. `node_modules` 패치는 없다. 정적 자산은 Pages 기본 캐시·ETag를 사용하고, 개인 API는 `private, no-store`다.

## 데이터 갱신

- 빌드 전 공개 TrailBase 추첨/통계 테이블의 최신 데이터를 확인한다. 빈 응답·미완료 집계는 빌드를 실패시켜 이전 배포를 유지한다.
- 빌드 후 생성 데이터의 최신 회차·빈 통계·개인 세션 유출 여부, 본문·메타와 라우팅 제한을 검사한다.
- `Refresh Static Lotto Pages`는 토요일 20:07~일요일 00:52 KST에 15분 간격, 매일 01:17 KST에 공개 데이터 변경을 확인한다. GitHub 예약 실행은 지연될 수 있다.
- 공개 데이터 해시 또는 판매 회차가 바뀐 경우에만 revision 파일을 커밋해 기존 Cloudflare Git 배포를 발생시킨다. 뉴스 생성 작업과 같은 concurrency group으로 푸시 충돌을 줄인다. 수동 실행은 GitHub Actions의 해당 워크플로에서 가능하다.
- 추첨 직후 홈은 재빌드와 별도로 최근 결과 API를 조회한다. API 메모리 캐시는 60초, 응답은 `max-age=30, s-maxage=60, stale-while-revalidate=60`이다. 이전 7일 캐시와 다른 키를 사용한다. 과거 결과 65개를 매번 공식 사이트에 재요청하지 않고 TrailBase 데이터를 이용하며 누락 회차만 제한적으로 보완한다.
- 통계 본문은 마지막 성공한 빌드의 공개 집계다. 현재 회차/집계는 CSR로 갱신한다. 빌드 실패 시 최신 통계 HTML 반영은 다음 성공 배포까지 늦어진다.
- 판매 회차 계산의 `getDay`를 `getUTCDay`로 변경해 한국 브라우저에서 UTC+9를 두 번 적용하던 문제를 수정했다.

## 인증·개인정보

레이아웃마다 생성한 CSR 세션 컨텍스트를 헤더·개인 기록·동기화·WebMCP가 공유한다. 계정 전환 시 지연 응답을 버리고, 로컬 티켓과 중복 해시는 익명/회원별로 분리한다. 새 클라이언트의 회원 RPC·QR·탈퇴 요청은 예상 계정과 서버의 실제 쿠키 세션을 대조한다. 클라이언트가 보낸 계정 ID를 저장 권한으로 사용하지 않는다.

가입에는 만 14세 이상 확인을 요구하고 서버에서도 검사한다. 소셜 로그인은 명시적 가입 요청에만 계정 생성을 허용한다. 탈퇴는 Better Auth의 최근 세션/비밀번호 검증을 거치며 기존 FK cascade로 계정·세션·회원 스캔을 삭제한다. 로컬 스캔도 해당 계정 범위에서 삭제한다.

운영자 1990컴퍼니, 개인정보 보호담당 김정래, `support@645.live`, `02-877-1990`을 정책·문의 화면에 반영했다. 이전 방침을 보존하고 회원 화면에 개정 안내를 추가했다. Clarity 수집을 종료하고 GA에는 경로만 포함한 페이지 주소를 명시한다. AdSense 설정은 유지한다. 법적 확인사항은 [별도 개인정보 검토](./2026-09-12-privacy-review.md)에 기록했다. 국내 호스팅 수탁자, Cloudflare 실제 국외 처리 국가·조건, GA/문의/백업/로그 보관 설정은 운영 확인이 남아 있으며 법적 완비를 단정하지 않는다.

## GLM 뉴스 생성

GitHub 저장소 Settings → Secrets and variables → Actions → Variables의 `ZAI_MODEL`을 `glm-5.3`으로 설정했다. 코드와 workflow 기본값도 같다. `thinking.type=enabled`, `reasoning_effort=low`, 문서에서 지원하는 `tool_choice=auto`를 사용한다.

기본 생성과 JSON 재시도 프롬프트에 한국어 교열 규칙을 공통 적용했다. 오탈자·띄어쓰기·조사·문체·단위 표기, 회차/금액/인원 대조, 필드 간 일치, 중복·상투어·미확인 인용 제거를 최종 출력 전에 점검하도록 요청한다. 기존 게시 기사는 다시 생성하지 않았다. 실제 새 모델 응답/교정 품질은 다음 기사 생성에서 확인해야 한다.

## 검증

- Svelte 타입체크 0 오류·0 경고, Biome 린트 오류 없음.
- Pages 빌드 및 HTML/데이터 검증 통과.
- Pages 로컬 런타임의 브라우저 회귀 테스트 19개 통과: 테마·모바일 내비게이션·SEO·WebMCP·CSR 인증·QR.
- 새 단위 검사: 정적 자산에서 Server 초기화/SSR 호출 없음, 콘텐츠 협상, 회원 요청 경계, 계정별 기록 격리, 회차 전환, QR 검증·저장 실패/계정 전환.
- 독립 로컬 PostgreSQL에 모든 기존 마이그레이션을 적용하고 실제 가입·세션·로그인·로그아웃·탈퇴·연쇄 삭제·잘못된 계정/출처 차단을 확인했다. 테스트 DB는 삭제했다. 운영 회원/QR 데이터로 쓰기 검증하지 않았다.
- 사이트맵 183개 URL 정상 응답. 추가 비정상 번호/쿼리 경로를 포함한 190개 감사에서 메타 누락·중복 태그·H1/구조화 데이터 오류 없음. 동일 canonical을 쓰는 history 쿼리의 설명 중복은 의도한 동작이다.
- 현재/이전 개인정보 방침 390·1280px × 라이트/다크, 홈·문의 모바일 검수. 목차·연락처·이전 방침 링크 정상.
- SDK check/build 및 TrailBase adapter type-check/62개 테스트 통과.

## 공식 참고

- [SvelteKit page options](https://svelte.dev/docs/kit/page-options)
- [SvelteKit Cloudflare adapter](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Cloudflare Pages routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Cloudflare Pages static serving](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Better Auth 계정 삭제](https://better-auth.com/docs/concepts/users-accounts)
- [GLM-5.3 이전 안내](https://docs.z.ai/guides/llm/glm-5.3)
- [Z.ai Chat Completions 옵션](https://docs.z.ai/api-reference/llm/chat-completion)
