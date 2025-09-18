-- Update game rules to include new winning patterns
UPDATE game_rules 
SET winning_patterns = '["line", "column", "diagonal", "4_corners", "all_edges", "full_house"]'
WHERE name = 'Classic Bingo';