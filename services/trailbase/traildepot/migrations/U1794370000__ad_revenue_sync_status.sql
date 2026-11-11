-- Private operator import status; never expose through the public Record API.
CREATE TABLE ait_lotto_ad_revenue_syncs (
  run_id TEXT PRIMARY KEY NOT NULL,
  start_day TEXT NOT NULL,
  end_day TEXT NOT NULL,
  fetched_at INTEGER NOT NULL CHECK(fetched_at>0),
  reported_rows INTEGER NOT NULL CHECK(reported_rows>=0),
  missing_group_days INTEGER NOT NULL CHECK(missing_group_days>=0)
) STRICT;
CREATE INDEX idx_ait_lotto_ad_revenue_syncs_fetched ON ait_lotto_ad_revenue_syncs(fetched_at DESC);
