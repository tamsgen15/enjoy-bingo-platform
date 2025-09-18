# 🚀 App Deployed Successfully!

**Live URL:** https://enjoy-tv-bingo-3kom0w6ce-tamsgen15-4917s-projects.vercel.app

## ⚠️ REQUIRED: Setup Database

The app is deployed but needs database setup to work properly.

### Step 1: Run Database Schema
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open SQL Editor
3. Copy and paste this SQL:

```sql
-- Complete schema fix for multiplayer bingo game
DROP TABLE IF EXISTS called_numbers CASCADE;
DROP TABLE IF EXISTS player_cards CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS bingo_cards CASCADE;
DROP TABLE IF EXISTS bingo_patterns CASCADE;
DROP TABLE IF EXISTS game_rules CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'finished')),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bingo_cards table
CREATE TABLE bingo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number INTEGER UNIQUE NOT NULL CHECK (card_number >= 1 AND card_number <= 100),
  b_column INTEGER[] NOT NULL,
  i_column INTEGER[] NOT NULL,
  n_column INTEGER[] NOT NULL,
  g_column INTEGER[] NOT NULL,
  o_column INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  selected_card_number INTEGER REFERENCES bingo_cards(card_number),
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create called_numbers table
CREATE TABLE called_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1 AND number <= 75),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bingo_patterns table
CREATE TABLE bingo_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  pattern JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_rules table
CREATE TABLE game_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(50) UNIQUE NOT NULL,
  rule_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_cards table
CREATE TABLE player_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  card_data JSONB NOT NULL,
  marked_positions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user
INSERT INTO admin_users (username, password_hash) VALUES
('admin', '$2b$10$rQZ8kHp0rQZ8kHp0rQZ8kOQZ8kHp0rQZ8kHp0rQZ8kHp0rQZ8kHp0r')
ON CONFLICT (username) DO NOTHING;

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

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now)
CREATE POLICY "Allow all on admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all on bingo_cards" ON bingo_cards FOR ALL USING (true);
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all on called_numbers" ON called_numbers FOR ALL USING (true);
CREATE POLICY "Allow all on bingo_patterns" ON bingo_patterns FOR ALL USING (true);
CREATE POLICY "Allow all on game_rules" ON game_rules FOR ALL USING (true);
CREATE POLICY "Allow all on player_cards" ON player_cards FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE player_cards;
```

4. Click "Run" to execute

### Step 2: Add Sample Bingo Cards
Run this SQL to add 3 sample cards:

```sql
INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column) VALUES
(1, '{3,7,12,1,15}', '{18,22,29,16,25}', '{34,38,31,45}', '{52,56,48,46,60}', '{67,71,74,61,69}'),
(2, '{5,9,14,2,11}', '{19,23,27,17,26}', '{35,39,32,44}', '{53,57,49,47,59}', '{68,72,75,62,70}'),
(3, '{4,8,13,6,10}', '{20,24,28,21,30}', '{36,40,33,43}', '{54,58,50,51,55}', '{65,73,66,63,64}');
```

### ✅ After Setup:
- Refresh your app: https://enjoy-tv-bingo-3kom0w6ce-tamsgen15-4917s-projects.vercel.app
- No more 400 errors
- Admin can create games
- Players can join with cards 1-3

### 🎯 Ready to Use:
Your multiplayer bingo game is now fully functional!