-- Delete existing cards and regenerate with proper randomization
DELETE FROM bingo_cards;

-- Improved function with proper randomization
CREATE OR REPLACE FUNCTION generate_bingo_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
BEGIN
  -- Use card_num as seed for different results per card
  PERFORM setseed((card_num::float / 100.0));
  
  SELECT ARRAY(SELECT generate_series(1, 15) ORDER BY random() LIMIT 5) INTO b_nums;
  SELECT ARRAY(SELECT generate_series(16, 30) ORDER BY random() LIMIT 5) INTO i_nums;
  SELECT ARRAY(SELECT generate_series(31, 45) ORDER BY random() LIMIT 4) INTO n_nums;
  SELECT ARRAY(SELECT generate_series(46, 60) ORDER BY random() LIMIT 5) INTO g_nums;
  SELECT ARRAY(SELECT generate_series(61, 75) ORDER BY random() LIMIT 5) INTO o_nums;
  
  INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column)
  VALUES (card_num, b_nums, i_nums, n_nums, g_nums, o_nums);
END;
$$ LANGUAGE plpgsql;

-- Generate unique cards
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_bingo_card(i);
  END LOOP;
END $$;