# Generation ad cadence experiment

Experiment: `generation-cadence-v1`. Activated only by releasing the new miniapp bundle; 1.5.3 and earlier are not enrolled. No backend migration or production database write is needed.

## Allocation and behavior

- 50% control: first 5 generations, then uniformly random 5–30 per cycle.
- 50% short: uniformly random 2–5 for both the first and subsequent cycles. A draw of 2 means two successful generations, then the next generation requires the explicit ad CTA.
- Allocation is a deterministic hash of experiment ID and the existing internal authenticated principal. Allocation is stable across sessions/devices for that principal; small samples will not be exactly 50:50. Account recreation/linking that changes the principal can change assignment.
- Progress is device storage scoped by principal, experiment and arm. Both arms start a fresh counter on first experiment enrollment; legacy progress remains available for rollback. Restarting restores progress; reinstalling/clearing storage starts a new first gate without changing the arm.
- The generation automatically performed after ad completion counts as the first generation of the new cycle. Failed generation requests and replayed generation IDs do not consume another slot.
- Existing ad availability, error handling, explicit CTA, server quotas and rewards remain unchanged. No-fill continuation must be reported separately from successful ad completion.
- Only the server's baseline `device / first=5 / min=5 / max=30` enables this experiment. Any other server policy bypasses allocation and retains server behavior. For an operational stop, change the server policy (for example max 29) through the existing approved administration flow; refreshed clients leave the experiment. Releasing a bundle without allocation is the exact baseline rollback. Do not change the experiment's hash/salt or cadence mid-analysis; create a new experiment ID instead.

## Metrics

Events use the existing Apps in Toss logging path. `policy` carries experiment/arm and actual cadence; `app_version` separates releases. An ephemeral `session_id` joins events within one app JavaScript lifetime, and `flow_id` joins one CTA attempt. No user ID, raw Toss identity, generated numbers or auth values are added to telemetry.

- `lotto_ad_experiment_exposed`: ready, foreground session enrollment, once per policy in this app lifetime.
- `lotto_ad_generation_attempted` / `lotto_ad_generation_succeeded`: all generation attempts/successes, including those without ads.
- Existing `lotto_ad_cta_viewed` → `lotto_ad_requested` → `lotto_ad_shown` → `lotto_ad_completed` → `lotto_ad_generation_completed` is the ad continuation funnel.
- `lotto_ad_unavailable` and `lotto_ad_failed` distinguish inventory/technical problems. Completion is **not** inferred merely from a closed ad.

Primary diagnostic: percentage of matured CTA attempts without a matching successful generation within 5 minutes. Secondary: successful generations in the first 5 minutes per exposed session, ad completion/no-fill/error rates. These are session/attempt continuation proxies, **not unique-user churn or D1/D7 retention**. Multiple attempts from the same user are correlated; do not claim statistical significance using attempts as independent users. For true user retention, use an authorized platform user-cohort export with repeat-user joins; this implementation deliberately does not invent a persistent analytics identifier.

Compare both arms concurrently on the same app version, date range and platform, excluding local preview and test accounts. Keep enrollment open for at least a complete weekly cycle, define minimum sample size and acceptable deterioration before reading results, and inspect sample imbalance and error/no-fill rates before interpreting abandonment. Do not stop at the first favorable daily result. Report numerator, denominator, uncertainty and revenue per exposed user/session alongside continuation; more ads alone is not a win.

## Export report

The report accepts normalized JSONL, not an assumed native console export format. Map an authorized export to:

```json
{"timestampMs":1793250000000,"log_name":"lotto_ad_cta_viewed","params":{"policy":"generation-cadence-v1/short:device:2-5:2-5","session_id":"ephemeral-session","flow_id":"attempt","app_version":"1.6.0"}}
```

Include complete events from exposure through the follow-up window and normalize timestamps to UTC milliseconds. Do not commit real exports. The cutoff is the time through which the export is complete (not the current clock). Recent incomplete 5-minute windows are excluded. Duplicate CTA views are deduplicated by session/flow. No denominator yields `null`, never a manufactured 0%.

```sh
bun scripts/miniapp/ad-experiment-report.ts /private/events.jsonl 1.6.0 2026-11-10T00:00:00Z
```

Before release, verify both arms on device using synthetic test principals in local tests and check console delivery of the new event parameters. This repository implementation does not create a hosted analytics dashboard or assert that a console export API is available.
