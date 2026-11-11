-- Attached에서 analytics를 선택합니다. 최근 30일, v4 생성 광고의 서버 수신 날짜 기준.
-- 완료처리실패는 서버 완료 요청/응답 처리 실패입니다. SDK 시청 완료와 생성 성공은 서로 다른 단계입니다.
-- 재시도/복구는 별도 이벤트이므로 동일 시도에 함께 나타날 수 있습니다. 합산해 이용자 이탈률로 쓰지 마세요.
-- 앱 재실행 복구는 새 flow_id일 수 있습니다. 복구 수를 당일 실패 수에서 빼거나 당일 복구율로 계산하지 않습니다.
-- 원문 오류·세션/주문 식별자는 저장하지 않고 허용된 오류 코드만 분류합니다. 이벤트 미관측은 무오류 보증이 아닙니다.
SELECT date(server_at/1000,'unixepoch','+9 hours') AS 한국시간_날짜,source AS 실험군,
 json_extract(props_json,'$.app_version') AS 앱버전,name AS 이벤트,
 json_extract(props_json,'$.outcome') AS 결과코드,count(*) AS 이벤트수,count(DISTINCT user_id) AS 이용자수
FROM analytics.events
WHERE server_at>=(unixepoch('now')-30*86400)*1000
 AND json_extract(props_json,'$.policy') LIKE 'generation-cadence-v4/%'
 AND name IN ('completion_retry','completion_recovered','completion_failed','completion_storage_failed','failed','unavailable')
GROUP BY 1,2,3,4,5 ORDER BY 1 DESC,2,3,4,5;
