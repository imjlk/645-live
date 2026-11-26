# Generation and attendance observations

The attendance entry is adjacent to generation and saving actions, before secondary statistics and the inline banner. It highlights server-confirmed eligibility. Opening it still leads to the existing attendance sheet, including restoration choices and explicit check-in; no reward, cadence, daily gate or assignment changes are made.

The optional private metrics mirror accepts `journey-v1` events under `app_journey`. Readiness is observed after authentication/configuration, so it is not a total-launch counter. Button/attendance entry visibility requires half the element on screen continuously for one second while the route is active. Clicks can precede an impression. Generation and attendance actions use ephemeral flow IDs; no generated numbers, purchase receipts or identifiers are added to event properties.

Generation success distinguishes ad, recovered ad, ticket/replayed ticket, ad-free purchase and free continuation. Repeated callbacks within an attempt are deduplicated. Ticket telemetry never calls the ad SDK. Check-in success is recorded after the server confirms check-in, independently of subsequent reward refresh or payment.

Use query 27 with analytics attached. It separates v4 enrollment-day observations from previously enrolled users; neither means acquisition source or actual signup date. Missing stages are incomplete observations, not certain exits. Daily unique users are not additive across days, and D1 waits for a complete follow-up day. Queries 22–24 remain the stable existing experiment/revenue comparison; do not backfill new journey events or combine their adoption gaps with older releases.

## First generation and return after the draw

Deploy the TrailBase guest before releasing the measuring bundle. The attendance response advertises support through `engagementStudy`. Older servers keep the original button and existing metrics.

In the SQL editor, attach `analytics` and run [29-first-generation-copy.sql](../../services/trailbase/sql/29-first-generation-copy.sql). New profiles on their first KST day with no generation receipt are assigned a stable 50:50 label using the random suffix of their account UUID. Only the enabled free generation button participates. A tap counts as exposure even before the visibility observer runs. Compare counts and first-day generation rates between arms after complete KST days.

Run [30-saved-round-return.sql](../../services/trailbase/sql/30-saved-round-return.sql) for each draw. Its denominator is distinct app accounts observed saving that round before its scheduled draw. The numerator is the same savers who actually see the results for that round in the next 48 hours, including savers without notification consent. A blank rate means the window is still open. This measures result views, independently of D1 app opens and notification delivery. Saves before instrumentation cannot be reconstructed from device storage for the full cohort. Treat the rollout round as partial and compare full instrumented rounds. The four new study events retain client occurrence time when delivery is up to seven days late, with five minutes of allowed forward clock skew. Out-of-range study events are skipped individually. Counts may be revised as delayed observations arrive.
