-- Attach analytics. Saves and visible results are prospective events from supporting bundles.
-- One observation per signed-in app principal and round, including users without notification consent.
-- Korea's scheduled draw is 35 minutes after sales close (lotto::close_time). Both clocks use ms.
WITH events AS (
  SELECT user_id,cast(json_extract(props_json,'$.outcome') AS INTEGER) AS round,name,client_at
  FROM analytics.events
  WHERE server_at>=(unixepoch('now')-40*86400)*1000
    AND name IN ('round_combination_saved','round_result_viewed')
    AND json_extract(props_json,'$.policy')='journey-v1'
    AND json_extract(props_json,'$.entry_point')='saved'
), timed AS (
  SELECT *,1039258800000+(round-1)*604800000+2100000 AS draw_at FROM events
), users AS (
  SELECT round,draw_at,user_id,
         max(name='round_combination_saved' AND client_at<draw_at) AS saved,
         max(name='round_result_viewed' AND client_at>=draw_at AND client_at<draw_at+172800000) AS viewed
  FROM timed GROUP BY round,draw_at,user_id
)
SELECT round AS 회차,datetime(draw_at/1000,'unixepoch','+9 hours') AS 추첨_KST,
       count(*) AS 추첨전_보관자,sum(viewed) AS 결과확인자_현재까지,
       CASE WHEN unixepoch('now')*1000>=draw_at+172800000 THEN round(100.0*sum(viewed)/count(*),1) END AS 결과확인율_48h
FROM users WHERE saved AND draw_at >= (unixepoch('now')-30*86400)*1000
GROUP BY round,draw_at ORDER BY round DESC;
