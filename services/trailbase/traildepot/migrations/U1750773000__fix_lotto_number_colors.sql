-- Fix lotto number colors to match LottoBall component color scheme
-- Update color values based on number ranges instead of cycling pattern

UPDATE lotto_number_details SET color = 'yellow' WHERE number BETWEEN 1 AND 10;
UPDATE lotto_number_details SET color = 'blue' WHERE number BETWEEN 11 AND 20;
UPDATE lotto_number_details SET color = 'red' WHERE number BETWEEN 21 AND 30;
UPDATE lotto_number_details SET color = 'gray' WHERE number BETWEEN 31 AND 40;
UPDATE lotto_number_details SET color = 'green' WHERE number BETWEEN 41 AND 45;