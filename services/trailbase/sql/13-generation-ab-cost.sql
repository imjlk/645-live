-- analytics Attached. 관측된 실험 참여 이후 신청된 지급 성공분만 집계합니다.
-- 제공자가 지급 시각을 반환하지 않을 수 있으므로 신청 시각으로 참여 이후 여부를 판단합니다.
-- 광고 SDK 이벤트로 수익을 계산하지 않습니다. 실제 수익은 정산 자료와 별도로 대조하세요.
WITH cohorts AS (
 SELECT user_id,source,min(server_at) AS enrolled_at
 FROM analytics.events WHERE name='experiment_exposed'
 AND json_extract(props_json,'$.policy') LIKE 'generation-cadence-v2/%'
 GROUP BY user_id,source
), paid AS (
 SELECT c.source,count(*) AS payments,sum(l.reward_amount) AS paid_amount
 FROM cohorts c JOIN promotion_reward_ledger l ON l.user_id=c.user_id
 WHERE l.status='success' AND l.requested_at>=c.enrolled_at
 GROUP BY c.source
), users AS (SELECT source,count(*) AS users FROM cohorts GROUP BY source)
SELECT u.source AS 실험군,u.users AS 관측이용자,coalesce(p.payments,0) AS 지급성공건수,
 coalesce(p.paid_amount,0) AS 지급성공금액,
 round(1.0*coalesce(p.paid_amount,0)/nullif(u.users,0),2) AS 관측이용자당_지급액,
 NULL AS 광고정산수익_별도대조필요
FROM users u LEFT JOIN paid p USING(source) ORDER BY source;
