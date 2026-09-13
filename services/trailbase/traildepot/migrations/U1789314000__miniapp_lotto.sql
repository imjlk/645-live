-- Miniapp generations have no relationship to QR scan counters.
CREATE TABLE ait_lotto_profiles (
  user_id BLOB PRIMARY KEY REFERENCES _user(id) ON DELETE CASCADE,
  anonymous_hash_hmac TEXT NOT NULL UNIQUE,
  anonymous_key_sealed TEXT,
  display_name TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;
CREATE INDEX ait_lotto_profiles_presence ON ait_lotto_profiles(last_seen_at) WHERE disabled = 0;

CREATE TABLE lotto_public_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round INTEGER NOT NULL CHECK (round > 0),
  display_name TEXT NOT NULL,
  number_1 INTEGER NOT NULL CHECK (number_1 BETWEEN 1 AND 45),
  number_2 INTEGER NOT NULL CHECK (number_2 BETWEEN 1 AND 45),
  number_3 INTEGER NOT NULL CHECK (number_3 BETWEEN 1 AND 45),
  number_4 INTEGER NOT NULL CHECK (number_4 BETWEEN 1 AND 45),
  number_5 INTEGER NOT NULL CHECK (number_5 BETWEEN 1 AND 45),
  number_6 INTEGER NOT NULL CHECK (number_6 BETWEEN 1 AND 45),
  created_at INTEGER NOT NULL,
  CHECK (number_1 < number_2 AND number_2 < number_3 AND number_3 < number_4 AND number_4 < number_5 AND number_5 < number_6)
) STRICT;
CREATE TABLE ait_lotto_generation_origins (
  generation_id INTEGER PRIMARY KEY REFERENCES lotto_public_generations(id) ON DELETE CASCADE,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'bot')),
  source TEXT NOT NULL CHECK (source IN ('miniapp', 'bot'))
) STRICT;
CREATE INDEX ait_lotto_generation_origins_actor ON ait_lotto_generation_origins(actor_kind, generation_id);
CREATE INDEX lotto_public_generations_round_id ON lotto_public_generations(round, id DESC);
CREATE INDEX lotto_public_generations_created_at ON lotto_public_generations(created_at);

-- Private ownership/idempotency: never exposed through Record API.
-- Keep tombstones after public deletion so retrying an old request cannot republish it.
CREATE TABLE ait_lotto_generation_requests (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  generation_id INTEGER UNIQUE REFERENCES lotto_public_generations(id) ON DELETE SET NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, request_id)
) STRICT;
CREATE INDEX ait_lotto_generation_requests_created ON ait_lotto_generation_requests(user_id, created_at);

-- Same round + 45 number counter shape as lotto_draw_scan_counts, isolated from purchases.
-- All generated combinations participate in the same counters; origin remains auditable.
CREATE TABLE lotto_draw_generation_counts (
  round INTEGER PRIMARY KEY,
  total_generations INTEGER NOT NULL DEFAULT 0 CHECK (total_generations >= 0),
  generation_count_1 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_1 >= 0),
  generation_count_2 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_2 >= 0),
  generation_count_3 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_3 >= 0),
  generation_count_4 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_4 >= 0),
  generation_count_5 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_5 >= 0),
  generation_count_6 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_6 >= 0),
  generation_count_7 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_7 >= 0),
  generation_count_8 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_8 >= 0),
  generation_count_9 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_9 >= 0),
  generation_count_10 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_10 >= 0),
  generation_count_11 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_11 >= 0),
  generation_count_12 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_12 >= 0),
  generation_count_13 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_13 >= 0),
  generation_count_14 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_14 >= 0),
  generation_count_15 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_15 >= 0),
  generation_count_16 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_16 >= 0),
  generation_count_17 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_17 >= 0),
  generation_count_18 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_18 >= 0),
  generation_count_19 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_19 >= 0),
  generation_count_20 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_20 >= 0),
  generation_count_21 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_21 >= 0),
  generation_count_22 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_22 >= 0),
  generation_count_23 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_23 >= 0),
  generation_count_24 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_24 >= 0),
  generation_count_25 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_25 >= 0),
  generation_count_26 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_26 >= 0),
  generation_count_27 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_27 >= 0),
  generation_count_28 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_28 >= 0),
  generation_count_29 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_29 >= 0),
  generation_count_30 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_30 >= 0),
  generation_count_31 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_31 >= 0),
  generation_count_32 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_32 >= 0),
  generation_count_33 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_33 >= 0),
  generation_count_34 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_34 >= 0),
  generation_count_35 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_35 >= 0),
  generation_count_36 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_36 >= 0),
  generation_count_37 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_37 >= 0),
  generation_count_38 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_38 >= 0),
  generation_count_39 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_39 >= 0),
  generation_count_40 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_40 >= 0),
  generation_count_41 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_41 >= 0),
  generation_count_42 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_42 >= 0),
  generation_count_43 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_43 >= 0),
  generation_count_44 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_44 >= 0),
  generation_count_45 INTEGER NOT NULL DEFAULT 0 CHECK (generation_count_45 >= 0),
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TRIGGER ait_lotto_count_insert AFTER INSERT ON lotto_public_generations BEGIN
  INSERT OR IGNORE INTO lotto_draw_generation_counts(round, updated_at) VALUES (NEW.round, NEW.created_at);
  UPDATE lotto_draw_generation_counts SET
    total_generations = total_generations + 1,
    generation_count_1 = generation_count_1 + (1 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_2 = generation_count_2 + (2 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_3 = generation_count_3 + (3 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_4 = generation_count_4 + (4 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_5 = generation_count_5 + (5 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_6 = generation_count_6 + (6 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_7 = generation_count_7 + (7 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_8 = generation_count_8 + (8 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_9 = generation_count_9 + (9 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_10 = generation_count_10 + (10 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_11 = generation_count_11 + (11 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_12 = generation_count_12 + (12 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_13 = generation_count_13 + (13 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_14 = generation_count_14 + (14 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_15 = generation_count_15 + (15 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_16 = generation_count_16 + (16 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_17 = generation_count_17 + (17 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_18 = generation_count_18 + (18 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_19 = generation_count_19 + (19 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_20 = generation_count_20 + (20 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_21 = generation_count_21 + (21 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_22 = generation_count_22 + (22 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_23 = generation_count_23 + (23 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_24 = generation_count_24 + (24 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_25 = generation_count_25 + (25 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_26 = generation_count_26 + (26 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_27 = generation_count_27 + (27 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_28 = generation_count_28 + (28 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_29 = generation_count_29 + (29 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_30 = generation_count_30 + (30 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_31 = generation_count_31 + (31 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_32 = generation_count_32 + (32 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_33 = generation_count_33 + (33 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_34 = generation_count_34 + (34 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_35 = generation_count_35 + (35 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_36 = generation_count_36 + (36 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_37 = generation_count_37 + (37 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_38 = generation_count_38 + (38 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_39 = generation_count_39 + (39 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_40 = generation_count_40 + (40 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_41 = generation_count_41 + (41 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_42 = generation_count_42 + (42 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_43 = generation_count_43 + (43 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_44 = generation_count_44 + (44 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    generation_count_45 = generation_count_45 + (45 IN (NEW.number_1, NEW.number_2, NEW.number_3, NEW.number_4, NEW.number_5, NEW.number_6)),
    updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE round = NEW.round;
END;
CREATE TRIGGER ait_lotto_count_delete AFTER DELETE ON lotto_public_generations BEGIN
  INSERT OR IGNORE INTO lotto_draw_generation_counts(round, updated_at) VALUES (OLD.round, OLD.created_at);
  UPDATE lotto_draw_generation_counts SET
    total_generations = total_generations - 1,
    generation_count_1 = generation_count_1 - (1 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_2 = generation_count_2 - (2 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_3 = generation_count_3 - (3 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_4 = generation_count_4 - (4 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_5 = generation_count_5 - (5 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_6 = generation_count_6 - (6 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_7 = generation_count_7 - (7 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_8 = generation_count_8 - (8 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_9 = generation_count_9 - (9 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_10 = generation_count_10 - (10 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_11 = generation_count_11 - (11 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_12 = generation_count_12 - (12 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_13 = generation_count_13 - (13 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_14 = generation_count_14 - (14 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_15 = generation_count_15 - (15 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_16 = generation_count_16 - (16 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_17 = generation_count_17 - (17 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_18 = generation_count_18 - (18 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_19 = generation_count_19 - (19 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_20 = generation_count_20 - (20 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_21 = generation_count_21 - (21 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_22 = generation_count_22 - (22 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_23 = generation_count_23 - (23 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_24 = generation_count_24 - (24 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_25 = generation_count_25 - (25 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_26 = generation_count_26 - (26 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_27 = generation_count_27 - (27 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_28 = generation_count_28 - (28 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_29 = generation_count_29 - (29 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_30 = generation_count_30 - (30 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_31 = generation_count_31 - (31 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_32 = generation_count_32 - (32 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_33 = generation_count_33 - (33 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_34 = generation_count_34 - (34 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_35 = generation_count_35 - (35 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_36 = generation_count_36 - (36 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_37 = generation_count_37 - (37 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_38 = generation_count_38 - (38 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_39 = generation_count_39 - (39 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_40 = generation_count_40 - (40 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_41 = generation_count_41 - (41 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_42 = generation_count_42 - (42 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_43 = generation_count_43 - (43 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_44 = generation_count_44 - (44 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_45 = generation_count_45 - (45 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE round = OLD.round;
END;
CREATE TABLE ait_lotto_presence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_users INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
) STRICT;
INSERT INTO ait_lotto_presence VALUES (1, 0, 0);

CREATE TABLE ait_lotto_attendance (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
) STRICT;
CREATE TABLE ait_lotto_entitlements (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('custom', 'report')),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, feature)
) STRICT;
CREATE TABLE ait_lotto_ad_placements (
  placement TEXT PRIMARY KEY CHECK (placement IN ('custom', 'report')),
  rewarded_group_id TEXT,
  interstitial_group_id TEXT,
  rewarded_weight INTEGER NOT NULL DEFAULT 50 CHECK (rewarded_weight BETWEEN 0 AND 100),
  cooldown_ms INTEGER NOT NULL DEFAULT 60000 CHECK (cooldown_ms >= 30000),
  daily_cap INTEGER NOT NULL DEFAULT 5 CHECK (daily_cap BETWEEN 1 AND 20),
  pass_duration_ms INTEGER NOT NULL DEFAULT 86400000 CHECK (pass_duration_ms BETWEEN 60000 AND 604800000),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
) STRICT;
INSERT INTO ait_lotto_ad_placements(placement) VALUES ('custom'), ('report');
CREATE TABLE ait_lotto_ad_sessions (
  id TEXT PRIMARY KEY,
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  placement TEXT NOT NULL REFERENCES ait_lotto_ad_placements(placement),
  format TEXT NOT NULL CHECK (format IN ('rewarded', 'interstitial')),
  group_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'cancelled', 'expired')),
  expires_at INTEGER NOT NULL,
  pass_duration_ms INTEGER NOT NULL,
  events_json TEXT CHECK (events_json IS NULL OR json_valid(events_json))
) STRICT;
CREATE INDEX ait_lotto_ad_sessions_user_created ON ait_lotto_ad_sessions(user_id, created_at);
CREATE UNIQUE INDEX ait_lotto_ad_sessions_pending ON ait_lotto_ad_sessions(user_id) WHERE status = 'pending';

CREATE TABLE ait_lotto_result_watches (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round > 0),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, round)
) STRICT;

-- Kit functional ledger template: anonymous_bootstrap_attempts.sql
CREATE TABLE IF NOT EXISTS anonymous_bootstrap_attempts (
  bucket_key TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  window_started_at INTEGER NOT NULL,
  last_attempt_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_anonymous_bootstrap_attempts_last_attempt
  ON anonymous_bootstrap_attempts(last_attempt_at DESC);

-- Kit functional ledger template: message_templates.sql
CREATE TABLE IF NOT EXISTS message_templates (
  template_code TEXT PRIMARY KEY CHECK (length(trim(template_code)) > 0),
  purpose TEXT NOT NULL CHECK (purpose IN ('FUNCTIONAL', 'MARKETING')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'PAUSED', 'RETIRED')),
  requires_agreement INTEGER NOT NULL DEFAULT 0 CHECK (requires_agreement IN (0, 1)),
  agreement_template_code TEXT CHECK (
    agreement_template_code IS NULL
    OR length(trim(agreement_template_code)) > 0
  ),
  default_deeplink_path TEXT,
  cooldown_ms INTEGER NOT NULL DEFAULT 60000 CHECK (cooldown_ms >= 0),
  daily_limit INTEGER CHECK (daily_limit IS NULL OR daily_limit > 0),
  title_preview TEXT,
  body_preview TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (requires_agreement = 0 OR agreement_template_code IS NOT NULL)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_message_templates_purpose_status
  ON message_templates(purpose, status);

CREATE INDEX IF NOT EXISTS idx_message_templates_agreement_template_code
  ON message_templates(agreement_template_code)
  WHERE agreement_template_code IS NOT NULL;

-- Kit functional ledger template: notification_template_agreements.sql
CREATE TABLE IF NOT EXISTS notification_template_agreements (
  id TEXT PRIMARY KEY,
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL CHECK (length(trim(template_code)) > 0),
  status TEXT NOT NULL CHECK (status IN ('OPTED_IN', 'OPTED_OUT')),
  source TEXT NOT NULL,
  last_result TEXT CHECK (
    last_result IS NULL
    OR last_result IN ('newAgreement', 'alreadyAgreed', 'agreementRejected')
  ),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (user_id, template_code)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_notification_template_agreements_template_status
  ON notification_template_agreements(template_code, status);

CREATE INDEX IF NOT EXISTS idx_notification_template_agreements_user_updated
  ON notification_template_agreements(user_id, updated_at DESC);

-- Kit functional ledger template: message_outbox.core.sql
CREATE TABLE IF NOT EXISTS message_outbox (
  id TEXT PRIMARY KEY,
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  toss_user_key_hmac TEXT NOT NULL,
  toss_user_key_sealed TEXT,
  campaign_id TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('FUNCTIONAL', 'MARKETING')),
  template_code TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'READY' CHECK (
    status IN ('READY', 'LOCKED', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED')
  ),
  provider TEXT NOT NULL DEFAULT 'TOSS_SMART_MESSAGE',
  provider_request_id TEXT NOT NULL,
  provider_status TEXT,
  provider_result_type TEXT,
  provider_msg_count INTEGER,
  provider_sent_push_count INTEGER,
  provider_sent_inbox_count INTEGER,
  provider_response_json TEXT CHECK (
    provider_response_json IS NULL
    OR json_valid(provider_response_json)
  ),
  attempts INTEGER NOT NULL DEFAULT 0,
  not_before_at INTEGER NOT NULL,
  locked_at INTEGER,
  sent_at INTEGER,
  failed_at INTEGER,
  failure_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (idempotency_key)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_message_outbox_ready_dispatch
  ON message_outbox(not_before_at, created_at)
  WHERE status = 'READY';

CREATE INDEX IF NOT EXISTS idx_message_outbox_user_created
  ON message_outbox(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_outbox_toss_user_key_hmac
  ON message_outbox(toss_user_key_hmac);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_outbox_provider_request
  ON message_outbox(provider, provider_request_id)
  WHERE provider_request_id IS NOT NULL;

-- Kit functional ledger template: promotion_campaigns.sql
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id TEXT PRIMARY KEY,
  feature_key TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'TOSS' CHECK (provider IN ('TOSS')),
  provider_promotion_code TEXT NOT NULL CHECK (length(trim(provider_promotion_code)) > 0),
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'EXHAUSTED')),
  starts_at INTEGER,
  ends_at INTEGER,
  budget_limit_amount INTEGER CHECK (budget_limit_amount IS NULL OR budget_limit_amount > 0),
  max_grant_count INTEGER CHECK (max_grant_count IS NULL OR max_grant_count > 0),
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CHECK (
    status <> 'ACTIVE'
    OR (
      starts_at IS NOT NULL
      AND ends_at IS NOT NULL
      AND budget_limit_amount IS NOT NULL
    )
  )
) STRICT;

CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_active_feature
  ON promotion_campaigns(feature_key, status, starts_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_active_feature_window
  ON promotion_campaigns(feature_key, starts_at DESC, created_at DESC)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_provider_code
  ON promotion_campaigns(provider, provider_promotion_code);

-- Kit functional ledger template: promotion_reward_ledger.sql
CREATE TABLE IF NOT EXISTS promotion_reward_ledger (
  id TEXT PRIMARY KEY,
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (length(trim(source_type)) > 0),
  source_id TEXT,
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('recorded', 'pending', 'success', 'failed', 'cancelled')
  ),
  provider TEXT NOT NULL DEFAULT 'TOSS' CHECK (length(trim(provider)) > 0),
  provider_request_id TEXT NOT NULL UNIQUE CHECK (length(trim(provider_request_id)) > 0),
  provider_status TEXT,
  provider_error_code TEXT,
  provider_transaction_key TEXT,
  provider_response_json TEXT CHECK (
    provider_response_json IS NULL
    OR json_valid(provider_response_json)
  ),
  requested_at INTEGER NOT NULL,
  granted_at INTEGER,
  failed_at INTEGER,
  failure_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_promotion_reward_ledger_user_created
  ON promotion_reward_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_reward_ledger_campaign_status
  ON promotion_reward_ledger(campaign_id, status, created_at DESC)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotion_reward_ledger_source
  ON promotion_reward_ledger(source_type, source_id, created_at DESC)
  WHERE source_id IS NOT NULL;
