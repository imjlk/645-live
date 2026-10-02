-- Anonymous activity aggregates. Existing scan frequency data cannot reconstruct
-- pairs or patterns; these aggregates explicitly track their own sample coverage.
CREATE TABLE lotto_activity_rounds (
  source TEXT NOT NULL CHECK (source IN ('generated','scanned')),
  round INTEGER NOT NULL CHECK (round > 0),
  combinations INTEGER NOT NULL DEFAULT 0 CHECK (combinations >= 0),
  odd_counts_json TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0]' CHECK (json_valid(odd_counts_json) AND json_array_length(odd_counts_json)=7),
  sum_counts_json TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0,0,0]' CHECK (json_valid(sum_counts_json) AND json_array_length(sum_counts_json)=14),
  with_consecutive INTEGER NOT NULL DEFAULT 0 CHECK (with_consecutive >= 0),
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(source,round)
) STRICT, WITHOUT ROWID;
CREATE TABLE lotto_activity_pairs (
  source TEXT NOT NULL CHECK (source IN ('generated','scanned')),
  round INTEGER NOT NULL CHECK (round > 0),
  first_number INTEGER NOT NULL CHECK (first_number BETWEEN 1 AND 44),
  second_number INTEGER NOT NULL CHECK (second_number BETWEEN 2 AND 45 AND second_number > first_number),
  occurrences INTEGER NOT NULL CHECK (occurrences >= 0),
  PRIMARY KEY(source,round,first_number,second_number)
) STRICT, WITHOUT ROWID;
CREATE TABLE lotto_activity_hours (
  source TEXT NOT NULL CHECK (source IN ('generated','scanned')),
  round INTEGER NOT NULL CHECK (round > 0),
  hour INTEGER NOT NULL CHECK (hour >= 0),
  combinations INTEGER NOT NULL CHECK (combinations >= 0),
  number_counts_json TEXT NOT NULL CHECK (json_valid(number_counts_json) AND json_array_length(number_counts_json)=45),
  PRIMARY KEY(source,round,hour)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_lotto_activity_hours_retention ON lotto_activity_hours(hour);
-- An internal transactional mailbox: its trigger deletes every input immediately.
-- It retains no identities, QR payloads or individual combinations.
CREATE TABLE lotto_activity_deltas (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('generated','scanned')),
  round INTEGER NOT NULL CHECK (round > 0),
  numbers_json TEXT NOT NULL CHECK (json_valid(numbers_json) AND json_array_length(numbers_json)=6
    AND json_extract(numbers_json,'$[0]')>=1 AND json_extract(numbers_json,'$[5]')<=45
    AND json_extract(numbers_json,'$[0]')<json_extract(numbers_json,'$[1]')
    AND json_extract(numbers_json,'$[1]')<json_extract(numbers_json,'$[2]')
    AND json_extract(numbers_json,'$[2]')<json_extract(numbers_json,'$[3]')
    AND json_extract(numbers_json,'$[3]')<json_extract(numbers_json,'$[4]')
    AND json_extract(numbers_json,'$[4]')<json_extract(numbers_json,'$[5]')),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  delta INTEGER NOT NULL CHECK(delta IN (-1,1))
) STRICT;
CREATE TRIGGER lotto_activity_collect AFTER INSERT ON lotto_activity_deltas BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.numbers_json) WHERE type != 'integer') THEN RAISE(ABORT,'Activity numbers must be integers') END;
  INSERT OR IGNORE INTO lotto_activity_rounds(source,round,started_at,updated_at)
  VALUES(NEW.source,NEW.round,NEW.created_at,NEW.created_at);
  UPDATE lotto_activity_rounds SET
    combinations=combinations+NEW.delta,
    odd_counts_json=json_set(odd_counts_json,'$[' || (SELECT sum(value % 2) FROM json_each(NEW.numbers_json)) || ']',json_extract(odd_counts_json,'$[' || (SELECT sum(value % 2) FROM json_each(NEW.numbers_json)) || ']')+NEW.delta),
    sum_counts_json=json_set(sum_counts_json,'$[' || (SELECT CAST(sum(value) / 20 AS INTEGER) FROM json_each(NEW.numbers_json)) || ']',json_extract(sum_counts_json,'$[' || (SELECT CAST(sum(value) / 20 AS INTEGER) FROM json_each(NEW.numbers_json)) || ']')+NEW.delta),
    with_consecutive=with_consecutive+NEW.delta*(SELECT EXISTS(SELECT 1 FROM json_each(NEW.numbers_json) a JOIN json_each(NEW.numbers_json) b ON b.value=a.value+1)),
    started_at=min(started_at,NEW.created_at),updated_at=CAST(unixepoch('subsec')*1000 AS INTEGER)
  WHERE source=NEW.source AND round=NEW.round;
  INSERT OR IGNORE INTO lotto_activity_pairs(source,round,first_number,second_number,occurrences)
  SELECT NEW.source,NEW.round,a.value,b.value,0
  FROM json_each(NEW.numbers_json) a JOIN json_each(NEW.numbers_json) b ON a.value<b.value;
  UPDATE lotto_activity_pairs SET occurrences=occurrences+NEW.delta
  WHERE source=NEW.source AND round=NEW.round
    AND first_number IN (SELECT value FROM json_each(NEW.numbers_json))
    AND second_number IN (SELECT value FROM json_each(NEW.numbers_json));
  INSERT OR IGNORE INTO lotto_activity_hours(source,round,hour,combinations,number_counts_json)
  SELECT NEW.source,NEW.round,NEW.created_at/3600000,0,'[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]' WHERE NEW.delta>0;
  UPDATE lotto_activity_hours SET combinations=combinations+NEW.delta,
    number_counts_json=(SELECT json_group_array(value+NEW.delta*CASE WHEN CAST(key AS INTEGER)+1 IN (SELECT value FROM json_each(NEW.numbers_json)) THEN 1 ELSE 0 END) FROM json_each(number_counts_json))
  WHERE source=NEW.source AND round=NEW.round AND hour=NEW.created_at/3600000;
  DELETE FROM lotto_activity_deltas WHERE id=NEW.id;
END;
-- Backfill only public records still available before the archive closes them.
INSERT INTO lotto_activity_deltas(source,round,numbers_json,created_at,delta)
SELECT 'generated',round,json_array(number_1,number_2,number_3,number_4,number_5,number_6),created_at,1
FROM lotto_public_generations g
WHERE NOT EXISTS(SELECT 1 FROM lotto_generation_weekly_archives a WHERE a.round=g.round);
CREATE TRIGGER lotto_activity_generation_insert AFTER INSERT ON lotto_public_generations BEGIN
  INSERT INTO lotto_activity_deltas(source,round,numbers_json,created_at,delta)
  VALUES('generated',NEW.round,json_array(NEW.number_1,NEW.number_2,NEW.number_3,NEW.number_4,NEW.number_5,NEW.number_6),NEW.created_at,1);
END;
CREATE TRIGGER lotto_activity_generation_delete BEFORE DELETE ON lotto_public_generations
WHEN NOT EXISTS(SELECT 1 FROM lotto_generation_weekly_archives WHERE round=OLD.round) BEGIN
  INSERT INTO lotto_activity_deltas(source,round,numbers_json,created_at,delta)
  VALUES('generated',OLD.round,json_array(OLD.number_1,OLD.number_2,OLD.number_3,OLD.number_4,OLD.number_5,OLD.number_6),OLD.created_at,-1);
END;
