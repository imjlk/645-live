-- Bounded, short-lived public snapshots amortize cumulative reads across clients.
-- A separate forward migration also upgrades depots already testing the insights.
CREATE TABLE IF NOT EXISTS lotto_activity_all_cache (
  round INTEGER PRIMARY KEY CHECK(round > 0),
  current_round INTEGER NOT NULL CHECK(current_round >= round),
  captured_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > captured_at),
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json))
) STRICT;
