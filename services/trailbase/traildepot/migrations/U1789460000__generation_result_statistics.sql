-- Keep only anonymous combination multiplicities while awaiting/comparing a draw.
-- User IDs, display names, request IDs and timestamps are never copied here.
CREATE TABLE lotto_generation_result_combinations (
  round INTEGER NOT NULL REFERENCES lotto_generation_weekly_archives(round) ON DELETE CASCADE,
  number_mask INTEGER NOT NULL CHECK (number_mask > 0 AND number_mask < 35184372088832),
  generation_count INTEGER NOT NULL CHECK (generation_count > 0),
  PRIMARY KEY (round, number_mask)
) STRICT, WITHOUT ROWID;

ALTER TABLE lotto_generation_weekly_archives ADD COLUMN comparison_source TEXT NOT NULL DEFAULT 'unavailable'
  CHECK (comparison_source IN ('collecting', 'complete', 'expired', 'unavailable'));
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN captured_generations INTEGER NOT NULL DEFAULT 0
  CHECK (captured_generations BETWEEN 0 AND total_generations);
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN compared_generations INTEGER NOT NULL DEFAULT 0
  CHECK (compared_generations BETWEEN 0 AND total_generations);
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN result_cursor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN result_draw_mask INTEGER;
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN result_bonus INTEGER;
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN result_settled_at INTEGER;
-- Slots: non-winning, rank 1, rank 2, rank 3, rank 4, rank 5.
ALTER TABLE lotto_generation_weekly_archives ADD COLUMN rank_counts_json TEXT CHECK (
  rank_counts_json IS NULL OR (json_valid(rank_counts_json)
  AND json_type(rank_counts_json) = 'array' AND json_array_length(rank_counts_json) = 6)
);

-- Legacy frequency totals cannot reconstruct joint winning combinations.
-- Recover only intact source rounds; already-deleted records remain unavailable, never zero wins.
UPDATE lotto_generation_weekly_archives SET comparison_source = 'complete'
WHERE total_generations = 0;
UPDATE lotto_generation_weekly_archives SET comparison_source = 'collecting'
WHERE total_generations > 0 AND purged_at IS NULL
  AND total_generations = (SELECT count(*) FROM lotto_public_generations g
                          WHERE g.round = lotto_generation_weekly_archives.round);

-- Capture every post-close deletion, including an owner withdrawing during a purge.
-- The counter snapshot already includes these rows. Pre-close unsharing stays excluded.
CREATE TRIGGER lotto_generation_capture_result BEFORE DELETE ON lotto_public_generations
WHEN EXISTS (SELECT 1 FROM lotto_generation_weekly_archives
             WHERE round = OLD.round AND comparison_source = 'collecting')
BEGIN
  INSERT INTO lotto_generation_result_combinations(round, number_mask, generation_count)
  VALUES (OLD.round,
    (1 << (OLD.number_1 - 1)) | (1 << (OLD.number_2 - 1)) | (1 << (OLD.number_3 - 1)) |
    (1 << (OLD.number_4 - 1)) | (1 << (OLD.number_5 - 1)) | (1 << (OLD.number_6 - 1)), 1)
  ON CONFLICT(round, number_mask) DO UPDATE SET generation_count = generation_count + 1;
  UPDATE lotto_generation_weekly_archives SET captured_generations = captured_generations + 1
  WHERE round = OLD.round;
END;
