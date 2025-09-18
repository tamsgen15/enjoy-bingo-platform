-- Regenerate truly unique bingo cards with proper randomization

-- Drop and recreate function with better randomization
DROP FUNCTION IF EXISTS generate_unique_bingo_card(INTEGER);

CREATE OR REPLACE FUNCTION generate_unique_bingo_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
  seed_val FLOAT;
BEGIN
  -- Set unique seed based on card number and current time
  seed_val := (card_num * 0.123456789 + extract(epoch from now()) * 0.001) % 1.0;
  PERFORM setseed(seed_val);
  
  -- Generate B column (1-15) - 5 unique numbers
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(1, 15) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO b_nums;
  
  -- New seed for I column
  PERFORM setseed((seed_val + 0.1) % 1.0);
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(16, 30) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO i_nums;
  
  -- New seed for N column
  PERFORM setseed((seed_val + 0.2) % 1.0);
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(31, 45) AS num ORDER BY random()
    ) sub LIMIT 4
  ) INTO n_nums;
  
  -- New seed for G column
  PERFORM setseed((seed_val + 0.3) % 1.0);
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(46, 60) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO g_nums;
  
  -- New seed for O column
  PERFORM setseed((seed_val + 0.4) % 1.0);
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(61, 75) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO o_nums;
  
  INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column)
  VALUES (card_num, b_nums, i_nums, n_nums, g_nums, o_nums)
  ON CONFLICT (card_number) DO UPDATE SET
    b_column = EXCLUDED.b_column,
    i_column = EXCLUDED.i_column,
    n_column = EXCLUDED.n_column,
    g_column = EXCLUDED.g_column,
    o_column = EXCLUDED.o_column;
END;
$$ LANGUAGE plpgsql;

-- Clear and regenerate all cards
DELETE FROM bingo_cards;

-- Generate with delays to ensure different timestamps
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_unique_bingo_card(i);
    -- Small delay to change timestamp
    PERFORM pg_sleep(0.01);
  END LOOP;
END $$;