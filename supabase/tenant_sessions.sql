-- Create tenant_sessions table for session management
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

-- Disable RLS for anonymous access
ALTER TABLE public.tenant_sessions DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated users
GRANT ALL ON public.tenant_sessions TO anon;
GRANT ALL ON public.tenant_sessions TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_tenant_id ON public.tenant_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_user_email ON public.tenant_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_active ON public.tenant_sessions(is_active, expires_at);

-- Create function to upsert tenant session
CREATE OR REPLACE FUNCTION upsert_tenant_session(
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
    -- Generate session token and expiry
    v_session_token := 'session_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 1, 8);
    v_expires_at := NOW() + INTERVAL '24 hours';
    
    -- Deactivate existing sessions for this user
    UPDATE public.tenant_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE user_email = p_user_email AND is_active = true;
    
    -- Insert new session
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

-- Drop existing function first
DROP FUNCTION IF EXISTS upsert_tenant_session;

-- Grant execute permission on function with full signature
GRANT EXECUTE ON FUNCTION upsert_tenant_session(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION upsert_tenant_session(TEXT, TEXT, TEXT, TEXT) TO authenticated;