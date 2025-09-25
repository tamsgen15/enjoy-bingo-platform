-- FIX REALTIME AND ADD 20% PLATFORM FEE
-- Run this in Supabase SQL Editor

-- Check and add tables to realtime publication (ignore errors if already added)
DO $$
BEGIN
    -- Try to add each table, ignore if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE games;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already exists
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE players;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_activity;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- Update create_tenant_game_isolated to use 20% platform fee
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
    
    -- Create new game with 20% platform fee for tenants
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
        20,  -- 20% platform fee for tenants
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
        'message', 'Tenant game created with 20% platform fee'
    );
END;
$$ LANGUAGE plpgsql;

-- Create tenant revenue tracking function
CREATE OR REPLACE FUNCTION get_tenant_revenue_summary(
    p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
    total_games INTEGER;
    total_players INTEGER;
    total_pot INTEGER;
    platform_revenue INTEGER;
    tenant_revenue INTEGER;
BEGIN
    -- Get tenant game statistics
    SELECT 
        COUNT(DISTINCT g.id),
        COUNT(p.id),
        COALESCE(SUM(g.entry_fee), 0) * COUNT(p.id),
        COALESCE(SUM(g.entry_fee * g.platform_fee_percent / 100.0), 0) * COUNT(p.id),
        COALESCE(SUM(g.entry_fee * (100 - g.platform_fee_percent) / 100.0), 0) * COUNT(p.id)
    INTO 
        total_games,
        total_players,
        total_pot,
        platform_revenue,
        tenant_revenue
    FROM games g
    LEFT JOIN players p ON g.id = p.game_id AND p.tenant_id = p_tenant_id
    WHERE g.tenant_id = p_tenant_id;
    
    RETURN json_build_object(
        'success', true,
        'total_games', COALESCE(total_games, 0),
        'total_players', COALESCE(total_players, 0),
        'total_pot', COALESCE(total_pot, 0),
        'platform_revenue', COALESCE(platform_revenue, 0),
        'tenant_revenue', COALESCE(tenant_revenue, 0)
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_tenant_game_isolated(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_revenue_summary(UUID) TO anon, authenticated;

SELECT 'Fixed realtime and added 20% platform fee for tenants!' as status;