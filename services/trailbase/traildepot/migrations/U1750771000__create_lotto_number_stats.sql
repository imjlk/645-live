-- new database migration
CREATE TABLE lotto_number_stats (
    number INTEGER PRIMARY KEY, -- 로또 번호 (1-45)
    draw_count INTEGER DEFAULT 0, -- 당첨 번호로 나온 횟수
    bonus_count INTEGER DEFAULT 0, -- 보너스 번호로 나온 횟수
    last_draw_round INTEGER, -- 마지막으로 당첨된 회차
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
);

-- 색상, 구간 등 번호별 상세 정보를 관리하는 테이블
CREATE TABLE lotto_number_details (
    number INTEGER PRIMARY KEY, -- 로또 번호 (1-45)
    color TEXT NOT NULL, -- 번호 색상 (e.g., yellow, blue, red, grey, green)
    section INTEGER NOT NULL -- 번호 구간 (e.g., 1 for 1-10, 2 for 11-20)
);

-- 회차별 홀/짝 통계
CREATE TABLE lotto_draw_odd_even_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    odd_count INTEGER NOT NULL, -- 홀수 개수
    even_count INTEGER NOT NULL, -- 짝수 개수
    numbers_sum INTEGER NOT NULL, -- 당첨번호 총합
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 회차별 색상 통계
CREATE TABLE lotto_draw_color_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    yellow_count INTEGER DEFAULT 0,
    blue_count INTEGER DEFAULT 0,
    red_count INTEGER DEFAULT 0,
    grey_count INTEGER DEFAULT 0,
    green_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 회차별 구간 통계
CREATE TABLE lotto_draw_section_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    section_1_10 INTEGER DEFAULT 0, -- 1-10 구간 개수
    section_11_20 INTEGER DEFAULT 0, -- 11-20 구간 개수
    section_21_30 INTEGER DEFAULT 0, -- 21-30 구간 개수
    section_31_40 INTEGER DEFAULT 0, -- 31-40 구간 개수
    section_41_45 INTEGER DEFAULT 0, -- 41-45 구간 개수
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 회차별 연속번호 출현 통계
CREATE TABLE lotto_draw_consecutive_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    consecutive_pairs_count INTEGER DEFAULT 0, -- 2연속 번호 쌍의 수
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 회차별 고/저 통계
CREATE TABLE lotto_draw_high_low_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    low_count INTEGER NOT NULL, -- 저번대 (1-22) 개수
    high_count INTEGER NOT NULL, -- 고번대 (23-45) 개수
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 이전 회차와 연속으로 출현한 번호 통계
CREATE TABLE lotto_draw_repeat_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    repeat_count INTEGER NOT NULL, -- 이전 회차와 동일한 번호 개수
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 회차별 끝수 통계
CREATE TABLE lotto_draw_unit_digit_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    digit_0_count INTEGER DEFAULT 0, -- 끝수 0의 개수
    digit_1_count INTEGER DEFAULT 0, -- 끝수 1의 개수
    digit_2_count INTEGER DEFAULT 0, -- 끝수 2의 개수
    digit_3_count INTEGER DEFAULT 0, -- 끝수 3의 개수
    digit_4_count INTEGER DEFAULT 0, -- 끝수 4의 개수
    digit_5_count INTEGER DEFAULT 0, -- 끝수 5의 개수
    digit_6_count INTEGER DEFAULT 0, -- 끝수 6의 개수
    digit_7_count INTEGER DEFAULT 0, -- 끝수 7의 개수
    digit_8_count INTEGER DEFAULT 0, -- 끝수 8의 개수
    digit_9_count INTEGER DEFAULT 0, -- 끝수 9의 개수
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 번호 궁합 통계 (두 번호가 함께 나온 횟수)
CREATE TABLE lotto_number_pair_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- 기본 키
    number_a INTEGER NOT NULL, -- 번호 A
    number_b INTEGER NOT NULL, -- 번호 B
    pair_count INTEGER DEFAULT 0, -- 함께 나온 횟수
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (number_a, number_b)
);

-- 회차별 AC(산술적 복잡도) 통계
CREATE TABLE lotto_draw_ac_stats (
    round INTEGER PRIMARY KEY, -- 회차 번호 (PK)
    ac_value INTEGER NOT NULL, -- AC 값
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
