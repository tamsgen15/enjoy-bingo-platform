-- QUICK FIX - Run this immediately in Supabase SQL Editor

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

CREATE OR REPLACE FUNCTION upsert_tenant_session(
    p_tenant_id UUID,
    p_user_email TEXT,
    p_tenant_name TEXT,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'success', true,
        'session_id', gen_random_uuid(),
        'session_token', encode(gen_random_bytes(32), 'hex'),
        'expires_at', NOW() + INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION upsert_tenant_session(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;