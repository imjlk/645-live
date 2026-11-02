-- Links a continuation ad to the client prompt it answers, so a watched ad and an
-- ad skip ticket can never both resolve the same prompt (ad_skip_opportunities).
-- Legacy clients send no key and keep their existing ad behavior.
ALTER TABLE ait_lotto_ad_sessions ADD COLUMN ad_skip_opportunity_key TEXT
  CHECK (ad_skip_opportunity_key IS NULL OR length(ad_skip_opportunity_key) BETWEEN 1 AND 128);
