-- Generation ad cadence: a fixed first gate, then recurring randomized intervals.
-- Existing device/server progress rows keep counting down under their old interval.
ALTER TABLE ait_lotto_generation_ad_policy ADD COLUMN first_generations INTEGER NOT NULL DEFAULT 5 CHECK (first_generations BETWEEN 1 AND 200);
UPDATE ait_lotto_generation_ad_policy SET min_generations=5, max_generations=30 WHERE id=1;
