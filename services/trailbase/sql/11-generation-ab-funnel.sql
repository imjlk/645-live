-- analytics 데이터베이스를 Attached에서 선택한 뒤 실행합니다. 신규 수집 이후만 집계합니다.
-- 전송된 클라이언트 관측 이벤트이며 광고 정산 수익/부정행위 증빙이 아닙니다.
-- CTA 노출 또는 즉시 클릭(요청) 후 5분이 지난 시도만 전환율 분모에 포함합니다.
-- 빠른 클릭은 1초 노출 이벤트 없이 요청될 수 있으므로 요청을 노출 근거로 포함합니다.
WITH e AS (
 SELECT *,substr(json_extract(props_json,'$.policy'),1,instr(json_extract(props_json,'$.policy'),'/')-1) AS experiment,json_extract(props_json,'$.session_id') AS session,
 json_extract(props_json,'$.flow_id') AS flow,json_extract(props_json,'$.app_version') AS version
 FROM analytics.events WHERE server_at >= (unixepoch('now')-30*86400)*1000
 AND json_extract(props_json,'$.policy') GLOB 'generation-cadence-v[23]/*'
), flows AS (
 SELECT experiment,source,version,user_id,session,flow,
 min(CASE WHEN name IN ('cta_viewed','requested') THEN client_at END) AS viewed,
 min(CASE WHEN name='requested' THEN client_at END) AS requested,
 min(CASE WHEN name='shown' THEN client_at END) AS shown,
 min(CASE WHEN name='completed' THEN client_at END) AS completed,
 min(CASE WHEN name='generation_completed' THEN client_at END) AS generated,
 max(name='unavailable') AS unavailable,max(name='failed') AS failed
 FROM e WHERE flow<>'' GROUP BY experiment,source,version,user_id,session,flow
), matured AS (
 SELECT * FROM flows WHERE viewed <= unixepoch('now')*1000-300000
), counts AS (
 SELECT experiment,source,version,count(*) AS attempts,
 sum(requested BETWEEN viewed AND viewed+300000) AS requests,
 sum(shown BETWEEN viewed AND viewed+300000) AS shows,
 sum(completed BETWEEN viewed AND viewed+300000) AS completions,
 sum(generated BETWEEN viewed AND viewed+300000) AS generations,
 sum(unavailable) AS unavailable,sum(failed) AS failed
 FROM matured GROUP BY experiment,source,version
), exposed AS (
 SELECT experiment,source,version,count(DISTINCT user_id) AS users FROM e WHERE name='experiment_exposed' GROUP BY experiment,source,version
)
SELECT x.experiment AS 실험,x.source AS 실험군,x.version AS 앱버전,x.users AS 관측이용자,
 coalesce(c.attempts,0) AS 평가가능_CTA수,coalesce(c.requests,0) AS 광고요청수,
 coalesce(c.shows,0) AS 광고표시수,coalesce(c.completions,0) AS 광고완료수,
 round(100.0*coalesce(c.shows,0)/nullif(c.attempts,0),2) AS CTA대비_광고표시율,
 round(100.0*coalesce(c.completions,0)/nullif(c.shows,0),2) AS 표시대비_완료율,
 round(100.0*(c.attempts-coalesce(c.generations,0))/nullif(c.attempts,0),2) AS 오분내_생성미완료율,
 coalesce(c.unavailable,0) AS 광고미공급수,coalesce(c.failed,0) AS 오류수
FROM exposed x LEFT JOIN counts c USING(experiment,source,version) ORDER BY x.experiment,x.version,x.source;
