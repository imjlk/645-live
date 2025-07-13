-- 로또 당첨점 정보 테이블
CREATE TABLE lotto_winning_stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round INTEGER NOT NULL,
    store_name TEXT NOT NULL,
    address TEXT NOT NULL,
    win_type TEXT NOT NULL CHECK (win_type IN ('1등', '2등')),
    selection_type TEXT CHECK (selection_type IN ('자동', '수동')) -- 1등만 해당, 2등은 NULL
) STRICT;

-- 인덱스 생성
CREATE INDEX idx_lotto_winning_stores_round ON lotto_winning_stores(round);
CREATE INDEX idx_lotto_winning_stores_win_type ON lotto_winning_stores(win_type);
CREATE INDEX idx_lotto_winning_stores_round_win_type ON lotto_winning_stores(round, win_type);
