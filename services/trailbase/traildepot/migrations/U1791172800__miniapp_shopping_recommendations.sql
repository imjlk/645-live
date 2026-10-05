-- Operator-managed recommendations, never user identities or analytics events.
-- Enable the policy only after the miniapp placement/channel is approved.
CREATE TABLE ait_lotto_shopping_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1))
) STRICT;
INSERT INTO ait_lotto_shopping_policy VALUES (1, 0);

CREATE TABLE ait_lotto_shopping_recommendations (
  placement TEXT PRIMARY KEY CHECK (placement IN ('generator', 'previous_results')),
  product_id TEXT NOT NULL CHECK (length(product_id) BETWEEN 1 AND 64),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  affiliate_url TEXT NOT NULL,
  image_url TEXT,
  starts_at INTEGER NOT NULL CHECK (starts_at >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > starts_at),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at INTEGER NOT NULL
) STRICT;
