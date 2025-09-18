-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game rules table
CREATE TABLE game_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 100,
  card_price DECIMAL(10,2) DEFAULT 1.00,
  winning_patterns JSONB DEFAULT '["line", "full_house"]',
  number_call_interval INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  rule_id UUID REFERENCES game_rules(id),
  admin_id UUID NOT NULL,
  current_number INTEGER,
  called_numbers INTEGER[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bingo cards table (pre-generated for numbers 1-100)
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

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  selected_card_number INTEGER NOT NULL CHECK (selected_card_number >= 1 AND selected_card_number <= 100),
  is_winner BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, selected_card_number)
);

-- Called numbers table
CREATE TABLE called_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game rules
INSERT INTO game_rules (name, min_players, max_players, card_price, winning_patterns, number_call_interval)
VALUES ('Classic Bingo', 2, 50, 5.00, '["line", "full_house"]', 3000);

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
  -- Generate random numbers for each column
  SELECT ARRAY(SELECT generate_series(1, 15) ORDER BY random() LIMIT 5) INTO b_nums;
  SELECT ARRAY(SELECT generate_series(16, 30) ORDER BY random() LIMIT 5) INTO i_nums;
  SELECT ARRAY(SELECT generate_series(31, 45) ORDER BY random() LIMIT 4) INTO n_nums; -- N column has 4 numbers (free space)
  SELECT ARRAY(SELECT generate_series(46, 60) ORDER BY random() LIMIT 5) INTO g_nums;
  SELECT ARRAY(SELECT generate_series(61, 75) ORDER BY random() LIMIT 5) INTO o_nums;
  
  INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column)
  VALUES (card_num, b_nums, i_nums, n_nums, g_nums, o_nums)
  ON CONFLICT (card_number) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Generate all 100 bingo cards
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_bingo_card(i);
  END LOOP;
END $$;

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now, customize as needed)
CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on called_numbers" ON called_numbers FOR ALL USING (true);