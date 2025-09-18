-- Bingo card patterns and game rules
CREATE TABLE IF NOT EXISTS bingo_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  pattern JSONB NOT NULL, -- Array of winning positions [0-24]
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game rules configuration
CREATE TABLE IF NOT EXISTS game_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(50) UNIQUE NOT NULL,
  rule_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player card numbers storage
CREATE TABLE IF NOT EXISTS player_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  card_number INTEGER NOT NULL,
  card_data JSONB NOT NULL, -- 5x5 bingo card numbers
  marked_positions JSONB DEFAULT '[]', -- Array of marked positions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default bingo patterns
INSERT INTO bingo_patterns (name, pattern, description) VALUES
('Full House', '[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]', 'All 25 numbers'),
('Four Corners', '[0,4,20,24]', 'Four corner positions'),
('Top Row', '[0,1,2,3,4]', 'Complete top row'),
('Middle Row', '[10,11,12,13,14]', 'Complete middle row'),
('Bottom Row', '[20,21,22,23,24]', 'Complete bottom row'),
('Left Column', '[0,5,10,15,20]', 'Complete left column'),
('Right Column', '[4,9,14,19,24]', 'Complete right column'),
('Diagonal', '[0,6,12,18,24]', 'Top-left to bottom-right diagonal'),
('Anti-Diagonal', '[4,8,12,16,20]', 'Top-right to bottom-left diagonal'),
('X Pattern', '[0,6,12,18,24,4,8,16,20]', 'Both diagonals forming X')
ON CONFLICT (name) DO NOTHING;

-- Insert default game rules
INSERT INTO game_rules (rule_name, rule_value, description) VALUES
('winning_patterns', '["Full House", "Four Corners", "Top Row", "Middle Row", "Bottom Row"]', 'Active winning patterns'),
('auto_call_interval', '3', 'Seconds between auto calls'),
('max_players', '100', 'Maximum players per game'),
('entry_fee', '20', 'Entry fee per player'),
('free_space_enabled', 'true', 'Center space is free')
ON CONFLICT (rule_name) DO NOTHING;

-- Enable RLS
ALTER TABLE bingo_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all on bingo_patterns" ON bingo_patterns FOR ALL USING (true);
CREATE POLICY "Allow all on game_rules" ON game_rules FOR ALL USING (true);
CREATE POLICY "Allow all on player_cards" ON player_cards FOR ALL USING (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE player_cards;