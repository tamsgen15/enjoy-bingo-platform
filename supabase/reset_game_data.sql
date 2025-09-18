-- Reset all game data to zero state
DELETE FROM called_numbers;
DELETE FROM players;
DELETE FROM games;

-- Reset any sequences if needed
-- This ensures clean state for real-time testing