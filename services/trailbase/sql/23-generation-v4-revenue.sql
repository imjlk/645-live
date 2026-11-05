-- Attached에서 analytics를 선택합니다.
-- v4 생성 계속하기 전용 광고 그룹의 콘솔 예상수익입니다. SDK 완료 수로 매출을 추정하지 않습니다.
-- 먼저 scripts/miniapp/ad-revenue-import.mjs로 만든 SQL을 실행하세요. 콘솔 집계는 매일 갱신되며 확정 정산과 다릅니다.
-- 두 포맷 중 미수집 그룹이 있으면 합계/차액은 NULL입니다. 관측된부분수익은 하한 참고용입니다.
-- 광고 노출수와 서버 승인수는 다른 지표입니다. 공통 배너/맞춤/분석/복구 수익과 기타 비용은 제외됩니다.
-- 포인트 비용은 v4 등록 이후 요청한 성공 지급만 셉니다. 주간 보상은 과거 출석의 영향을 포함할 수 있습니다.
-- 차액은 생성광고 예상수익-지급성공액일 뿐 확정 순이익이 아닙니다. 미신청/미래 보상도 제외됩니다.
-- 동일 이용자의 관측 기간, 기존 출석빈도, 보상 기간 전환을 함께 보세요. 오늘은 진행 중입니다.
-- 관측자당 수익은 이벤트 수집 이용자가 분모입니다. 수집 누락 시 과대 추정될 수 있어 관측자 수도 함께 확인하세요.
WITH RECURSIVE days(day) AS (
 SELECT date('now','+9 hours','-29 days')
 UNION ALL SELECT date(day,'+1 day') FROM days WHERE day<date('now','+9 hours')
) , enrollment_windows AS (
 SELECT e.*,coalesce((SELECT min(a.server_at) FROM analytics.events a WHERE a.user_id=e.user_id AND a.name='experiment_exposed' AND a.server_at>=e.enrolled_at AND json_extract(a.props_json,'$.policy') NOT LIKE e.experiment||'/%'),unixepoch('now')*1000) AS end_ms
 FROM ait_lotto_generation_experiment_enrollments e
), arms AS (
 SELECT DISTINCT experiment,variant FROM ait_lotto_generation_ad_groups WHERE experiment='generation-cadence-v4'
), daily AS (
 SELECT d.day,a.variant,
 (SELECT count(DISTINCT ev.user_id) FROM analytics.events ev WHERE ev.name='experiment_exposed' AND ev.source=a.variant AND json_extract(ev.props_json,'$.policy') LIKE a.experiment||'/%' AND date(ev.server_at/1000,'unixepoch','+9 hours')=d.day) AS observed,
 (SELECT count(*) FROM ait_lotto_ad_revenue_daily r JOIN ait_lotto_generation_ad_groups g USING(group_id) WHERE g.experiment=a.experiment AND g.variant=a.variant AND r.report_day=d.day) AS coverage,
 (SELECT sum(r.estimated_revenue_krw) FROM ait_lotto_ad_revenue_daily r JOIN ait_lotto_generation_ad_groups g USING(group_id) WHERE g.experiment=a.experiment AND g.variant=a.variant AND r.report_day=d.day) AS revenue,
 (SELECT sum(r.impressions) FROM ait_lotto_ad_revenue_daily r JOIN ait_lotto_generation_ad_groups g USING(group_id) WHERE g.experiment=a.experiment AND g.variant=a.variant AND r.report_day=d.day) AS impressions,
 (SELECT max(r.imported_at) FROM ait_lotto_ad_revenue_daily r JOIN ait_lotto_generation_ad_groups g USING(group_id) WHERE g.experiment=a.experiment AND g.variant=a.variant AND r.report_day=d.day) AS imported,
 (SELECT coalesce(sum(l.reward_amount),0) FROM promotion_reward_ledger l JOIN enrollment_windows e ON e.user_id=l.user_id AND e.experiment=a.experiment AND e.variant=a.variant WHERE l.status='success' AND l.source_type IN ('ait_lotto_attendance_daily','ait_lotto_attendance_weekly') AND l.requested_at>=e.enrolled_at AND l.requested_at<e.end_ms AND date(l.requested_at/1000,'unixepoch','+9 hours')=d.day) AS cost
 FROM days d CROSS JOIN arms a
 WHERE d.day>=coalesce((SELECT date(min(enrolled_at)/1000,'unixepoch','+9 hours') FROM ait_lotto_generation_experiment_enrollments WHERE experiment=a.experiment),date('now','+9 hours'))
)
SELECT day AS 한국시간_날짜,variant AS 실험군,
 observed AS 당일_관측이용자,
 coverage AS 수집된그룹수,2 AS 필요그룹수,
 CASE WHEN coverage=2 THEN '수집완료' WHEN coverage=0 THEN '미수집' ELSE '부분수집' END AS 수집상태,
 impressions AS 보고된_광고노출수,round(revenue,2) AS 관측된부분수익_원,
 CASE WHEN coverage=2 THEN round(revenue,2) END AS 생성광고_예상수익_원,
 cost AS 출석포인트_지급성공액,
 CASE WHEN coverage=2 THEN round(revenue-cost,2) END AS 지급액차감_예상차액,
 CASE WHEN coverage=2 THEN round(revenue/nullif(observed,0),2) END AS 관측자당_생성광고예상수익,
 datetime(imported/1000,'unixepoch','+9 hours') AS 최근수익수집_KST,
 day=date('now','+9 hours') AS 오늘_진행중
FROM daily ORDER BY day DESC,variant;
