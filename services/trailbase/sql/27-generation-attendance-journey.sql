-- Attached에서 analytics를 선택합니다. journey-v1 배포 후의 최근 30일만 관측할 수 있습니다.
-- 진입은 인증/설정 준비가 끝난 앱 관측입니다. 부팅 실패와 전송 누락은 포함되지 않아 토스 DAU와 다릅니다.
-- 화면 노출은 실제 50% 이상 영역을 1초 본 경우입니다. 빠른 클릭은 노출 이벤트보다 먼저 올 수 있습니다.
-- v4 신규배정/이전배정은 실험 등록일 기준이며 가입일이나 혜택탭 유입 여부가 아닙니다.
-- 광고/스킵/구매자/무료 경로의 생성 성공을 분리합니다. 광고로 표시된 성공도 정산 노출수와 동일하지 않습니다.
-- 이 표의 사용자는 하루에 한 번 세지만 같은 사람이 여러 날 반복됩니다. 단계를 건너뛴 관측도 있어 차이를 이탈로 확정하지 마세요.
-- D1은 다음 KST 날짜가 끝나야 평가합니다. 최초 가입 코호트 리텐션이 아닌 일별 관측 이용자의 재방문입니다.
WITH e AS (
 SELECT a.*,date(a.server_at/1000,'unixepoch','+9 hours') AS day,
 json_extract(props_json,'$.flow_id') AS flow,json_extract(props_json,'$.outcome') AS outcome,
 CASE WHEN x.user_id IS NULL THEN '미배정'
 WHEN date(x.enrolled_at/1000,'unixepoch','+9 hours')=date(a.server_at/1000,'unixepoch','+9 hours') THEN 'v4신규배정' ELSE '이전배정' END AS cohort
 FROM analytics.events a LEFT JOIN ait_lotto_generation_experiment_enrollments x
 ON x.user_id=a.user_id AND x.experiment='generation-cadence-v4'
 WHERE a.server_at>=(unixepoch('now')-30*86400)*1000
 AND json_extract(props_json,'$.policy')='journey-v1'
 AND json_extract(props_json,'$.placement')='app_journey'
), users AS (
 SELECT day,user_id,source,cohort,
 max(name='journey_entered') AS entered,max(name='generation_cta_viewed') AS viewed,
 max(name='journey_generation_started') AS started,max(name='journey_generation_finished') AS generated,
 max(name='attendance_entry_viewed') AS attendance_viewed,max(name='attendance_entry_clicked') AS attendance_clicked,
 max(name='journey_attendance_succeeded') AS checked,
 count(DISTINCT CASE WHEN name='journey_generation_started' THEN flow END) AS attempts,
 count(DISTINCT CASE WHEN name='journey_generation_finished' THEN flow END) AS successes,
 count(DISTINCT CASE WHEN name='journey_generation_failed' THEN flow END) AS failures,
 count(DISTINCT CASE WHEN name='journey_generation_finished' AND outcome='ad' THEN flow END) AS ad,
 count(DISTINCT CASE WHEN name='journey_generation_finished' AND outcome='ad_recovered' THEN flow END) AS ad_recovered,
 count(DISTINCT CASE WHEN name='journey_generation_finished' AND outcome IN ('ticket','ticket_replay') THEN flow END) AS ticket,
 count(DISTINCT CASE WHEN name='journey_generation_finished' AND outcome='ad_free' THEN flow END) AS ad_free,
 count(DISTINCT CASE WHEN name='journey_generation_finished' AND outcome='free' THEN flow END) AS free
 FROM e GROUP BY day,user_id,source,cohort
)
SELECT u.day AS 한국시간_날짜,u.source AS 실험군,u.cohort AS 배정구분,
 count(*) AS 관측이용자,sum(u.entered) AS 앱준비_관측자,sum(u.viewed) AS 생성버튼_노출자,
 sum(u.started) AS 생성시도자,sum(u.generated) AS 생성성공자,
 sum(u.attendance_viewed) AS 출석안내_노출자,sum(u.attendance_clicked) AS 출석안내_클릭자,sum(u.checked) AS 출석성공자,
 sum(u.successes>1) AS 두번이상_생성자,
 sum(u.attempts) AS 생성시도수,sum(u.successes) AS 생성성공수,sum(u.failures) AS 생성실패수,
 sum(u.ad) AS 광고경로_생성,sum(u.ad_recovered) AS 이전광고복구_생성,sum(u.ticket) AS 스킵경로_생성,
 sum(u.ad_free) AS 광고제거구매자_생성,sum(u.free) AS 무료경로_생성,
 CASE WHEN date(u.day,'+1 day')<date('now','+9 hours') THEN count(d1.user_id) END AS D1_재방문자,
 CASE WHEN date(u.day,'+1 day')<date('now','+9 hours') THEN round(100.0*count(d1.user_id)/count(*),1) END AS D1_pct,
 u.day=date('now','+9 hours') AS 오늘_진행중
FROM users u LEFT JOIN users d1 ON d1.user_id=u.user_id AND d1.day=date(u.day,'+1 day')
GROUP BY u.day,u.source,u.cohort ORDER BY 1 DESC,2,3;
