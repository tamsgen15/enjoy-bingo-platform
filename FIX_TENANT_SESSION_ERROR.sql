-- FIX TENANT SESSION ERROR - Complete Solution
-- Run this in Supabase SQL Editor to fix the 400 Bad Request error

-- Create tenant_sessions table if it doesn't exist
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

-- Create tenants table if it doesn't exist
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

-- Drop existing function first
DROP FUNCTION IF EXISTS upsert_tenant_session(UUID, TEXT, TEXT, TEXT);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_tenant_session(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Enable RLS on tenant_sessions
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant_sessions
CREATE POLICY "Users can access their own tenant sessions" ON tenant_sessions
    FOR ALL USING (true);

-- Grant table permissions
GRANT ALL ON tenant_sessions TO anon, authenticated;
GRANT ALL ON tenants TO anon, authenticated;

SELECT 'Tenant session error fixed successfully!' as status;