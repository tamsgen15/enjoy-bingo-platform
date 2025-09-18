-- Complete database schema for bingo game
-- Run this in your new Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  max_players INTEGER DEFAULT 100,
  entry_fee INTEGER DEFAULT 20,
  rule_id INTEGER DEFAULT 1,
  admin_id UUID
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  selected_card_number INTEGER CHECK (selected_card_number BETWEEN 1 AND 100),
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Called numbers table
CREATE TABLE IF NOT EXISTS called_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  number INTEGER CHECK (number BETWEEN 1 AND 75),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bingo cards table
CREATE TABLE IF NOT EXISTS bingo_cards (
  id SERIAL PRIMARY KEY,
  card_number INTEGER UNIQUE CHECK (card_number BETWEEN 1 AND 100),
  b_column TEXT,
  i_column TEXT,
  n_column TEXT,
  g_column TEXT,
  o_column TEXT
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin accounts
INSERT INTO admin_users (username, password) VALUES 
('admin', 'admin123'),
('Admin', 'Enjoy@1501')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now)
CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on called_numbers" ON called_numbers FOR ALL USING (true);
CREATE POLICY "Allow all operations on bingo_cards" ON bingo_cards FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);

-- Generate sample bingo cards (1-100)
INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column)
SELECT 
  generate_series(1, 100) as card_number,
  array_to_string(ARRAY(SELECT (random() * 14 + 1)::int FROM generate_series(1, 5)), ',') as b_column,
  array_to_string(ARRAY(SELECT (random() * 14 + 16)::int FROM generate_series(1, 5)), ',') as i_column,
  array_to_string(ARRAY(SELECT (random() * 14 + 31)::int FROM generate_series(1, 4)), ',') as n_column,
  array_to_string(ARRAY(SELECT (random() * 14 + 46)::int FROM generate_series(1, 5)), ',') as g_column,
  array_to_string(ARRAY(SELECT (random() * 14 + 61)::int FROM generate_series(1, 5)), ',') as o_column
ON CONFLICT (card_number) DO NOTHING;