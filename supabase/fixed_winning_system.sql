-- Fixed Winning System - Ensures only valid bingo cards can win
-- Run this to fix the winning verification system

-- Create function to verify winner with actual card data
CREATE OR REPLACE FUNCTION verify_winner_with_card(
  p_game_id UUID,
  p_card_number INTEGER
) RETURNS TABLE (
  is_winner BOOLEAN,
  player_id UUID,
  player_name VARCHAR,
  winning_pattern VARCHAR,
  pattern_description TEXT,
  marked_positions INTEGER[],
  card_data JSONB
) AS $$
DECLARE
  player_record RECORD;
  card_record RECORD;
  marked_pos INTEGER[];
  all_marked INTEGER[];
  pattern_result RECORD;
BEGIN
  -- Get player
  SELECT * INTO player_record
  FROM players p
  WHERE p.game_id = p_game_id 
    AND p.card_number = p_card_number 
    AND p.is_winner = false;
    
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT, NULL::INTEGER[], NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get bingo card data
  SELECT * INTO card_record
  FROM bingo_cards bc
  WHERE bc.card_number = p_card_number;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT, NULL::INTEGER[], NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get marked positions
  SELECT 
    COALESCE(pmn.marked_positions, '{}') || COALESCE(pmn.auto_marked_positions, '{}') || ARRAY[12]
  INTO marked_pos
  FROM player_marked_numbers pmn
  WHERE pmn.game_id = p_game_id AND pmn.player_id = player_record.id;
  
  -- Remove duplicates and sort
  SELECT array_agg(DISTINCT pos ORDER BY pos) INTO all_marked
  FROM unnest(COALESCE(marked_pos, ARRAY[12])) AS pos;
  
  -- Check winning patterns
  SELECT * INTO pattern_result
  FROM check_winning_patterns(p_game_id, player_record.id, all_marked)
  WHERE is_winner = true
  LIMIT 1;
  
  IF FOUND AND pattern_result.is_winner THEN
    RETURN QUERY SELECT 
      true,
      player_record.id,
      player_record.player_name,
      pattern_result.pattern_name,
      pattern_result.pattern_description,
      all_marked,
      jsonb_build_object(
        'b_column', card_record.b_column,
        'i_column', card_record.i_column,
        'n_column', card_record.n_column,
        'g_column', card_record.g_column,
        'o_column', card_record.o_column
      );
  ELSE
    RETURN QUERY SELECT 
      false,
      player_record.id,
      player_record.player_name,
      NULL::VARCHAR,
      NULL::TEXT,
      all_marked,
      jsonb_build_object(
        'b_column', card_record.b_column,
        'i_column', card_record.i_column,
        'n_column', card_record.n_column,
        'g_column', card_record.g_column,
        'o_column', card_record.o_column
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix auto-mark function position calculations
CREATE OR REPLACE FUNCTION auto_mark_called_number(
  p_game_id UUID,
  p_called_number INTEGER
) RETURNS INTEGER AS $$
DECLARE
  player_record RECORD;
  card_record RECORD;
  position INTEGER;
  marked_count INTEGER := 0;
BEGIN
  FOR player_record IN 
    SELECT p.id, p.card_number
    FROM players p
    WHERE p.game_id = p_game_id AND p.is_winner = false
  LOOP
    SELECT * INTO card_record
    FROM bingo_cards bc
    WHERE bc.card_number = player_record.card_number;
    
    IF FOUND THEN
      position := NULL;
      
      -- Check B column (positions 0-4)
      FOR i IN 1..5 LOOP
        IF card_record.b_column[i] = p_called_number THEN
          position := i - 1;
          EXIT;
        END IF;
      END LOOP;
      
      -- Check I column (positions 5-9)
      IF position IS NULL THEN
        FOR i IN 1..5 LOOP
          IF card_record.i_column[i] = p_called_number THEN
            position := 5 + (i - 1);
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Check N column (positions 10-14, center is 12)
      IF position IS NULL THEN
        FOR i IN 1..array_length(card_record.n_column, 1) LOOP
          IF card_record.n_column[i] = p_called_number THEN
            position := 10 + (i - 1) + (CASE WHEN i > 2 THEN 1 ELSE 0 END);
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Check G column (positions 15-19)
      IF position IS NULL THEN
        FOR i IN 1..5 LOOP
          IF card_record.g_column[i] = p_called_number THEN
            position := 15 + (i - 1);
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Check O column (positions 20-24)
      IF position IS NULL THEN
        FOR i IN 1..5 LOOP
          IF card_record.o_column[i] = p_called_number THEN
            position := 20 + (i - 1);
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Mark the position if found and not already marked
      IF position IS NOT NULL THEN
        INSERT INTO player_marked_numbers (game_id, player_id, card_number, auto_marked_positions)
        VALUES (p_game_id, player_record.id, player_record.card_number, ARRAY[position])
        ON CONFLICT (game_id, player_id)
        DO UPDATE SET 
          auto_marked_positions = (
            SELECT array_agg(DISTINCT pos ORDER BY pos) 
            FROM unnest(
              COALESCE(player_marked_numbers.auto_marked_positions, '{}') || position
            ) AS pos
          ),
          updated_at = NOW()
        WHERE NOT (position = ANY(COALESCE(player_marked_numbers.auto_marked_positions, '{}')));
        
        marked_count := marked_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN marked_count;
END;
$$ LANGUAGE plpgsql;

SELECT 'Fixed winning system - only valid bingo cards can win now!' as status;