# Generation reports

The `generation-cadence-v4` phase keeps the existing principal assignment: `control`
is A (2–8 subsequent generations), `short` is B (2–5). Both use one successful daily
generation for attendance, a first gate drawn from 1–3, and the same returning daily
continuation condition. A counter interval includes the generation performed by its
continuation CTA. Counters and draws stay on the client; metrics never authorize them.

Deploy the forward migration and WASM before releasing the client. Existing v3
bundles retain their handshake and legacy groups. V4 enrollment makes attendance
available after one generation; returning to an old bundle cannot raise that account's
requirement. Assignment stays stable. A v4 counter starts a new first-gate draw once,
except an unresolved old prompt is retained so pending ticket recovery stays valid.
Later updates do not reset the v4 counter. Existing rewards and ticket balances stay intact.

The server selects the arm from the authenticated principal. The four mappings in
`ait_lotto_generation_ad_groups` are private operator data, and existing placement
enablement, format weights, cooldown and caps apply equally to both arms. Missing
experiment groups never fall back to a shared revenue group. Test mode still uses
test-only SDK group IDs. These groups measure **generation continuation revenue**;
shared banners, custom generation, reports and attendance recovery are excluded.

Use SQL editor query `22-generation-v4-summary.sql` with `analytics` attached for
activity and mature D1/D7. Receipt timestamps avoid device clock skew; transmission
delay can still affect the KST midnight boundary. Read the interpretation comments.

To update revenue:

1. Read Apps in Toss `iaa_placement_group_list` for this app with `includeReport=true`
   and explicit start/end dates. Prefer completed KST days and refresh the report
   after the console's daily update. Save the returned group array privately as JSON.
2. Run `bun scripts/miniapp/ad-revenue-import.mjs /private/path/groups.json /private/path/import.sql`.
3. Execute the generated SQL in this app's authenticated SQL editor. It only upserts
   allowlisted date/group aggregates and cannot change rewards or user balances.
4. Run `23-generation-v4-revenue.sql` with `analytics` attached. Reimporting a newer
   report updates corrected amounts. Null/missing reports remain **unknown**, not zero.
   Both format reports are needed for a complete arm/day total; the partial amount
   is shown separately. Do not manufacture missing zero rows.

The reports use estimated KRW, not settled revenue. The difference subtracts successful
attendance payouts requested after enrollment while the latest observed phase is v4,
including returns to v4. Without a later observation, enrollment is the fallback;
missing telemetry can therefore affect cost attribution.
It is not net profit: shared revenue, operating costs, and unclaimed future benefits
are excluded. Weekly payout timing can reflect earlier attendance. Keep reward policy
and observation periods aligned when comparing arms. Metrics are retained for 45 days;
withdrawal removes the account's activity and enrollment, so this is an operational
comparison rather than an immutable financial close.

Reward grace end is a separate runtime setting (`AIT_REWARD_LEGACY_POINTS_ENDS_AT`,
exclusive epoch milliseconds). Verify it in Coolify and the mounted runtime settings
before release; a campaign end date or an eligibility claim deadline is not that value.
Preserve earned claims through their existing deadline. See `OPERATIONS.md`.


SQL editor report 24 compares daily ticket use, generation ad revenue and D1/D7 server activity across the existing cadence arms from November 6 (KST). Builds through 2.0.0 did not mirror v4 exposure events. The report uses server records after enrollment for daily activity and requires both format reports before showing revenue.
