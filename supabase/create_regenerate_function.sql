-- Create function to regenerate all bingo cards
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