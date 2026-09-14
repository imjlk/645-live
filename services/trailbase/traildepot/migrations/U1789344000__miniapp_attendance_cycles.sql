-- Preserve existing placement/session records while allowing a bounded streak restore.
CREATE TABLE ait_lotto_ad_placements_v2 (
  placement TEXT PRIMARY KEY CHECK (placement IN ('custom', 'report', 'attendance_restore')),
  rewarded_group_id TEXT,
  interstitial_group_id TEXT,
  rewarded_weight INTEGER NOT NULL DEFAULT 50 CHECK (rewarded_weight BETWEEN 0 AND 100),
  cooldown_ms INTEGER NOT NULL DEFAULT 60000 CHECK (cooldown_ms >= 30000),
  daily_cap INTEGER NOT NULL DEFAULT 5 CHECK (daily_cap BETWEEN 1 AND 20),
  pass_duration_ms INTEGER NOT NULL DEFAULT 86400000 CHECK (pass_duration_ms BETWEEN 60000 AND 604800000),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
) STRICT;
INSERT INTO ait_lotto_ad_placements_v2 SELECT * FROM ait_lotto_ad_placements;
INSERT INTO ait_lotto_ad_placements_v2(placement) VALUES ('attendance_restore');
CREATE TABLE ait_lotto_ad_sessions_v2 (
  id TEXT PRIMARY KEY,
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  placement TEXT NOT NULL REFERENCES ait_lotto_ad_placements_v2(placement),
  format TEXT NOT NULL CHECK (format IN ('rewarded', 'interstitial')),
  group_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'cancelled', 'expired')),
  expires_at INTEGER NOT NULL,
  pass_duration_ms INTEGER NOT NULL,
  events_json TEXT CHECK (events_json IS NULL OR json_valid(events_json)),
  attendance_day INTEGER
) STRICT;
INSERT INTO ait_lotto_ad_sessions_v2 SELECT *, NULL FROM ait_lotto_ad_sessions;
DROP TABLE ait_lotto_ad_sessions;
DROP TABLE ait_lotto_ad_placements;
ALTER TABLE ait_lotto_ad_placements_v2 RENAME TO ait_lotto_ad_placements;
ALTER TABLE ait_lotto_ad_sessions_v2 RENAME TO ait_lotto_ad_sessions;
CREATE INDEX ait_lotto_ad_sessions_user_created ON ait_lotto_ad_sessions(user_id, created_at);
CREATE UNIQUE INDEX ait_lotto_ad_sessions_pending ON ait_lotto_ad_sessions(user_id) WHERE status = 'pending';
CREATE TABLE ait_lotto_attendance_cycles (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  start_day INTEGER NOT NULL,
  end_day INTEGER NOT NULL CHECK (end_day = start_day + 6),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, end_day)
) STRICT;
CREATE TABLE ait_lotto_attendance_restores (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  ad_session_id TEXT UNIQUE REFERENCES ait_lotto_ad_sessions(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
) STRICT;
-- These private reservations survive profile deletion, as the existing budget ledger does.
ALTER TABLE ait_lotto_promotion_reservations ADD COLUMN subject_hmac TEXT;
ALTER TABLE ait_lotto_promotion_reservations ADD COLUMN reward_kind TEXT CHECK (reward_kind IN ('daily', 'weekly'));
ALTER TABLE ait_lotto_promotion_reservations ADD COLUMN period_start INTEGER;
ALTER TABLE ait_lotto_promotion_reservations ADD COLUMN period_end INTEGER;
CREATE INDEX ait_lotto_promotion_periods ON ait_lotto_promotion_reservations(subject_hmac, reward_kind, period_end);
CREATE INDEX ait_lotto_promotion_user_period ON promotion_reward_ledger(user_id, source_type, source_id);
