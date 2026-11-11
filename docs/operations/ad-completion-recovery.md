# Ad completion and checkout diagnostics

Completed SDK event receipts are retained in Apps in Toss Storage, scoped to the authenticated app principal. They are replayed only to the existing authenticated completion endpoint; stored data never grants access. A successful response clears the receipt. Expired or missing server sessions are discarded. Existing server expiry, ad cadence, skip rewards and placement rules are unchanged.

Transient network/time-out/5xx completion failures retry once after 400 ms using the same session ID. Closing the app preserves unresolved completion for a later explicit continuation. Recovery refills a local counter only when the original placement and opportunity still match. Storage errors retain in-memory recovery and emit a diagnostic; persistence is best effort.

The metrics endpoint accepts allowlisted purchase-v1 events independently of generation cadence. purchase_entered means an accepted purchase-button action; purchase_opened means the SDK checkout was invoked, not proof that the native screen became visible. purchase_canceled requires the native USER_CANCELED result. purchase_succeeded requires both server verification in the grant callback and successful SDK completion; it is a client funnel signal, not a settlement ledger. Restore/background refresh never counts as a new purchase. No order IDs, receipts, raw user identifiers or error messages are sent.

Existing optional server collection and 45-day analytics retention apply. Deploy the backend before testing the bundle. Validate interrupted network, app restart, account changes, expiration, double taps, purchase cancellation, verification failure and restoration on real devices.
