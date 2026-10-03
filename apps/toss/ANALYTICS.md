# Conversion and ad diagnostics

Use the existing Apps in Toss event logger. Never reinitialize the SDK logger or mirror individual analytics events into the product database. Local preview prints sanitized events to the console without sending production events. The sandbox SDK also prints logs; production collection must be confirmed in the console after deployment.

## Product conversions

Suggested primary conversion: `lotto_combination_saved`. Supporting conversions: `lotto_generation_succeeded` and `lotto_saved_results_viewed`. Revisit activity is a separate console metric. Verify the current console settings before changing them; metric changes take effect the following day.

Statistics consumption: `lotto_insights_viewed`, `lotto_insights_detail_viewed`, and `lotto_insights_patterns_viewed`. Only a completed feature action records the corresponding detail/pattern event; dismissing an ad prompt does not. Screen visibility and stable selection keys prevent render-driven duplicates.

All app-owned product and ad events include a bounded `app_version`. Product conversion events expose only a bounded `source`. Performance events additionally project the allowed stage, outcome and bounded duration. Ad events project placement, format, policy, attempt-local flow ID, outcome and entry point. Never add credentials, account IDs, generated combinations or raw errors to these payloads. The SDK manages its own anonymous identity.

## Separate denominators

Full-screen attempts: `lotto_ad_cta_viewed` → `lotto_ad_requested` → `lotto_ad_shown` → `lotto_ad_completed` → `lotto_ad_settled`. Feature-ad dialogs record the CTA only after the TDS enter callback and pass the same attempt to the ad controller. Declining records `settled` with `outcome=declined`, without requesting an ad; abandoning the prompt records `prompt_canceled`. Resolve a reserved attempt's format from `session_started` by `flow_id`; an earlier CTA/request has `format=unknown`. Group by placement and resolved format, deduplicate attempt-local `flow_id`, and report no-fill/failure separately. Rewarded completion and interstitial completion do not mean the same reward behavior.

Banners: `lotto_ad_banner_slot_viewed` → `lotto_ad_banner_requested` → `lotto_ad_banner_rendered` → `lotto_ad_banner_viewable`; SDK impression and click callbacks remain separate events. Rendering is not proof of viewability. A banner request denominator cannot explain the percentage of visitors who completed a full-screen ad.

Compare versions with the same window and traffic mix. Confirm delivery before interpreting missing events as zero conversions. Measure ad opportunity among visitors, completion among shown ads, successful generation after settlement, save conversion, and return visits together.

## Validation

1. In local preview, generate, save and open statistics. Inspect `[lotto analytics]` entries and their version/source.
2. In a sandbox build, verify the native event logs for the same actions, including canceling a feature ad.
3. After deployment, verify actual production collection and the selected console conversions. Keep the SDK's native ad viewability/refresh behavior.

Official references: [event logging](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/analytics/analytics.log), [conversion metrics](https://developers-apps-in-toss.toss.im/guide/analytics/conversion-metrics).

## Result return links

A functional result notification may target `/saved?round=<draw-round>&entry=notification`. Match the approved console template link to this route using its round variable; the worker already supplies `context.round`. Do not change a template or request new consent implicitly during a code release. Verify the actual approved template and test its link before enabling dispatch.

Home returns use the existing saved tab and record `lotto_results_return_opened`. A round-targeted notification entry records `lotto_notification_result_opened`. Result viewing requires the summary to be at least half visible for one second on an active screen, including when it is below a banner. Read markers persist with each local saved combination, reopen after draw corrections, and do not suppress newly saved combinations. An absent local round is explained without showing a different round as the requested result.

## Performance

`lotto_performance` records the bounded stage, outcome and duration in milliseconds, with source and app version. Stages cover public context, restored/bootstrap session, first generator readiness, tab tap-to-layout, first statistics fetch per query, and live stream reconnection. No raw exception or network URL is transmitted. Only compare `outcome=ready` when calculating successful-load p50/p95; canceled, failed and 120-second-capped samples must be considered separately.

Initial context and authentication start independently. Private state and the local collection load independently after authentication, while the feed is loaded once by its existing subscription effect. Generation stays disabled until the private ad policy/counter is available. Private refreshes share one in-flight request to avoid bootstrap/foreground duplicates. Mutation settlement waits for an older in-flight read and then requires a fresh read.

The cold-start regression fixture holds both the initial feed and private ad configuration. It proves generation is blocked before policy and becomes ready before the feed reply; it does not establish physical-device latency. Measure iOS/Android cold launch, the first tab switch, background/foreground, offline recovery and font scaling in the test build before release.
