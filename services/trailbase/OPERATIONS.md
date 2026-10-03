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
