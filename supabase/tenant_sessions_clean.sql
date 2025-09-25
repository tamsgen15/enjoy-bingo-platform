-- Drop all existing functions first
DROP FUNCTION IF EXISTS upsert_tenant_session(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS upsert_tenant_session(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS upsert_tenant_session;

-- Create tenant_sessions table
CREATE TABLE IF NOT EXISTS public.tenant_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    session_token TEXT NOT NULL,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS and grant permissions
ALTER TABLE public.tenant_sessions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tenant_sessions TO anon;
GRANT ALL ON public.tenant_sessions TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_active ON public.tenant_sessions(is_active, expires_at);

-- Create clean function
CREATE FUNCTION upsert_tenant_session(
    p_tenant_id TEXT,
    p_user_email TEXT,
    p_tenant_name TEXT,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_session_id UUID;
    v_session_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    v_session_token := 'session_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 1, 8);
    v_expires_at := NOW() + INTERVAL '24 hours';
    
    UPDATE public.tenant_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE user_email = p_user_email AND is_active = true;
    
    INSERT INTO public.tenant_sessions (
        tenant_id, user_email, tenant_name, session_token, 
        device_info, is_active, expires_at
    ) VALUES (
        p_tenant_id, p_user_email, p_tenant_name, v_session_token,
        p_device_info, true, v_expires_at
    ) RETURNING id INTO v_session_id;
    
    RETURN json_build_object(
        'success', true,
        'session_id', v_session_id,
        'session_token', v_session_token,
        'expires_at', v_expires_at
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_tenant_session(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION upsert_tenant_session(TEXT, TEXT, TEXT, TEXT) TO authenticated;