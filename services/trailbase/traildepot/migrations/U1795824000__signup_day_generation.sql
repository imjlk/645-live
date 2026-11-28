-- Private cohort outcome: NULL = incomplete historical coverage, 0/1 = known.
-- Keep one bit on the existing profile. Retain no numbers or purchase data.
ALTER TABLE ait_lotto_profiles ADD COLUMN signup_day_generated INTEGER
  CHECK (signup_day_generated IN (0, 1));

CREATE TRIGGER ait_lotto_signup_day_generation_start
AFTER INSERT ON ait_lotto_profiles
BEGIN
  UPDATE ait_lotto_profiles SET signup_day_generated = 0 WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER ait_lotto_signup_day_generation_complete
AFTER INSERT ON ait_lotto_generation_requests
BEGIN
  UPDATE ait_lotto_profiles SET signup_day_generated = 1
  WHERE user_id = NEW.user_id AND signup_day_generated = 0
    AND NEW.created_at >= created_at
    AND (NEW.created_at + 32400000) / 86400000 = (created_at + 32400000) / 86400000;
END;

-- The archive always keeps the last 24 hours of receipts. Only today's KST
-- signups can be initialized completely; leave older profiles unknown.
UPDATE ait_lotto_profiles AS p
SET signup_day_generated = EXISTS (
  SELECT 1 FROM ait_lotto_generation_requests r
  WHERE r.user_id = p.user_id AND r.created_at >= p.created_at
    AND (r.created_at + 32400000) / 86400000 = (p.created_at + 32400000) / 86400000
)
WHERE p.created_at >= unixepoch('now', '+9 hours', 'start of day', '-9 hours') * 1000;
