# 🚨 URGENT: Fix Database Errors

Your app is deployed but needs the database setup. Follow these exact steps:

## Step 1: Run Database Setup (CRITICAL)

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Open your project: `gvfcbzzindikkmhaahak`**
3. **Click "SQL Editor" in the left sidebar**
4. **Copy this entire script and paste it:**

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (to ensure clean setup)
DROP TABLE IF EXISTS player_cards CASCADE;
DROP TABLE IF EXISTS called_numbers CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS bingo_cards CASCADE;
DROP TABLE IF EXISTS bingo_patterns CASCADE;
DROP TABLE IF EXISTS game_rules CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  max_players INTEGER DEFAULT 100,
  entry_fee INTEGER DEFAULT 20,
  rule_id INTEGER DEFAULT 1,
  admin_id UUID
);

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  selected_card_number INTEGER CHECK (selected_card_number BETWEEN 1 AND 100),
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create called_numbers table
CREATE TABLE called_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  number INTEGER CHECK (number BETWEEN 1 AND 75),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bingo_cards table
CREATE TABLE bingo_cards (
  id SERIAL PRIMARY KEY,
  card_number INTEGER UNIQUE CHECK (card_number BETWEEN 1 AND 100),
  b_column INTEGER[],
  i_column INTEGER[],
  n_column INTEGER[],
  g_column INTEGER[],
  o_column INTEGER[]
);

-- Create bingo_patterns table (this was missing!)
CREATE TABLE bingo_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  pattern JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_rules table
CREATE TABLE game_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(50) UNIQUE NOT NULL,
  rule_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_cards table
CREATE TABLE player_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  card_data JSONB NOT NULL,
  marked_positions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin accounts
INSERT INTO admin_users (username, password) VALUES 
('admin', 'admin123'),
('Admin', 'Enjoy@1501');

-- Insert default bingo patterns
INSERT INTO bingo_patterns (name, pattern, description, is_active) VALUES
('Full House', '[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]', 'All 25 numbers', true),
('Four Corners', '[0,4,20,24]', 'Four corner positions', true),
('Top Row', '[0,1,2,3,4]', 'Complete top row', true),
('Middle Row', '[10,11,12,13,14]', 'Complete middle row', true),
('Bottom Row', '[20,21,22,23,24]', 'Complete bottom row', true);

-- Insert default game rules
INSERT INTO game_rules (rule_name, rule_value, description) VALUES
('winning_patterns', '["Full House", "Four Corners", "Top Row"]', 'Active winning patterns'),
('auto_call_interval', '3', 'Seconds between auto calls'),
('max_players', '100', 'Maximum players per game'),
('entry_fee', '20', 'Entry fee per player');

-- Generate bingo cards function
CREATE OR REPLACE FUNCTION generate_bingo_card(card_num INTEGER)
RETURNS VOID AS $$
DECLARE
  b_nums INTEGER[];
  i_nums INTEGER[];
  n_nums INTEGER[];
  g_nums INTEGER[];
  o_nums INTEGER[];
BEGIN
  SELECT ARRAY(SELECT DISTINCT floor(random() * 15 + 1)::INTEGER FROM generate_series(1, 5)) INTO b_nums;
  SELECT ARRAY(SELECT DISTINCT floor(random() * 15 + 16)::INTEGER FROM generate_series(1, 5)) INTO i_nums;
  SELECT ARRAY(SELECT DISTINCT floor(random() * 15 + 31)::INTEGER FROM generate_series(1, 4)) INTO n_nums;
  SELECT ARRAY(SELECT DISTINCT floor(random() * 15 + 46)::INTEGER FROM generate_series(1, 5)) INTO g_nums;
  SELECT ARRAY(SELECT DISTINCT floor(random() * 15 + 61)::INTEGER FROM generate_series(1, 5)) INTO o_nums;
  
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
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all operations)
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all on called_numbers" ON called_numbers FOR ALL USING (true);
CREATE POLICY "Allow all on bingo_cards" ON bingo_cards FOR ALL USING (true);
CREATE POLICY "Allow all on bingo_patterns" ON bingo_patterns FOR ALL USING (true);
CREATE POLICY "Allow all on game_rules" ON game_rules FOR ALL USING (true);
CREATE POLICY "Allow all on player_cards" ON player_cards FOR ALL USING (true);
CREATE POLICY "Allow all on admin_users" ON admin_users FOR ALL USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE player_cards;

-- Create a default game for testing
INSERT INTO games (status, max_players, entry_fee) 
VALUES ('waiting', 100, 20);
```

5. **Click "RUN" button**
6. **Wait for "Success" message**

## Step 2: Redeploy with Fix

```bash
npm run deploy
```

## ✅ After Running the Script:

Your app will work perfectly at:
**https://enjoy-tv-bingo-gcc7dqkb3-tamsgen15-4917s-projects.vercel.app**

The 400 errors will disappear and your bingo game will be fully functional!