# 645.live 개인정보 처리 점검 — 2026-09-12

회원가입이 추가된 실제 코드와 운영자가 확인한 사실을 기준으로 개인정보 처리방침을 보완했다. 문구·구현·공개 설정을 대조한 점검이며, 위탁계약·관리자 콘솔·백업·보안 운영을 실사한 법률 준수 인증은 아니다. 특히 아래의 **운영 확인이 남은 사항**이 확정되어야 국외 처리와 보관기간 고지를 완결할 수 있다.

## 확인 기준

- 개인정보 보호법은 **2026-09-11 시행본**, 작성지침은 개인정보보호위원회 **2026년 4월 개정본**을 확인했다. 기존 검색 결과의 2025년 지침을 최신판으로 취급하지 않았다.
- 법 제30조와 시행령 제31조에 맞춰 목적·항목·보유기간·파기·제3자 제공/위탁·권리행사·담당자·자동수집장치를 검토했다. [법 제30조](https://law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033214957), [작성지침 2026.4](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=I030010000&nttId=12018)
- 회원 서비스에 필요한 정보는 계약 체결·이행 근거와 동의 기반의 선택 처리를 구분한다. 처리방침을 게시했다는 사실 자체를 광고·제3자 제공·국외 이전에 대한 포괄 동의로 보지 않는다. 작성지침 24–27쪽은 실제 처리 항목, 동의 여부와 법적 근거를 구분하고 간편 로그인도 예시로 설명한다. [법 제15조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029335387), [작성지침](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=I030010000&nttId=12018)

## 운영자가 확인한 사실

| 구분 | 확인 내용 |
| --- | --- |
| 서비스 운영자 | 1990컴퍼니 |
| 개인정보 담당자 | 김정래 |
| 담당 부서 표시 | 개인정보 보호담당 — 운영자가 적절한 부서명 작성을 허용함 |
| 전화 | 02-877-1990 |
| 이메일 | support@645.live |
| 회원 DB 및 TrailBase 저장 위치 | 대한민국 |
| 웹 호스팅 | Cloudflare Pages 사용. DB의 국내 저장과 웹 요청의 처리 위치는 별개 |

법 제30조제1항제6호는 책임자 성명 또는 담당 부서명과 전화번호 등 연락처를 요구한다. 임의 이메일·회사 주소·호스팅 사업자를 만들지 않고, 확인된 전화와 지원 이메일을 권리행사 창구로 적었다.

## 코드에서 확인한 처리 흐름

| 기능 | 실제 항목·처리 | 근거 파일 |
| --- | --- | --- |
| 이메일 가입 | 이름/닉네임, 이메일, 비밀번호 해시, 내부 회원 ID, 이메일 확인 상태, 생성·수정 시각 | `pages/www/src/lib/auth.ts`, `pages/www/src/lib/db/schema/auth.ts` |
| 소셜 가입·로그인 | Google·카카오·네이버 중 설정된 제공자. 제공자 계정 ID, 프로필, 이메일, 인증 토큰·유효기간 저장 가능. 제공자 비밀번호는 수신하지 않음 | `auth-social.ts`, Better Auth 설정과 `account` 스키마 |
| 로그인 유지 | 세션 ID·토큰, 만료·생성·수정 시각, IP, user agent. Better Auth 기본 쿠키 7일, 사용 중 갱신 | `schema/auth.ts`, 설치된 Better Auth `cookies/index.mjs`, `context/create-context.mjs` |
| QR 인식 | Barqode가 기기에서 영상/사진을 디코딩. QR 문자열을 사이트 API로 전송. 회차·번호만 TrailBase 집계로 전달 | `routes/qr-scan/+page.svelte`, `lib/server/qr-scan-service.ts`, TrailBase `lotto-utils.ts` |
| 기기 기록 | **IndexedDB가 아니라 localStorage**의 `qr-scan-history`. QR 원문, 결과, 시간, 티켓 구분값, 계정 연결·동기화 상태. 최근 7일/100건; 읽기 때 오래된 항목 정리 | `lib/utils/qr-scan-history-v2.ts` |
| 회원 기록 | 회원 ID와 QR 원문, 회차·게임 수, 결과·등수·수령 기간, 요약, 스캔·갱신 시각. 회원 Postgres에 저장 | `schema/member-scan.ts`, `server/my-scans.ts`, `utils/member-scan-sync.ts` |
| 공개 스캔 집계 | 회차·번호를 합산. 공개 번호 통계에 회원 ID/이메일/개별 QR 원문을 노출하는 구조는 아님 | TrailBase `processScannedLottoData`, `lotto_draw_scan_counts` |
| 접속 수 집계 | 임의 접속 ID, user agent, 페이지 path, 연결·최근 확인 시각. 회원 ID와 분리. 12분 비활성 기준, 요청 처리 및 5분 주기 정리 | `global-connection.svelte.ts`, `services/trailbase/wasm-guest/src/index.ts` |
| 기기 설정 | 테마, 카메라 장치 선택, 접속·탭 식별자 등 로컬/세션 저장소 | `ThemeSelect.svelte`, QR, global-connection |
| 광고·분석 | AdSense, GA4. 기존 Clarity 전역 실행은 이번 작업에서 종료 | `routes/+layout.svelte`, `utils/analytics.ts` |
| 웹·DB 연결 | Pages/Workers, Hyperdrive, 내부 비밀번호 해시 Worker. 단순 정적 파일 전송 외에 로그인 및 API 데이터 처리도 존재 | `wrangler.jsonc`, `auth-password-hasher.ts` |

회원 DB의 `user` 외래키에는 `account`, `session`, `member_scan`의 `ON DELETE CASCADE`가 선언되어 있다. 실제 배포 DB에도 동일한 제약이 적용되었는지와 백업 삭제 정책은 별도 운영 확인 대상이다. 탈퇴는 계정을 삭제하는 경로이며, 별도의 개별 회원 스캔 삭제 API는 이번 점검 이전 코드에 존재하지 않았다.

## 발견 사항과 이번 보완

| 발견 사항 | 보완 내용 / 상태 |
| --- | --- |
| 기존 방침에 회원가입·소셜·회원 스캔 항목이 없음 | 기능별 실제 항목, 목적, 필수/선택한 기능을 구분하여 추가 |
| “위탁할 수 있음”만 있고 구체적인 처리 설명 부족 | 국내 DB와 Cloudflare 요청 처리를 분리해 안내. 정확한 수탁자·이전 조건은 아래 운영 확인 필요 |
| 계정·삭제 요청을 공개 SNS/GitHub로만 안내 | 지원 이메일·전화·운영자·담당자 명시. 개인정보를 공개 이슈에 올리지 않도록 안내 |
| 회원 탈퇴 경로 없음 | 인증 담당 구현과 맞춰 `/my` 탈퇴, 재인증, 계정과 스캔 삭제를 안내 |
| 브라우저 기록 삭제를 회원 DB 삭제로 오해 가능 | 기기/서버 기록, 로그아웃/탈퇴, 다른 기기의 기록을 구분 |
| 쿠키와 광고 네트워크 안내·거부 방법 없음 | AdSense, GA, 브라우저 차단/삭제, 사업자 선택 도구를 안내 |
| Clarity가 회원·QR 화면에서 전역 실행 | 이번 구현에서 Clarity 수집 종료. 과거 수집 데이터의 처리·보관 안내는 유지 |
| 만 14세 미만 가입 처리 원칙과 절차 없음 | 만 14세 이상 가입 안내와 별도 연령 확인을 실제 UI/API 변경에 맞춤 |
| 이전 정책 이력 없음 | `/privacy/2026-03-01` 보존. `noindex,follow`; 신규 방침에서 링크 |
| 공통 인증 때문에 방침도 SSR | 본문·이전 방침 모두 `prerender = true`. 정적 HTML의 메타·본문·연락처 유지 |

### 광고·분석의 법적 구분

- AdSense 공식 요구사항에는 Google/광고 파트너의 쿠키, 이전 방문에 기반한 광고, 개인 맞춤 광고 거부 안내가 포함된다. 이를 보완했다. 사이트 계정의 **실제 허용 광고 기술 제공자 목록**은 운영자가 확인하여 필요하면 목록/링크도 추가해야 한다. [AdSense 필수 콘텐츠](https://support.google.com/adsense/answer/1348695?hl=ko)
- Clarity의 Microsoft는 공식 약관에서 독립적 개인정보처리자 지위를 설명하고, 데이터의 광고 목적 사용을 안내한다. 단순한 “익명 통계 수탁업체”라고 쓰지 않았다. 신규 수집 종료가 이전 데이터 삭제를 뜻하지 않으므로 종료 사실과 잔여 보관을 구분했다. [Microsoft Clarity 약관](https://clarity.microsoft.com/terms), [개인정보 공개 안내](https://learn.microsoft.com/en-us/clarity/setup-and-installation/privacy-disclosure)
- 2026-06-30 개정 Clarity 안내의 보관기간은 일반 화면 재생 30일, 클릭/히트맵 및 표시·즐겨찾기 세션 9개월이다. 예전 자료의 13개월을 사용하지 않았다. 관리자에서 이전 프로젝트 데이터를 삭제하면 잔여 보관 안내도 갱신할 수 있다. [Clarity 보관기간](https://learn.microsoft.com/en-us/clarity/setup-and-installation/data-retention)
- GA4 일반 속성은 사용자·이벤트 수준 데이터에 2개월 또는 14개월 등의 설정을 제공한다. **쿠키 수명, 원시 이벤트 보관, 집계 보고서 보관은 서로 다르다.** 콘솔 값을 확인하지 않고 “모두 2개월 후 삭제”라고 쓰지 않았다. [GA4 데이터 보관](https://support.google.com/analytics/answer/7667196?hl=ko)
- 한국 서비스에 모든 쿠키에 대한 유럽식 동의 배너가 일률적으로 필요하다고 결론 내리지 않았다. 다만 선택 정보·식별 가능한 행태정보·제3자 제공·국외 이전별 적법 근거가 따로 필요하며, 소셜 제공자의 동의가 645.live의 모든 추가 처리를 포괄하지는 않는다. [2026 작성지침 24–27, 54–63쪽](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=I030010000&nttId=12018)

## 운영 확인이 남은 사항

| 우선순위 | 필요한 확인/조치 | 완료 조건 |
| --- | --- | --- |
| 높음 | 국내 회원 DB·TrailBase의 실제 호스팅/위탁 사업자와 직접 운영 여부 | 국내 저장 사실 외에 수탁자명·위탁 업무·계약/감독 관계 공개. 메일 호스팅도 포함 |
| 높음 | Cloudflare Pages/Workers/Hyperdrive의 국외 처리 범위 | 실제 이전 국가 전체, 수령자와 연락처, 항목, 시기·방법, 목적, 보유기간, 거부 방법·효과, 적용 법적 근거 확정 |
| 높음 | 광고/분석 서비스의 실제 계정 설정과 국외 처리 | Google 계약 주체·처리 국가·실제 보유기간·공유 설정·광고 기술 제공자 확인; 필요한 고지·동의 방식 정합성 검토 |
| 높음 | 회원/QR 데이터가 들어갈 수 있는 기존 Clarity 데이터 | 기존 프로젝트의 데이터·공유·라벨/즐겨찾기 상태 확인, 필요한 삭제 수행. 신규 SDK 제거만으로 과거 데이터 삭제 완료라고 보고하지 않음 |
| 높음 | 회원 탈퇴의 실제 DB·기기 검증 | user/account/session/member_scan 삭제, 이전 쿠키 무효화, 다른 계정 데이터 보존, 로컬 동기화 중 재저장 방지 확인 |
| 보통 | 만료 세션·verification 정리 | 유효기간 종료와 DB 행 삭제를 분리하여 정리 작업 및 기간을 정함. 현재 7일 쿠키 TTL은 서버 자동 파기 증거가 아님 |
| 보통 | 문의·접속/보안 로그·백업 보관기간 | 예: 문의 해결 후 30일 등 운영자가 정한 기간을 실제 메일함/로그/백업에 적용한 뒤 항목별 공개. 적용 여부 미확인인 “접속기록 3개월”, “모든 회원 정보 5년”을 관행적으로 넣지 않음 |
| 보통 | 아동 기존 계정 처리와 연령 확인 방식 | 신규 가입 체크는 실제 나이 검증/법정대리인 동의와 다름. 기존 미성년 가입 상황과 확인된 아동 정보 삭제 프로세스 결정 |

**Cloudflare의 “글로벌 서비스”라는 표현만으로 국외 이전 고지를 완결할 수 없다.** 법 제28조의8의 계약 이행을 위한 국외 처리위탁·보관 예외도 요구되는 세부사항을 공개하거나 알리는 조건이 있다. 2026 작성지침 45쪽은 클라우드로 여러 국가에 이전하면 그 국가를 모두 기재하도록 설명한다. 따라서 국내 DB, 미국 소재 Cloudflare 법인, EU SCC/DPA의 존재만으로 모든 국외 이전 요건을 충족했다고 단정하지 않았다. [법 제28조의8](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334953), [작성지침](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=I030010000&nttId=12018)

Cloudflare 공식 DPA v6.4의 수령자는 Cloudflare, Inc.이며 연락처는 `legal@cloudflare.com`이다. 고객/최종 이용자가 서비스에 전달하는 콘텐츠는 수탁 처리 대상으로 설명한다. Annex 1은 계약 종료 또는 업무 수행을 위한 처리 필요가 없어지는 시점 중 빠른 때까지를 보관 기준으로 설명하지만, 실제 활성화한 제품의 로그·캐시·지역 설정도 함께 확인해야 한다. [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), [Cloudflare 개인정보처리방침](https://www.cloudflare.com/privacypolicy/)

만 14세 미만의 아동 개인정보에 동의가 필요한 경우 법정대리인 동의와 확인 절차가 요구된다. 이번 서비스는 해당 가입을 지원하지 않는 방향으로 정리했다. 법 제22조의2의 보호 원칙을 신규 가입 체크 하나로 전부 충족한다고 표현하지 않았다. [법 제22조의2](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1020398521)

### 개정 공지와 이력

2026 작성지침 83쪽은 이전 방침과 적용기간을 공개하고, 권리에 중대한 영향을 미치는 변경은 개정 전 또는 개정 즉시 주요 변경을 별도로 안내하도록 설명한다. 일반적인 개인정보 처리방침 변경에 무조건 7일/30일이 법정 기간이라고 기재하지 않았다. 본문에 개정 요약·시행일과 이전 버전(2026-03-01~2026-09-11 적용)을 연결했다. 회원 또는 홈 화면에서 개정 링크를 별도로 알리는 것은 권장하며, 새로운 동의 대상의 처리를 추가하는 경우 별도 동의 절차가 대체되는 것은 아니다. [작성지침](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=I030010000&nttId=12018)

## 검증

- `bunx biome format --write` — 개인정보 본문·이전 방침·정적 렌더링 설정 4개 파일, 오류 없음.
- `npx @sveltejs/mcp svelte-autofixer ... --svelte-version 5` — 본문과 이전 방침 모두 `issues: []`, `suggestions: []`.
- 소스 기준 본문 메타 설명 124자, H1 1개, 목차/본문 앵커 10개 일치, 확인된 회사·담당자·메일·전화 포함.
- 실제 운영 회원·티켓을 조회하거나 삭제하지 않았다. 계정 삭제 테스트와 전체 Svelte/배포 검증은 본 작업의 통합 검증에 포함한다.
