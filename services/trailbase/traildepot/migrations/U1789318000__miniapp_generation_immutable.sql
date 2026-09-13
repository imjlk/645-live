-- Counter triggers assume append/delete semantics. Corrections replace a generation.
CREATE TRIGGER ait_lotto_generation_immutable
BEFORE UPDATE OF round, number_1, number_2, number_3, number_4, number_5, number_6
ON lotto_public_generations
BEGIN
  SELECT RAISE(ABORT, 'Generation numbers and round are immutable');
END;
