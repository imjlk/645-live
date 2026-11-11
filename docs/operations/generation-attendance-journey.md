# Generation and attendance observations

The attendance entry is adjacent to generation and saving actions, before secondary statistics and the inline banner. It highlights server-confirmed eligibility. Opening it still leads to the existing attendance sheet, including restoration choices and explicit check-in; no reward, cadence, daily gate or assignment changes are made.

The optional private metrics mirror accepts `journey-v1` events under `app_journey`. Readiness is observed after authentication/configuration, so it is not a total-launch counter. Button/attendance entry visibility requires half the element on screen continuously for one second while the route is active. Clicks can precede an impression. Generation and attendance actions use ephemeral flow IDs; no generated numbers, purchase receipts or identifiers are added to event properties.

Generation success distinguishes ad, recovered ad, ticket/replayed ticket, ad-free purchase and free continuation. Repeated callbacks within an attempt are deduplicated. Ticket telemetry never calls the ad SDK. Check-in success is recorded after the server confirms check-in, independently of subsequent reward refresh or payment.

Use query 27 with analytics attached. It separates v4 enrollment-day observations from previously enrolled users; neither means acquisition source or actual signup date. Missing stages are incomplete observations, not certain exits. Daily unique users are not additive across days, and D1 waits for a complete follow-up day. Queries 22–24 remain the stable existing experiment/revenue comparison; do not backfill new journey events or combine their adoption gaps with older releases.
