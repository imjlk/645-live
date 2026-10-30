# Generation continuation update

The new bundle uses `generation-cadence-v2` with stable 50:50 assignment by the authenticated internal principal. No raw principal or Toss identity is included in analytics.

- Control: first 5 generations, recurring random 5–30.
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
