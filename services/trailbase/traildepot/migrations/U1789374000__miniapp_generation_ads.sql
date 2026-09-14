-- Extend the placement allowlist without losing sessions or attendance references.
CREATE TABLE ait_lotto_ad_placements_v3 (
  placement TEXT PRIMARY KEY CHECK (placement IN ('custom', 'report', 'attendance_restore', 'generation_continue')),
  rewarded_group_id TEXT,
  interstitial_group_id TEXT,
  rewarded_weight INTEGER NOT NULL DEFAULT 50 CHECK (rewarded_weight BETWEEN 0 AND 100),
  cooldown_ms INTEGER NOT NULL DEFAULT 60000 CHECK (cooldown_ms >= 30000),
  daily_cap INTEGER NOT NULL DEFAULT 5 CHECK (daily_cap BETWEEN 1 AND 20),
  pass_duration_ms INTEGER NOT NULL DEFAULT 86400000 CHECK (pass_duration_ms BETWEEN 60000 AND 604800000),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
) STRICT;
INSERT INTO ait_lotto_ad_placements_v3 SELECT * FROM ait_lotto_ad_placements;
INSERT INTO ait_lotto_ad_placements_v3(placement) VALUES ('generation_continue');
CREATE TABLE ait_lotto_ad_sessions_v3 (
  id TEXT PRIMARY KEY,
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  placement TEXT NOT NULL REFERENCES ait_lotto_ad_placements_v3(placement),
  format TEXT NOT NULL CHECK (format IN ('rewarded', 'interstitial')),
  group_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'cancelled', 'expired')),
  expires_at INTEGER NOT NULL,
  pass_duration_ms INTEGER NOT NULL,
  events_json TEXT CHECK (events_json IS NULL OR json_valid(events_json)),
  attendance_day INTEGER,
  generation_ad_cycle INTEGER
) STRICT;
INSERT INTO ait_lotto_ad_sessions_v3 SELECT *, NULL FROM ait_lotto_ad_sessions;
CREATE TABLE ait_lotto_attendance_restores_v3 (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  ad_session_id TEXT UNIQUE REFERENCES ait_lotto_ad_sessions_v3(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
) STRICT;
INSERT INTO ait_lotto_attendance_restores_v3 SELECT * FROM ait_lotto_attendance_restores;
DROP TABLE ait_lotto_attendance_restores;
DROP TABLE ait_lotto_ad_sessions;
DROP TABLE ait_lotto_ad_placements;
ALTER TABLE ait_lotto_ad_placements_v3 RENAME TO ait_lotto_ad_placements;
ALTER TABLE ait_lotto_ad_sessions_v3 RENAME TO ait_lotto_ad_sessions;
ALTER TABLE ait_lotto_attendance_restores_v3 RENAME TO ait_lotto_attendance_restores;
CREATE INDEX ait_lotto_ad_sessions_user_created ON ait_lotto_ad_sessions(user_id, created_at);
CREATE UNIQUE INDEX ait_lotto_ad_sessions_pending ON ait_lotto_ad_sessions(user_id) WHERE status = 'pending';

-- Private server state: successful generations count once across retries and devices.
CREATE TABLE ait_lotto_generation_ad_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  min_generations INTEGER NOT NULL CHECK (min_generations BETWEEN 1 AND 200),
  max_generations INTEGER NOT NULL CHECK (max_generations BETWEEN min_generations AND 200)
) STRICT;
INSERT INTO ait_lotto_generation_ad_policy VALUES (1, 10, 50);
CREATE TABLE ait_lotto_generation_ad_progress (
  user_id BLOB PRIMARY KEY REFERENCES _user(id) ON DELETE CASCADE,
  remaining INTEGER NOT NULL CHECK (remaining BETWEEN 0 AND 200),
  cycle INTEGER NOT NULL DEFAULT 0 CHECK (cycle >= 0),
  updated_at INTEGER NOT NULL
) STRICT;
