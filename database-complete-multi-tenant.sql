-- Complete Multi-Tenant Database Schema with Full Isolation
-- Run this script in your Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table for complete tenant management
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name TEXT NOT NULL,
    admin_email TEXT NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'pending', 'expired', 'suspended')),
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    monthly_fee INTEGER DEFAULT 20000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tenant_id to all existing tables if not exists
ALTER TABLE games ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();
ALTER TABLE games ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS admin_device_id TEXT;

ALTER TABLE players ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_id TEXT;

ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS session_id UUID;

-- Create tenant sessions table for multi-device support
CREATE TABLE IF NOT EXISTS tenant_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user activity tracking table
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    page_url TEXT,
    device_info TEXT,
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game sessions table for tracking active game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    admin_device_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'reset')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, game_id, session_id)
);

-- Create revenue tracking table
CREATE TABLE IF NOT EXISTS tenant_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_count INTEGER DEFAULT 0,
    entry_fee INTEGER DEFAULT 20,
    total_revenue INTEGER DEFAULT 0,
    platform_fee INTEGER DEFAULT 0,
    tenant_earnings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to create or update tenant
CREATE OR REPLACE FUNCTION upsert_tenant(
    p_tenant_name TEXT,
    p_admin_email TEXT,
    p_subscription_status TEXT DEFAULT 'active',
    p_monthly_fee INTEGER DEFAULT 20000
)
RETURNS JSON AS $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Insert or update tenant
    INSERT INTO tenants (tenant_name, admin_email, subscription_status, monthly_fee)
    VALUES (p_tenant_name, p_admin_email, p_subscription_status, p_monthly_fee)
    ON CONFLICT (admin_email) 
    DO UPDATE SET 
        tenant_name = EXCLUDED.tenant_name,
        subscription_status = EXCLUDED.subscription_status,
        monthly_fee = EXCLUDED.monthly_fee,
        updated_at = NOW()
    RETURNING * INTO tenant_record;
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', tenant_record.id,
        'tenant_name', tenant_record.tenant_name,
        'admin_email', tenant_record.admin_email,
        'subscription_status', tenant_record.subscription_status
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create tenant session with device tracking
CREATE OR REPLACE FUNCTION upsert_tenant_session(
    p_tenant_id UUID,
    p_user_email TEXT,
    p_tenant_name TEXT,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Deactivate old sessions for this user
    UPDATE tenant_sessions 
    SET is_active = false 
    WHERE tenant_id = p_tenant_id 
    AND user_email = p_user_email;
    
    -- Create new session
    INSERT INTO tenant_sessions (
        tenant_id, 
        user_email, 
        tenant_name, 
        device_info,
        expires_at
    )
    VALUES (
        p_tenant_id, 
        p_user_email, 
        p_tenant_name, 
        p_device_info,
        NOW() + INTERVAL '24 hours'
    )
    RETURNING * INTO session_record;
    
    -- Log session creation
    INSERT INTO user_activity (
        tenant_id, 
        user_email, 
        activity_type, 
        device_info,
        session_data
    ) VALUES (
        p_tenant_id,
        p_user_email,
        'session_created',
        p_device_info,
        json_build_object('session_id', session_record.id)
    );
    
    RETURN json_build_object(
        'success', true,
        'session_id', session_record.id,
        'session_token', session_record.session_token,
        'expires_at', session_record.expires_at
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
    
    -- Log game creation activity
    INSERT INTO user_activity (
        tenant_id, 
        user_email, 
        activity_type, 
        session_data
    ) VALUES (
        p_tenant_id,
        p_admin_email,
        'game_created',
        json_build_object(
            'game_id', new_game_id,
            'session_id', new_session_id
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'game_id', new_game_id,
        'session_id', new_session_id,
        'tenant_id', p_tenant_id,
        'message', 'Isolated tenant game created'
    );
END;
$$ LANGUAGE plpgsql;

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
    
    -- Update revenue tracking
    INSERT INTO tenant_revenue (
        tenant_id,
        game_id,
        player_count,
        entry_fee,
        total_revenue,
        platform_fee,
        tenant_earnings
    )
    VALUES (
        p_tenant_id,
        p_game_id,
        1,
        20,
        20,
        0,
        20
    )
    ON CONFLICT (tenant_id, game_id) 
    DO UPDATE SET
        player_count = tenant_revenue.player_count + 1,
        total_revenue = tenant_revenue.total_revenue + 20,
        tenant_earnings = tenant_revenue.tenant_earnings + 20;
    
    RETURN json_build_object(
        'success', true,
        'player_id', new_player_id,
        'session_id', p_session_id,
        'tenant_id', p_tenant_id,
        'message', 'Player added to isolated tenant session'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant game status with complete isolation
CREATE OR REPLACE FUNCTION get_tenant_game_status_isolated(
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
    -- Get game with strict tenant validation
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
    
    -- Get players count for this tenant session
    SELECT COUNT(*) INTO players_count 
    FROM players 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    -- Get called numbers count for this tenant session
    SELECT COUNT(*) INTO numbers_called 
    FROM called_numbers 
    WHERE game_id = p_game_id 
    AND tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    -- Calculate pot and prize (tenants keep 100%)
    total_pot := players_count * COALESCE(game_record.entry_fee, 20);
    winner_prize := total_pot; -- No platform fee for tenants
    
    RETURN json_build_object(
        'success', true,
        'status', game_record.status,
        'players_count', players_count,
        'numbers_called', numbers_called,
        'total_pot', total_pot,
        'platform_fee_percent', 0,
        'winner_prize', winner_prize,
        'current_number', game_record.current_number,
        'entry_fee', COALESCE(game_record.entry_fee, 20),
        'session_id', game_record.session_id,
        'tenant_id', game_record.tenant_id
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
    
    SELECT COUNT(*) INTO sessions_count 
    FROM game_sessions 
    WHERE tenant_id = p_tenant_id 
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
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
    
    -- End game sessions only for this user's games
    UPDATE game_sessions 
    SET status = 'ended'
    WHERE tenant_id = p_tenant_id 
    AND game_id IN (
        SELECT id FROM games 
        WHERE tenant_id = p_tenant_id 
        AND admin_id = p_user_email
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
        'user_games_terminated',
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

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_tenants_admin_email ON tenants(admin_email);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

CREATE INDEX IF NOT EXISTS idx_games_tenant_session ON games(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_games_tenant_admin ON games(tenant_id, admin_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

CREATE INDEX IF NOT EXISTS idx_players_tenant_session ON players(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_players_game_tenant ON players(game_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_players_card_number ON players(card_number);

CREATE INDEX IF NOT EXISTS idx_called_numbers_tenant_session ON called_numbers(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_called_numbers_game_tenant ON called_numbers(game_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_sessions_tenant_user ON tenant_sessions(tenant_id, user_email);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_active ON tenant_sessions(is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_game_sessions_tenant ON game_sessions(tenant_id, game_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_user ON user_activity(tenant_id, user_email);
CREATE INDEX IF NOT EXISTS idx_tenant_revenue_tenant_game ON tenant_revenue(tenant_id, game_id);

-- Enable Row Level Security (RLS) for complete tenant isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY tenant_isolation_policy ON games
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_policy ON players
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_policy ON called_numbers
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_policy ON tenant_sessions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_policy ON game_sessions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_policy ON user_activity
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_policy ON tenant_revenue
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION upsert_tenant(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_tenant_session(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_game_isolated(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION call_number_tenant_isolated(UUID, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_player_tenant_isolated(UUID, UUID, TEXT, INTEGER, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_game_status_isolated(UUID, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_tenant_user_games_isolated(UUID, TEXT) TO anon, authenticated;

-- Grant table permissions
GRANT ALL ON tenants TO anon, authenticated;
GRANT ALL ON tenant_sessions TO anon, authenticated;
GRANT ALL ON game_sessions TO anon, authenticated;
GRANT ALL ON user_activity TO anon, authenticated;
GRANT ALL ON tenant_revenue TO anon, authenticated;

SELECT 'Complete multi-tenant database schema deployed successfully!' as status;