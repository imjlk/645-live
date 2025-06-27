CREATE TABLE lotto_draw_scan_counts (
    round INTEGER PRIMARY KEY,  -- 회차 번호 (PK)
    scan_count_1 INTEGER DEFAULT 0,    -- 1번 공 스캔 횟수
    scan_count_2 INTEGER DEFAULT 0,    -- 2번 공 스캔 횟수
    scan_count_3 INTEGER DEFAULT 0,    -- 3번 공 스캔 횟수
    scan_count_4 INTEGER DEFAULT 0,    -- 4번 공 스캔 횟수
    scan_count_5 INTEGER DEFAULT 0,    -- 5번 공 스캔 횟수
    scan_count_6 INTEGER DEFAULT 0,    -- 6번 공 스캔 횟수
    scan_count_7 INTEGER DEFAULT 0,    -- 7번 공 스캔 횟수
    scan_count_8 INTEGER DEFAULT 0,    -- 8번 공 스캔 횟수
    scan_count_9 INTEGER DEFAULT 0,    -- 9번 공 스캔 횟수
    scan_count_10 INTEGER DEFAULT 0,   -- 10번 공 스캔 횟수
    scan_count_11 INTEGER DEFAULT 0,   -- 11번 공 스캔 횟수
    scan_count_12 INTEGER DEFAULT 0,   -- 12번 공 스캔 횟수
    scan_count_13 INTEGER DEFAULT 0,   -- 13번 공 스캔 횟수
    scan_count_14 INTEGER DEFAULT 0,   -- 14번 공 스캔 횟수
    scan_count_15 INTEGER DEFAULT 0,   -- 15번 공 스캔 횟수
    scan_count_16 INTEGER DEFAULT 0,   -- 16번 공 스캔 횟수
    scan_count_17 INTEGER DEFAULT 0,   -- 17번 공 스캔 횟수
    scan_count_18 INTEGER DEFAULT 0,   -- 18번 공 스캔 횟수
    scan_count_19 INTEGER DEFAULT 0,   -- 19번 공 스캔 횟수
    scan_count_20 INTEGER DEFAULT 0,   -- 20번 공 스캔 횟수
    scan_count_21 INTEGER DEFAULT 0,   -- 21번 공 스캔 횟수
    scan_count_22 INTEGER DEFAULT 0,   -- 22번 공 스캔 횟수
    scan_count_23 INTEGER DEFAULT 0,   -- 23번 공 스캔 횟수
    scan_count_24 INTEGER DEFAULT 0,   -- 24번 공 스캔 횟수
    scan_count_25 INTEGER DEFAULT 0,   -- 25번 공 스캔 횟수
    scan_count_26 INTEGER DEFAULT 0,   -- 26번 공 스캔 횟수
    scan_count_27 INTEGER DEFAULT 0,   -- 27번 공 스캔 횟수
    scan_count_28 INTEGER DEFAULT 0,   -- 28번 공 스캔 횟수
    scan_count_29 INTEGER DEFAULT 0,   -- 29번 공 스캔 횟수
    scan_count_30 INTEGER DEFAULT 0,   -- 30번 공 스캔 횟수
    scan_count_31 INTEGER DEFAULT 0,   -- 31번 공 스캔 횟수
    scan_count_32 INTEGER DEFAULT 0,   -- 32번 공 스캔 횟수
    scan_count_33 INTEGER DEFAULT 0,   -- 33번 공 스캔 횟수
    scan_count_34 INTEGER DEFAULT 0,   -- 34번 공 스캔 횟수
    scan_count_35 INTEGER DEFAULT 0,   -- 35번 공 스캔 횟수
    scan_count_36 INTEGER DEFAULT 0,   -- 36번 공 스캔 횟수
    scan_count_37 INTEGER DEFAULT 0,   -- 37번 공 스캔 횟수
    scan_count_38 INTEGER DEFAULT 0,   -- 38번 공 스캔 횟수
    scan_count_39 INTEGER DEFAULT 0,   -- 39번 공 스캔 횟수
    scan_count_40 INTEGER DEFAULT 0,   -- 40번 공 스캔 횟수
    scan_count_41 INTEGER DEFAULT 0,   -- 41번 공 스캔 횟수
    scan_count_42 INTEGER DEFAULT 0,   -- 42번 공 스캔 횟수
    scan_count_43 INTEGER DEFAULT 0,   -- 43번 공 스캔 횟수
    scan_count_44 INTEGER DEFAULT 0,   -- 44번 공 스캔 횟수
    scan_count_45 INTEGER DEFAULT 0,   -- 45번 공 스캔 횟수
    total_scans INTEGER DEFAULT 0, -- 해당 회차 총 스캔 횟수 (선택 사항, 중복될 수 있지만 편의성)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 마지막 업데이트 시각
);

CREATE TABLE lotto_draw_results (
    round INTEGER PRIMARY KEY,                       -- 회차 번호 (PK)
    draw_date DATE,                                  -- 추첨일
    total_sell_amount BIGINT,                        -- 총 판매금액
    first_prize_amount BIGINT,                       -- 1등 당첨금액
    first_prize_winner_count INTEGER,                -- 1등 당첨자 수
    first_prize_accumulated_amount BIGINT,           -- 1등 누적 당첨금액
    draw_number_1 INTEGER,                           -- 당첨번호 1
    draw_number_2 INTEGER,                           -- 당첨번호 2
    draw_number_3 INTEGER,                           -- 당첨번호 3
    draw_number_4 INTEGER,                           -- 당첨번호 4
    draw_number_5 INTEGER,                           -- 당첨번호 5
    draw_number_6 INTEGER,                           -- 당첨번호 6
    bonus_number INTEGER,                            -- 보너스 번호
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 마지막 업데이트 시각
);
