# @645/toss

## 1.1.2 — 2026-09-14

### Patch changes

- [99c1cca](https://github.com/imjlk/645-live/commit/99c1cca702145146fa003d0c461bdf496b297f40) 저장된 인증 정보가 만료된 상태에서 앱을 다시 열 때 연결 오류로 번호를 만들지 못하던 문제를 수정했습니다.

## 1.1.1 — 2026-09-14

### Patch changes

- [3a1cb54](https://github.com/imjlk/645-live/commit/3a1cb54db6dc4297f416f057039a9c57942d2d1a) 연결 초기화 중 실행 오류가 발생하면 실패 단계를 확인할 수 있는 안내와 진단 코드를 표시합니다. 연결 실패 후 다시 시도할 수 있도록 요청 정리 과정도 보완했습니다.

## 1.1.0 — 2026-09-14

### Minor changes

- [e32ca60](https://github.com/imjlk/645-live/commit/e32ca60e620802e7c11080e6d5d560ef6280595d) 번호를 10~50회 생성할 때마다 무작위 시점에 광고를 보고 이어서 만들 수 있도록 개선했습니다. 생성 횟수는 서버에 보관하며, 광고를 불러오지 못하면 기본 번호 생성을 계속 이용할 수 있습니다.

### Patch changes

- [ecdf83f](https://github.com/imjlk/645-live/commit/ecdf83f6841b65209286c3f1e2912cf95b874099) 실시간 화면의 상단 여백을 다른 탭과 맞추고, 번호별 증가량과 전체 조합 수가 더 잘 보이도록 전환 효과를 개선했습니다.

## 1.0.0 — 2026-09-14

### Major changes

- [49abf83](https://github.com/imjlk/645-live/commit/49abf8302d3dfb9ee7d6bfde029c067d1c1e654f) 645 번호 생성기를 앱인토스에 출시합니다. 번호 생성과 기기 보관, 실시간 생성 현황, 추첨 결과 비교, 출석 및 광고 기능을 제공합니다.

### Patch changes

- [49abf83](https://github.com/imjlk/645-live/commit/49abf8302d3dfb9ee7d6bfde029c067d1c1e654f) 운영자가 지정한 테스트 계정에서 일일·7일 프로모션의 TEST 코드 호출을 검증할 수 있도록 설정 도구를 추가합니다. 출석 기록과 실제 지급 예산은 변경하지 않습니다.
- [49abf83](https://github.com/imjlk/645-live/commit/49abf8302d3dfb9ee7d6bfde029c067d1c1e654f) 보관함을 1,000개로 확대하고 목록을 20개씩 표시합니다. 보관함 상단 정렬을 맞추고 조합 분석에 통계 출처를 표시합니다.

