-- Schema for using existing printed bingo cards
-- Run this AFTER running fix_complete_schema.sql

-- Drop the random generation function since we use printed cards
DROP FUNCTION IF EXISTS generate_truly_random_bingo_card(INTEGER);

-- Create function to validate printed card format
CREATE OR REPLACE FUNCTION validate_printed_card(
  card_num INTEGER,
  b_nums INTEGER[],
  i_nums INTEGER[],
  n_nums INTEGER[],
  g_nums INTEGER[],
  o_nums INTEGER[]
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate B column (1-15)
  IF array_length(b_nums, 1) != 5 OR 
     EXISTS (SELECT 1 FROM unnest(b_nums) AS num WHERE num < 1 OR num > 15) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate I column (16-30)
  IF array_length(i_nums, 1) != 5 OR 
     EXISTS (SELECT 1 FROM unnest(i_nums) AS num WHERE num < 16 OR num > 30) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate N column (31-45, only 4 numbers)
  IF array_length(n_nums, 1) != 4 OR 
     EXISTS (SELECT 1 FROM unnest(n_nums) AS num WHERE num < 31 OR num > 45) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate G column (46-60)
  IF array_length(g_nums, 1) != 5 OR 
     EXISTS (SELECT 1 FROM unnest(g_nums) AS num WHERE num < 46 OR num > 60) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate O column (61-75)
  IF array_length(o_nums, 1) != 5 OR 
     EXISTS (SELECT 1 FROM unnest(o_nums) AS num WHERE num < 61 OR num > 75) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure only valid printed cards
ALTER TABLE bingo_cards ADD CONSTRAINT valid_printed_card 
CHECK (validate_printed_card(card_number, b_column, i_column, n_column, g_column, o_column));

-- Create view for easy card access
CREATE OR REPLACE VIEW printed_cards_view AS
SELECT 
  card_number,
  b_column as B,
  i_column as I,
  n_column as N,
  g_column as G,
  o_column as O,
  array_cat(array_cat(array_cat(array_cat(b_column, i_column), n_column), g_column), o_column) as all_numbers
FROM bingo_cards
ORDER BY card_number;