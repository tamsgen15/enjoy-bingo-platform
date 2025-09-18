-- Complete updated schema with unique card generation functions

-- Drop existing functions
DROP FUNCTION IF EXISTS generate_bingo_card(INTEGER);
DROP FUNCTION IF EXISTS generate_unique_bingo_card(INTEGER);
DROP FUNCTION IF EXISTS generate_truly_random_bingo_card(INTEGER);
DROP FUNCTION IF EXISTS regenerate_unique_bingo_cards();

-- Create truly random bingo card generation function
CREATE OR REPLACE FUNCTION generate_truly_random_bingo_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
  temp_array INTEGER[];
  i INTEGER;
  j INTEGER;
  temp INTEGER;
BEGIN
  -- Generate B column (1-15) using Fisher-Yates shuffle
  SELECT ARRAY(SELECT generate_series(1, 15)) INTO temp_array;
  FOR i IN 1..15 LOOP
    j := floor(random() * (16 - i) + i)::INTEGER;
    temp := temp_array[i];
    temp_array[i] := temp_array[j];
    temp_array[j] := temp;
  END LOOP;
  b_nums := temp_array[1:5];
  
  -- Generate I column (16-30)
  SELECT ARRAY(SELECT generate_series(16, 30)) INTO temp_array;
  FOR i IN 1..15 LOOP
    j := floor(random() * (16 - i) + i)::INTEGER;
    temp := temp_array[i];
    temp_array[i] := temp_array[j];
    temp_array[j] := temp;
  END LOOP;
  i_nums := temp_array[1:5];
  
  -- Generate N column (31-45) - only 4 numbers
  SELECT ARRAY(SELECT generate_series(31, 45)) INTO temp_array;
  FOR i IN 1..15 LOOP
    j := floor(random() * (16 - i) + i)::INTEGER;
    temp := temp_array[i];
    temp_array[i] := temp_array[j];
    temp_array[j] := temp;
  END LOOP;
  n_nums := temp_array[1:4];
  
  -- Generate G column (46-60)
  SELECT ARRAY(SELECT generate_series(46, 60)) INTO temp_array;
  FOR i IN 1..15 LOOP
    j := floor(random() * (16 - i) + i)::INTEGER;
    temp := temp_array[i];
    temp_array[i] := temp_array[j];
    temp_array[j] := temp;
  END LOOP;
  g_nums := temp_array[1:5];
  
  -- Generate O column (61-75)
  SELECT ARRAY(SELECT generate_series(61, 75)) INTO temp_array;
  FOR i IN 1..15 LOOP
    j := floor(random() * (16 - i) + i)::INTEGER;
    temp := temp_array[i];
    temp_array[i] := temp_array[j];
    temp_array[j] := temp;
  END LOOP;
  o_nums := temp_array[1:5];
  
  -- Insert the card
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

-- Create batch regeneration function
CREATE OR REPLACE FUNCTION regenerate_all_unique_cards()
RETURNS VOID AS $$
DECLARE
  delay_ms INTEGER;
BEGIN
  -- Clear existing cards
  DELETE FROM bingo_cards;
  
  -- Generate cards with random delays
  FOR card_num IN 1..100 LOOP
    -- Random delay between 10-50ms to ensure different random states
    delay_ms := floor(random() * 40 + 10)::INTEGER;
    PERFORM pg_sleep(delay_ms / 1000.0);
    
    -- Generate the card
    PERFORM generate_truly_random_bingo_card(card_num);
  END LOOP;
END;
$$ LANGUAGE plpgsql;