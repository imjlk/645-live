-- Attached에서 analytics를 선택합니다. 최근 30일, 구매 버튼을 누른 KST 날짜 기준입니다.
-- 구매진입은 버튼 동작 수락, SDK호출은 네이티브 화면 표시 확인이 아닌 구매 SDK 호출입니다.
-- 취소는 USER_CANCELED 콜백만 포함합니다. 앱 종료/뒤로가기/관측 누락을 취소로 간주하지 않습니다.
-- 성공은 서버 검증 후 SDK 완료까지 관측된 클라이언트 신호이며, 복원/확정매출/환불 집계가 아닙니다.
-- user_id+flow_id로 시도를 중복 제거합니다. 미결은 아직 완료되거나 전송되지 않았을 수 있어 이탈률이 아닙니다.
-- 최초 진입 이벤트가 누락된 시도는 별도 표시하고 전환율 분모에서 제외합니다. 오늘은 진행 중입니다.
WITH events AS (
 SELECT *,json_extract(props_json,'$.flow_id') AS flow FROM analytics.events
 WHERE server_at>=(unixepoch('now')-30*86400)*1000
 AND json_extract(props_json,'$.policy')='purchase-v1'
 AND json_extract(props_json,'$.placement')='ad_free_purchase'
), attempts AS (
 SELECT user_id,flow,source,min(server_at) AS first_at,
 min(CASE WHEN name='purchase_entered' THEN server_at END) AS entered,
 max(name='purchase_opened') AS opened,max(name='purchase_canceled') AS canceled,
 max(name='purchase_succeeded') AS succeeded,max(name='purchase_failed') AS failed
 FROM events WHERE flow<>'' GROUP BY user_id,flow,source
)
SELECT date(coalesce(entered,first_at)/1000,'unixepoch','+9 hours') AS 한국시간_날짜,source AS 실험군,
 count(DISTINCT CASE WHEN entered IS NOT NULL THEN user_id END) AS 구매진입_이용자,
 count(entered) AS 구매진입_시도,
 sum(entered IS NOT NULL AND opened) AS 구매SDK_호출,
 sum(entered IS NOT NULL AND canceled) AS 명시적_취소,
 sum(entered IS NOT NULL AND succeeded) AS 검증후_SDK완료,
 sum(entered IS NOT NULL AND failed) AS 처리오류,
 sum(entered IS NOT NULL AND NOT(canceled OR succeeded OR failed)) AS 결과미관측,
 sum(entered IS NULL) AS 진입누락_시도,
 round(100.0*sum(entered IS NOT NULL AND succeeded)/nullif(count(entered),0),1) AS 진입대비_성공_pct,
 date(coalesce(entered,first_at)/1000,'unixepoch','+9 hours')=date('now','+9 hours') AS 오늘_진행중
FROM attempts GROUP BY 1,source ORDER BY 1 DESC,source;
