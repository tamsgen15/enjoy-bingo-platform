-- Check current game_rules structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'game_rules';

-- If card_price doesn't exist, add it
ALTER TABLE game_rules ADD COLUMN IF NOT EXISTS card_price DECIMAL(10,2) DEFAULT 10.00;

-- Update entry fees
UPDATE game_rules SET card_price = 10.00 WHERE name = 'Classic Bingo';
UPDATE game_rules SET max_players = 100 WHERE name = 'Classic Bingo';

-- Add Premium Bingo rule (only if it doesn't exist)
INSERT INTO game_rules (name, min_players, max_players, card_price, winning_patterns, number_call_interval)
SELECT 'Premium Bingo', 2, 100, 20.00, '["line", "full_house"]', 3000
WHERE NOT EXISTS (SELECT 1 FROM game_rules WHERE name = 'Premium Bingo');