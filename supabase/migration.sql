-- Migration script for printed bingo cards system

-- Drop existing tables if they exist
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS called_numbers CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS printed_cards CASCADE;
DROP TABLE IF EXISTS bingo_cards CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS game_rules CASCADE;

-- Recreate with new structure
CREATE TABLE game_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 100,
  entry_fee DECIMAL(10,2) DEFAULT 1.00,
  winning_patterns JSONB DEFAULT '["line", "full_house"]',
  number_call_interval INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE printed_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_number INTEGER UNIQUE NOT NULL CHECK (card_number >= 1 AND card_number <= 100),
  b_column INTEGER[] NOT NULL,
  i_column INTEGER[] NOT NULL,
  n_column INTEGER[] NOT NULL,
  g_column INTEGER[] NOT NULL,
  o_column INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  selected_card_number INTEGER NOT NULL CHECK (selected_card_number >= 1 AND selected_card_number <= 100),
  bet_amount DECIMAL(10,2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, selected_card_number)
);

CREATE TABLE called_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  player_id UUID REFERENCES players(id),
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('number_selection', 'winner_verification')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO game_rules (name, min_players, max_players, entry_fee, winning_patterns, number_call_interval)
VALUES ('Classic Bingo', 2, 50, 5.00, '["line", "full_house"]', 3000);

CREATE OR REPLACE FUNCTION generate_printed_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
BEGIN
  PERFORM setseed(card_num * 0.001);
  
  SELECT ARRAY(SELECT generate_series(1, 15) ORDER BY random() LIMIT 5) INTO b_nums;
  SELECT ARRAY(SELECT generate_series(16, 30) ORDER BY random() LIMIT 5) INTO i_nums;
  SELECT ARRAY(SELECT generate_series(31, 45) ORDER BY random() LIMIT 4) INTO n_nums;
  SELECT ARRAY(SELECT generate_series(46, 60) ORDER BY random() LIMIT 5) INTO g_nums;
  SELECT ARRAY(SELECT generate_series(61, 75) ORDER BY random() LIMIT 5) INTO o_nums;
  
  INSERT INTO printed_cards (card_number, b_column, i_column, n_column, g_column, o_column)
  VALUES (card_num, b_nums, i_nums, n_nums, g_nums, o_nums)
  ON CONFLICT (card_number) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM generate_printed_card(i);
  END LOOP;
END $$;

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on called_numbers" ON called_numbers FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_actions" ON admin_actions FOR ALL USING (true);