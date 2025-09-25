-- End All Tenant Games Function
-- Run this script in your Supabase SQL editor

-- Function to end games for a specific tenant user session
CREATE OR REPLACE FUNCTION end_tenant_user_games(
    p_tenant_id UUID,
    p_user_email TEXT
)
RETURNS JSON AS $$
DECLARE
    games_count INTEGER;
    players_count INTEGER;
    numbers_count INTEGER;
    sessions_count INTEGER;
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
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    );
    
    SELECT COUNT(*) INTO numbers_count 
    FROM called_numbers 
    WHERE tenant_id = p_tenant_id
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    );
    
    SELECT COUNT(*) INTO sessions_count 
    FROM game_sessions 
    WHERE tenant_id = p_tenant_id 
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    )
    AND status = 'active';
    
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
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    );
    
    -- Clear called numbers only from this user's games
    DELETE FROM called_numbers 
    WHERE tenant_id = p_tenant_id
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    );
    
    -- End game sessions only for this user's games
    UPDATE game_sessions 
    SET status = 'ended'
    WHERE tenant_id = p_tenant_id 
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    )
    AND status = 'active';
    
    -- Log the user-specific termination activity
    INSERT INTO user_activity (
        tenant_id, 
        user_email, 
        activity_type, 
        session_data
    ) VALUES (
        p_tenant_id,
        p_user_email,
        'user_game_termination',
        json_build_object(
            'games_ended', games_count,
            'players_cleared', players_count,
            'numbers_cleared', numbers_count,
            'sessions_ended', sessions_count
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User games ended successfully',
        'games_ended', games_count,
        'players_cleared', players_count,
        'numbers_cleared', numbers_count,
        'sessions_ended', sessions_count
    );
END;
$$ LANGUAGE plpgsql;

-- Function to end all games globally (for platform owner)
CREATE OR REPLACE FUNCTION end_all_platform_games()
RETURNS JSON AS $$
DECLARE
    total_games INTEGER;
    total_players INTEGER;
    total_numbers INTEGER;
    total_sessions INTEGER;
BEGIN
    -- Count all affected records
    SELECT COUNT(*) INTO total_games 
    FROM games 
    WHERE status IN ('waiting', 'active', 'paused');
    
    SELECT COUNT(*) INTO total_players 
    FROM players;
    
    SELECT COUNT(*) INTO total_numbers 
    FROM called_numbers;
    
    SELECT COUNT(*) INTO total_sessions 
    FROM game_sessions 
    WHERE status = 'active';
    
    -- End all games across all tenants
    UPDATE games 
    SET status = 'finished',
        finished_at = NOW()
    WHERE status IN ('waiting', 'active', 'paused');
    
    -- Clear all players
    DELETE FROM players;
    
    -- Clear all called numbers
    DELETE FROM called_numbers;
    
    -- End all game sessions
    UPDATE game_sessions 
    SET status = 'ended'
    WHERE status = 'active';
    
    -- Log platform-wide termination
    INSERT INTO user_activity (
        tenant_id, 
        user_email, 
        activity_type, 
        session_data
    ) VALUES (
        gen_random_uuid(), -- Platform owner activity
        'platform_owner',
        'platform_wide_termination',
        json_build_object(
            'total_games_ended', total_games,
            'total_players_cleared', total_players,
            'total_numbers_cleared', total_numbers,
            'total_sessions_ended', total_sessions
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'All platform games ended successfully',
        'total_games_ended', total_games,
        'total_players_cleared', total_players,
        'total_numbers_cleared', total_numbers,
        'total_sessions_ended', total_sessions
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION end_tenant_user_games(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_all_platform_games() TO anon, authenticated;

SELECT 'End all tenant games functions deployed successfully!' as status;