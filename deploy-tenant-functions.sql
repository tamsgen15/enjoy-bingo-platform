-- Deploy Tenant-Specific Functions for Number Calling
-- Run this in your Supabase SQL editor

-- Function to call number with complete tenant isolation
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
    -- Get game with strict tenant and session validation
    SELECT * INTO game_record 
    FROM games 
    WHERE id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Game not found or access denied'
        );
    END IF;
    
    IF game_record.status != 'active' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Game not active'
        );
    END IF;
    
    -- Check timing with tenant isolation
    SELECT called_at INTO last_call_time 
    FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id)
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
    
    -- Get available numbers for this tenant session
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers 
        WHERE game_id = p_game_id 
        AND tenant_id = p_tenant_id
        AND (p_session_id IS NULL OR session_id = p_session_id)
    )
    SELECT num INTO next_num 
    FROM available_numbers 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF next_num IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'All numbers called'
        );
    END IF;
    
    -- Insert with complete tenant isolation
    INSERT INTO called_numbers (
        game_id, 
        number, 
        tenant_id, 
        session_id, 
        called_at
    )
    VALUES (
        p_game_id, 
        next_num, 
        p_tenant_id, 
        p_session_id, 
        NOW()
    );
    
    -- Update game current number
    UPDATE games 
    SET current_number = next_num 
    WHERE id = p_game_id 
    AND tenant_id = p_tenant_id;
    
    -- Get total called count for this tenant session
    SELECT COUNT(*) INTO total_called_count
    FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
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
        'remaining', 75 - total_called_count,
        'session_id', p_session_id,
        'tenant_id', p_tenant_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create tenant game with complete isolation
CREATE OR REPLACE FUNCTION create_tenant_game_isolated(
    p_tenant_id UUID,
    p_admin_email TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_game_id UUID;
    new_session_id UUID;
    tenant_record RECORD;
BEGIN
    -- Verify tenant exists and is active
    SELECT * INTO tenant_record 
    FROM tenants 
    WHERE id = p_tenant_id 
    AND subscription_status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Tenant not found or subscription inactive'
        );
    END IF;
    
    -- End existing active games for this tenant user
    UPDATE games 
    SET status = 'finished', 
        finished_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_admin_email
    AND status IN ('waiting', 'active', 'paused');
    
    -- Generate new session ID
    new_session_id := gen_random_uuid();
    
    -- Create new game with tenant isolation
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
        0,  -- Tenants keep 100% of revenue
        p_tenant_id,
        new_session_id,
        p_device_id
    )
    RETURNING id INTO new_game_id;
    
    RETURN json_build_object(
        'success', true,
        'game_id', new_game_id,
        'session_id', new_session_id,
        'tenant_id', p_tenant_id,
        'message', 'Isolated tenant game created'
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
    -- Verify game belongs to tenant
    IF NOT EXISTS (
        SELECT 1 FROM games 
        WHERE id = p_game_id 
        AND tenant_id = p_tenant_id
    ) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Game not found or access denied'
        );
    END IF;
    
    -- Check if card is available in this tenant session
    IF EXISTS (
        SELECT 1 FROM players 
        WHERE game_id = p_game_id 
        AND tenant_id = p_tenant_id
        AND card_number = p_card_number
        AND (p_session_id IS NULL OR session_id = p_session_id)
    ) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Card already taken in this session'
        );
    END IF;
    
    -- Add player with complete tenant isolation
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
        'player_id', new_player_id,
        'session_id', p_session_id,
        'tenant_id', p_tenant_id,
        'message', 'Player added to isolated tenant session'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to end tenant user games with complete isolation
CREATE OR REPLACE FUNCTION end_tenant_user_games_isolated(
    p_tenant_id UUID,
    p_user_email TEXT
)
RETURNS JSON AS $$
DECLARE
    games_count INTEGER;
    players_count INTEGER;
    numbers_count INTEGER;
BEGIN
    -- Count affected records for this specific tenant user
    SELECT COUNT(*) INTO games_count 
    FROM games 
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_user_email
    AND status IN ('waiting', 'active', 'paused');
    
    SELECT COUNT(*) INTO players_count 
    FROM players 
    WHERE tenant_id = p_tenant_id
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
    );
    
    SELECT COUNT(*) INTO numbers_count 
    FROM called_numbers 
    WHERE tenant_id = p_tenant_id
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
    );
    
    -- End games only created by this specific tenant user
    UPDATE games 
    SET status = 'finished',
        finished_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_user_email
    AND status IN ('waiting', 'active', 'paused');
    
    -- Clear players only from this user's games
    DELETE FROM players 
    WHERE tenant_id = p_tenant_id
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
    );
    
    -- Clear called numbers only from this user's games
    DELETE FROM called_numbers 
    WHERE tenant_id = p_tenant_id
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User games ended successfully',
        'games_ended', games_count,
        'players_cleared', players_count,
        'numbers_cleared', numbers_count
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
RETURNS JSON AS $$
BEGIN
    INSERT INTO user_activity (
        tenant_id,
        user_email,
        activity_type,
        page_url,
        device_info,
        session_data
    )
    VALUES (
        p_tenant_id,
        p_user_email,
        p_activity_type,
        p_page_url,
        p_device_info,
        p_session_data
    );
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION call_number_tenant_isolated(UUID, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_game_isolated(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_player_tenant_isolated(UUID, UUID, TEXT, INTEGER, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_tenant_user_games_isolated(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

SELECT 'Tenant-specific functions deployed successfully!' as status;