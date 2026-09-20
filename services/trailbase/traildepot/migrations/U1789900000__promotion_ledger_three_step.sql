-- Kit promotion ledger v2: persisted three-step reward contract.
-- Adopts templates/trailbase/sql/promotion_reward_ledger.v2.sql from
-- trailbase-apps-in-toss-kit. Additive only: legacy grant rows keep their
-- keys and outcomes and stay protocol IS NULL; nothing is backfilled.
SAVEPOINT promotion_reward_ledger_v2;

ALTER TABLE promotion_reward_ledger ADD COLUMN protocol TEXT
  CHECK (protocol IS NULL OR protocol IN ('three-step'));

ALTER TABLE promotion_reward_ledger ADD COLUMN execution_started_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_promotion_reward_ledger_recovery
  ON promotion_reward_ledger(execution_started_at)
  WHERE protocol = 'three-step'
    AND status = 'pending'
    AND provider_transaction_key IS NOT NULL;

RELEASE promotion_reward_ledger_v2;
