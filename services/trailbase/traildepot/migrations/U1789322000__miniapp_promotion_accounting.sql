-- A deleted app profile must not replenish a monetary campaign's spent budget.
CREATE TABLE ait_lotto_promotion_usage (
  campaign_id TEXT PRIMARY KEY REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  reserved_amount INTEGER NOT NULL CHECK (reserved_amount >= 0),
  grant_count INTEGER NOT NULL CHECK (grant_count >= 0)
) STRICT;

-- A campaign-scoped HMAC prevents a new app profile from claiming the same benefit.
-- There is deliberately no user FK, raw anonymous key, name, or provider credential.
CREATE TABLE ait_lotto_promotion_reservations (
  campaign_id TEXT NOT NULL REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  identity_hmac TEXT NOT NULL,
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (campaign_id, identity_hmac)
) STRICT;

CREATE TRIGGER ait_lotto_promotion_reserve AFTER INSERT ON ait_lotto_promotion_reservations
BEGIN
  INSERT INTO ait_lotto_promotion_usage(campaign_id, reserved_amount, grant_count)
  VALUES (NEW.campaign_id, NEW.reward_amount, 1)
  ON CONFLICT(campaign_id) DO UPDATE SET
    reserved_amount = reserved_amount + NEW.reward_amount,
    grant_count = grant_count + 1;
END;
