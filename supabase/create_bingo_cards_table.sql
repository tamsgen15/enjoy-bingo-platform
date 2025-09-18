-- Create bingo_cards table
CREATE TABLE bingo_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_number INTEGER UNIQUE NOT NULL CHECK (card_number >= 1 AND card_number <= 100),
  b_column INTEGER[] NOT NULL,
  i_column INTEGER[] NOT NULL,
  n_column INTEGER[] NOT NULL,
  g_column INTEGER[] NOT NULL,
  o_column INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to generate bingo card
CREATE OR REPLACE FUNCTION generate_bingo_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
BEGIN
  SELECT ARRAY(SELECT generate_series(1, 15) ORDER BY random() LIMIT 5) INTO b_nums;
  SELECT ARRAY(SELECT generate_series(16, 30) ORDER BY random() LIMIT 5) INTO i_nums;
  SELECT ARRAY(SELECT generate_series(31, 45) ORDER BY random() LIMIT 4) INTO n_nums;
  SELECT ARRAY(SELECT generate_series(46, 60) ORDER BY random() LIMIT 5) INTO g_nums;
  SELECT ARRAY(SELECT generate_series(61, 75) ORDER BY random() LIMIT 5) INTO o_nums;
  
  INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column)
  VALUES (card_num, b_nums, i_nums, n_nums, g_nums, o_nums);
END;
$$ LANGUAGE plpgsql;

-- Generate all 100 bingo cards
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_bingo_card(i);
  END LOOP;
END $$;