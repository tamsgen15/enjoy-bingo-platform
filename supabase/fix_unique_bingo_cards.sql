-- Fix bingo cards to ensure unique numbers in each column
-- Drop existing cards and recreate with proper unique generation

-- Clear existing cards
DELETE FROM bingo_cards;

-- Drop and recreate the generation function with proper uniqueness
DROP FUNCTION IF EXISTS generate_bingo_card(INTEGER);

CREATE OR REPLACE FUNCTION generate_unique_bingo_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
  temp_array INTEGER[];
BEGIN
  -- Generate B column (1-15) - 5 unique numbers
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(1, 15) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO b_nums;
  
  -- Generate I column (16-30) - 5 unique numbers
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(16, 30) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO i_nums;
  
  -- Generate N column (31-45) - 4 unique numbers (excluding free space)
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(31, 45) AS num ORDER BY random()
    ) sub LIMIT 4
  ) INTO n_nums;
  
  -- Generate G column (46-60) - 5 unique numbers
  SELECT ARRAY(
    SELECT num FROM (
      SELECT generate_series(46, 60) AS num ORDER BY random()
    ) sub LIMIT 5
  ) INTO g_nums;
  
  -- Generate O column (61-75) - 5 unique numbers
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

-- Generate all 100 unique bingo cards
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_unique_bingo_card(i);
  END LOOP;
END $$;

-- Verify no duplicates exist within columns
SELECT 
  card_number,
  array_length(b_column, 1) as b_count,
  array_length(array(SELECT DISTINCT unnest(b_column)), 1) as b_unique,
  array_length(i_column, 1) as i_count,
  array_length(array(SELECT DISTINCT unnest(i_column)), 1) as i_unique,
  array_length(n_column, 1) as n_count,
  array_length(array(SELECT DISTINCT unnest(n_column)), 1) as n_unique,
  array_length(g_column, 1) as g_count,
  array_length(array(SELECT DISTINCT unnest(g_column)), 1) as g_unique,
  array_length(o_column, 1) as o_count,
  array_length(array(SELECT DISTINCT unnest(o_column)), 1) as o_unique
FROM bingo_cards 
WHERE card_number <= 5
ORDER BY card_number;