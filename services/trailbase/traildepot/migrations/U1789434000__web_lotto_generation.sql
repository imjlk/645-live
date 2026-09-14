-- Web identities are independent of verified Apps in Toss identities and web members.
-- Only the public generation ledger and its existing counters are shared.
CREATE TABLE web_lotto_profiles (
  user_id BLOB PRIMARY KEY REFERENCES _user(id) ON DELETE CASCADE,
  installation_hmac TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;
CREATE INDEX web_lotto_profiles_presence ON web_lotto_profiles(last_seen_at) WHERE disabled = 0;

-- An atomic batch keeps retries from publishing the same games twice. IDs remain
-- after a public deletion, so an old request cannot resurrect a deleted game.
CREATE TABLE web_lotto_generation_batches (
  user_id BLOB NOT NULL REFERENCES web_lotto_profiles(user_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  generation_ids_json TEXT NOT NULL CHECK (json_valid(generation_ids_json)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, request_id)
) STRICT;
CREATE INDEX web_lotto_batches_created ON web_lotto_generation_batches(user_id, created_at);

-- Expand the origin constraint without rewriting the shipped baseline or public rows.
CREATE TABLE ait_lotto_generation_origins_v2 (
  generation_id INTEGER PRIMARY KEY REFERENCES lotto_public_generations(id) ON DELETE CASCADE,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'bot')),
  source TEXT NOT NULL CHECK (source IN ('miniapp', 'bot', 'web'))
) STRICT;
INSERT INTO ait_lotto_generation_origins_v2 SELECT * FROM ait_lotto_generation_origins;
DROP TABLE ait_lotto_generation_origins;
ALTER TABLE ait_lotto_generation_origins_v2 RENAME TO ait_lotto_generation_origins;
CREATE INDEX ait_lotto_generation_origins_actor ON ait_lotto_generation_origins(actor_kind, generation_id);
