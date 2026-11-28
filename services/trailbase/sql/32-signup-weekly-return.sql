-- Attach analytics. Set through_kst to the last complete KST date to replay a check.
-- Compare two seven-day signup cohorts with a complete next day for every entrant.
-- Signup version comes from the first authenticated ready event that day. A return can use another version.
WITH settings(through_kst) AS (VALUES (NULL)), bounds AS (
  SELECT unixepoch(coalesce(through_kst,date('now','+9 hours','-1 day'))) / 86400 AS through_day
  FROM settings WHERE through_kst IS NULL OR through_kst<date('now','+9 hours')
), events AS (
  SELECT e.user_id,e.name,e.server_at,(e.server_at+32400000)/86400000 AS day,
         coalesce(nullif(json_extract(e.props_json,'$.app_version'),''),'unknown') AS version,e.id
  FROM analytics.events e,bounds
  WHERE e.server_at >= (through_day-14)*86400000-32400000
    AND e.server_at < (through_day+1)*86400000-32400000
    AND e.name IN ('journey_entered','journey_generation_finished','journey_attendance_succeeded')
    AND json_extract(e.props_json,'$.policy')='journey-v1'
    AND json_extract(e.props_json,'$.placement')='app_journey'
), signups AS (
  SELECT e.user_id,e.day,e.version,
         row_number() OVER (PARTITION BY e.user_id ORDER BY e.server_at,e.id) AS visit
  FROM events e JOIN ait_lotto_profiles p ON p.user_id=e.user_id CROSS JOIN bounds
  WHERE e.name='journey_entered' AND e.day=(p.created_at+32400000)/86400000
    AND e.day<through_day
), activity AS (
  SELECT user_id,day,max(name='journey_entered') AS ready,
         max(name='journey_generation_finished') AS generated,
         max(name='journey_attendance_succeeded') AS checked_in
  FROM events GROUP BY user_id,day
), users AS (
  SELECT s.version, CASE WHEN s.day>=through_day-7 THEN through_day-7 ELSE through_day-14 END AS start_day,
         a.generated,a.checked_in,coalesce(next.ready,0) AS returned
  FROM signups s JOIN activity a ON a.user_id=s.user_id AND a.day=s.day
  LEFT JOIN activity next ON next.user_id=s.user_id AND next.day=s.day+1
  CROSS JOIN bounds WHERE s.visit=1
)
SELECT date(start_day*86400,'unixepoch') AS 가입시작_KST,
       date((start_day+6)*86400,'unixepoch') AS 가입종료_KST, version AS 가입시점_앱버전,
       count(*) AS 가입일_준비관측자,sum(generated) AS 첫날_생성관측자,sum(checked_in) AS 첫날_출석관측자,
       sum(returned) AS D1_준비관측자,round(100.0*sum(returned)/count(*),1) AS D1_pct
FROM users GROUP BY start_day,version ORDER BY start_day DESC,version;
