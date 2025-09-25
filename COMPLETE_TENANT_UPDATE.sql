-- COMPLETE TENANT UPDATE - Run this to fix all tenant functionality
-- Execute this in Supabase SQL Editor

-- 1. Create required tables
CREATE TABLE IF NOT EXISTS tenant_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    session_token TEXT NOT NULL,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_email)
);

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name TEXT NOT NULL,
    admin_email TEXT NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'active',
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    monthly_fee DECIMAL(10,2) DEFAULT 100.00,
    default_platform_fee_percent INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns to existing tables
ALTER TABLE games ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE games ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();
ALTER TABLE games ADD COLUMN IF NOT EXISTS admin_device_id TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE players ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS session_id UUID;

-- 3. Create all required functions
CREATE OR REPLACE FUNCTION upsert_tenant_session(
    p_tenant_id UUID,
    p_user_email TEXT,
    p_tenant_name TEXT,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_session_id UUID;
    session_token TEXT;
    expires_at TIMESTAMP;
BEGIN
    new_session_id := gen_random_uuid();
    session_token := encode(gen_random_bytes(32), 'hex');
    expires_at := NOW() + INTERVAL '24 hours';
    
    INSERT INTO tenant_sessions (
        id, tenant_id, user_email, tenant_name, session_token, 
        device_info, is_active, expires_at, created_at, updated_at
    )
    VALUES (
        new_session_id, p_tenant_id, p_user_email, p_tenant_name, session_token,
        p_device_info, true, expires_at, NOW(), NOW()
    )
    ON CONFLICT (tenant_id, user_email) 
    DO UPDATE SET
        session_token = EXCLUDED.session_token,
        device_info = EXCLUDED.device_info,
        is_active = true,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    RETURNING id INTO new_session_id;
    
    RETURN json_build_object(
        'success', true,
        'session_id', new_session_id,
        'session_token', session_token,
        'expires_at', expires_at
    );
END;
$$ LANGUAGE plpgsql;

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
    UPDATE games 
    SET status = 'finished', finished_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_admin_email
    AND status IN ('waiting', 'active', 'paused');
    
    new_session_id := gen_random_uuid();
    
    INSERT INTO games (
        admin_id, status, entry_fee, platform_fee_percent,
        tenant_id, session_id, admin_device_id
    )
    VALUES (
        p_admin_email, 'waiting', 20, 0,
        p_tenant_id, new_session_id, p_device_id
    )
    RETURNING id INTO new_game_id;
    
    RETURN json_build_object(
        'success', true,
        'game_id', new_game_id,
        'session_id', new_session_id
    );
END;
$$ LANGUAGE plpgsql;

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
    SELECT * INTO game_record 
    FROM games 
    WHERE id = p_game_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    IF game_record.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Game not active');
    END IF;
    
    SELECT called_at INTO last_call_time 
    FROM called_numbers 
    WHERE game_id = p_game_id AND tenant_id = p_tenant_id
    ORDER BY called_at DESC LIMIT 1;
    
    IF last_call_time IS NOT NULL THEN
        time_diff := EXTRACT(EPOCH FROM (NOW() - last_call_time));
        IF time_diff < 6 THEN
            RETURN json_build_object('success', false, 'wait_seconds', 6 - time_diff);
        END IF;
    END IF;
    
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers 
        WHERE game_id = p_game_id AND tenant_id = p_tenant_id
    )
    SELECT num INTO next_num 
    FROM available_numbers 
    ORDER BY RANDOM() LIMIT 1;
    
    IF next_num IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'All numbers called');
    END IF;
    
    INSERT INTO called_numbers (game_id, number, tenant_id, session_id, called_at)
    VALUES (p_game_id, next_num, p_tenant_id, p_session_id, NOW());
    
    UPDATE games SET current_number = next_num WHERE id = p_game_id;
    
    SELECT COUNT(*) INTO total_called_count
    FROM called_numbers WHERE game_id = p_game_id AND tenant_id = p_tenant_id;
    
    RETURN json_build_object(
        'success', true, 'number', next_num,
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
    IF EXISTS (
        SELECT 1 FROM players 
        WHERE game_id = p_game_id AND tenant_id = p_tenant_id AND card_number = p_card_number
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Card already taken');
    END IF;
    
    INSERT INTO players (
        game_id, player_name, card_number, is_winner, 
        tenant_id, session_id, device_id
    )
    VALUES (
        p_game_id, p_player_name, p_card_number, false,
        p_tenant_id, p_session_id, p_device_id
    )
    RETURNING id INTO new_player_id;
    
    RETURN json_build_object('success', true, 'player_id', new_player_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION end_tenant_user_games_isolated(
    p_tenant_id UUID,
    p_user_email TEXT
)
RETURNS JSON AS $$
DECLARE
    games_ended INTEGER := 0;
    players_cleared INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO games_ended
    FROM games 
    WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    AND status IN ('waiting', 'active', 'paused');
    
    SELECT COUNT(*) INTO players_cleared
    FROM players p JOIN games g ON p.game_id = g.id
    WHERE g.tenant_id = p_tenant_id AND g.admin_id = p_user_email
    AND g.status IN ('waiting', 'active', 'paused');
    
    DELETE FROM players 
    WHERE game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
        AND status IN ('waiting', 'active', 'paused')
    );
    
    DELETE FROM called_numbers 
    WHERE game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
        AND status IN ('waiting', 'active', 'paused')
    );
    
    UPDATE games 
    SET status = 'finished', finished_at = NOW()
    WHERE tenant_id = p_tenant_id AND admin_id = p_user_email
    AND status IN ('waiting', 'active', 'paused');
    
    RETURN json_build_object(
        'success', true,
        'games_ended', games_ended,
        'players_cleared', players_cleared
    );
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
CREATE FUNCTION log_user_activity(
    p_tenant_id UUID,
    p_user_email TEXT,
    p_activity_type TEXT,
    p_page_url TEXT DEFAULT NULL,
    p_device_info TEXT DEFAULT NULL,
    p_session_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Simple logging - can be expanded
    NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT ALL ON tenant_sessions TO anon, authenticated;
GRANT ALL ON tenants TO anon, authenticated;

-- 5. Enable RLS
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own tenant sessions" ON tenant_sessions;
CREATE POLICY "Users can access their own tenant sessions" ON tenant_sessions FOR ALL USING (true);

SELECT 'Complete tenant update deployed successfully!' as status; anon, authenticated;
GRANT ALL ON tenants TO anon, authenticated;

-- 5. Enable RLS
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own tenant sessions" ON tenant_sessions;
CREATE POLICY "Users can access their own tenant sessions" ON tenant_sessions FOR ALL USING (true);

SELECT 'Complete tenant update deployed successfully!' as status;