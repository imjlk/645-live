-- Attach analytics. Only settled KST signup days in the last 28 days enter the comparison.
-- A tap also proves exposure. Successful receipt insertion latches the signup-day outcome on the profile.
-- Historical profiles with incomplete receipt coverage are NULL. Report the full-cohort rate only with full coverage.
WITH exposed AS (
  SELECT e.user_id, json_extract(e.props_json,'$.outcome') AS arm,
         (p.created_at+32400000)/86400000 AS signup_day, p.signup_day_generated,
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
)
SELECT arm AS 실험군,count(*) AS 노출자,sum(clicked) AS 클릭자,
       count(signup_day_generated) AS 측정가능_노출자,sum(signup_day_generated) AS 첫날_생성완료자,
       CASE WHEN count(signup_day_generated)=count(*)
            THEN round(100.0*sum(signup_day_generated)/count(*),1) END AS 노출대비_생성완료율,
       round(100.0*sum(signup_day_generated)/nullif(count(signup_day_generated),0),1) AS 측정가능자_생성완료율
FROM exposed GROUP BY arm ORDER BY arm;
