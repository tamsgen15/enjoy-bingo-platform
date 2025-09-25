-- Create user_sessions table for database-only session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL UNIQUE,
    tenant_id TEXT,
    tenant_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS and grant permissions
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_sessions TO anon;
GRANT ALL ON public.user_sessions TO authenticated;

-- Create function to manage user sessions
CREATE OR REPLACE FUNCTION manage_user_session(
    p_user_email TEXT,
    p_tenant_id TEXT DEFAULT NULL,
    p_tenant_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    -- Upsert user session
    INSERT INTO public.user_sessions (user_email, tenant_id, tenant_name, is_active, last_activity)
    VALUES (p_user_email, p_tenant_id, p_tenant_name, true, NOW())
    ON CONFLICT (user_email) 
    DO UPDATE SET 
        tenant_id = COALESCE(p_tenant_id, user_sessions.tenant_id),
        tenant_name = COALESCE(p_tenant_name, user_sessions.tenant_name),
        is_active = true,
        last_activity = NOW();
    
    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION manage_user_session(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION manage_user_session(TEXT, TEXT, TEXT) TO authenticated;