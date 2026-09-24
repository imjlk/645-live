-- A streak restore is a reward, so an interstitial impression cannot grant it.
-- Preserve historical ad sessions and restore records; change only future selection.
UPDATE ait_lotto_ad_placements
SET interstitial_group_id = NULL,
    rewarded_weight = 100,
    enabled = CASE
      WHEN rewarded_group_id IS NULL OR trim(rewarded_group_id) = '' THEN 0
      ELSE enabled
    END
WHERE placement = 'attendance_restore';
