-- Complete Bingo Card Fix Script
-- This script fixes all duplicate number issues and ensures unique cards

-- Step 1: Drop existing function and recreate with proper uniqueness
DROP FUNCTION IF EXISTS generate_bingo_card(INTEGER);
DROP FUNCTION IF EXISTS generate_unique_bingo_card(INTEGER);

-- Step 2: Create improved unique bingo card generation function
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
  -- Set unique seed for each card
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

-- Step 3: Create function to regenerate all cards (for API use)
CREATE OR REPLACE FUNCTION regenerate_unique_bingo_cards()
RETURNS VOID AS $$
DECLARE
  card_num INTEGER;
BEGIN
  -- Clear existing cards
  DELETE FROM bingo_cards;
  
  -- Generate all 100 unique bingo cards
  FOR card_num IN 1..100 LOOP
    PERFORM generate_unique_bingo_card(card_num);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Clear existing cards and regenerate all with unique numbers
DELETE FROM bingo_cards;

-- Step 5: Generate all 100 unique bingo cards
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_unique_bingo_card(i);
  END LOOP;
END $$;

-- Step 6: Verification queries
-- Check that all cards were generated
SELECT COUNT(*) as total_cards FROM bingo_cards;

-- Check for duplicates within columns (should return no rows)
SELECT 
  card_number,
  'B' as column_name,
  unnest(b_column) as number,
  COUNT(*) as occurrences
FROM bingo_cards 
GROUP BY card_number, unnest(b_column)
HAVING COUNT(*) > 1

UNION ALL

SELECT 
  card_number,
  'I' as column_name,
  unnest(i_column) as number,
  COUNT(*) as occurrences
FROM bingo_cards 
GROUP BY card_number, unnest(i_column)
HAVING COUNT(*) > 1

UNION ALL

SELECT 
  card_number,
  'N' as column_name,
  unnest(n_column) as number,
  COUNT(*) as occurrences
FROM bingo_cards 
GROUP BY card_number, unnest(n_column)
HAVING COUNT(*) > 1

UNION ALL

SELECT 
  card_number,
  'G' as column_name,
  unnest(g_column) as number,
  COUNT(*) as occurrences
FROM bingo_cards 
GROUP BY card_number, unnest(g_column)
HAVING COUNT(*) > 1

UNION ALL

SELECT 
  card_number,
  'O' as column_name,
  unnest(o_column) as number,
  COUNT(*) as occurrences
FROM bingo_cards 
GROUP BY card_number, unnest(o_column)
HAVING COUNT(*) > 1;

-- Step 7: Sample verification - show first 5 cards
SELECT 
  card_number,
  b_column,
  i_column,
  n_column,
  g_column,
  o_column
FROM bingo_cards 
WHERE card_number <= 5
ORDER BY card_number;