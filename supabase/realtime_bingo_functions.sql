-- Real-time Bingo Game Functions
-- These functions ensure proper database synchronization for real-time updates

-- Function to call next number with real-time updates
CREATE OR REPLACE FUNCTION call_next_number_realtime(game_uuid UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    next_num INTEGER;
    game_record RECORD;
    last_call_time TIMESTAMP;
    time_diff INTEGER;
    result JSON;
BEGIN
    -- Get game info
    SELECT * INTO game_record FROM games WHERE id = game_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    IF game_record.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Game not active');
    END IF;
    
    -- Check if we need to wait (6 second interval)
    SELECT called_at INTO last_call_time 
    FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ORDER BY called_at DESC 
    LIMIT 1;
    
    IF last_call_time IS NOT NULL THEN
        time_diff := EXTRACT(EPOCH FROM (NOW() - last_call_time));
        IF time_diff < 6 THEN
            RETURN json_build_object(
                'success', false, 
                'wait_seconds', 6 - time_diff,
                'message', 'Please wait before calling next number'
            );
        END IF;
    END IF;
    
    -- Get next available number
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers 
        WHERE game_id = game_uuid 
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    )
    SELECT num INTO next_num 
    FROM available_numbers 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF next_num IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'All numbers called');
    END IF;
    
    -- Insert the called number
    INSERT INTO called_numbers (game_id, number, tenant_id, called_at)
    VALUES (game_uuid, next_num, p_tenant_id, NOW());
    
    -- Update game's current number
    UPDATE games 
    SET current_number = next_num 
    WHERE id = game_uuid;
    
    -- Get total called count
    SELECT COUNT(*) INTO result 
    FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    RETURN json_build_object(
        'success', true,
        'number', next_num,
        'letter', CASE 
            WHEN next_num <= 15 THEN 'B'
            WHEN next_num <= 30 THEN 'I'
            WHEN next_num <= 45 THEN 'N'
            WHEN next_num <= 60 THEN 'G'
            ELSE 'O'
        END,
        'total_called', result,
        'remaining', 75 - result::INTEGER
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time game status
CREATE OR REPLACE FUNCTION get_realtime_game_status(game_uuid UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    game_record RECORD;
    players_count INTEGER;
    numbers_called INTEGER;
    total_pot INTEGER;
    winner_prize INTEGER;
    result JSON;
BEGIN
    -- Get game info
    SELECT * INTO game_record FROM games WHERE id = game_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    -- Get players count
    SELECT COUNT(*) INTO players_count 
    FROM players 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Get called numbers count
    SELECT COUNT(*) INTO numbers_called 
    FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Calculate pot and prize
    total_pot := players_count * COALESCE(game_record.entry_fee, 20);
    winner_prize := total_pot - (total_pot * COALESCE(game_record.platform_fee_percent, 0) / 100);
    
    RETURN json_build_object(
        'success', true,
        'status', game_record.status,
        'players_count', players_count,
        'numbers_called', numbers_called,
        'total_pot', total_pot,
        'platform_fee_percent', COALESCE(game_record.platform_fee_percent, 0),
        'winner_prize', winner_prize,
        'current_number', game_record.current_number,
        'entry_fee', COALESCE(game_record.entry_fee, 20)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to reset game with real-time cleanup
CREATE OR REPLACE FUNCTION reset_game_realtime(game_uuid UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
    -- Clear called numbers
    DELETE FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Clear players
    DELETE FROM players 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Reset game status
    UPDATE games 
    SET status = 'waiting', 
        current_number = NULL,
        started_at = NULL,
        finished_at = NULL
    WHERE id = game_uuid;
    
    RETURN json_build_object('success', true, 'message', 'Game reset successfully');
END;
$$ LANGUAGE plpgsql;

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;

-- Create indexes for better real-time performance
CREATE INDEX IF NOT EXISTS idx_called_numbers_game_tenant ON called_numbers(game_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_players_game_tenant ON players(game_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_called_numbers_time ON called_numbers(called_at DESC);

-- Grant permissions
GRANT EXECUTE ON FUNCTION call_next_number_realtime(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_game_status(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_game_realtime(UUID, UUID) TO anon, authenticated;