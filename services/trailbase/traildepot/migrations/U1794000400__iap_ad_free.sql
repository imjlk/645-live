-- Private order ledger. The native store supplies account-scoped purchase history.
-- No public Record API, account identifiers or reusable order receipts.
CREATE TABLE ait_lotto_ad_free_orders (
  order_digest TEXT PRIMARY KEY NOT NULL,
  refunded INTEGER NOT NULL CHECK (refunded IN (0, 1))
) STRICT;
