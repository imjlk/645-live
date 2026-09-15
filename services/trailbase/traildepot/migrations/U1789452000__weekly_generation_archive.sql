-- One anonymous aggregate per closed round; public detail rows can then be purged.
-- No user identifiers, aliases, individual combinations or promotion data are archived.
CREATE TABLE lotto_generation_weekly_archives (
  round INTEGER PRIMARY KEY CHECK (round > 0),
  total_generations INTEGER NOT NULL CHECK (total_generations >= 0),
  number_counts_json TEXT NOT NULL CHECK (
    json_valid(number_counts_json) AND json_type(number_counts_json) = 'array'
    AND json_array_length(number_counts_json) = 45
  ),
  closed_at INTEGER NOT NULL,
  archived_at INTEGER NOT NULL CHECK (archived_at >= closed_at),
  purged_at INTEGER CHECK (purged_at IS NULL OR purged_at >= archived_at)
) STRICT;

CREATE TRIGGER lotto_generation_archive_validate BEFORE INSERT ON lotto_generation_weekly_archives
BEGIN
  SELECT CASE WHEN
    EXISTS (SELECT 1 FROM json_each(NEW.number_counts_json)
            WHERE type != 'integer' OR value < 0 OR value > NEW.total_generations)
    OR (SELECT sum(value) FROM json_each(NEW.number_counts_json)) != NEW.total_generations * 6
  THEN RAISE(ABORT, 'Generation archive counters are inconsistent') END;
END;

-- A retry, stale request or older server cannot repopulate a frozen round.
CREATE TRIGGER lotto_generation_archived_round BEFORE INSERT ON lotto_public_generations
WHEN EXISTS (SELECT 1 FROM lotto_generation_weekly_archives WHERE round=NEW.round)
BEGIN
  SELECT RAISE(ABORT, 'Generation round has been archived');
END;

-- Retain current-round deletion behavior, but do not recreate/reset counters while purging.
DROP TRIGGER ait_lotto_count_delete;
CREATE TRIGGER ait_lotto_count_delete AFTER DELETE ON lotto_public_generations
WHEN NOT EXISTS (SELECT 1 FROM lotto_generation_weekly_archives WHERE round=OLD.round)
BEGIN
  INSERT OR IGNORE INTO lotto_draw_generation_counts(round, updated_at) VALUES (OLD.round, OLD.created_at);
  UPDATE lotto_draw_generation_counts SET
    total_generations = total_generations - 1,
    generation_count_1 = generation_count_1 - (1 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_2 = generation_count_2 - (2 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_3 = generation_count_3 - (3 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_4 = generation_count_4 - (4 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_5 = generation_count_5 - (5 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_6 = generation_count_6 - (6 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_7 = generation_count_7 - (7 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_8 = generation_count_8 - (8 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_9 = generation_count_9 - (9 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_10 = generation_count_10 - (10 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_11 = generation_count_11 - (11 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_12 = generation_count_12 - (12 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_13 = generation_count_13 - (13 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_14 = generation_count_14 - (14 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_15 = generation_count_15 - (15 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_16 = generation_count_16 - (16 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_17 = generation_count_17 - (17 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_18 = generation_count_18 - (18 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_19 = generation_count_19 - (19 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_20 = generation_count_20 - (20 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_21 = generation_count_21 - (21 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_22 = generation_count_22 - (22 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_23 = generation_count_23 - (23 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_24 = generation_count_24 - (24 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_25 = generation_count_25 - (25 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_26 = generation_count_26 - (26 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_27 = generation_count_27 - (27 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_28 = generation_count_28 - (28 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_29 = generation_count_29 - (29 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_30 = generation_count_30 - (30 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_31 = generation_count_31 - (31 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_32 = generation_count_32 - (32 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_33 = generation_count_33 - (33 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_34 = generation_count_34 - (34 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_35 = generation_count_35 - (35 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_36 = generation_count_36 - (36 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_37 = generation_count_37 - (37 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_38 = generation_count_38 - (38 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_39 = generation_count_39 - (39 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_40 = generation_count_40 - (40 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_41 = generation_count_41 - (41 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_42 = generation_count_42 - (42 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_43 = generation_count_43 - (43 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_44 = generation_count_44 - (44 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    generation_count_45 = generation_count_45 - (45 IN (OLD.number_1, OLD.number_2, OLD.number_3, OLD.number_4, OLD.number_5, OLD.number_6)),
    updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE round = OLD.round;
END;

-- Pruning must seek expired archived rounds, not scan the active week's request history.
CREATE INDEX ait_lotto_requests_archive ON ait_lotto_generation_requests(
  json_extract(payload_json, '$.round'), created_at
) WHERE generation_id IS NULL;
CREATE INDEX web_lotto_batches_archive ON web_lotto_generation_batches(
  json_extract(payload_json, '$.round'), created_at
);
