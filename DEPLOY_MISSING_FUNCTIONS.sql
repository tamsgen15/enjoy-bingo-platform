-- DEPLOY MISSING FUNCTIONS - Run this in Supabase SQL Editor
-- This creates the missing upsert_tenant_session function

-- Drop existing functions first
DROP FUNCTION IF EXISTS upsert_tenant_session(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_tenant_game_session(UUID, TEXT, TEXT);

-- Function to upsert tenant session (matching enhancedTenantService call)
CREATE FUNCTION upsert_tenant_session(
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
    -- Generate session data
    new_session_id := gen_random_uuid();
    session_token := encode(gen_random_bytes(32), 'hex');
    expires_at := NOW() + INTERVAL '24 hours';
    
    -- Create or update tenant session
    INSERT INTO tenant_sessions (
        id,
        tenant_id,
        user_email,
        tenant_name,
        session_token,
        device_info,
        is_active,
        expires_at,
        created_at,
        updated_at
    )
    VALUES (
        new_session_id,
        p_tenant_id,
        p_user_email,
        p_tenant_name,
        session_token,
        p_device_info,
        true,
        expires_at,
        NOW(),
        NOW()
    )
    ON CONFLICT (tenant_id, user_email) 
    DO UPDATE SET
        session_token = EXCLUDED.session_token,
        device_info = EXCLUDED.device_info,
        is_active = true,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'session_id', new_session_id,
        'session_token', session_token,
        'expires_at', expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_tenant_session(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

SELECT 'Missing upsert_tenant_session function deployed successfully!' as status;