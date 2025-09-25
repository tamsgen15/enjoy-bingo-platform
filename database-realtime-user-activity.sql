-- Real-time User Activity Tracking
-- Run this script in your Supabase SQL editor

-- Create user activity tracking table
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    activity_type TEXT NOT NULL, -- 'login', 'logout', 'game_access', 'admin_access'
    page_url TEXT,
    device_info TEXT,
    session_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant sessions table for real-time session management
CREATE TABLE IF NOT EXISTS tenant_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    tenant_name TEXT,
    session_token TEXT UNIQUE NOT NULL,
    device_info TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_email)
);

-- Function to create or update tenant session
CREATE OR REPLACE FUNCTION upsert_tenant_session(
    p_tenant_id UUID,
    p_user_email TEXT,
    p_tenant_name TEXT DEFAULT NULL,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    session_token TEXT;
    existing_session RECORD;
BEGIN
    -- Generate session token
    session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Check for existing session
    SELECT * INTO existing_session 
    FROM tenant_sessions 
    WHERE tenant_id = p_tenant_id AND user_email = p_user_email;
    
    IF existing_session.id IS NOT NULL THEN
        -- Update existing session
        UPDATE tenant_sessions 
        SET session_token = session_token,
            tenant_name = COALESCE(p_tenant_name, tenant_name),
            device_info = COALESCE(p_device_info, device_info),
            last_activity = NOW(),
            is_active = true,
            expires_at = NOW() + INTERVAL '7 days',
            updated_at = NOW()
        WHERE id = existing_session.id;
    ELSE
        -- Create new session
        INSERT INTO tenant_sessions (
            tenant_id, user_email, tenant_name, session_token, device_info
        ) VALUES (
            p_tenant_id, p_user_email, p_tenant_name, session_token, p_device_info
        );
    END IF;
    
    -- Log activity
    INSERT INTO user_activity (
        tenant_id, user_email, user_name, activity_type, device_info,
        session_data
    ) VALUES (
        p_tenant_id, p_user_email, p_tenant_name, 'login', p_device_info,
        json_build_object('session_token', session_token)
    );
    
    RETURN json_build_object(
        'success', true,
        'session_token', session_token,
        'tenant_id', p_tenant_id,
        'user_email', p_user_email,
        'tenant_name', p_tenant_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get active tenant session
CREATE OR REPLACE FUNCTION get_tenant_session(
    p_session_token TEXT
)
RETURNS JSON AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record 
    FROM tenant_sessions 
    WHERE session_token = p_session_token 
    AND is_active = true 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Session not found or expired');
    END IF;
    
    -- Update last activity
    UPDATE tenant_sessions 
    SET last_activity = NOW() 
    WHERE id = session_record.id;
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', session_record.tenant_id,
        'user_email', session_record.user_email,
        'tenant_name', session_record.tenant_name,
        'last_activity', session_record.last_activity
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
        tenant_id, user_email, activity_type, page_url, device_info, session_data
    ) VALUES (
        p_tenant_id, p_user_email, p_activity_type, p_page_url, p_device_info, p_session_data
    );
    
    RETURN json_build_object('success', true, 'message', 'Activity logged');
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate tenant session
CREATE OR REPLACE FUNCTION invalidate_tenant_session(
    p_session_token TEXT
)
RETURNS JSON AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record 
    FROM tenant_sessions 
    WHERE session_token = p_session_token;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Session not found');
    END IF;
    
    -- Deactivate session
    UPDATE tenant_sessions 
    SET is_active = false, updated_at = NOW() 
    WHERE session_token = p_session_token;
    
    -- Log logout activity
    INSERT INTO user_activity (
        tenant_id, user_email, activity_type, device_info
    ) VALUES (
        session_record.tenant_id, session_record.user_email, 'logout', session_record.device_info
    );
    
    RETURN json_build_object('success', true, 'message', 'Session invalidated');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_tenant_session(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION invalidate_tenant_session(TEXT) TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant ON user_activity(tenant_id, user_email);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_token ON tenant_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_active ON tenant_sessions(tenant_id, is_active, expires_at);

SELECT 'Real-time user activity tracking deployed successfully!' as status;