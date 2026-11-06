-- 24. v4 스킵권 사용·광고수익·재방문. Attached에서 analytics를 선택한다.
-- 포인트 신규 적립 종료일(2026-11-06 KST)부터 최근 30일. control 이후 2~8회, short 이후 2~5회. 두 군 모두 출석은 생성 1회, 첫 광고는 1~3회.
-- 서버의 v4 최초 배정군 기준이다. 배정 이후 구버전으로 돌아온 사용자도 원래 군에 포함하며, 11/06은 SDK 전환일이다.
-- 서버활동자는 배정, 번호 생성, 출석, 출석권 발급 또는 생성 광고 기회 해결을 기록한 당일 고유 사용자다. 단순 앱 열기는 빠질 수 있다.
-- 배정 후 생성 계속하기의 키별 최종 결과를 한 번만 센다. 사용률=스킵 사용자/서버활동자. 스킵선택률=TICKET/(AD+TICKET). FREE와 미해결 기회는 선택률 분모에서 제외한다.
-- 당일 지급과 사용은 다른 날의 적립분을 포함할 수 있다. 스킵권 자체의 인과효과나 사용 포기율은 이 비교로 계산할 수 없다.
-- D1/D7은 기준일 활동자가 정확히 1일/7일 뒤 다시 서버 활동한 비율이다. 그 날짜가 끝난 뒤 표시한다. 여러 날짜를 합칠 때 같은 사람이 중복될 수 있다.
-- SDK노출자는 별도 진단 지표다. v4 미러 수정 전 번들은 서버에 v4 노출을 전송하지 않아 과거 화면 방문을 복원할 수 없다.
-- 수익은 23번과 동일한 생성 전용 두 그룹의 콘솔 예상수익. 두 보고서가 있어야 금액을 표시한다. 공통 배너·기타 지면은 제외한다.
-- 오늘은 진행 중이다. 0건과 미수집(NULL)을 구분하고 표본 수를 함께 본다.
WITH RECURSIVE
bounds AS (
 SELECT max('2026-11-06',date('now','+9 hours','-29 days')) AS first_day,date('now','+9 hours') AS today
),
days(day) AS (
 SELECT first_day FROM bounds WHERE first_day<=today
 UNION ALL SELECT date(day,'+1 day') FROM days,bounds WHERE day<today
),
arms(variant) AS (VALUES ('control'),('short')),
members AS (
 SELECT e.user_id,e.variant,e.enrolled_at,max(e.enrolled_at,unixepoch(b.first_day,'-9 hours')*1000) AS start_ms
 FROM ait_lotto_generation_experiment_enrollments e,bounds b WHERE e.experiment='generation-cadence-v4'
),
actions(user_id,variant,at_ms,kind,quantity) AS (
 SELECT user_id,variant,enrolled_at,'visit',1 FROM members WHERE enrolled_at>=start_ms
 UNION ALL SELECT m.user_id,m.variant,g.created_at,'visit',1 FROM members m
   JOIN ait_lotto_generation_requests g ON g.user_id=m.user_id AND g.created_at>=m.start_ms
 UNION ALL SELECT m.user_id,m.variant,a.created_at,'visit',1 FROM members m
   JOIN ait_lotto_attendance a ON a.user_id=m.user_id AND a.created_at>=m.start_ms
 UNION ALL SELECT m.user_id,m.variant,g.created_at,'grant',g.quantity FROM members m
   JOIN ad_skip_ticket_grants g ON g.user_id=m.user_id AND g.created_at>=m.start_ms
   WHERE g.cause IN ('daily_attendance','streak_bonus')
 UNION ALL SELECT m.user_id,m.variant,o.resolved_at,o.resolution,1 FROM members m
   JOIN ad_skip_opportunities o ON o.user_id=m.user_id AND o.resolved_at>=m.start_ms
   WHERE o.placement='generation_continue'
),
user_days AS (
 SELECT date(at_ms/1000,'unixepoch','+9 hours') AS day,user_id,variant,
   sum(CASE WHEN kind='grant' THEN quantity ELSE 0 END) AS grants,
   count(*) FILTER(WHERE kind='AD') AS ads,count(*) FILTER(WHERE kind='TICKET') AS tickets,
   count(*) FILTER(WHERE kind='FREE') AS free
 FROM actions GROUP BY 1,user_id,variant
),
daily AS (
 SELECT u.day,u.variant,count(*) AS active,sum(u.grants) AS grants,sum(u.tickets>0) AS spenders,
   sum(u.ads) AS ads,sum(u.tickets) AS tickets,sum(u.free) AS free,count(d1.user_id) AS d1_users,count(d7.user_id) AS d7_users
 FROM user_days u
 LEFT JOIN user_days d1 ON d1.user_id=u.user_id AND d1.day=date(u.day,'+1 day')
 LEFT JOIN user_days d7 ON d7.user_id=u.user_id AND d7.day=date(u.day,'+7 days')
 GROUP BY u.day,u.variant
),
sdk AS (
 SELECT date(a.server_at/1000,'unixepoch','+9 hours') AS day,m.variant,count(DISTINCT m.user_id) AS observed
 FROM members m JOIN analytics.events a ON a.user_id=m.user_id AND a.server_at>=m.start_ms
 WHERE a.name='experiment_exposed' AND a.source=m.variant
   AND json_extract(a.props_json,'$.policy') LIKE 'generation-cadence-v4/'||m.variant||':%' GROUP BY 1,m.variant
),
revenue AS (
 SELECT r.report_day AS day,g.variant,count(*) AS formats,sum(r.estimated_revenue_krw) AS krw
 FROM ait_lotto_ad_revenue_daily r JOIN ait_lotto_generation_ad_groups g USING(group_id)
 WHERE g.experiment='generation-cadence-v4' GROUP BY r.report_day,g.variant
)
SELECT d.day AS 한국시간_날짜,a.variant AS 실험군,coalesce(s.active,0) AS 서버활동자,coalesce(x.observed,0) AS SDK노출자,
 coalesce(s.grants,0) AS 출석발급장수,coalesce(s.spenders,0) AS 생성스킵_사용자,
 round(100.0*s.spenders/nullif(s.active,0),1) AS 활동자_사용률_pct,
 coalesce(s.tickets,0) AS 생성스킵_장수,coalesce(s.ads,0) AS 광고로_해결,coalesce(s.free,0) AS 무료로_해결,
 round(100.0*s.tickets/nullif(s.ads+s.tickets,0),1) AS 해결중_스킵선택_pct,
 coalesce(r.formats,0) AS 수익수집그룹_2개중,
 CASE WHEN r.formats=2 THEN round(r.krw,2) END AS 생성광고_예상수익_원,
 CASE WHEN r.formats=2 THEN round(r.krw/nullif(s.active,0),2) END AS 활동자당_생성수익_원,
 CASE WHEN date(d.day,'+1 day')<b.today THEN coalesce(s.d1_users,0) END AS D1_재방문자,
 CASE WHEN date(d.day,'+1 day')<b.today THEN round(100.0*s.d1_users/nullif(s.active,0),1) END AS D1_pct,
 CASE WHEN date(d.day,'+7 days')<b.today THEN coalesce(s.d7_users,0) END AS D7_재방문자,
 CASE WHEN date(d.day,'+7 days')<b.today THEN round(100.0*s.d7_users/nullif(s.active,0),1) END AS D7_pct,
 d.day=b.today AS 오늘_진행중
FROM days d CROSS JOIN arms a CROSS JOIN bounds b
LEFT JOIN daily s ON s.day=d.day AND s.variant=a.variant
LEFT JOIN sdk x ON x.day=d.day AND x.variant=a.variant
LEFT JOIN revenue r ON r.day=d.day AND r.variant=a.variant
ORDER BY d.day DESC,a.variant;
