-- Fix bingo cards migration
-- Ensures proper schema and adds sample cards

-- First, ensure the players table has the correct column name
DO $$
BEGIN
    -- Check if selected_card_number exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'selected_card_number'
    ) THEN
        ALTER TABLE players RENAME COLUMN selected_card_number TO card_number;
    END IF;
    
    -- Ensure card_number column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'card_number'
    ) THEN
        ALTER TABLE players ADD COLUMN card_number INTEGER;
    END IF;
END $$;

-- Ensure bingo_cards table exists with proper structure
CREATE TABLE IF NOT EXISTS bingo_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_number INTEGER UNIQUE NOT NULL CHECK (card_number >= 1 AND card_number <= 100),
    b_column INTEGER[] NOT NULL,
    i_column INTEGER[] NOT NULL,
    n_column INTEGER[] NOT NULL,
    g_column INTEGER[] NOT NULL,
    o_column INTEGER[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample bingo cards if none exist
INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column) VALUES
(1, ARRAY[1,2,3,4,5], ARRAY[16,17,18,19,20], ARRAY[31,32,34,35], ARRAY[46,47,48,49,50], ARRAY[61,62,63,64,65]),
(2, ARRAY[6,7,8,9,10], ARRAY[21,22,23,24,25], ARRAY[36,37,39,40], ARRAY[51,52,53,54,55], ARRAY[66,67,68,69,70]),
(3, ARRAY[11,12,13,14,15], ARRAY[26,27,28,29,30], ARRAY[41,42,44,45], ARRAY[56,57,58,59,60], ARRAY[71,72,73,74,75])
ON CONFLICT (card_number) DO NOTHING;

-- Enable RLS if not already enabled
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;

-- Create policy for bingo_cards
DROP POLICY IF EXISTS "Allow all on bingo_cards" ON bingo_cards;
CREATE POLICY "Allow all on bingo_cards" ON bingo_cards FOR ALL USING (true);

-- Enable realtime for bingo_cards
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_cards;

-- Grant permissions
GRANT ALL ON bingo_cards TO authenticated, anon;

RAISE NOTICE 'Bingo cards migration completed successfully!';