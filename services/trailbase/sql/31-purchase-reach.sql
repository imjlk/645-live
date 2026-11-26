-- 최근 완료된 KST 4일. 배포 전후 같은 길이의 기간을 비교할 때 버전별 고유 이용자를 한 번씩 셉니다.
-- 분모는 인증·설정 준비가 관측된 이용자이며 각 단계도 이 이용자 안에서 계산합니다.
-- 구버전과 새 이벤트를 지원하지 않는 서버의 상품링크 수치는 미수집입니다.
WITH bounds AS (
 SELECT unixepoch('now','+9 hours','start of day','-9 hours')*1000 AS end_at
), users AS (
 SELECT user_id,coalesce(nullif(json_extract(props_json,'$.app_version'),''),'unknown') AS version,
 max(name='journey_entered') AS ready,
 max(name='purchase_link_viewed') AS link_viewed,max(name='purchase_link_clicked') AS link_clicked,
 max(name='purchase_info_viewed') AS info,max(name='purchase_cta_viewed') AS price,
 max(name='purchase_entered') AS checkout,max(name='purchase_succeeded') AS success
 FROM analytics.events,bounds
 WHERE server_at>=end_at-4*86400000 AND server_at<end_at AND (
 (name='journey_entered' AND json_extract(props_json,'$.policy')='journey-v1' AND json_extract(props_json,'$.placement')='app_journey')
 OR (name IN ('purchase_link_viewed','purchase_link_clicked','purchase_info_viewed','purchase_cta_viewed','purchase_entered','purchase_succeeded')
 AND json_extract(props_json,'$.policy')='purchase-v1' AND json_extract(props_json,'$.placement')='ad_free_purchase'))
 GROUP BY user_id,version
)
SELECT version AS 앱버전,count(*) AS 앱준비_관측이용자,
 sum(link_viewed) AS 상품링크_노출이용자,sum(link_clicked) AS 상품링크_클릭이용자,
 sum(info) AS 상품안내_관측이용자,sum(price) AS 가격버튼_관측이용자,
 round(100.0*sum(price)/count(*),1) AS 준비대비_가격노출_pct,
 sum(checkout) AS 구매진입_이용자,sum(success) AS 검증후_SDK완료_이용자
FROM users WHERE ready=1 GROUP BY version ORDER BY version;
