-- Update game rules to reflect 20 ETB entry fee
UPDATE game_rules 
SET card_price = 20.00 
WHERE name = 'Classic Bingo';

-- Add entry_fee column to players table if not exists
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10,2) DEFAULT 20.00;

-- Update existing players to have 20 ETB entry fee
UPDATE players 
SET entry_fee = 20.00 
WHERE entry_fee IS NULL;