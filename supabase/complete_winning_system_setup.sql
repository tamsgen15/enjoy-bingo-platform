-- Complete Winning System Setup
-- Run this script to set up the entire database-driven winning system
-- This includes patterns, rules, auto-marking, and real-time verification

-- First, ensure we have the base tables
-- Update players table to use card_number instead of selected_card_number
DO $$
BEGIN
  -- Check if selected_card_number exists and card_number doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'selected_card_number') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'card_number') THEN
    ALTER TABLE players RENAME COLUMN selected_card_number TO card_number;
  END IF;
  
  -- Add card_number if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'card_number') THEN
    ALTER TABLE players ADD COLUMN card_number INTEGER NOT NULL CHECK (card_number >= 1 AND card_number <= 100);
  END IF;
  
  -- Add winning_pattern column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'winning_pattern') THEN
    ALTER TABLE players ADD COLUMN winning_pattern VARCHAR(50);
  END IF;
END $$;

-- Drop existing tables if they exist to recreate with proper structure
DROP TABLE IF EXISTS winning_patterns CASCADE;
DROP TABLE IF EXISTS game_rules CASCADE;
DROP TABLE IF EXISTS player_marked_numbers CASCADE;

-- Winning patterns table with comprehensive pattern definitions
CREATE TABLE winning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  pattern_positions INTEGER[] NOT NULL, -- Array of positions (0-24) that must be marked
  description TEXT,
  priority INTEGER DEFAULT 1, -- Lower number = higher priority
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game rules table for configurable game settings
CREATE TABLE game_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(50) UNIQUE NOT NULL,
  rule_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player marked numbers tracking
CREATE TABLE player_marked_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  marked_positions INTEGER[] DEFAULT '{}', -- Array of marked positions (0-24)
  auto_marked_positions INTEGER[] DEFAULT '{}', -- Positions marked by system
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Insert comprehensive winning patterns
INSERT INTO winning_patterns (name, pattern_positions, description, priority) VALUES
-- Single lines (highest priority)
('Top Row', '{0,1,2,3,4}', 'Complete top horizontal line', 1),
('Second Row', '{5,6,7,8,9}', 'Complete second horizontal line', 1),
('Middle Row', '{10,11,12,13,14}', 'Complete middle horizontal line', 1),
('Fourth Row', '{15,16,17,18,19}', 'Complete fourth horizontal line', 1),
('Bottom Row', '{20,21,22,23,24}', 'Complete bottom horizontal line', 1),

-- Vertical lines
('B Column', '{0,5,10,15,20}', 'Complete B column', 1),
('I Column', '{1,6,11,16,21}', 'Complete I column', 1),
('N Column', '{2,7,12,17,22}', 'Complete N column', 1),
('G Column', '{3,8,13,18,23}', 'Complete G column', 1),
('O Column', '{4,9,14,19,24}', 'Complete O column', 1),

-- Diagonal lines
('Main Diagonal', '{0,6,12,18,24}', 'Top-left to bottom-right diagonal', 1),
('Anti Diagonal', '{4,8,12,16,20}', 'Top-right to bottom-left diagonal', 1),

-- Special patterns (medium priority)
('Four Corners', '{0,4,20,24}', 'All four corner positions', 2),
('X Pattern', '{0,6,12,18,24,4,8,16,20}', 'Both diagonals forming X', 3),
('Plus Pattern', '{2,7,10,11,12,13,14,17,22}', 'Plus sign pattern', 3),
('T Pattern', '{0,1,2,3,4,12}', 'T-shaped pattern', 3),

-- Full house (lowest priority)
('Full House', '{0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24}', 'All 25 positions marked', 5);

-- Insert game rules
INSERT INTO game_rules (rule_name, rule_value, description) VALUES
('active_patterns', '["Top Row", "Second Row", "Middle Row", "Fourth Row", "Bottom Row", "B Column", "I Column", "N Column", "G Column", "O Column", "Main Diagonal", "Anti Diagonal"]', 'Currently active winning patterns'),
('auto_mark_enabled', 'true', 'Automatically mark called numbers on player cards'),
('free_space_enabled', 'true', 'Center space (position 12) is automatically marked'),
('multiple_winners_allowed', 'false', 'Allow multiple winners in same game'),
('winner_verification_required', 'true', 'Require manual verification of winners'),
('prize_distribution', '{"winner_percentage": 80, "platform_fee": 20}', 'Prize distribution percentages'),
('min_players_to_start', '2', 'Minimum players required to start game'),
('max_players_per_game', '100', 'Maximum players allowed per game'),
('auto_call_interval_seconds', '3', 'Seconds between automatic number calls'),
('entry_fee_amount', '20', 'Entry fee per player in ETB');

-- Create function to check winning patterns
CREATE OR REPLACE FUNCTION check_winning_patterns(
  p_game_id UUID,
  p_player_id UUID,
  p_marked_positions INTEGER[]
) RETURNS TABLE (
  pattern_name VARCHAR(50),
  pattern_description TEXT,
  is_winner BOOLEAN
) AS $$
DECLARE
  pattern_record RECORD;
  active_patterns TEXT[];
BEGIN
  -- Get active patterns from game rules
  SELECT (rule_value::jsonb)::text[] INTO active_patterns
  FROM game_rules 
  WHERE rule_name = 'active_patterns' AND is_active = true;
  
  -- Check each active pattern
  FOR pattern_record IN 
    SELECT wp.name, wp.pattern_positions, wp.description, wp.priority
    FROM winning_patterns wp
    WHERE wp.is_active = true 
    AND wp.name = ANY(active_patterns)
    ORDER BY wp.priority ASC, wp.name ASC
  LOOP
    -- Check if all positions in pattern are marked
    IF pattern_record.pattern_positions <@ p_marked_positions THEN
      RETURN QUERY SELECT 
        pattern_record.name,
        pattern_record.description,
        true;
      RETURN; -- Return first winning pattern found
    END IF;
  END LOOP;
  
  -- No winning pattern found
  RETURN QUERY SELECT 
    ''::VARCHAR(50),
    'No winning pattern'::TEXT,
    false;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-mark numbers for all players
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
  -- Loop through all players in the game
  FOR player_record IN 
    SELECT p.id, p.card_number
    FROM players p
    WHERE p.game_id = p_game_id AND p.is_winner = false
  LOOP
    -- Get the bingo card for this player
    SELECT * INTO card_record
    FROM bingo_cards bc
    WHERE bc.card_number = player_record.card_number;
    
    IF FOUND THEN
      -- Find position of called number on card
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
            position := 4 + i;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Check N column (positions 10-14, skip center)
      IF position IS NULL THEN
        FOR i IN 1..array_length(card_record.n_column, 1) LOOP
          IF card_record.n_column[i] = p_called_number THEN
            position := 9 + i + (CASE WHEN i > 2 THEN 1 ELSE 0 END);
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Check G column (positions 15-19)
      IF position IS NULL THEN
        FOR i IN 1..5 LOOP
          IF card_record.g_column[i] = p_called_number THEN
            position := 14 + i;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Check O column (positions 20-24)
      IF position IS NULL THEN
        FOR i IN 1..5 LOOP
          IF card_record.o_column[i] = p_called_number THEN
            position := 19 + i;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Mark the position if found
      IF position IS NOT NULL THEN
        INSERT INTO player_marked_numbers (game_id, player_id, card_number, auto_marked_positions)
        VALUES (p_game_id, player_record.id, player_record.card_number, ARRAY[position])
        ON CONFLICT (game_id, player_id)
        DO UPDATE SET 
          auto_marked_positions = array_append(
            COALESCE(player_marked_numbers.auto_marked_positions, '{}'), 
            position
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

-- Create trigger function for auto-marking when numbers are called
CREATE OR REPLACE FUNCTION trigger_auto_mark_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-mark the called number for all players
  PERFORM auto_mark_called_number(NEW.game_id, NEW.number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on called_numbers table
DROP TRIGGER IF EXISTS auto_mark_trigger ON called_numbers;
CREATE TRIGGER auto_mark_trigger
  AFTER INSERT ON called_numbers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_mark_numbers();

-- Enable RLS
ALTER TABLE winning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_marked_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to winning_patterns" ON winning_patterns FOR SELECT USING (true);
CREATE POLICY "Allow read access to game_rules" ON game_rules FOR SELECT USING (true);
CREATE POLICY "Allow all access to player_marked_numbers" ON player_marked_numbers FOR ALL USING (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE winning_patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE player_marked_numbers;

-- Initialize free space for existing players
INSERT INTO player_marked_numbers (game_id, player_id, card_number, marked_positions)
SELECT 
  p.game_id,
  p.id,
  p.card_number,
  ARRAY[12] -- Center position is always marked
FROM players p
WHERE NOT EXISTS (
  SELECT 1 FROM player_marked_numbers pmn 
  WHERE pmn.game_id = p.game_id AND pmn.player_id = p.id
)
ON CONFLICT (game_id, player_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_winning_patterns_active ON winning_patterns(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_game_rules_active ON game_rules(is_active, rule_name);
CREATE INDEX IF NOT EXISTS idx_player_marked_numbers_game_player ON player_marked_numbers(game_id, player_id);
CREATE INDEX IF NOT EXISTS idx_players_game_winner ON players(game_id, is_winner);
CREATE INDEX IF NOT EXISTS idx_called_numbers_game ON called_numbers(game_id, called_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

SELECT 'Complete winning system setup completed successfully!' as status,
       'Database now supports:' as features,
       '- Database-driven winning patterns' as feature1,
       '- Configurable game rules' as feature2,
       '- Auto-marking of called numbers' as feature3,
       '- Real-time winner verification' as feature4,
       '- Pattern completion tracking' as feature5;