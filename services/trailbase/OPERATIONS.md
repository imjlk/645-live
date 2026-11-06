# Read-only operational status

Apply the forward operations-view migration through the normal deployment. It adds only private SQL views; it does not register them in Record API or change existing payout/message state. The views can also be inspected in the authenticated TrailBase admin SQL interface.

From a consistent SQLite backup, run:

```sh
bun run miniapp:ops --database /path/to/snapshot.db
bun run miniapp:ops --database /path/to/snapshot.db --as-of 1791010000000 --fail-on-attention
```

The command opens the file read-only and reads all views in one transaction. `--as-of` is the snapshot's Unix timestamp in milliseconds; use the capture time for historical backups. Exit 2 with `--fail-on-attention` means the report contains attention items; exit 1 means unavailable/invalid input. Output is local and contains only aggregates/configuration timing. It omits account identifiers, promotion/provider codes, recipient keys, sealed values, transaction keys, message payloads and raw failure messages.

- Campaigns: configured status/window, reward size, local budget, committed reservation amount and remaining grant limits. Reservation usage remains authoritative after profile/ledger deletion. This is the service's local ceiling, not a verified Toss balance or successful-payment total.
- Rewards: counts and amounts by source/status, oldest pending times, missing campaigns and unsettled three-step executions. Pending older than ten minutes or missing its campaign follows the application's existing needs-review rule.
- Notifications: provider-outcome counts, oldest scheduled/locked times and unknown delivery outcomes, scoped to functional result notifications. SENT does not prove the user opened the notification.
- Watches: total pending round watches and the subset whose draw exists. This is not dispatch eligibility; agreement, template approval and account checks remain with the worker.

All-history counts can include resolved historical failures. Stale-group attention uses `group_records` for the size of the group containing an old record, not the count of stale records. Attention items are diagnostic signals for an operator, never permission to grant, resend, release reservations, activate campaigns or change state. Use the existing owner-bound payout status lookup and outbox recovery procedure. Unknown delivery outcomes must not be blindly resent. Review runtime/provider readiness with the existing `miniapp:readiness` check separately.

Before release, verify production event collection and the approved round-targeted notification link described in `apps/toss/ANALYTICS.md`. Promotion activation and template/console configuration are separate operator actions.

## Attendance rewards: ad skip tickets and point cohorts

Attendance always earns app-owned ad skip tickets; Toss points are limited by cohort. Every instant below is Unix epoch milliseconds (server time) and is unset by default, which keeps ticket grants and the cohort limit inactive and leaves the existing promotion behavior unchanged. Decide all dates before activation; never use the deployment date as a default.

| Setting | Meaning | Default |
| --- | --- | --- |
| `AIT_REWARD_POLICY_VERSION` | Policy/notice identifier stored with grants and snapshots | `attendance-rewards-v1` |
| `AIT_REWARD_NOTICE_STARTS_AT` | In-app notice for existing users starts | unset |
| `AIT_REWARD_NEW_USER_CUTOVER_AT` | Subjects first seen before it are legacy, at or after it welcome | unset |
| `AIT_REWARD_LEGACY_POINTS_ENDS_AT` | Exclusive end of new point eligibility for every legacy subject | unset |
| `AIT_REWARD_WELCOME_POINT_DAYS` | KST days of welcome points, counting the first day | `7` |
| `AIT_AD_SKIP_REWARDS_STARTS_AT` | Daily (1) and 7-day streak bonus (3) ticket grants start | unset |
| `AIT_AD_SKIP_REDEMPTION_ENABLED` | `false` pauses redemption only; balances and grants stay | `true` |

The cohort limit activates only when both the cutover and the legacy end are set and valid; a partial configuration stays inactive. Prefer KST 00:00 boundaries and start the grace period when the notice actually starts. Quantities (1 daily, 3 bonus) and the redemption allowlist (`generation_continue`, `custom`, `report`; never `attendance_restore`) are code constants.

To end Toss points for everyone after a grace period (no welcome window), set the cutover far in the future, for example `AIT_REWARD_NEW_USER_CUTOVER_AT=4102412400000` (2100-01-01 KST). Every subject then registers as legacy and stops earning at `AIT_REWARD_LEGACY_POINTS_ENDS_AT`; registration is permanent, so a later welcome policy will not reopen points for those subjects. Keep `AIT_PROMOTIONS_ENABLED=true` and the console promotion running until the last first-claim deadline has passed (a streak completed on the last grace day can be claimed until that day + 7 days 00:00 KST) and no pending ledger rows remain; only then end the console promotion and pause the campaign rows.

Profiles deleted before the cohort limit was activated cannot be recovered. With a real cutover, such a returning identity registers with its new profile time and can be classified as welcome.

- Tickets are granted in the check-in/restore transaction and reconciled on status reads for today's own check-in and recently completed cycles only. No history is replayed: a cycle completed before the start earns nothing, a cycle that began before and completes after it earns its bonus once, and a restored day earns no daily ticket.
- Subjects are registered with the original profile `created_at` (first registration wins, keyed by a scoped HMAC of the verified identity). Profiles deleted before activation cannot be recovered; such a returning identity registers with its new profile time.
- With the cohort limit active, a point condition met inside the window is snapshotted with the campaign, provider code and amount at that time (`promotion_reward_eligibilities`). A first claim uses only that snapshot until its deadline (daily: end of that KST day; streak: completion day + 6 days) and never answers `CAMPAIGN_CHANGED` for a newer campaign. Pending ledger rows keep reconciling after the window. A welcome subject earns at most one streak point reward.
- Without an active campaign the status amount is `null`; there is no fixed 50P fallback.
- `AIT_PROMOTIONS_ENABLED=false` is not a cohort limit: it also stops pending claims from being rechecked. Ending the legacy window does not end the console promotion that welcome users may still use. Before ending or replacing a console promotion, check unclaimed snapshots, open first-claim deadlines and pending ledger rows, and keep campaign rows referenced by snapshots.
- Tickets are not transferable or convertible to cash or Toss points and never use `promotion_reward_ledger`. Withdrawal forfeits the balance; grant history keeps its subject hash so a re-joined identity cannot earn the same day or an overlapping cycle again. Retention prunes redemption receipts and settled prompts after 90 days.

## Shopping recommendation configuration

The public read-only `GET /api/app/v1/shopping/recommendations` returns at most one product for each of `generator` and `previous_results`. No authentication/bootstrap or product detail/provider call is required. Both `ait_lotto_shopping_policy` and `ait_lotto_shopping_recommendations` are operator-only tables, with no Record API registration. The additive migration defaults the policy off and creates no real product links.

After confirming the miniapp placement and registering its Sharelink channel, operators can populate the recommendations with an issued affiliate URL, a public product key (1–64 ASCII letters/digits/underscore/hyphen), title (up to 160 characters), optional original HTTPS thumbnail, `starts_at`, `expires_at`, and `updated_at` (Unix milliseconds). Both the global policy and each placement must be enabled. Only issued HTTPS short URLs on `toss.im/_m/` or `toss.shopping/_m/`, original URLs on `toss.shopping/t/` with a tracking `k`, and the supported legacy `service.toss.im/shopping/s/` tracking URL are accepted; no credentials, nonstandard ports or lookalike hosts. Never substitute a non-affiliate product URL, edit an issued URL's tracking fields, crop/alter an image, or promise an unverified price/discount. Keep the read-time provider expiry intact.

The app shares an in-flight read and a memory cache for at most 60 seconds, refreshes valid cards without remounting their images, and rechecks expiry before navigation. Configuration failures/disabled/expired products collapse the optional slot without blocking generation, attendance or results. The global policy is a kill switch with up to a 60-second cache delay under a healthy connection. Product changes do not require a native bundle release.

### Future hooka consumer

Keep provider API keys, approved fixed outbound IP calls, product selection and link issuance in the automation service. Its Sharelink preset provides app-scoped, versioned snapshots and a consumer-only `selectSharelinkOffer` validator. A future trusted server-side importer should validate `appId`, `appRevision`, `subjectId`, `ruleRevision`, `generatedAt`, ready status, unique subject entries and offer expiry before atomically mapping the two configured subjects to these placement rows. Preserve `offer.productId`, `offer.title`, `offer.url`, `offer.checkedAt` and `offer.expiresAt`; reject overlong titles or ask for a shorter reviewed title. The current automation offer has no image field, so leave `image_url` null unless a separately approved thumbnail is supplied. A failed/expired snapshot disables that slot; it must not extend expiry or reactivate the global policy. Use registered subTags for attribution, not a user key in the URL.

This PR adds the consumer boundary, not a scheduler, provider credential, external webhook write route or deployment to the automation service. Validate its released consumer package and real provider response contract before installing that importer.

### 미니앱 광고 제거 상품

- 토스 콘솔에서 **비소모성** 상품 하나를 등록한다. 구매 화면은 스토어가 반환한 가격을 표시한다.
- TrailBase 컨테이너에 `AIT_AD_FREE_SKU`로 발급 SKU를 설정하고 재시작한다. 미설정 시 구매 기능은 꺼진다. 판매 중단 시에는 콘솔에서 미노출로 전환하고 기존 구매·환불 조회를 위해 서버에는 같은 SKU를 유지한다. 기존 내부 mTLS 프록시의 forward 모드와 앱 인증서가 필요하다.
- 토스 계정의 미지급 주문 및 전체 구매 이력을 조회하고 서버에서 주문·SKU·결제 상태를 확인한다. 서버의 비공개 원장은 주문 다이제스트와 환불 여부만 보관한다. 앱 재실행·포그라운드 복귀·설정의 구매 복원 또는 활성 상태에서 5분마다 재확인한다. 별도 환불 신청은 스토어 구매 내역에서 진행한다.
- 판매 전 실제 기기에서 결제, 재설치 후 복원, 같은 기기의 다른 토스 계정, 환불 후 배너·번호 생성 광고 재개를 확인한다. SDK 3 콘솔 QR 결제에는 실제 금액이 청구된다.
