-- Simple updates without complex syntax
ALTER TABLE game_rules ADD COLUMN IF NOT EXISTS card_price DECIMAL(10,2) DEFAULT 10.00;

UPDATE game_rules SET card_price = 10.00 WHERE name = 'Classic Bingo';
UPDATE game_rules SET max_players = 100 WHERE name = 'Classic Bingo';

INSERT INTO game_rules (name, min_players, max_players, card_price, winning_patterns, number_call_interval)
VALUES ('Premium Bingo', 2, 100, 20.00, '["line", "full_house"]', 3000);