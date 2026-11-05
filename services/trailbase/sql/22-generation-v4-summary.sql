-- Attached에서 analytics를 선택합니다. v4만 비교하며 기존 v2/v3 관측을 섞지 않습니다.
-- control=A: 출석1회/첫1~3회/이후2~8회, short=B: 출석1회/첫1~3회/이후2~5회.
-- 재방문 첫 생성 광고 조건과 보상 정책은 공통입니다. 번호 생성 횟수/남은 횟수는 클라이언트에서 관리합니다.
-- 시각은 서버 수신 시각 기준입니다. 단말 시계 오차를 피하되 전송 지연/자정 경계의 영향은 남습니다.
-- 등록은 첫 v4 출석상태 요청이며 가입일이 아닙니다. 관측은 수집된 이벤트 기준으로, 수집 누락·탈퇴 영향이 있습니다.
-- 다른 실험의 다음 노출부터 활동 귀속을 끝냅니다. D1/D7은 버전과 무관한 재방문이며 해당 KST 날짜가 끝나야 평가합니다.
-- 분모가 전체 관측자인 광고완료비중과 광고 표시대비 완료율을 구분하세요. 완료는 정산매출이 아닙니다.
-- 실제 광고수익은 23번에서 콘솔 보고서를 가져온 뒤 확인합니다. 보상 유예 종료 전후를 구분해 해석하세요.
WITH params AS (SELECT unixepoch('now')*1000 AS now_ms),
cohorts AS (
 SELECT e.*,coalesce((SELECT min(a.server_at) FROM analytics.events a WHERE a.user_id=e.user_id AND a.name='experiment_exposed' AND a.server_at>=e.enrolled_at AND json_extract(a.props_json,'$.policy') NOT LIKE e.experiment||'/%'),p.now_ms) AS end_ms
 FROM ait_lotto_generation_experiment_enrollments e CROSS JOIN params p WHERE e.experiment='generation-cadence-v4'
), metrics AS (
 SELECT c.*,
 (SELECT min(a.server_at) FROM analytics.events a WHERE a.user_id=c.user_id AND a.server_at>=c.enrolled_at AND a.server_at<c.end_ms AND a.name='experiment_exposed' AND json_extract(a.props_json,'$.policy') LIKE c.experiment||'/%') AS first_seen,
 (SELECT count(*) FROM analytics.events a WHERE a.user_id=c.user_id AND a.server_at>=c.enrolled_at AND a.server_at<c.end_ms AND a.name='generation_succeeded' AND json_extract(a.props_json,'$.policy') LIKE c.experiment||'/%') AS generations,
 (SELECT count(*) FROM analytics.events a WHERE a.user_id=c.user_id AND a.server_at>=c.enrolled_at AND a.server_at<c.end_ms AND a.name='completed' AND json_extract(a.props_json,'$.policy') LIKE c.experiment||'/%') AS completed,
 (SELECT count(*) FROM ait_lotto_attendance a WHERE a.user_id=c.user_id AND a.created_at>=c.enrolled_at AND a.created_at<c.end_ms) AS checkins,
 (SELECT coalesce(sum(r.consumed),0) FROM ad_skip_ticket_redemptions r WHERE r.user_id=c.user_id AND r.placement='generation_continue' AND r.created_at>=c.enrolled_at AND r.created_at<c.end_ms) AS skips
 FROM cohorts c
), retention AS (
 SELECT m.*,
 date(first_seen/1000,'unixepoch','+9 hours')<date('now','+9 hours','-1 day') AS d1_mature,
 date(first_seen/1000,'unixepoch','+9 hours')<date('now','+9 hours','-7 days') AS d7_mature,
 EXISTS(SELECT 1 FROM analytics.events a WHERE a.user_id=m.user_id AND a.name='experiment_exposed' AND a.server_at<p.now_ms AND date(a.server_at/1000,'unixepoch','+9 hours')=date(m.first_seen/1000,'unixepoch','+9 hours','+1 day')) AS d1,
 EXISTS(SELECT 1 FROM analytics.events a WHERE a.user_id=m.user_id AND a.name='experiment_exposed' AND a.server_at<p.now_ms AND date(a.server_at/1000,'unixepoch','+9 hours')=date(m.first_seen/1000,'unixepoch','+9 hours','+7 days')) AS d7
 FROM metrics m CROSS JOIN params p
)
SELECT variant AS 실험군,count(*) AS 등록이용자,count(first_seen) AS 관측이용자,
 sum(generations) AS 관측생성수,sum(completed) AS SDK광고완료,
 sum(completed>0) AS 광고완료이용자,
 round(100.0*sum(completed>0 AND first_seen IS NOT NULL)/nullif(count(first_seen),0),2) AS 관측자대비_광고완료비중,
 sum(checkins) AS 출석완료_이용자일수,sum(skips) AS 생성광고_스킵권소비,
 coalesce(sum(d1_mature),0) AS D1평가이용자,sum(d1_mature*d1) AS D1재방문자,
 round(100.0*sum(d1_mature*d1)/nullif(sum(d1_mature),0),2) AS D1재방문율,
 coalesce(sum(d7_mature),0) AS D7평가이용자,
 round(100.0*sum(d7_mature*d7)/nullif(sum(d7_mature),0),2) AS D7재방문율
FROM retention GROUP BY variant ORDER BY variant;
