-- Multi-Tenant Game Session Management
-- Run this script in your Supabase SQL editor

-- Add session tracking columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE games ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();
ALTER TABLE games ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS admin_device_id TEXT;

-- Add session tracking to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Add session tracking to called_numbers table
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS session_id UUID;

-- Create game sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    admin_device_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, game_id, session_id)
);

-- Function to create tenant game session
CREATE OR REPLACE FUNCTION create_tenant_game_session(
    p_tenant_id UUID,
    p_admin_id TEXT DEFAULT 'admin',
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_game_id UUID;
    new_session_id UUID;
BEGIN
    -- Generate new session ID
    new_session_id := gen_random_uuid();
    
    -- Create new game with tenant and session info
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
        p_admin_id, 
        'waiting', 
        20, 
        0,
        p_tenant_id,
        new_session_id,
        p_device_id
    )
    RETURNING id INTO new_game_id;
    
    -- Create session tracking record
    INSERT INTO game_sessions (
        tenant_id,
        game_id,
        session_id,
        admin_device_id
    )
    VALUES (
        p_tenant_id,
        new_game_id,
        new_session_id,
        p_device_id
    );
    
    RETURN json_build_object(
        'success', true,
        'game_id', new_game_id,
        'session_id', new_session_id,
        'tenant_id', p_tenant_id,
        'message', 'Tenant game session created'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant game status with session isolation
CREATE OR REPLACE FUNCTION get_tenant_game_status(
    p_game_id UUID,
    p_tenant_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    game_record RECORD;
    players_count INTEGER;
    numbers_called INTEGER;
    total_pot INTEGER;
    winner_prize INTEGER;
BEGIN
    -- Get game info with tenant and session filtering
    SELECT * INTO game_record 
    FROM games 
    WHERE id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game session not found');
    END IF;
    
    -- Get players count for this session
    SELECT COUNT(*) INTO players_count 
    FROM players 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    -- Get called numbers count for this session
    SELECT COUNT(*) INTO numbers_called 
    FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
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
        'entry_fee', COALESCE(game_record.entry_fee, 20),
        'session_id', game_record.session_id,
        'tenant_id', game_record.tenant_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to call number with session isolation
CREATE OR REPLACE FUNCTION call_number_session(
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
    -- Get game with session validation
    SELECT * INTO game_record 
    FROM games 
    WHERE id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game session not found');
    END IF;
    
    IF game_record.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Game not active');
    END IF;
    
    -- Check timing with session isolation
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
    
    -- Get available numbers for this session
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
        RETURN json_build_object('success', false, 'error', 'All numbers called');
    END IF;
    
    -- Insert with session tracking
    INSERT INTO called_numbers (game_id, number, tenant_id, session_id, called_at)
    VALUES (p_game_id, next_num, p_tenant_id, p_session_id, NOW());
    
    -- Update game current number
    UPDATE games 
    SET current_number = next_num 
    WHERE id = p_game_id;
    
    -- Get total called count for this session
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
        'session_id', p_session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add player with session tracking
CREATE OR REPLACE FUNCTION add_player_session(
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
    -- Check if card is available in this session
    IF EXISTS (
        SELECT 1 FROM players 
        WHERE game_id = p_game_id 
        AND tenant_id = p_tenant_id
        AND card_number = p_card_number
        AND (p_session_id IS NULL OR session_id = p_session_id)
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Card already taken in this session');
    END IF;
    
    -- Add player with session tracking
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
        'message', 'Player added to session'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to reset game session
CREATE OR REPLACE FUNCTION reset_game_session(
    p_game_id UUID,
    p_tenant_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    -- Clear called numbers for this session
    DELETE FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    -- Clear players for this session
    DELETE FROM players 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    -- Reset game status
    UPDATE games 
    SET status = 'waiting', 
        current_number = NULL,
        started_at = NULL,
        finished_at = NULL
    WHERE id = p_game_id
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    -- Update session status
    UPDATE game_sessions
    SET status = 'reset',
        updated_at = NOW()
    WHERE game_id = p_game_id
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    RETURN json_build_object('success', true, 'message', 'Game session reset successfully');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_tenant_game_session(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_game_status(UUID, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION call_number_session(UUID, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_player_session(UUID, UUID, TEXT, INTEGER, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_game_session(UUID, UUID, UUID) TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_tenant_session ON games(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_players_tenant_session ON players(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_called_numbers_tenant_session ON called_numbers(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_tenant ON game_sessions(tenant_id, game_id);

SELECT 'Multi-tenant session management deployed successfully!' as status;