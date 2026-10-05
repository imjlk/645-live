# Miniapp bootstrap diagnostics

The miniapp already reuses `ensure_verified_auth_user_tx` and performs official password login against `http://127.0.0.1:4000`. Repeated verified accounts do not rewrite their password hash; previous-secret recovery remains enabled. Keep the public app/API URL unchanged. `TRAILBASE_AUTH_BASE_URL` can override the internal auth origin; only use HTTPS or an encrypted trusted connection for a non-loopback override.

Set `TRAILBASE_BOOTSTRAP_TIMING=true` on the TrailBase service for a bounded measurement window and recreate the service. All provided Compose variants forward the variable; `miniapp-settings.mjs` writes it into the private WASM settings file. Only the exact string `true` enables it. It defaults to `false`, and other values disable it. Set it back to `false` and recreate the service after measurement. This change does not enable diagnostics or deploy production automatically.

One `bootstrap_timing` line is emitted per miniapp bootstrap, including early failures. It accepts no identifiers, URLs, tokens, provider responses or arbitrary error text. It creates no database/analytics rows and does not change the API response.

- `prepare_ms`: body validation, rate-limit transaction and anonymous-key provider verification, plus credential preparation. In this app provider verification precedes the profile transaction, so it belongs here rather than `auth_ms`.
- `transaction_open_ms`: profile/auth-user transaction acquisition; not pure lock wait.
- `transaction_ms`: account/profile database work including commit.
- `auth_ms`: official TrailBase HTTP login including any previous-secret recovery; not pure network latency.
- `response_ms`: response assembly after authentication.
- `total_ms`: sum of these handler stages, excluding upstream routing and response transport after handler return.

Compare cold/new and warm/existing accounts separately, using p50/p95 and error rates. A local development identity bypasses Toss key verification; its timings cannot establish production speed. The web session endpoint is unchanged and does not emit these miniapp diagnostics.

`miniapp-guest/src/bootstrap_timing.rs` is an unchanged copy of the Kit's `templates/trailbase/bootstrap_timing.rs`, used because the pinned Kit predates the exported helper. Reconcile or replace this consumer-owned copy during a future Kit update; this patch does not upgrade unrelated SDK/proxy contracts.

Validation against a separately built image and disposable depots:

```sh
python3 scripts/miniapp/bootstrap-timing-smoke.py --image 645-trailbase:miniapp
```

This checks diagnostics off/on, success/failure coverage, fixed log fields, additive durations, stable account/password hashes, and acceptance of official TrailBase tokens. It does not use production data or call Toss.
