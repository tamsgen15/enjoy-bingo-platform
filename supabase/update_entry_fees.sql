-- Update entry fee and add new game rules with different entry fees
UPDATE game_rules 
SET card_price = 10.00 
WHERE name = 'Classic Bingo';

-- Add 20 ETB entry fee game rule
INSERT INTO game_rules (name, min_players, max_players, card_price, winning_patterns, number_call_interval)
VALUES ('Premium Bingo', 2, 100, 20.00, '["line", "full_house"]', 3000);