-- Update max_players from 50 to 100 for Classic Bingo
UPDATE game_rules 
SET max_players = 100 
WHERE name = 'Classic Bingo';