-- Normalize lotto ball colors to the spelling expected by the stats schema.
UPDATE lotto_number_details
SET color = 'yellow'
WHERE number BETWEEN 1 AND 10
  AND color <> 'yellow';

UPDATE lotto_number_details
SET color = 'blue'
WHERE number BETWEEN 11 AND 20
  AND color <> 'blue';

UPDATE lotto_number_details
SET color = 'red'
WHERE number BETWEEN 21 AND 30
  AND color <> 'red';

UPDATE lotto_number_details
SET color = 'grey'
WHERE number BETWEEN 31 AND 40
  AND color <> 'grey';

UPDATE lotto_number_details
SET color = 'green'
WHERE number BETWEEN 41 AND 45
  AND color <> 'green';

-- Rebuild historical color stats after correcting grey/gray mismatches.
DELETE FROM lotto_draw_color_stats;

INSERT INTO lotto_draw_color_stats (
  round,
  yellow_count,
  blue_count,
  red_count,
  grey_count,
  green_count,
  updated_at
)
SELECT
  r.round,
  SUM(CASE WHEN d.color = 'yellow' THEN 1 ELSE 0 END),
  SUM(CASE WHEN d.color = 'blue' THEN 1 ELSE 0 END),
  SUM(CASE WHEN d.color = 'red' THEN 1 ELSE 0 END),
  SUM(CASE WHEN d.color = 'grey' THEN 1 ELSE 0 END),
  SUM(CASE WHEN d.color = 'green' THEN 1 ELSE 0 END),
  CURRENT_TIMESTAMP
FROM lotto_draw_results r
JOIN lotto_number_details d
  ON d.number IN (
    r.draw_number_1,
    r.draw_number_2,
    r.draw_number_3,
    r.draw_number_4,
    r.draw_number_5,
    r.draw_number_6
  )
GROUP BY r.round
ORDER BY r.round;
