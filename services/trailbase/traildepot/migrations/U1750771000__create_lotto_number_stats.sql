-- new database migration
CREATE TABLE lotto_number_stats (
    number INTEGER PRIMARY KEY, -- 로또 번호 (1-45)
    draw_count INTEGER NOT NULL DEFAULT 0, -- 해당 번호가 추첨된 횟수
    bonus_count INTEGER NOT NULL DEFAULT 0, -- 해당 번호가 보너스 번호로 추첨된 횟수
    last_draw_round INTEGER, -- 마지막으로 추첨된 회차 번호
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_number_stats_draw_count ON lotto_number_stats(draw_count);
CREATE INDEX IF NOT EXISTS idx_lotto_number_stats_bonus_count ON lotto_number_stats(bonus_count);
CREATE INDEX IF NOT EXISTS idx_lotto_number_stats_last_draw_round ON lotto_number_stats(last_draw_round);

CREATE TABLE lotto_number_details (
    number INTEGER PRIMARY KEY, -- 로또 번호 (1-45)
    color TEXT NOT NULL,        -- 번호 색상 (예: yellow, blue, red, grey, green)
    section INTEGER NOT NULL,   -- 번호 구간 (예: 1 for 1-10, 2 for 11-20)
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_number_details_color ON lotto_number_details(color);
CREATE INDEX IF NOT EXISTS idx_lotto_number_details_section ON lotto_number_details(section);

CREATE TABLE lotto_draw_odd_even_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    odd_count INTEGER NOT NULL, -- 홀수 개수
    even_count INTEGER NOT NULL, -- 짝수 개수
    numbers_sum INTEGER NOT NULL, -- 당첨번호 총합
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_odd_even_stats_odd_count ON lotto_draw_odd_even_stats(odd_count);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_odd_even_stats_even_count ON lotto_draw_odd_even_stats(even_count);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_odd_even_stats_numbers_sum ON lotto_draw_odd_even_stats(numbers_sum);

CREATE TABLE lotto_draw_color_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    yellow_count INTEGER NOT NULL DEFAULT 0, -- 노란색 공 개수
    blue_count INTEGER NOT NULL DEFAULT 0,   -- 파란색 공 개수
    red_count INTEGER NOT NULL DEFAULT 0,    -- 빨간색 공 개수
    grey_count INTEGER NOT NULL DEFAULT 0,   -- 회색 공 개수
    green_count INTEGER NOT NULL DEFAULT 0,  -- 초록색 공 개수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_color_stats_yellow_count ON lotto_draw_color_stats(yellow_count);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_color_stats_blue_count ON lotto_draw_color_stats(blue_count);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_color_stats_red_count ON lotto_draw_color_stats(red_count);

CREATE TABLE lotto_draw_section_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    section_1_10 INTEGER NOT NULL DEFAULT 0,  -- 1-10 구간 개수
    section_11_20 INTEGER NOT NULL DEFAULT 0, -- 11-20 구간 개수
    section_21_30 INTEGER NOT NULL DEFAULT 0, -- 21-30 구간 개수
    section_31_40 INTEGER NOT NULL DEFAULT 0, -- 31-40 구간 개수
    section_41_45 INTEGER NOT NULL DEFAULT 0, -- 41-45 구간 개수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_section_stats_section_1_10 ON lotto_draw_section_stats(section_1_10);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_section_stats_section_11_20 ON lotto_draw_section_stats(section_11_20);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_section_stats_section_21_30 ON lotto_draw_section_stats(section_21_30);

CREATE TABLE lotto_draw_consecutive_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    consecutive_pairs_count INTEGER NOT NULL DEFAULT 0, -- 2연속 번호 쌍의 수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_consecutive_stats_pairs_count ON lotto_draw_consecutive_stats(consecutive_pairs_count);

CREATE TABLE lotto_draw_high_low_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    low_count INTEGER NOT NULL, -- 저번대(1-22) 개수
    high_count INTEGER NOT NULL, -- 고번대(23-45) 개수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_high_low_stats_low_count ON lotto_draw_high_low_stats(low_count);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_high_low_stats_high_count ON lotto_draw_high_low_stats(high_count);

CREATE TABLE lotto_draw_repeat_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    repeat_count INTEGER NOT NULL, -- 이전 회차와 동일한 번호 개수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_repeat_stats_repeat_count ON lotto_draw_repeat_stats(repeat_count);

CREATE TABLE lotto_draw_unit_digit_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    digit_0_count INTEGER NOT NULL DEFAULT 0, -- 끝수 0의 개수
    digit_1_count INTEGER NOT NULL DEFAULT 0, -- 끝수 1의 개수
    digit_2_count INTEGER NOT NULL DEFAULT 0, -- 끝수 2의 개수
    digit_3_count INTEGER NOT NULL DEFAULT 0, -- 끝수 3의 개수
    digit_4_count INTEGER NOT NULL DEFAULT 0, -- 끝수 4의 개수
    digit_5_count INTEGER NOT NULL DEFAULT 0, -- 끝수 5의 개수
    digit_6_count INTEGER NOT NULL DEFAULT 0, -- 끝수 6의 개수
    digit_7_count INTEGER NOT NULL DEFAULT 0, -- 끝수 7의 개수
    digit_8_count INTEGER NOT NULL DEFAULT 0, -- 끝수 8의 개수
    digit_9_count INTEGER NOT NULL DEFAULT 0, -- 끝수 9의 개수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_unit_digit_stats_digit_0_count ON lotto_draw_unit_digit_stats(digit_0_count);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_unit_digit_stats_digit_5_count ON lotto_draw_unit_digit_stats(digit_5_count);

CREATE TABLE lotto_number_pair_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 고유 PK
    number_a INTEGER NOT NULL, -- 번호 A
    number_b INTEGER NOT NULL, -- 번호 B
    pair_count INTEGER NOT NULL DEFAULT 0, -- 두 번호가 함께 나온 횟수
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 마지막 업데이트 시각
    UNIQUE (number_a, number_b)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_number_pair_stats_number_a ON lotto_number_pair_stats(number_a);
CREATE INDEX IF NOT EXISTS idx_lotto_number_pair_stats_number_b ON lotto_number_pair_stats(number_b);
CREATE INDEX IF NOT EXISTS idx_lotto_number_pair_stats_pair_count ON lotto_number_pair_stats(pair_count);

CREATE TABLE lotto_draw_ac_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    ac_value INTEGER NOT NULL, -- AC(산술적 복잡도) 값
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_ac_stats_ac_value ON lotto_draw_ac_stats(ac_value);

-- lotto_number_details 초기 데이터 삽입 (1~45번 번호별 색상, 구간 정보)
INSERT INTO lotto_number_details (number, color, section) VALUES
-- 1-10 구간 (section 1)
(1, 'yellow', 1), (2, 'blue', 1), (3, 'red', 1), (4, 'grey', 1), (5, 'green', 1),
(6, 'yellow', 1), (7, 'blue', 1), (8, 'red', 1), (9, 'grey', 1), (10, 'green', 1),
-- 11-20 구간 (section 2)
(11, 'yellow', 2), (12, 'blue', 2), (13, 'red', 2), (14, 'grey', 2), (15, 'green', 2),
(16, 'yellow', 2), (17, 'blue', 2), (18, 'red', 2), (19, 'grey', 2), (20, 'green', 2),
-- 21-30 구간 (section 3)
(21, 'yellow', 3), (22, 'blue', 3), (23, 'red', 3), (24, 'grey', 3), (25, 'green', 3),
(26, 'yellow', 3), (27, 'blue', 3), (28, 'red', 3), (29, 'grey', 3), (30, 'green', 3),
-- 31-40 구간 (section 4)
(31, 'yellow', 4), (32, 'blue', 4), (33, 'red', 4), (34, 'grey', 4), (35, 'green', 4),
(36, 'yellow', 4), (37, 'blue', 4), (38, 'red', 4), (39, 'grey', 4), (40, 'green', 4),
-- 41-45 구간 (section 5)
(41, 'yellow', 5), (42, 'blue', 5), (43, 'red', 5), (44, 'grey', 5), (45, 'green', 5);
