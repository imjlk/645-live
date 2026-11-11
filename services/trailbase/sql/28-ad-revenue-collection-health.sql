-- 마지막 정상 수집 실행과 그룹별 실제 반영 범위를 확인합니다. 실행 실패는 이 표에 성공으로 남지 않습니다.
-- 미보고 그룹일수는 0원/무노출 확정이 아니라 콘솔 응답에 일별 행이 없었던 수입니다.
-- 최근 7일 재조회가 기본이므로 이전 날짜의 금액 정정도 반영합니다. 당일은 다음 날부터 수집합니다.
-- 마지막 실행이 36시간 이상 오래되었거나 NULL이면 정기 작업/콘솔 접근을 확인하세요.
-- SQL에는 수익 원본 보고서나 토큰·개인 식별자가 없습니다. 예상수익은 확정 정산과 다릅니다.
WITH last_run AS (SELECT * FROM ait_lotto_ad_revenue_syncs ORDER BY fetched_at DESC LIMIT 1)
SELECT g.variant AS 실험군,g.format AS 광고형식,
 (SELECT start_day FROM last_run) AS 최근조회_시작일,(SELECT end_day FROM last_run) AS 최근조회_종료일,
 datetime((SELECT fetched_at FROM last_run)/1000,'unixepoch','+9 hours') AS 최근실행_KST,
 CASE WHEN (SELECT fetched_at FROM last_run) IS NULL THEN '미실행'
 WHEN (SELECT fetched_at FROM last_run)<(unixepoch('now')-36*3600)*1000 THEN '갱신지연' ELSE '최근실행' END AS 실행상태,
 (SELECT missing_group_days FROM last_run) AS 최근조회_미보고그룹일수,
 max(r.report_day) AS 마지막_보고일,datetime(max(r.imported_at)/1000,'unixepoch','+9 hours') AS 마지막_반영_KST,
 count(r.report_day) AS 보유_일별행수
FROM ait_lotto_generation_ad_groups g LEFT JOIN ait_lotto_ad_revenue_daily r USING(group_id)
WHERE g.experiment='generation-cadence-v4' GROUP BY g.variant,g.format ORDER BY 1,2;
