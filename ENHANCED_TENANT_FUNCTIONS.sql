-- ENHANCED TENANT FUNCTIONS - Complete Database Setup
-- Run this in Supabase SQL Editor

-- Create missing functions for enhanced tenant service

-- Function to create isolated tenant game
CREATE OR REPLACE FUNCTION create_tenant_game_isolated(
    p_tenant_id UUID,
    p_admin_email TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_game_id UUID;
    new_session_id UUID;
BEGIN
    -- End existing active games for this tenant user
    UPDATE games 
    SET status = 'finished', 
        finished_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_admin_email
    AND status IN ('waiting', 'active', 'paused');
    
    -- Generate new session ID
    new_session_id := gen_random_uuid();
    
    -- Create new game
    INSERT INTO games (
        admin_id, 
        status, 
        entry_fee, 
        platform_fee_percent,
        tenant_id,
        session_id,
        admin_device_id
    )
    VALUES (
        p_admin_email, 
        'waiting', 
        20, 
        0,
        p_tenant_id,
        new_session_id,
        p_device_id
    )
    RETURNING id INTO new_game_id;
    
    RETURN json_build_object(
        'success', true,
        'game_id', new_game_id,
        'session_id', new_session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to call number with tenant isolation
CREATE OR REPLACE FUNCTION call_number_tenant_isolated(
    p_game_id UUID,
    p_tenant_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    next_num INTEGER;
    game_record RECORD;
    last_call_time TIMESTAMP;
    time_diff INTEGER;
    total_called_count INTEGER;
BEGIN
    -- Get game with tenant validation
    SELECT * INTO game_record 
    FROM games 
    WHERE id = p_game_id 
    AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    IF game_record.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Game not active');
    END IF;
    
    -- Check timing
    SELECT called_at INTO last_call_time 
    FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    ORDER BY called_at DESC 
    LIMIT 1;
    
    IF last_call_time IS NOT NULL THEN
        time_diff := EXTRACT(EPOCH FROM (NOW() - last_call_time));
        IF time_diff < 6 THEN
            RETURN json_build_object(
                'success', false, 
                'wait_seconds', 6 - time_diff
            );
        END IF;
    END IF;
    
    -- Get next available number
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers 
        WHERE game_id = p_game_id 
        AND tenant_id = p_tenant_id
    )
    SELECT num INTO next_num 
    FROM available_numbers 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF next_num IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'All numbers called');
    END IF;
    
    -- Insert called number
    INSERT INTO called_numbers (game_id, number, tenant_id, session_id, called_at)
    VALUES (p_game_id, next_num, p_tenant_id, p_session_id, NOW());
    
    -- Update game current number
    UPDATE games 
    SET current_number = next_num 
    WHERE id = p_game_id;
    
    -- Get total called count
    SELECT COUNT(*) INTO total_called_count
    FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id;
    
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
        'total_called', total_called_count,
        'remaining', 75 - total_called_count
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add player with tenant isolation
CREATE OR REPLACE FUNCTION add_player_tenant_isolated(
    p_game_id UUID,
    p_tenant_id UUID,
    p_player_name TEXT,
    p_card_number INTEGER,
    p_session_id UUID DEFAULT NULL,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_player_id UUID;
BEGIN
    -- Check if card is available
    IF EXISTS (
        SELECT 1 FROM players 
        WHERE game_id = p_game_id 
        AND tenant_id = p_tenant_id
        AND card_number = p_card_number
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Card already taken');
    END IF;
    
    -- Add player
    INSERT INTO players (
        game_id, 
        player_name, 
        card_number, 
        is_winner, 
        tenant_id,
        session_id,
        device_id
    )
    VALUES (
        p_game_id, 
        p_player_name, 
        p_card_number, 
        false,
        p_tenant_id,
        p_session_id,
        p_device_id
    )
    RETURNING id INTO new_player_id;
    
    RETURN json_build_object(
        'success', true,
        'player_id', new_player_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to end tenant user games
CREATE OR REPLACE FUNCTION end_tenant_user_games_isolated(
    p_tenant_id UUID,
    p_user_email TEXT
)
RETURNS JSON AS $$
DECLARE
    games_ended INTEGER := 0;
    players_cleared INTEGER := 0;
BEGIN
    -- Count games to be ended
    SELECT COUNT(*) INTO games_ended
    FROM games 
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_user_email
    AND status IN ('waiting', 'active', 'paused');
    
    -- Count players to be cleared
    SELECT COUNT(*) INTO players_cleared
    FROM players p
    JOIN games g ON p.game_id = g.id
    WHERE g.tenant_id = p_tenant_id 
    AND g.admin_id = p_user_email
    AND g.status IN ('waiting', 'active', 'paused');
    
    -- Clear players first
    DELETE FROM players 
    WHERE game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
        AND status IN ('waiting', 'active', 'paused')
    );
    
    -- Clear called numbers
    DELETE FROM called_numbers 
    WHERE game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
        AND status IN ('waiting', 'active', 'paused')
    );
    
    -- End games
    UPDATE games 
    SET status = 'finished', 
        finished_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_user_email
    AND status IN ('waiting', 'active', 'paused');
    
    RETURN json_build_object(
        'success', true,
        'games_ended', games_ended,
        'players_cleared', players_cleared
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_tenant_id UUID,
    p_user_email TEXT,
    p_activity_type TEXT,
    p_page_url TEXT DEFAULT NULL,
    p_device_info TEXT DEFAULT NULL,
    p_session_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Simple activity logging (you can expand this)
    INSERT INTO tenant_sessions (
        tenant_id,
        user_email,
        tenant_name,
        session_token,
        device_info,
        is_active,
        expires_at
    )
    VALUES (
        p_tenant_id,
        p_user_email,
        'Activity Log',
        encode(gen_random_bytes(16), 'hex'),
        p_device_info,
        false,
        NOW()
    )
    ON CONFLICT (tenant_id, user_email) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_tenant_game_isolated(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION call_number_tenant_isolated(UUID, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_player_tenant_isolated(UUID, UUID, TEXT, INTEGER, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_tenant_user_games_isolated(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

SELECT 'Enhanced tenant functions deployed successfully!' as status;