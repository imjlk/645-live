# Conversion and ad diagnostics

Use the existing Apps in Toss event logger. Never reinitialize the SDK logger or mirror individual analytics events into the product database. Local preview prints sanitized events to the console without sending production events. The sandbox SDK also prints logs; production collection must be confirmed in the console after deployment.

## Product conversions

Suggested primary conversion: `lotto_combination_saved`. Supporting conversions: `lotto_generation_succeeded` and `lotto_saved_results_viewed`. Revisit activity is a separate console metric. Verify the current console settings before changing them; metric changes take effect the following day.

Statistics consumption: `lotto_insights_viewed`, `lotto_insights_detail_viewed`, and `lotto_insights_patterns_viewed`. Only a completed feature action records the corresponding detail/pattern event; dismissing an ad prompt does not. Screen visibility and stable selection keys prevent render-driven duplicates.

All app-owned product and ad events include a bounded `app_version`. Product events expose only a bounded `source`. Ad events project placement, format, policy, attempt-local flow ID, outcome and entry point. Never add credentials, account IDs, generated combinations or raw errors to these payloads. The SDK manages its own anonymous identity.

## Separate denominators

Full-screen attempts: `lotto_ad_cta_viewed` → `lotto_ad_requested` → `lotto_ad_shown` → `lotto_ad_completed` → `lotto_ad_settled`. Group by placement and format, deduplicate attempt-local `flow_id`, and report no-fill/failure separately. Rewarded completion and interstitial completion do not mean the same reward behavior.

Banners: `lotto_ad_banner_slot_viewed` → `lotto_ad_banner_requested` → `lotto_ad_banner_rendered` → `lotto_ad_banner_viewable`; SDK impression and click callbacks remain separate events. Rendering is not proof of viewability. A banner request denominator cannot explain the percentage of visitors who completed a full-screen ad.

Compare versions with the same window and traffic mix. Confirm delivery before interpreting missing events as zero conversions. Measure ad opportunity among visitors, completion among shown ads, successful generation after settlement, save conversion, and return visits together.

## Validation

1. In local preview, generate, save and open statistics. Inspect `[lotto analytics]` entries and their version/source.
2. In a sandbox build, verify the native event logs for the same actions, including canceling a feature ad.
3. After deployment, verify actual production collection and the selected console conversions. Keep the SDK's native ad viewability/refresh behavior.

Official references: [event logging](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/analytics/analytics.log), [conversion metrics](https://developers-apps-in-toss.toss.im/guide/analytics/conversion-metrics).
