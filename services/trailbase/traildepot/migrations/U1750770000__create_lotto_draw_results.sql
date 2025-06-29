CREATE TABLE lotto_draw_scan_counts (
    round INTEGER PRIMARY KEY,  -- 회차 번호 (PK)
    scan_count_1 INTEGER NOT NULL DEFAULT 0,
    scan_count_2 INTEGER NOT NULL DEFAULT 0,
    scan_count_3 INTEGER NOT NULL DEFAULT 0,
    scan_count_4 INTEGER NOT NULL DEFAULT 0,
    scan_count_5 INTEGER NOT NULL DEFAULT 0,
    scan_count_6 INTEGER NOT NULL DEFAULT 0,
    scan_count_7 INTEGER NOT NULL DEFAULT 0,
    scan_count_8 INTEGER NOT NULL DEFAULT 0,
    scan_count_9 INTEGER NOT NULL DEFAULT 0,
    scan_count_10 INTEGER NOT NULL DEFAULT 0,
    scan_count_11 INTEGER NOT NULL DEFAULT 0,
    scan_count_12 INTEGER NOT NULL DEFAULT 0,
    scan_count_13 INTEGER NOT NULL DEFAULT 0,
    scan_count_14 INTEGER NOT NULL DEFAULT 0,
    scan_count_15 INTEGER NOT NULL DEFAULT 0,
    scan_count_16 INTEGER NOT NULL DEFAULT 0,
    scan_count_17 INTEGER NOT NULL DEFAULT 0,
    scan_count_18 INTEGER NOT NULL DEFAULT 0,
    scan_count_19 INTEGER NOT NULL DEFAULT 0,
    scan_count_20 INTEGER NOT NULL DEFAULT 0,
    scan_count_21 INTEGER NOT NULL DEFAULT 0,
    scan_count_22 INTEGER NOT NULL DEFAULT 0,
    scan_count_23 INTEGER NOT NULL DEFAULT 0,
    scan_count_24 INTEGER NOT NULL DEFAULT 0,
    scan_count_25 INTEGER NOT NULL DEFAULT 0,
    scan_count_26 INTEGER NOT NULL DEFAULT 0,
    scan_count_27 INTEGER NOT NULL DEFAULT 0,
    scan_count_28 INTEGER NOT NULL DEFAULT 0,
    scan_count_29 INTEGER NOT NULL DEFAULT 0,
    scan_count_30 INTEGER NOT NULL DEFAULT 0,
    scan_count_31 INTEGER NOT NULL DEFAULT 0,
    scan_count_32 INTEGER NOT NULL DEFAULT 0,
    scan_count_33 INTEGER NOT NULL DEFAULT 0,
    scan_count_34 INTEGER NOT NULL DEFAULT 0,
    scan_count_35 INTEGER NOT NULL DEFAULT 0,
    scan_count_36 INTEGER NOT NULL DEFAULT 0,
    scan_count_37 INTEGER NOT NULL DEFAULT 0,
    scan_count_38 INTEGER NOT NULL DEFAULT 0,
    scan_count_39 INTEGER NOT NULL DEFAULT 0,
    scan_count_40 INTEGER NOT NULL DEFAULT 0,
    scan_count_41 INTEGER NOT NULL DEFAULT 0,
    scan_count_42 INTEGER NOT NULL DEFAULT 0,
    scan_count_43 INTEGER NOT NULL DEFAULT 0,
    scan_count_44 INTEGER NOT NULL DEFAULT 0,
    scan_count_45 INTEGER NOT NULL DEFAULT 0,
    total_scans INTEGER NOT NULL DEFAULT 0, -- 총 스캔 횟수(로또 용지 기준)
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_scan_counts_total_scans ON lotto_draw_scan_counts(total_scans);

CREATE TABLE lotto_draw_results (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    draw_date TEXT NOT NULL, -- 추첨일 (YYYY-MM-DD)
    total_sell_amount INTEGER NOT NULL DEFAULT 0, -- 총 판매금액
    first_prize_amount INTEGER NOT NULL DEFAULT 0, -- 1등 당첨금액
    first_prize_winner_count INTEGER NOT NULL DEFAULT 0, -- 1등 당첨자 수
    first_prize_accumulated_amount INTEGER NOT NULL DEFAULT 0, -- 1등 누적 당첨금액
    draw_number_1 INTEGER NOT NULL, -- 당첨번호 1
    draw_number_2 INTEGER NOT NULL, -- 당첨번호 2
    draw_number_3 INTEGER NOT NULL, -- 당첨번호 3
    draw_number_4 INTEGER NOT NULL, -- 당첨번호 4
    draw_number_5 INTEGER NOT NULL, -- 당첨번호 5
    draw_number_6 INTEGER NOT NULL, -- 당첨번호 6
    bonus_number INTEGER NOT NULL, -- 보너스 번호
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_date ON lotto_draw_results(draw_date);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_number_1 ON lotto_draw_results(draw_number_1);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_number_2 ON lotto_draw_results(draw_number_2);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_number_3 ON lotto_draw_results(draw_number_3);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_number_4 ON lotto_draw_results(draw_number_4);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_number_5 ON lotto_draw_results(draw_number_5);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_draw_number_6 ON lotto_draw_results(draw_number_6);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_bonus_number ON lotto_draw_results(bonus_number);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_total_sell_amount ON lotto_draw_results(total_sell_amount);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_results_first_prize_amount ON lotto_draw_results(first_prize_amount);

-- draw results 인서트 시 전체 통계 테이블 자동 반영 트리거
CREATE TRIGGER IF NOT EXISTS trg_update_lotto_stats_after_insert
AFTER INSERT ON lotto_draw_results
FOR EACH ROW
BEGIN
  -- 홀/짝 통계 (간단한 방식으로 계산)
  INSERT INTO lotto_draw_odd_even_stats (
    round, odd_count, even_count, numbers_sum, updated_at
  ) VALUES (
    NEW.round,
    ((NEW.draw_number_1 % 2) + (NEW.draw_number_2 % 2) + (NEW.draw_number_3 % 2) + (NEW.draw_number_4 % 2) + (NEW.draw_number_5 % 2) + (NEW.draw_number_6 % 2)),
    (6 - ((NEW.draw_number_1 % 2) + (NEW.draw_number_2 % 2) + (NEW.draw_number_3 % 2) + (NEW.draw_number_4 % 2) + (NEW.draw_number_5 % 2) + (NEW.draw_number_6 % 2))),
    (NEW.draw_number_1 + NEW.draw_number_2 + NEW.draw_number_3 + NEW.draw_number_4 + NEW.draw_number_5 + NEW.draw_number_6),
    CURRENT_TIMESTAMP
  );

  -- 색상 통계
  INSERT INTO lotto_draw_color_stats (
    round, yellow_count, blue_count, red_count, grey_count, green_count, updated_at
  )
  SELECT NEW.round,
    SUM(CASE WHEN d.color = 'yellow' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.color = 'blue' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.color = 'red' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.color = 'grey' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.color = 'green' THEN 1 ELSE 0 END),
    CURRENT_TIMESTAMP
  FROM lotto_number_details d
  WHERE d.number IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6);

  -- 구간 통계
  INSERT INTO lotto_draw_section_stats (
    round, section_1_10, section_11_20, section_21_30, section_31_40, section_41_45, updated_at
  )
  SELECT NEW.round,
    SUM(CASE WHEN d.section = 1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.section = 2 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.section = 3 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.section = 4 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.section = 5 THEN 1 ELSE 0 END),
    CURRENT_TIMESTAMP
  FROM lotto_number_details d
  WHERE d.number IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6);

  -- 연속번호 통계 (실제 연속번호 쌍 개수 계산)
  INSERT INTO lotto_draw_consecutive_stats (
    round, consecutive_pairs_count, updated_at
  )
  VALUES (
    NEW.round,
    (CASE WHEN NEW.draw_number_2 = NEW.draw_number_1 + 1 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_3 = NEW.draw_number_2 + 1 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_4 = NEW.draw_number_3 + 1 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_5 = NEW.draw_number_4 + 1 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_6 = NEW.draw_number_5 + 1 THEN 1 ELSE 0 END),
    CURRENT_TIMESTAMP
  );

  -- 고/저 통계 (간단한 방식으로 계산)
  INSERT INTO lotto_draw_high_low_stats (
    round, low_count, high_count, updated_at
  ) VALUES (
    NEW.round,
    (CASE WHEN NEW.draw_number_1 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_2 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_3 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_4 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_5 BETWEEN 1 AND 22 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_6 BETWEEN 1 AND 22 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_2 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_3 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_4 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_5 BETWEEN 23 AND 45 THEN 1 ELSE 0 END +
     CASE WHEN NEW.draw_number_6 BETWEEN 23 AND 45 THEN 1 ELSE 0 END),
    CURRENT_TIMESTAMP
  );

  -- 끝수 통계 (간단한 방식으로 계산)
  INSERT INTO lotto_draw_unit_digit_stats (
    round, digit_0_count, digit_1_count, digit_2_count, digit_3_count, digit_4_count, digit_5_count, digit_6_count, digit_7_count, digit_8_count, digit_9_count, updated_at
  ) VALUES (
    NEW.round,
    (CASE WHEN NEW.draw_number_1 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 0 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 0 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 1 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 1 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 2 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 2 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 3 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 3 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 4 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 4 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 5 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 5 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 6 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 6 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 7 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 7 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 8 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 8 THEN 1 ELSE 0 END),
    (CASE WHEN NEW.draw_number_1 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_2 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_3 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_4 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_5 % 10 = 9 THEN 1 ELSE 0 END + CASE WHEN NEW.draw_number_6 % 10 = 9 THEN 1 ELSE 0 END),
    CURRENT_TIMESTAMP
  );

  -- 번호별 당첨 통계 업데이트 (각 번호별로 개별 처리)
  UPDATE lotto_number_stats SET draw_count = draw_count + 1, last_draw_round = NEW.round, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.draw_number_1;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.draw_number_1, 1, 0, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.draw_number_1);
  
  UPDATE lotto_number_stats SET draw_count = draw_count + 1, last_draw_round = NEW.round, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.draw_number_2;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.draw_number_2, 1, 0, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.draw_number_2);
  
  UPDATE lotto_number_stats SET draw_count = draw_count + 1, last_draw_round = NEW.round, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.draw_number_3;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.draw_number_3, 1, 0, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.draw_number_3);
  
  UPDATE lotto_number_stats SET draw_count = draw_count + 1, last_draw_round = NEW.round, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.draw_number_4;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.draw_number_4, 1, 0, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.draw_number_4);
  
  UPDATE lotto_number_stats SET draw_count = draw_count + 1, last_draw_round = NEW.round, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.draw_number_5;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.draw_number_5, 1, 0, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.draw_number_5);
  
  UPDATE lotto_number_stats SET draw_count = draw_count + 1, last_draw_round = NEW.round, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.draw_number_6;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.draw_number_6, 1, 0, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.draw_number_6);

  -- 보너스 번호 통계 업데이트
  UPDATE lotto_number_stats SET bonus_count = bonus_count + 1, updated_at = CURRENT_TIMESTAMP WHERE number = NEW.bonus_number;
  INSERT INTO lotto_number_stats (number, draw_count, bonus_count, last_draw_round, updated_at) 
  SELECT NEW.bonus_number, 0, 1, NEW.round, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM lotto_number_stats WHERE number = NEW.bonus_number);

  -- 이전 회차와 반복 번호 통계 (실제 반복 번호 개수 계산)
  INSERT INTO lotto_draw_repeat_stats (round, repeat_count, updated_at)
  VALUES (
    NEW.round,
    COALESCE((
      SELECT (
        CASE WHEN prev.draw_number_1 IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6) THEN 1 ELSE 0 END +
        CASE WHEN prev.draw_number_2 IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6) THEN 1 ELSE 0 END +
        CASE WHEN prev.draw_number_3 IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6) THEN 1 ELSE 0 END +
        CASE WHEN prev.draw_number_4 IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6) THEN 1 ELSE 0 END +
        CASE WHEN prev.draw_number_5 IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6) THEN 1 ELSE 0 END +
        CASE WHEN prev.draw_number_6 IN (NEW.draw_number_1, NEW.draw_number_2, NEW.draw_number_3, NEW.draw_number_4, NEW.draw_number_5, NEW.draw_number_6) THEN 1 ELSE 0 END
      )
      FROM lotto_draw_results prev
      WHERE prev.round = NEW.round - 1
    ), 0),
    CURRENT_TIMESTAMP
  );

  -- AC(산술적 복잡도) 통계 (실제 AC값 계산)
  INSERT INTO lotto_draw_ac_stats (round, ac_value, updated_at)
  SELECT 
    NEW.round,
    (SELECT COUNT(DISTINCT diff_val) - 1 FROM (
      SELECT ABS(NEW.draw_number_2 - NEW.draw_number_1) as diff_val
      UNION SELECT ABS(NEW.draw_number_3 - NEW.draw_number_1)
      UNION SELECT ABS(NEW.draw_number_4 - NEW.draw_number_1)
      UNION SELECT ABS(NEW.draw_number_5 - NEW.draw_number_1)
      UNION SELECT ABS(NEW.draw_number_6 - NEW.draw_number_1)
      UNION SELECT ABS(NEW.draw_number_3 - NEW.draw_number_2)
      UNION SELECT ABS(NEW.draw_number_4 - NEW.draw_number_2)
      UNION SELECT ABS(NEW.draw_number_5 - NEW.draw_number_2)
      UNION SELECT ABS(NEW.draw_number_6 - NEW.draw_number_2)
      UNION SELECT ABS(NEW.draw_number_4 - NEW.draw_number_3)
      UNION SELECT ABS(NEW.draw_number_5 - NEW.draw_number_3)
      UNION SELECT ABS(NEW.draw_number_6 - NEW.draw_number_3)
      UNION SELECT ABS(NEW.draw_number_5 - NEW.draw_number_4)
      UNION SELECT ABS(NEW.draw_number_6 - NEW.draw_number_4)
      UNION SELECT ABS(NEW.draw_number_6 - NEW.draw_number_5)
    )),
    CURRENT_TIMESTAMP;

  -- 번호 쌍 통계 업데이트 (6개 번호에서 2개씩 조합 = 15개 쌍)
  -- (1,2) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_2) OR (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_1);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_1, NEW.draw_number_2), MAX(NEW.draw_number_1, NEW.draw_number_2), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_2) OR (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_1)
  );

  -- (1,3) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_3) OR (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_1);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_1, NEW.draw_number_3), MAX(NEW.draw_number_1, NEW.draw_number_3), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_3) OR (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_1)
  );

  -- (1,4) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_4) OR (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_1);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_1, NEW.draw_number_4), MAX(NEW.draw_number_1, NEW.draw_number_4), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_4) OR (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_1)
  );

  -- (1,5) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_1);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_1, NEW.draw_number_5), MAX(NEW.draw_number_1, NEW.draw_number_5), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_1)
  );

  -- (1,6) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_1);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_1, NEW.draw_number_6), MAX(NEW.draw_number_1, NEW.draw_number_6), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_1 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_1)
  );

  -- (2,3) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_3) OR (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_2);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_2, NEW.draw_number_3), MAX(NEW.draw_number_2, NEW.draw_number_3), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_3) OR (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_2)
  );

  -- (2,4) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_4) OR (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_2);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_2, NEW.draw_number_4), MAX(NEW.draw_number_2, NEW.draw_number_4), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_4) OR (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_2)
  );

  -- (2,5) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_2);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_2, NEW.draw_number_5), MAX(NEW.draw_number_2, NEW.draw_number_5), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_2)
  );

  -- (2,6) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_2);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_2, NEW.draw_number_6), MAX(NEW.draw_number_2, NEW.draw_number_6), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_2 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_2)
  );

  -- (3,4) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_4) OR (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_3);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_3, NEW.draw_number_4), MAX(NEW.draw_number_3, NEW.draw_number_4), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_4) OR (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_3)
  );

  -- (3,5) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_3);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_3, NEW.draw_number_5), MAX(NEW.draw_number_3, NEW.draw_number_5), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_3)
  );

  -- (3,6) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_3);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_3, NEW.draw_number_6), MAX(NEW.draw_number_3, NEW.draw_number_6), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_3 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_3)
  );

  -- (4,5) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_4);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_4, NEW.draw_number_5), MAX(NEW.draw_number_4, NEW.draw_number_5), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_5) OR (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_4)
  );

  -- (4,6) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_4);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_4, NEW.draw_number_6), MAX(NEW.draw_number_4, NEW.draw_number_6), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_4 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_4)
  );

  -- (5,6) 쌍
  UPDATE lotto_number_pair_stats 
  SET pair_count = pair_count + 1, updated_at = CURRENT_TIMESTAMP 
  WHERE (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_5);
  INSERT INTO lotto_number_pair_stats (number_a, number_b, pair_count, updated_at) 
  SELECT MIN(NEW.draw_number_5, NEW.draw_number_6), MAX(NEW.draw_number_5, NEW.draw_number_6), 1, CURRENT_TIMESTAMP 
  WHERE NOT EXISTS (
    SELECT 1 FROM lotto_number_pair_stats 
    WHERE (number_a = NEW.draw_number_5 AND number_b = NEW.draw_number_6) OR (number_a = NEW.draw_number_6 AND number_b = NEW.draw_number_5)
  );

END;
