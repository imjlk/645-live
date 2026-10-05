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

## Shopping recommendation configuration

The public read-only `GET /api/app/v1/shopping/recommendations` returns at most one product for each of `generator` and `previous_results`. No authentication/bootstrap or product detail/provider call is required. Both `ait_lotto_shopping_policy` and `ait_lotto_shopping_recommendations` are operator-only tables, with no Record API registration. The additive migration defaults the policy off and creates no real product links.

After confirming the miniapp placement and registering its Sharelink channel, operators can populate the recommendations with an issued affiliate URL, a public product key (1–64 ASCII letters/digits/underscore/hyphen), title (up to 160 characters), optional original HTTPS thumbnail, `starts_at`, `expires_at`, and `updated_at` (Unix milliseconds). Both the global policy and each placement must be enabled. Only issued HTTPS short URLs on `toss.im/_m/` or `toss.shopping/_m/`, original URLs on `toss.shopping/t/` with a tracking `k`, and the supported legacy `service.toss.im/shopping/s/` tracking URL are accepted; no credentials, nonstandard ports or lookalike hosts. Never substitute a non-affiliate product URL, edit an issued URL's tracking fields, crop/alter an image, or promise an unverified price/discount. Keep the read-time provider expiry intact.

The app shares an in-flight read and a memory cache for at most 60 seconds, refreshes valid cards without remounting their images, and rechecks expiry before navigation. Configuration failures/disabled/expired products collapse the optional slot without blocking generation, attendance or results. The global policy is a kill switch with up to a 60-second cache delay under a healthy connection. Product changes do not require a native bundle release.

### Future hooka consumer

Keep provider API keys, approved fixed outbound IP calls, product selection and link issuance in the automation service. Its Sharelink preset provides app-scoped, versioned snapshots and a consumer-only `selectSharelinkOffer` validator. A future trusted server-side importer should validate `appId`, `appRevision`, `subjectId`, `ruleRevision`, `generatedAt`, ready status, unique subject entries and offer expiry before atomically mapping the two configured subjects to these placement rows. Preserve `offer.productId`, `offer.title`, `offer.url`, `offer.checkedAt` and `offer.expiresAt`; reject overlong titles or ask for a shorter reviewed title. The current automation offer has no image field, so leave `image_url` null unless a separately approved thumbnail is supplied. A failed/expired snapshot disables that slot; it must not extend expiry or reactivate the global policy. Use registered subTags for attribution, not a user key in the URL.

This PR adds the consumer boundary, not a scheduler, provider credential, external webhook write route or deployment to the automation service. Validate its released consumer package and real provider response contract before installing that importer.
