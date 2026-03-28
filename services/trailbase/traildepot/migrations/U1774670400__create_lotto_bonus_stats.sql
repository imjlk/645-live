CREATE TABLE lotto_draw_bonus_stats (
    round INTEGER PRIMARY KEY,
    bonus_number INTEGER NOT NULL,
    color TEXT NOT NULL,
    section INTEGER NOT NULL,
    is_odd INTEGER NOT NULL DEFAULT 0,
    is_high INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_draw_bonus_stats_bonus_number ON lotto_draw_bonus_stats(bonus_number);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_bonus_stats_color ON lotto_draw_bonus_stats(color);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_bonus_stats_section ON lotto_draw_bonus_stats(section);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_bonus_stats_is_odd ON lotto_draw_bonus_stats(is_odd);
CREATE INDEX IF NOT EXISTS idx_lotto_draw_bonus_stats_is_high ON lotto_draw_bonus_stats(is_high);

CREATE TABLE lotto_bonus_number_stats (
    number INTEGER PRIMARY KEY,
    bonus_count INTEGER NOT NULL DEFAULT 0,
    main_count INTEGER NOT NULL DEFAULT 0,
    combined_count INTEGER NOT NULL DEFAULT 0,
    last_bonus_round INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lotto_bonus_number_stats_bonus_count ON lotto_bonus_number_stats(bonus_count);
CREATE INDEX IF NOT EXISTS idx_lotto_bonus_number_stats_combined_count ON lotto_bonus_number_stats(combined_count);
CREATE INDEX IF NOT EXISTS idx_lotto_bonus_number_stats_last_bonus_round ON lotto_bonus_number_stats(last_bonus_round);

INSERT INTO lotto_draw_bonus_stats (
    round,
    bonus_number,
    color,
    section,
    is_odd,
    is_high,
    updated_at
)
SELECT
    r.round,
    r.bonus_number,
    d.color,
    d.section,
    CASE WHEN r.bonus_number % 2 = 1 THEN 1 ELSE 0 END,
    CASE WHEN r.bonus_number >= 23 THEN 1 ELSE 0 END,
    CURRENT_TIMESTAMP
FROM lotto_draw_results r
JOIN lotto_number_details d ON d.number = r.bonus_number
ORDER BY r.round;

INSERT INTO lotto_bonus_number_stats (
    number,
    bonus_count,
    main_count,
    combined_count,
    last_bonus_round,
    updated_at
)
SELECT
    d.number,
    COALESCE(n.bonus_count, 0),
    COALESCE(n.draw_count, 0),
    COALESCE(n.draw_count, 0) + COALESCE(n.bonus_count, 0),
    (
        SELECT MAX(r.round)
        FROM lotto_draw_results r
        WHERE r.bonus_number = d.number
    ),
    CURRENT_TIMESTAMP
FROM lotto_number_details d
LEFT JOIN lotto_number_stats n ON n.number = d.number
ORDER BY d.number;

CREATE TRIGGER IF NOT EXISTS lotto_draw_results_bonus_stats_after_insert
AFTER INSERT ON lotto_draw_results
BEGIN
    INSERT OR REPLACE INTO lotto_draw_bonus_stats (
        round,
        bonus_number,
        color,
        section,
        is_odd,
        is_high,
        updated_at
    )
    SELECT
        NEW.round,
        NEW.bonus_number,
        d.color,
        d.section,
        CASE WHEN NEW.bonus_number % 2 = 1 THEN 1 ELSE 0 END,
        CASE WHEN NEW.bonus_number >= 23 THEN 1 ELSE 0 END,
        CURRENT_TIMESTAMP
    FROM lotto_number_details d
    WHERE d.number = NEW.bonus_number;

    UPDATE lotto_bonus_number_stats
    SET
        main_count = main_count + 1,
        combined_count = combined_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE number IN (
        NEW.draw_number_1,
        NEW.draw_number_2,
        NEW.draw_number_3,
        NEW.draw_number_4,
        NEW.draw_number_5,
        NEW.draw_number_6
    );

    UPDATE lotto_bonus_number_stats
    SET
        bonus_count = bonus_count + 1,
        combined_count = combined_count + 1,
        last_bonus_round = NEW.round,
        updated_at = CURRENT_TIMESTAMP
    WHERE number = NEW.bonus_number;
END;
