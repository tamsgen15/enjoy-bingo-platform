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
    
    -- Add game status index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_games_status'
    ) THEN
        CREATE INDEX idx_games_status 
        ON games (status);
    END IF;
    
    -- Add players game_id index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_players_game_id'
    ) THEN
        CREATE INDEX idx_players_game_id 
        ON players (game_id);
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
        SET current_number = next_num,
            called_numbers = array_append(COALESCE(called_numbers, '{}'), next_num)
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

-- Step 3: Helper function to get called numbers for a game
CREATE OR REPLACE FUNCTION get_called_numbers(game_uuid UUID)
RETURNS INTEGER[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT number 
        FROM called_numbers 
        WHERE game_id = game_uuid 
        ORDER BY called_at
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 4: Function to reset game state
CREATE OR REPLACE FUNCTION reset_game_state(game_uuid UUID)
RETURNS JSON AS $$
BEGIN
    -- Clear called numbers
    DELETE FROM called_numbers WHERE game_id = game_uuid;
    
    -- Reset game state
    UPDATE games 
    SET current_number = NULL,
        called_numbers = '{}',
        status = 'waiting'
    WHERE id = game_uuid;
    
    RETURN json_build_object('success', true, 'message', 'Game reset successfully');
END;
$$ LANGUAGE plpgsql;

-- Step 5: Function to check game integrity
CREATE OR REPLACE FUNCTION check_game_integrity(game_uuid UUID)
RETURNS JSON AS $$
DECLARE
    game_record RECORD;
    called_count INTEGER;
    array_count INTEGER;
    issues TEXT[] := '{}';
BEGIN
    -- Get game record
    SELECT * INTO game_record FROM games WHERE id = game_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    -- Count called numbers in table
    SELECT COUNT(*) INTO called_count FROM called_numbers WHERE game_id = game_uuid;
    
    -- Count numbers in game array
    SELECT array_length(called_numbers, 1) INTO array_count FROM games WHERE id = game_uuid;
    array_count := COALESCE(array_count, 0);
    
    -- Check for inconsistencies
    IF called_count != array_count THEN
        issues := array_append(issues, format('Mismatch: table has %s numbers, array has %s', called_count, array_count));
    END IF;
    
    -- Check for duplicates in called_numbers table
    IF EXISTS (
        SELECT 1 FROM called_numbers 
        WHERE game_id = game_uuid 
        GROUP BY number 
        HAVING COUNT(*) > 1
    ) THEN
        issues := array_append(issues, 'Duplicate numbers found in called_numbers table');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'game_id', game_uuid,
        'status', game_record.status,
        'called_count', called_count,
        'array_count', array_count,
        'issues', issues,
        'is_healthy', array_length(issues, 1) = 0 OR array_length(issues, 1) IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Step 6: Enable real-time subscriptions (skip if already exists)
DO $$
BEGIN
    -- Try to add tables to realtime publication, ignore if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, continue
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE games;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, continue
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE players;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, continue
    END;
END $$;

-- Step 7: Add RLS policies for better security
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow all operations on games" ON games;
    DROP POLICY IF EXISTS "Allow all operations on players" ON players;
    DROP POLICY IF EXISTS "Allow all operations on called_numbers" ON called_numbers;
    
    -- Create more specific policies
    CREATE POLICY "Enable read access for all users" ON games FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users" ON games FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for game admins" ON games FOR UPDATE USING (true);
    CREATE POLICY "Enable delete for game admins" ON games FOR DELETE USING (true);
    
    CREATE POLICY "Enable all operations on players" ON players FOR ALL USING (true);
    CREATE POLICY "Enable all operations on called_numbers" ON called_numbers FOR ALL USING (true);
END $$;

-- Step 8: Create monitoring view for game health
CREATE OR REPLACE VIEW game_health_monitor AS
SELECT 
    g.id,
    g.status,
    g.created_at,
    COUNT(p.id) as player_count,
    COUNT(cn.id) as called_numbers_count,
    array_length(g.called_numbers, 1) as array_numbers_count,
    CASE 
        WHEN COUNT(cn.id) = COALESCE(array_length(g.called_numbers, 1), 0) THEN 'HEALTHY'
        ELSE 'INCONSISTENT'
    END as health_status
FROM games g
LEFT JOIN players p ON g.id = p.game_id
LEFT JOIN called_numbers cn ON g.id = cn.game_id
GROUP BY g.id, g.status, g.created_at, g.called_numbers;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION call_next_number(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_called_numbers(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_game_state(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_game_integrity(UUID) TO authenticated, anon;
GRANT SELECT ON game_health_monitor TO authenticated, anon;

-- Step 10: Final verification
DO $$
BEGIN
    RAISE NOTICE 'Enhanced bingo migration completed successfully!';
    RAISE NOTICE 'All functions created and constraints applied.';
    RAISE NOTICE 'Real-time subscriptions enabled.';
END $$;ount,
    COUNT(cn.id) as called_numbers_count,
    array_length(g.called_numbers, 1) as array_numbers_count,
    CASE 
        WHEN COUNT(cn.id) = COALESCE(array_length(g.called_numbers, 1), 0) THEN 'HEALTHY'
        ELSE 'INCONSISTENT'
    END as health_status
FROM games g
LEFT JOIN players p ON g.id = p.game_id
LEFT JOIN called_numbers cn ON g.id = cn.game_id
GROUP BY g.id, g.status, g.created_at, g.called_numbers;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION call_next_number(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_called_numbers(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_game_state(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_game_integrity(UUID) TO authenticated, anon;
GRANT SELECT ON game_health_monitor TO authenticated, anon;

-- Step 10: Final verification
DO $$
BEGIN
    RAISE NOTICE 'Enhanced bingo migration completed successfully!';
    RAISE NOTICE 'All functions created and constraints applied.';
    RAISE NOTICE 'Real-time subscriptions enabled for games, players, and called_numbers tables.';
END $$;ount,
    COUNT(cn.id) as called_numbers_count,
    array_length(g.called_numbers, 1) as array_numbers_count,
    CASE 
        WHEN COUNT(cn.id) = COALESCE(array_length(g.called_numbers, 1), 0) THEN 'HEALTHY'
        ELSE 'INCONSISTENT'
    END as health_status
FROM games g
LEFT JOIN players p ON g.id = p.game_id
LEFT JOIN called_numbers cn ON g.id = cn.game_id
GROUP BY g.id, g.status, g.created_at, g.called_numbers;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION call_next_number(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_called_numbers(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_game_state(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_game_integrity(UUID) TO authenticated, anon;
GRANT SELECT ON game_health_monitor TO authenticated, anon;

-- Step 10: Final verification
DO $$
DECLARE
    health_check RECORD;
BEGIN
    -- Check if all functions were created successfully
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'call_next_number') THEN
        RAISE EXCEPTION 'call_next_number function not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_called_numbers') THEN
        RAISE EXCEPTION 'get_called_numbers function not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_game_state') THEN
        RAISE EXCEPTION 'reset_game_state function not created';
    END IF;
    
    RAISE NOTICE 'Enhanced bingo migration completed successfully!';
    RAISE NOTICE 'All functions created and constraints applied.';
    RAISE NOTICE 'Real-time subscriptions enabled for games, players, and called_numbers tables.';
END $$;E VIEW game_health_monitor AS
SELECT 
    g.id,
    g.status,
    g.created_at,
    COUNT(p.id) as player_count,
    COUNT(cn.id) as called_numbers_count,
    array_length(g.called_numbers, 1) as array_numbers_count,
    CASE 
        WHEN COUNT(cn.id) = COALESCE(array_length(g.called_numbers, 1), 0) THEN 'HEALTHY'
        ELSE 'INCONSISTENT'
    END as health_status
FROM games g
LEFT JOIN players p ON g.id = p.game_id
LEFT JOIN called_numbers cn ON g.id = cn.game_id
GROUP BY g.id, g.status, g.created_at, g.called_numbers;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION call_next_number(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_called_numbers(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_game_state(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_game_integrity(UUID) TO authenticated, anon;
GRANT SELECT ON game_health_monitor TO authenticated, anon;

-- Step 10: Final verification
DO $$
DECLARE
    health_check RECORD;
BEGIN
    -- Check if all functions were created successfully
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'call_next_number') THEN
        RAISE EXCEPTION 'call_next_number function not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_called_numbers') THEN
        RAISE EXCEPTION 'get_called_numbers function not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_game_state') THEN
        RAISE EXCEPTION 'reset_game_state function not created';
    END IF;
    
    RAISE NOTICE 'Enhanced bingo migration completed successfully!';
    RAISE NOTICE 'All functions created and constraints applied.';
    RAISE NOTICE 'Real-time subscriptions enabled for games, players, and called_numbers tables.';
END $$;