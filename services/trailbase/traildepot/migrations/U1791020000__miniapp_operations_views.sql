-- Private, read-only operational projections. Deliberately not registered in Record API.
-- Keep reservations authoritative for committed budget even when profiles/ledger rows are deleted.
CREATE VIEW ait_lotto_ops_campaigns AS
SELECT c.feature_key, c.status, c.reward_amount, c.starts_at, c.ends_at,
       c.budget_limit_amount, c.max_grant_count,
       coalesce(u.reserved_amount, 0) AS committed_amount,
       coalesce(u.grant_count, 0) AS reserved_grants
FROM promotion_campaigns c
LEFT JOIN ait_lotto_promotion_usage u ON u.campaign_id = c.id
WHERE c.feature_key IN ('ait_lotto_attendance', 'ait_lotto_attendance_daily', 'ait_lotto_attendance_weekly');

CREATE VIEW ait_lotto_ops_rewards AS
SELECT source_type, status, count(*) AS records, sum(reward_amount) AS amount,
       min(created_at) AS oldest_created_at, min(updated_at) AS oldest_updated_at,
       sum(CASE WHEN campaign_id IS NULL THEN 1 ELSE 0 END) AS missing_campaign_records,
       sum(CASE WHEN protocol = 'three-step' AND execution_started_at IS NOT NULL
                     AND status IN ('pending','failed') THEN 1 ELSE 0 END) AS execution_unsettled_records
FROM promotion_reward_ledger
WHERE source_type IN ('ait_lotto_attendance', 'ait_lotto_attendance_daily', 'ait_lotto_attendance_weekly')
GROUP BY source_type, status;

CREATE VIEW ait_lotto_ops_notifications AS
SELECT status, count(*) AS records, min(created_at) AS oldest_created_at,
       min(not_before_at) AS oldest_due_at, min(locked_at) AS oldest_locked_at,
       max(sent_at) AS last_sent_at,
       sum(CASE WHEN failure_reason = 'delivery_outcome_unknown' THEN 1 ELSE 0 END) AS unknown_outcome_records
FROM message_outbox
WHERE purpose = 'FUNCTIONAL' AND provider_request_id LIKE 'ait-result-%'
GROUP BY status;

CREATE VIEW ait_lotto_ops_watches AS
SELECT count(*) AS records, min(w.created_at) AS oldest_created_at,
       coalesce(sum(CASE WHEN EXISTS (SELECT 1 FROM lotto_draw_results d WHERE d.round=w.round) THEN 1 ELSE 0 END), 0) AS result_available_records
FROM ait_lotto_result_watches w;
