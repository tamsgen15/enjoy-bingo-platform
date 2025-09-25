-- Enhanced Bingo Game Migration Script
-- This script fixes duplicate number calling issues and enhances the game system

-- Step 1: Clean up existing data and add constraints
DO $$
BEGIN
    -- Remove duplicate called numbers keeping only the first occurrence
    WITH duplicates AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY game_id, number ORDER BY called_at) as rn
        FROM called_numbers
    )
    DELETE FROM called_numbers 
    WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
    );
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_game_number'
    ) THEN
        ALTER TABLE called_numbers 
        ADD CONSTRAINT unique_game_number 
        UNIQUE (game_id, number);
    END IF;
    
    -- Add performance indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_called_numbers_game_id_called_at'
    ) THEN
        CREATE INDEX idx_called_numbers_game_id_called_at 
        ON called_numbers (game_id, called_at);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_called_numbers_game_number'
    ) THEN
        CREATE INDEX idx_called_numbers_game_number 
        ON called_numbers (game_id, number);
    END IF;
END $$;

-- Step 2: Enhanced function to safely call the next number
CREATE OR REPLACE FUNCTION call_next_number(game_uuid UUID)
RETURNS JSON AS $$
DECLARE
    next_num INTEGER;
    called_count INTEGER;
    result JSON;
    lock_key BIGINT;
BEGIN
    -- Create a consistent lock key from game UUID
    lock_key := hashtext(game_uuid::text);
    
    -- Acquire advisory lock with timeout to prevent deadlocks
    IF NOT pg_try_advisory_lock(lock_key) THEN
        RETURN json_build_object('success', false, 'error', 'Another call in progress');
    END IF;
    
    -- Validate game exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM games 
        WHERE id = game_uuid AND status = 'active'
    ) THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object('success', false, 'error', 'Game not active');
    END IF;
    
    -- Get current count of called numbers
    SELECT COUNT(*) INTO called_count
    FROM called_numbers 
    WHERE game_id = game_uuid;
    
    -- Check if all numbers have been called
    IF called_count >= 75 THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object('success', false, 'error', 'All numbers called', 'total_called', called_count);
    END IF;
    
    -- Find next available number using secure random selection
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers WHERE game_id = game_uuid
    ),
    random_selection AS (
        SELECT num FROM available_numbers 
        ORDER BY random() 
        LIMIT 1
    )
    SELECT num INTO next_num FROM random_selection;
    
    -- Handle case where no numbers are available
    IF next_num IS NULL THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object('success', false, 'error', 'No available numbers', 'total_called', called_count);
    END IF;
    
    -- Insert the number with proper error handling
    BEGIN
        INSERT INTO called_numbers (game_id, number, called_at)
        VALUES (game_uuid, next_num, NOW());
        
        -- Update game's current number for real-time sync
        UPDATE games 
        SET current_number = next_num
        WHERE id = game_uuid;
        
        result := json_build_object(
            'success', true, 
            'number', next_num,
            'total_called', called_count + 1,
            'remaining', 75 - (called_count + 1)
        );
        
    EXCEPTION 
        WHEN unique_violation THEN
            result := json_build_object('success', false, 'error', 'Number already called');
        WHEN OTHERS THEN
            result := json_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
    END;
    
    -- Always release the lock
    PERFORM pg_advisory_unlock(lock_key);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Enable real-time subscriptions
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE games;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE players;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION call_next_number(UUID) TO authenticated, anon;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Enhanced bingo migration completed successfully!';
END $$;