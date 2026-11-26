-- Attach analytics. Only settled KST signup days in the last 28 days enter the comparison.
-- A tap also proves exposure. The authenticated generation receipt is independent of telemetry delivery.
WITH exposed AS (
  SELECT e.user_id, json_extract(e.props_json,'$.outcome') AS arm,
         (p.created_at+32400000)/86400000 AS signup_day,
         max(e.name='first_generation_copy_clicked') AS clicked
  FROM analytics.events e JOIN ait_lotto_profiles p ON p.user_id=e.user_id
  WHERE e.server_at >= (unixepoch('now')-29*86400)*1000
    AND e.name IN ('first_generation_copy_viewed','first_generation_copy_clicked')
    AND json_extract(e.props_json,'$.policy')='journey-v1'
    AND json_extract(e.props_json,'$.placement')='app_journey'
    AND json_extract(e.props_json,'$.outcome') IN ('control','six_numbers')
    AND (e.client_at+32400000)/86400000=(p.created_at+32400000)/86400000
    AND (p.created_at+32400000)/86400000 BETWEEN (unixepoch('now')+32400)/86400-28 AND (unixepoch('now')+32400)/86400-1
  GROUP BY e.user_id,arm,signup_day
), cohort AS (
  SELECT arm,clicked,EXISTS(SELECT 1 FROM ait_lotto_generation_requests g
         WHERE g.user_id=e.user_id AND g.created_at>=signup_day*86400000-32400000
         AND g.created_at<(signup_day+1)*86400000-32400000) AS generated
  FROM exposed e
)
SELECT arm AS 실험군,count(*) AS 노출자,sum(clicked) AS 클릭자,sum(generated) AS 첫날_생성완료자,
       round(100.0*sum(generated)/count(*),1) AS 노출대비_생성완료율
FROM cohort GROUP BY arm ORDER BY arm;
