-- Attached에서 analytics를 선택합니다. 최근 30일, KST 기준입니다. 오늘은 진행 중입니다.
-- 안내/가격버튼 노출은 화면의 50%가 1초 이상 보일 때 화면 방문당 한 번 기록합니다.
-- 버튼클릭은 명시적 탭, 구매진입은 스토어가 수락한 시도, SDK호출은 네이티브 화면 표시 확인이 아닙니다.
-- 노출/클릭은 발생 날짜, 구매 결과는 최초 구매진입 날짜에 귀속합니다. 진입경로·앱버전을 분리합니다.
-- 노출 전 빠른 탭/전송 누락이 가능하므로 노출 없는 클릭도 보존하며, 노출 대비 클릭을 인과 전환율로 해석하지 않습니다.
-- 노출·클릭 flow는 구매시도 flow와 별개입니다. 안내만 본 사람을 결과미관측 시도에 포함하지 않습니다.
-- 취소는 USER_CANCELED 콜백만 포함합니다. 앱 종료/뒤로가기/관측 누락을 취소로 간주하지 않습니다.
-- 성공은 서버 검증 후 SDK 완료 신호이며, 복원/확정매출/환불 집계가 아닙니다.
-- user_id+flow_id로 구매시도를 중복 제거합니다. 결과미관측은 아직 미완료/미전송일 수 있어 이탈률이 아닙니다.
-- 최초 진입이 누락된 구매시도는 별도 표시하고 전환율 분모에서 제외합니다. 이전 버전의 노출 0은 미수집입니다.
WITH events AS (
 SELECT *,json_extract(props_json,'$.flow_id') AS flow,
 coalesce(nullif(json_extract(props_json,'$.entry_point'),''),'unknown') AS entry,
 coalesce(nullif(json_extract(props_json,'$.app_version'),''),'unknown') AS version
 FROM analytics.events
 WHERE server_at>=(unixepoch('now')-30*86400)*1000
 AND json_extract(props_json,'$.policy')='purchase-v1'
 AND json_extract(props_json,'$.placement')='ad_free_purchase'
), presentations AS (
 SELECT date(server_at/1000,'unixepoch','+9 hours') AS day,source,entry,version,
 count(DISTINCT CASE WHEN name='purchase_info_viewed' THEN user_id END) AS info_users,
 count(DISTINCT CASE WHEN name='purchase_cta_viewed' THEN user_id END) AS offer_users,
 count(DISTINCT CASE WHEN name='purchase_button_clicked' THEN user_id END) AS click_users,
 count(DISTINCT CASE WHEN name='purchase_button_clicked' THEN hex(user_id)||':'||flow END) AS clicks
 FROM events WHERE name IN ('purchase_info_viewed','purchase_cta_viewed','purchase_button_clicked')
 GROUP BY 1,source,entry,version
), attempts AS (
 SELECT user_id,flow,source,entry,version,min(server_at) AS first_at,
 min(CASE WHEN name='purchase_entered' THEN server_at END) AS entered,
 max(name='purchase_opened') AS opened,max(name='purchase_canceled') AS canceled,
 max(name='purchase_succeeded') AS succeeded,max(name='purchase_failed') AS failed
 FROM events WHERE flow<>'' AND name IN ('purchase_entered','purchase_opened','purchase_canceled','purchase_succeeded','purchase_failed')
 GROUP BY user_id,flow,source,entry,version
), checkouts AS (
 SELECT date(coalesce(entered,first_at)/1000,'unixepoch','+9 hours') AS day,source,entry,version,
 count(DISTINCT CASE WHEN entered IS NOT NULL THEN user_id END) AS users,
 count(entered) AS entered,sum(entered IS NOT NULL AND opened) AS opened,
 sum(entered IS NOT NULL AND canceled) AS canceled,sum(entered IS NOT NULL AND succeeded) AS succeeded,
 sum(entered IS NOT NULL AND failed) AS failed,
 sum(entered IS NOT NULL AND NOT(canceled OR succeeded OR failed)) AS unresolved,
 sum(entered IS NULL) AS missing_entry
 FROM attempts GROUP BY 1,source,entry,version
), keys AS (
 SELECT day,source,entry,version FROM presentations UNION SELECT day,source,entry,version FROM checkouts
)
SELECT k.day AS 한국시간_날짜,k.source AS 실험군,k.entry AS 진입경로,k.version AS 앱버전,
 coalesce(p.info_users,0) AS 상품안내_관측이용자,coalesce(p.offer_users,0) AS 가격버튼_관측이용자,
 coalesce(p.click_users,0) AS 구매버튼_클릭이용자,coalesce(p.clicks,0) AS 구매버튼_클릭수,
 coalesce(c.users,0) AS 구매진입_이용자,coalesce(c.entered,0) AS 구매진입_시도,
 coalesce(c.opened,0) AS 구매SDK_호출,coalesce(c.canceled,0) AS 명시적_취소,
 coalesce(c.succeeded,0) AS 검증후_SDK완료,coalesce(c.failed,0) AS 처리오류,
 coalesce(c.unresolved,0) AS 결과미관측,coalesce(c.missing_entry,0) AS 진입누락_시도,
 round(100.0*c.succeeded/nullif(c.entered,0),1) AS 진입대비_성공_pct,
 k.day=date('now','+9 hours') AS 오늘_진행중
FROM keys k LEFT JOIN presentations p USING(day,source,entry,version)
LEFT JOIN checkouts c USING(day,source,entry,version)
ORDER BY k.day DESC,k.source,k.entry,k.version;
