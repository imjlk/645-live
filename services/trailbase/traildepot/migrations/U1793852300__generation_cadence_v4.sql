-- Private enrollment and reporting. Existing v3 enrollments remain unchanged.
CREATE TABLE ait_lotto_generation_experiment_enrollments (
  user_id BLOB NOT NULL REFERENCES _user(id) ON DELETE CASCADE,
  experiment TEXT NOT NULL CHECK (experiment = 'generation-cadence-v4'),
  variant TEXT NOT NULL CHECK (variant IN ('control','short')),
  enrolled_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, experiment)
) STRICT;

-- The server chooses the arm from the authenticated principal, never client input.
-- Dedicated groups isolate this phase from old app versions and shared banners.
CREATE TABLE ait_lotto_generation_ad_groups (
  experiment TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control','short')),
  format TEXT NOT NULL CHECK (format IN ('rewarded','interstitial')),
  group_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY (experiment,variant,format)
) STRICT;
INSERT INTO ait_lotto_generation_ad_groups VALUES
 ('generation-cadence-v4','control','rewarded','ait.v2.live.7700cddda6e84a37'),
 ('generation-cadence-v4','control','interstitial','ait.v2.live.74d57d445b6d4fd9'),
 ('generation-cadence-v4','short','rewarded','ait.v2.live.af3e69b0e59d48d8'),
 ('generation-cadence-v4','short','interstitial','ait.v2.live.14e80579edd44ee2');

-- Operator-imported Apps in Toss reports. Estimated KRW, not settled revenue.
-- No user identifiers; reimports replace a day/group to support report corrections.
CREATE TABLE ait_lotto_ad_revenue_daily (
  report_day TEXT NOT NULL CHECK (length(report_day)=10),
  group_id TEXT NOT NULL REFERENCES ait_lotto_generation_ad_groups(group_id),
  impressions INTEGER NOT NULL CHECK (impressions>=0),
  estimated_revenue_krw REAL NOT NULL CHECK (estimated_revenue_krw>=0),
  imported_at INTEGER NOT NULL,
  PRIMARY KEY (report_day,group_id)
) STRICT;
