-- analytics Attached. 새 출석 실험 v3의 KST 일별 전환입니다.
-- 2초 전송 버퍼 때문에 빠른 출석이 누락되지 않도록 서버가 범위를 제한한 client_at을 사용합니다.
-- 참여 전에 이미 출석한 이용자는 전환 분모에서 제외합니다. 오늘 수치는 잠정 집계입니다.
WITH exposure AS (
 SELECT source,user_id,CAST((client_at+32400000)/86400000 AS INTEGER) AS day,min(client_at) AS entered_at
 FROM analytics.events WHERE name='experiment_exposed'
 AND json_extract(props_json,'$.policy') LIKE 'generation-cadence-v3/%'
 GROUP BY source,user_id,day
), outcomes AS (
 SELECT e.*,a.created_at AS checked_at FROM exposure e
 LEFT JOIN ait_lotto_attendance a ON a.user_id=e.user_id AND a.day=e.day
)
SELECT date(day*86400,'unixepoch') AS 한국시간_날짜,source AS 실험군,count(*) AS 관측이용자,
 sum(CASE WHEN checked_at<entered_at THEN 1 ELSE 0 END) AS 참여전_출석완료자,
 sum(CASE WHEN checked_at IS NULL OR checked_at>=entered_at THEN 1 ELSE 0 END) AS 평가가능_이용자,
 sum(CASE WHEN checked_at>=entered_at THEN 1 ELSE 0 END) AS 출석완료자,
 round(100.0*sum(CASE WHEN checked_at>=entered_at THEN 1 ELSE 0 END)/nullif(sum(CASE WHEN checked_at IS NULL OR checked_at>=entered_at THEN 1 ELSE 0 END),0),2) AS 관측_출석완료율,
 day=CAST((unixepoch('now')+32400)/86400 AS INTEGER) AS 오늘_진행중
FROM outcomes GROUP BY day,source ORDER BY day DESC,source;
