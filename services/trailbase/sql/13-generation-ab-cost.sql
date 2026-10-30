-- analytics Attached. 실험 참여 이후 신청된 성공 지급을 해당 실험 구간에 귀속합니다.
-- 제공자가 지급 시각을 반환하지 않을 수 있으므로 requested_at을 사용합니다.
-- 참여 시작은 전송 지연을 제외한 클라이언트 관측 시각(서버가 범위를 제한함)입니다.
-- 광고 정산 수익은 별도 자료로 대조합니다. 같은 이용자의 다음 실험 시작에서 구간을 닫습니다.
WITH first_exposure AS (
 SELECT user_id,source,substr(json_extract(props_json,'$.policy'),1,instr(json_extract(props_json,'$.policy'),'/')-1) AS experiment,min(client_at) AS enrolled_at
 FROM analytics.events WHERE name='experiment_exposed'
 AND json_extract(props_json,'$.policy') GLOB 'generation-cadence-v[23]/*'
 GROUP BY user_id,source,experiment
), cohorts AS (
 SELECT *,lead(enrolled_at) OVER (PARTITION BY user_id ORDER BY enrolled_at,experiment) AS ended_at FROM first_exposure
), paid AS (
 SELECT c.experiment,c.source,count(*) AS payments,sum(l.reward_amount) AS paid_amount
 FROM cohorts c JOIN promotion_reward_ledger l ON l.user_id=c.user_id
 WHERE l.status='success' AND l.requested_at>=c.enrolled_at AND (c.ended_at IS NULL OR l.requested_at<c.ended_at)
 GROUP BY c.experiment,c.source
), users AS (SELECT experiment,source,count(*) AS users FROM cohorts GROUP BY experiment,source)
SELECT u.experiment AS 실험,u.source AS 실험군,u.users AS 관측이용자,coalesce(p.payments,0) AS 지급성공건수,
 coalesce(p.paid_amount,0) AS 지급성공금액,
 round(1.0*coalesce(p.paid_amount,0)/nullif(u.users,0),2) AS 관측이용자당_지급액,
 NULL AS 광고정산수익_별도대조필요
FROM users u LEFT JOIN paid p USING(experiment,source) ORDER BY experiment,source;
