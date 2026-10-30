-- analytics Attached. 관측 시작일부터의 사용자 코호트입니다(생애 첫 방문이 아님).
-- KST 달력일 기준 D1/D7. 해당 날짜가 끝난 사용자만 분모에 포함합니다.
WITH visits AS (
 SELECT DISTINCT user_id,source,substr(json_extract(props_json,'$.policy'),1,instr(json_extract(props_json,'$.policy'),'/')-1) AS experiment,json_extract(props_json,'$.app_version') AS version,
 date(client_at/1000,'unixepoch','+9 hours') AS day
 FROM analytics.events WHERE name='experiment_exposed'
 AND json_extract(props_json,'$.policy') GLOB 'generation-cadence-v[23]/*'
), cohorts AS (
 SELECT experiment,user_id,source,version,min(day) AS first_day FROM visits GROUP BY experiment,user_id,source,version
), result AS (
 SELECT c.*,
 EXISTS(SELECT 1 FROM visits v WHERE v.experiment=c.experiment AND v.user_id=c.user_id AND v.source=c.source AND v.version=c.version AND v.day=date(c.first_day,'+1 day')) AS d1,
 EXISTS(SELECT 1 FROM visits v WHERE v.experiment=c.experiment AND v.user_id=c.user_id AND v.source=c.source AND v.version=c.version AND v.day=date(c.first_day,'+7 days')) AS d7
 FROM cohorts c
)
SELECT experiment AS 실험,source AS 실험군,version AS 앱버전,count(*) AS 관측이용자,
 sum(first_day<date('now','+9 hours','-1 day')) AS D1_평가이용자,
 round(100.0*sum(CASE WHEN first_day<date('now','+9 hours','-1 day') THEN d1 ELSE 0 END)/nullif(sum(first_day<date('now','+9 hours','-1 day')),0),2) AS D1_재방문율,
 sum(first_day<date('now','+9 hours','-7 days')) AS D7_평가이용자,
 round(100.0*sum(CASE WHEN first_day<date('now','+9 hours','-7 days') THEN d7 ELSE 0 END)/nullif(sum(first_day<date('now','+9 hours','-7 days')),0),2) AS D7_재방문율
FROM result GROUP BY experiment,source,version ORDER BY experiment,version,source;
