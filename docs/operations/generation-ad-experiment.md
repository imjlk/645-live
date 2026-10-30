# Generation continuation update

The new bundle uses `generation-cadence-v2` with stable 50:50 assignment by the authenticated internal principal. No raw principal or Toss identity is included in analytics.

- Control: first 3 generations, recurring random 3–12.
- Short: first random 1–3, recurring random 2–8.
- In the short arm, a returning user with server-reported streak >= 1, no generation today, and no check-in today receives an explicit ad CTA before the day's first generation. Completed daily continuation is persisted by server day so failed generation retries and app restarts do not require another daily ad. A new server day can trigger it again.
- The generation performed after the ad counts toward the new cycle. Existing no-fill/error continuation and ad limits remain in effect. This is a client interaction update, not a new server-side promotion entitlement or a guarantee of filled ads.
- Counter state is scoped to user/experiment/variant. Both arms start fresh experimental progress; legacy progress is preserved. Token renewal retains the same principal scope.
- Only baseline server policy `device / first=5 / min=5 / max=30` enables allocation. Other policies bypass it. A replacement bundle can disable allocation for exact baseline rollback.

## Event report

Existing ad events retain `flow_id`, `policy`, `app_version` and an ephemeral `session_id`. Exposure and successful-generation events support matured five-minute CTA continuation and per-session counts. These are attempt/session diagnostics, not unique-user D1/D7 retention.

Normalize authorized exports into JSONL with `timestampMs`, `log_name`, and `params` containing these fields. Include the entire exposure and follow-up period; use the export coverage cutoff, not the wall clock. Do not commit actual exports.

```sh
bun scripts/miniapp/ad-experiment-report.ts /private/events.jsonl 1.6.0 2026-11-10T00:00:00Z
```

## Aggregate comparison

`ad-value-report.ts` accepts two aggregate rows (one per arm), each containing `variant`, matching ISO `periodStart`/`periodEnd`, `currency`, `exposedUsers`, `adRevenue`, and `promotionCost`. Input amounts must be settled totals with a common attribution window. Promotion retries must not count a payment twice. Do not treat ad SDK completion counts as settled revenue or allocate totals 50:50 without cohort evidence.

```sh
bun scripts/miniapp/ad-value-report.ts /private/aggregates.json
```

The report returns contribution after promotion cost per exposed user and the treatment-minus-control difference. Zero users yields null. If cohort-level revenue/cost attribution is unavailable, leave this analysis pending rather than fabricate arm totals. The scripts do not collect billing data or create a console dashboard.

Before rollout verify both arms, daily boundaries, unavailable ads and native event delivery. Compare on the same release and full weekly window; evaluate continuation, errors, fill rate and repeat-user retention alongside aggregate value. Establish sample size and decision criteria before selecting a winner; multiple attempts from one user are not independent observations.

## Private TrailBase metrics

Deploy the backend before the new bundle (main triggers the existing Coolify deployment). The authenticated `/api/app/v1/metrics` endpoint mirrors allowlisted generation events to a private `analytics.events` database. It recomputes cohort assignment, rejects mismatched policy/payloads, caps batches at 20 and per-user intake at 3,000 events per rolling day, and deduplicates stable event IDs. Clients buffer at most 100 events, flush every two seconds and on background, and never block generation on collection failure. Abrupt termination/offline operation can lose events; displayed funnel rates are observed telemetry, not verified ad revenue.

The new analytics migration and `databases` config are copied by the existing container entrypoint. On the currently deployed TrailBase 0.33.15, the WASM attachment fallback uses `/app/traildepot/data/analytics.db`; review this path when upgrading to 0.34+. No analytics Record API is public. Events are retained for 45 days with bounded cleanup during intake and removed on account withdrawal.

Saved editor queries are maintained in `services/trailbase/sql/11-generation-ab-funnel.sql`, `12-generation-ab-retention.sql`, and `13-generation-ab-cost.sql`. Select `analytics` under Attached before running. The retention query uses authenticated internal principals and KST day boundaries; completed D1/D7 follow-up dates are required. Its first day is first **observed** exposure within retained history, not necessarily registration day. Queries include zero-denominator null handling and never fabricate revenue totals. Exposure is emitted once per foreground server day so an app retained in memory can still record a return on a later day.

## Client-side controls

`apps/toss/src/generation-ad-settings.ts` owns the bundle-local switches and interval presets. Defaults preserve the active experiment. `mode: "relaxed"` uses first 5 / recurring 5–30 for both arms and disables the returning-user daily gate. Existing counters keep their remaining generations and use the softer interval on their next continuation; new counters start at 5. Assignment and counter storage keys remain stable. No server counter or analytics event is consulted to decrement or refill progress.

`collectServerMetrics: false` disables the optional TrailBase mirror only; SDK logging and generation work normally. The server validates experiment/cohort and bounded numeric ranges rather than enforcing the current intervals, so later bundle-only tuning does not require another server range update. Continue comparing metrics within the same app version.

The funnel starts its five-minute window at the first viewport impression **or explicit ad request**. A quick tap may precede the one-second impression event and must not disappear from reporting. Requests and impressions for one flow are counted once.

The payout query attributes successful ledger entries by `requested_at` after observed enrollment. Provider-supplied `granted_at` may be absent for successful three-step payouts; this is a request-cohort cost view, not a payment-date reconciliation report.
